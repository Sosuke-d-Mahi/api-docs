const express = require('express');
const crypto = require('crypto');

const User = require('../models/User');
const AuthChallenge = require('../models/AuthChallenge');
const requireAuth = require('../middleware/requireAuth');
const {
    getEmailErrorCode,
    getEmailErrorMessage,
    isEmailConfigured,
    isEmailTimeoutError,
    sendEmail
} = require('../utils/emailSender');
const configLoader = require('../utils/configLoader');
const { hashPassword, isPasswordHashed, verifyPassword } = require('../utils/passwords');
const { getRequestIp } = require('../utils/requestIdentity');
const { hitRateLimit } = require('../utils/rateLimitStore');
const { createAuthToken } = require('../utils/tokenService');
const {
    generateApiKey,
    migrateLegacyUsersFromFile,
    normalizeEmail,
    normalizeUsername,
    sanitizeUser,
    findUserByLogin
} = require('../utils/userStore');

const router = express.Router();

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const OTP_SEND_IP_LIMIT = 6;
const OTP_SEND_IP_WINDOW_MS = 60 * 60 * 1000;
const OTP_SEND_EMAIL_LIMIT = 3;
const OTP_SEND_EMAIL_WINDOW_MS = 30 * 60 * 1000;
const OTP_VERIFY_IP_LIMIT = 20;
const OTP_VERIFY_IP_WINDOW_MS = 30 * 60 * 1000;

const hashOtpCode = (email, code) => crypto
    .createHmac('sha256', configLoader.getOtpSecret())
    .update(`${normalizeEmail(email)}:${String(code)}`)
    .digest('hex');

const validateUsername = (value) => /^[a-zA-Z0-9._-]{3,32}$/.test(String(value || '').trim());

const validatePassword = (value) => typeof value === 'string' && value.length >= 8;

const sendEmailWithRetry = async (sendOperation, retries = 3, delay = 2000) => {
    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await sendOperation();
        } catch (error) {
            lastError = error;
            if (attempt < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
};

const rejectRateLimit = (res, limiter, message) => {
    res.setHeader('Retry-After', Math.ceil(limiter.retryAfterMs / 1000));
    return res.status(429).json({ status: false, message });
};

const ensureAdminExists = async () => {
    await migrateLegacyUsersFromFile();

    const adminCreds = configLoader.getAdminCredentials();
    const username = String(adminCreds.username || '').trim();
    const password = String(adminCreds.password || '');
    const adminEmail = 'admin@easir.local';

    if (!username || !password) {
        return null;
    }

    let adminUser = await User.findOne({
        $or: [
            { usernameLower: normalizeUsername(username) },
            { emailLower: adminEmail }
        ]
    });

    if (!adminUser) {
        adminUser = await User.create({
            username,
            usernameLower: normalizeUsername(username),
            password: await hashPassword(password),
            name: 'Admin',
            email: adminEmail,
            emailLower: adminEmail,
            role: 'admin',
            apikey: generateApiKey('velrith-admin'),
            credits: -1,
            creditLimit: -1
        });
        return adminUser;
    }

    const update = {
        username,
        usernameLower: normalizeUsername(username),
        name: 'Admin',
        email: adminEmail,
        emailLower: adminEmail,
        role: 'admin',
        credits: -1,
        creditLimit: -1
    };

    if (!adminUser.apikey) {
        update.apikey = generateApiKey('velrith-admin');
    }

    if (!isPasswordHashed(adminUser.password) || !(await verifyPassword(password, adminUser.password))) {
        update.password = await hashPassword(password);
        update.tokenVersion = (adminUser.tokenVersion || 0) + 1;
    }

    adminUser = await User.findByIdAndUpdate(
        adminUser._id,
        { $set: update },
        { new: true }
    );

    return adminUser;
};

router.get('/me', requireAuth, async (req, res) => {
    return res.json({
        status: true,
        user: sanitizeUser(req.user)
    });
});

router.post('/send-otp', async (req, res) => {
    try {
        const { username, email, name, password } = req.body;
        const clientIp = getRequestIp(req) || 'unknown';
        const normalizedEmail = normalizeEmail(email);
        const normalizedUsername = normalizeUsername(username);

        if (!normalizedUsername || !normalizedEmail || !password) {
            return res.status(400).json({ status: false, message: "Username, email, and password are required." });
        }

        if (!validateUsername(username)) {
            return res.status(400).json({ status: false, message: "Username must be 3-32 characters and use letters, numbers, dots, underscores, or dashes." });
        }

        if (!normalizedEmail.endsWith('@gmail.com')) {
            return res.status(400).json({ status: false, message: "Only @gmail.com addresses are allowed." });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ status: false, message: "Password must be at least 8 characters long." });
        }

        if (!isEmailConfigured()) {
            return res.status(500).json({ status: false, message: "Email service not configured" });
        }

        const ipLimiter = await hitRateLimit({
            scope: 'otp-send-ip',
            key: clientIp,
            limit: OTP_SEND_IP_LIMIT,
            windowMs: OTP_SEND_IP_WINDOW_MS
        });
        if (!ipLimiter.allowed) {
            return rejectRateLimit(res, ipLimiter, "Too many verification code requests from this IP. Please try again later.");
        }

        const emailLimiter = await hitRateLimit({
            scope: 'otp-send-email',
            key: normalizedEmail,
            limit: OTP_SEND_EMAIL_LIMIT,
            windowMs: OTP_SEND_EMAIL_WINDOW_MS
        });
        if (!emailLimiter.allowed) {
            return rejectRateLimit(res, emailLimiter, "Too many verification code requests for this email. Please try again later.");
        }

        const existingUser = await User.findOne({
            $or: [
                { usernameLower: normalizedUsername },
                { emailLower: normalizedEmail }
            ]
        }).select('_id');

        if (existingUser) {
            return res.status(409).json({ status: false, message: "Username or email already registered." });
        }

        const existingChallenge = await AuthChallenge.findOne({ email: normalizedEmail });
        if (existingChallenge && existingChallenge.resendAvailableAt > new Date()) {
            const seconds = Math.ceil((existingChallenge.resendAvailableAt.getTime() - Date.now()) / 1000);
            return res.status(429).json({
                status: false,
                message: `Please wait ${Math.max(seconds, 1)} seconds before requesting another code.`
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_TTL_MS);
        const resendAvailableAt = new Date(Date.now() + OTP_RESEND_COOLDOWN_MS);
        const passwordHash = await hashPassword(password);

        await AuthChallenge.findOneAndUpdate(
            { email: normalizedEmail },
            {
                $set: {
                    email: normalizedEmail,
                    username: String(username).trim(),
                    name: String(name || username).trim(),
                    passwordHash,
                    codeHash: hashOtpCode(normalizedEmail, code),
                    attemptCount: 0,
                    resendCount: (existingChallenge?.resendCount || 0) + 1,
                    lastSentAt: new Date(),
                    resendAvailableAt,
                    ipAddress: clientIp,
                    expiresAt
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        const mailOptions = {
            to: normalizedEmail,
            subject: "Your Verification Code - Velrith API",
            text: `Your Velrith API verification code is ${code}. This code expires in 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Welcome to Velrith API</h2>
                    <p>Use the following code to complete your registration:</p>
                    <h1 style="background: #fff; padding: 10px; border-radius: 5px; display: inline-block; letter-spacing: 5px;">${code}</h1>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">This code expires in 5 minutes.</p>
                </div>
            `
        };

        await sendEmailWithRetry(() => sendEmail(mailOptions), 3, 2000);

        return res.json({
            status: true,
            message: "Verification code sent to " + normalizedEmail,
            expiresInSeconds: OTP_TTL_MS / 1000,
            resendInSeconds: OTP_RESEND_COOLDOWN_MS / 1000
        });
    } catch (error) {
        const errMsg = getEmailErrorMessage(error);
        const errCode = getEmailErrorCode(error);

        if (isEmailTimeoutError(error)) {
            return res.status(500).json({
                status: false,
                message: "External email API timed out. Please try again."
            });
        }

        return res.status(500).json({ status: false, message: "Failed to send email: " + errMsg + ` (${errCode})` });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { email, code } = req.body;
        const clientIp = getRequestIp(req) || 'unknown';
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !code) {
            return res.status(400).json({ status: false, message: "Email and verification code are required." });
        }

        const verifyLimiter = await hitRateLimit({
            scope: 'otp-verify-ip',
            key: clientIp,
            limit: OTP_VERIFY_IP_LIMIT,
            windowMs: OTP_VERIFY_IP_WINDOW_MS
        });
        if (!verifyLimiter.allowed) {
            return rejectRateLimit(res, verifyLimiter, "Too many verification attempts. Please try again later.");
        }

        const pending = await AuthChallenge.findOne({ email: normalizedEmail });
        if (!pending) {
            return res.status(400).json({ status: false, message: "Registration session expired or invalid." });
        }

        if (pending.expiresAt.getTime() < Date.now()) {
            await AuthChallenge.deleteOne({ _id: pending._id });
            return res.status(400).json({ status: false, message: "Code expired. Please request a new one." });
        }

        if (pending.attemptCount >= OTP_MAX_ATTEMPTS) {
            await AuthChallenge.deleteOne({ _id: pending._id });
            return res.status(429).json({ status: false, message: "Too many invalid attempts. Please request a new code." });
        }

        const codeMatches = pending.codeHash === hashOtpCode(normalizedEmail, code);
        if (!codeMatches) {
            const updated = await AuthChallenge.findByIdAndUpdate(
                pending._id,
                { $inc: { attemptCount: 1 } },
                { new: true }
            );

            if (updated && updated.attemptCount >= OTP_MAX_ATTEMPTS) {
                await AuthChallenge.deleteOne({ _id: updated._id });
                return res.status(429).json({ status: false, message: "Too many invalid attempts. Please request a new code." });
            }

            return res.status(400).json({ status: false, message: "Invalid verification code." });
        }

        const existingUser = await User.findOne({
            $or: [
                { usernameLower: normalizeUsername(pending.username) },
                { emailLower: normalizedEmail }
            ]
        }).select('_id');

        if (existingUser) {
            await AuthChallenge.deleteOne({ _id: pending._id });
            return res.status(409).json({ status: false, message: "Username or email already registered." });
        }

        const isAdmin = normalizedEmail === 'easiriqbalmahi@gmail.com';
        const user = await User.create({
            username: pending.username,
            usernameLower: normalizeUsername(pending.username),
            password: pending.passwordHash,
            name: pending.name,
            email: normalizedEmail,
            emailLower: normalizedEmail,
            role: isAdmin ? 'admin' : 'user',
            apikey: generateApiKey(isAdmin ? 'velrith-admin' : 'velrith'),
            credits: isAdmin ? -1 : 1000,
            creditLimit: -1
        });

        await AuthChallenge.deleteOne({ _id: pending._id });

        const token = createAuthToken(user);
        return res.json({
            status: true,
            message: isAdmin ? "Registration Successful (Admin Access Granted)" : "Registration Successful",
            token,
            user: sanitizeUser(user),
            apikey: user.apikey
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const identifier = String(username || '').trim();
        const clientIp = getRequestIp(req) || 'unknown';

        if (!identifier || !password) {
            return res.status(400).json({ status: false, message: "Username and password are required." });
        }

        const loginLimiter = await hitRateLimit({
            scope: 'login',
            key: `${clientIp}:${identifier.toLowerCase()}`,
            limit: LOGIN_LIMIT,
            windowMs: LOGIN_WINDOW_MS
        });
        if (!loginLimiter.allowed) {
            return rejectRateLimit(res, loginLimiter, "Too many login attempts. Please try again later.");
        }

        const user = await findUserByLogin(identifier);
        if (!user) {
            return res.status(401).json({ status: false, message: "Invalid Credentials" });
        }

        const passwordMatches = await verifyPassword(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ status: false, message: "Invalid Credentials" });
        }

        if (user.banned) {
            return res.status(403).json({
                status: false,
                message: "Account suspended. Reason: " + (user.banReason || "Contact admin")
            });
        }

        const update = { lastLoginAt: new Date() };
        if (!isPasswordHashed(user.password)) {
            update.password = await hashPassword(password);
            update.tokenVersion = (user.tokenVersion || 0) + 1;
        }

        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { $set: update },
            { new: true }
        );

        const token = createAuthToken(updatedUser);

        return res.json({
            status: true,
            message: "Login Successful",
            token,
            user: sanitizeUser(updatedUser)
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Login Failed" });
    }
});

module.exports = { router, ensureAdminExists };
