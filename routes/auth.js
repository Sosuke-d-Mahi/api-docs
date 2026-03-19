const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const User = require('../models/User');

const usersFile = path.join(__dirname, '../data/users.json');
const otpFile = path.join(__dirname, '../data/otp_store.json');
const settingsManager = require('../utils/settingsManager');
const configLoader = require('../utils/configLoader');

const otpStore = new Map();

const loadOtpFromFile = () => {
    try {
        if (fs.existsSync(otpFile)) {
            const data = JSON.parse(fs.readFileSync(otpFile, 'utf-8'));
            const now = Date.now();
            for (const [email, otpData] of Object.entries(data)) {
                if (otpData.expires > now) {
                    otpStore.set(email, otpData);
                }
            }
            console.log('[Auth] Loaded OTPs from file, count:', otpStore.size);
        }
    } catch (e) {
        console.error('[Auth] Failed to load OTP file:', e.message);
    }
};

const saveOtpToFile = () => {
    try {
        const obj = Object.fromEntries(otpStore);
        fs.writeFileSync(otpFile, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.error('[Auth] Failed to save OTP file:', e.message);
    }
};

loadOtpFromFile();

setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [email, data] of otpStore) {
        if (data.expires < now) {
            otpStore.delete(email);
            changed = true;
        }
    }
    if (changed) saveOtpToFile();
}, 60000);

const getSettings = () => {
    return settingsManager.get();
};

const getUsers = () => {
    try {
        if (!fs.existsSync(usersFile)) return [];
        const content = fs.readFileSync(usersFile, 'utf-8');
        if (!content || content.trim() === "") return [];
        return JSON.parse(content);
    } catch (e) {
        return [];
    }
};

const saveUsers = async (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    try {
        for (const user of users) {
            await User.findOneAndUpdate(
                { email: user.email },
                user,
                { upsert: true, new: true }
            );
        }
    } catch (err) {
        console.error("MongoDB Sync Error:", err.message);
    }
};

const generateApiKey = () => {
    const random = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36).substring(4);
    return `god-mahi-${random}-${timestamp}`;
};

const generateToken = () => 'easir-token-' + Math.random().toString(36).substr(2) + Date.now().toString(36);

const ensureAdminExists = async () => {
    const adminCreds = configLoader.getAdminCredentials();
    
    const adminUser = {
        username: adminCreds.username,
        password: adminCreds.password,
        name: "Admin",
        email: "admin@easir.local",
        role: "admin",
        apikey: "god-admin-manual-entry",
        credits: -1,
        creditLimit: -1
    };

    let users = getUsers();
    const exists = users.find(u => u.username === adminUser.username);

    if (!exists) {
        console.log(`[Auth] Seeding Admin User '${adminUser.username}'...`);
        users.push(adminUser);
        await saveUsers(users);
    } else {
        try {
            await User.findOneAndUpdate(
                { email: adminUser.email },
                adminUser,
                { upsert: true, new: true }
            );
        } catch (e) { console.error("[Auth] Admin Mongo Sync Fail:", e.message); }
    }
};

// Run immediately
ensureAdminExists().catch((error) => {
    console.error("[Auth] Failed to ensure admin exists:", error.message);
});

const sendEmailWithRetry = async (transporter, mailOptions, retries = 3, delay = 2000) => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            return { success: true, info };
        } catch (error) {
            lastError = error;
            console.log(`[Email] Attempt ${i + 1}/${retries} failed: ${error.message}`);
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    return { success: false, error: lastError };
};

router.post('/send-otp', async (req, res) => {
    try {
        const { username, email, name, password } = req.body;

        if (!username || !email || !password) {
            return res.json({ status: false, message: "Missing fields" });
        }

        if (!email.toLowerCase().endsWith('@gmail.com')) {
            return res.json({ status: false, message: "Only @gmail.com addresses are allowed." });
        }

        const settings = getSettings();
        if (!settings?.credentials?.gmailAccount) {
            return res.status(500).json({ status: false, message: "Server Email Config Missing" });
        }

        const creds = settings.credentials.gmailAccount;
        if (!creds.email || !creds.clientId || !creds.clientSecret || !creds.refreshToken) {
            return res.status(500).json({ status: false, message: "Email service not configured" });
        }

        const users = getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return res.json({ status: false, message: "Username already taken." });
        }

        const normalizedEmail = email.toLowerCase();
        if (users.find(u => u.email.toLowerCase() === normalizedEmail)) {
            return res.json({ status: false, message: "Email already registered." });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore.set(normalizedEmail, {
            code,
            username,
            password,
            name: name || username,
            expires: Date.now() + 5 * 60 * 1000
        });
        saveOtpToFile();

        console.log(`[Auth] OTP for ${username}: ${code}`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: creds.email,
                clientId: creds.clientId,
                clientSecret: creds.clientSecret,
                refreshToken: creds.refreshToken
            }
        });

        transporter.on('token', (token) => {
            console.log('[Email] New access token:', token.accessToken);
        });

        transporter.on('error', (err) => {
            console.error('[Email] Transporter error:', err.message);
        });

        const mailOptions = {
            from: `"Easir API" <${creds.email}>`,
            to: normalizedEmail,
            subject: "Your Verification Code - Easir API",
            html: `
                <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #6d28d9;">Welcome to Easir API</h2>
                    <p>Use the following code to complete your registration:</p>
                    <h1 style="background: #fff; padding: 10px; border-radius: 5px; display: inline-block; letter-spacing: 5px;">${code}</h1>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">This code expires in 5 minutes.</p>
                </div>
            `
        };

        const result = await sendEmailWithRetry(transporter, mailOptions, 3, 2000);
        
        if (result.success) {
            console.log(`[Email] Sent to ${normalizedEmail}`);
            return res.json({ status: true, message: "Verification code sent to " + normalizedEmail });
        }

        const errMsg = result.error?.message || 'Unknown error';
        const errCode = result.error?.code || 'N/A';
        console.error(`[Email] Failed: ${errMsg} (code: ${errCode})`);
        
        if (errMsg.includes('Invalid')) {
            return res.status(500).json({ status: false, message: "Email authentication failed. Please contact admin." });
        }
        if (errMsg.includes('Timeout')) {
            return res.status(500).json({ status: false, message: "Email connection timeout. Please try again." });
        }
        
        return res.status(500).json({ status: false, message: "Failed to send email: " + errMsg });

    } catch (error) {
        console.error("[Email] Error:", error);
        return res.status(500).json({ status: false, message: "Internal Server Error: " + error.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ status: false, message: "Email and Code required" });
        }

        const normalizedEmail = email.toLowerCase();
        const pending = otpStore.get(normalizedEmail);

        if (!pending) {
            return res.json({ status: false, message: "Registration session expired or invalid." });
        }

        if (Date.now() > pending.expires) {
            otpStore.delete(normalizedEmail);
            saveOtpToFile();
            return res.json({ status: false, message: "Code expired. Please try again." });
        }

        if (pending.code !== code.toString()) {
            return res.json({ status: false, message: "Invalid Verification Code." });
        }

        const users = getUsers();

        if (users.find(u => u.username.toLowerCase() === pending.username.toLowerCase())) {
            return res.json({ status: false, message: "Username already taken." });
        }

        const isAdmin = normalizedEmail === 'easiriqbalmahi@gmail.com';

        const newUser = {
            username: pending.username,
            password: pending.password,
            name: pending.name,
            email: normalizedEmail,
            role: isAdmin ? "admin" : "user",
            apikey: generateApiKey(),
            banned: false,
            credits: 1000,
            creditLimit: -1
        };

        users.push(newUser);
        await saveUsers(users);

        otpStore.delete(normalizedEmail);
        saveOtpToFile();

        res.json({
            status: true,
            message: isAdmin ? "Registration Successful (Admin Access Granted)" : "Registration Successful",
            apikey: newUser.apikey
        });
    } catch (error) {
        console.error("[Auth] /register Error:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const normalizedInput = username.toLowerCase();

    const users = getUsers();
    const user = users.find(u =>
        (u.username.toLowerCase() === normalizedInput || u.email.toLowerCase() === normalizedInput) &&
        u.password === password
    );

    if (user) {
        if (user.banned) {
            return res.status(403).json({
                status: false,
                message: "Account suspended. Reason: " + (user.banReason || "Contact admin")
            });
        }
        return res.json({
            status: true,
            message: "Login Successful",
            token: generateToken(),
            user: {
                username: user.username,
                role: user.role,
                name: user.name,
                apikey: user.apikey,
                credits: user.credits,
                creditLimit: user.creditLimit
            }
        });
    }

    return res.status(401).json({
        status: false,
        message: "Invalid Credentials"
    });
});

module.exports = router;
