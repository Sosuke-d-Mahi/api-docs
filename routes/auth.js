const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const User = require('../models/User');

const usersFile = path.join(__dirname, '../data/users.json');
const settingsManager = require('../utils/settingsManager');

const otpStore = new Map();

const getSettings = () => {
    return settingsManager.get();
};

const getUsers = () => {
    try {
        if (!fs.existsSync(usersFile)) return [];
        const content = fs.readFileSync(usersFile, 'utf-8');
        // Handle empty file case
        if (!content || content.trim() === "") return [];
        return JSON.parse(content);
    } catch (e) {
        return [];
    }
};

const saveUsers = async (users) => {
    // 1. Save to JSON File
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    // 2. Sync to MongoDB (Fire and Forget)
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

// --- AUTO SEED ADMIN ---
const ensureAdminExists = async () => {
    const adminUser = {
        username: "mahi",
        password: "6244",
        name: "Mahi Admin",
        email: "mahi@admin.local",
        role: "admin",
        apikey: "god-mahi-manual-entry"
    };

    let users = getUsers();
    const exists = users.find(u => u.username === adminUser.username);

    if (!exists) {
        console.log("Seeding Admin User 'mahi'...");
        users.push(adminUser);
        await saveUsers(users); // This will save to JSON AND Mongo
    } else {
        // Even if exists locally, ensure it's in Mongo
        try {
            await User.findOneAndUpdate(
                { email: adminUser.email },
                adminUser,
                { upsert: true, new: true }
            );
        } catch (e) { console.error("Admin Mongo Sync Fail:", e.message); }
    }
};

// Run immediately
ensureAdminExists();

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
        // Safe check for settings existence
        if (!settings || !settings.credentials || !settings.credentials.gmailAccount) {
            console.error("Critical: Email settings missing.");
            return res.status(500).json({ status: false, message: "Server Email Config Missing" });
        }

        const creds = settings.credentials.gmailAccount;

        // Debug Log for Missing Creds
        const missingKeys = [];
        if (!creds.email) missingKeys.push("email");
        if (!creds.clientId) missingKeys.push("clientId");
        if (!creds.clientSecret) missingKeys.push("clientSecret");
        if (!creds.refreshToken) missingKeys.push("refreshToken");

        if (missingKeys.length > 0) {
            console.error("CRITICAL: Missing Email Credentials: " + missingKeys.join(", "));
            return res.status(500).json({ status: false, message: "Server Email Config Incomplete: " + missingKeys.join(", ") });
        }

        let transporter;
        try {
            // Using explicit settings to avoid timeouts on Render
            transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // use STARTTLS
                requireTLS: true,
                auth: {
                    type: 'OAuth2',
                    user: creds.email,
                    clientId: creds.clientId,
                    clientSecret: creds.clientSecret,
                    refreshToken: creds.refreshToken
                },
                tls: {
                    rejectUnauthorized: false // Helps with some self-signed cert issues if they arise, though Gmail is usually fine.
                },
                logger: true,
                debug: true,
                connectionTimeout: 10000, // 10s connection timeout
                socketTimeout: 10000      // 10s socket timeout
            });
        } catch (err) {
            console.error("Transporter Creation Error:", err);
            return res.status(500).json({ status: false, message: "Email Service Unavailable" });
        }

        const users = getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return res.json({ status: false, message: "Username already taken." });
        }

        // Normalize email for check
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

        console.log(`[Auth] User ${username} requested OTP for ${normalizedEmail}. Code generated. Sending email...`);

        // Send Email with Timeout Protection
        const mailOptions = {
            from: "Easir API <noreply@easiriqbal.com>",
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

        const sendMailPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Email Send Timeout (15s)")), 15000));

        await Promise.race([sendMailPromise, timeoutPromise]);

        console.log(`[Auth] Email sent successfully to ${normalizedEmail}`);

        res.json({ status: true, message: "Verification code sent to " + normalizedEmail });

    } catch (error) {
        console.error("Deep Logic Error in /send-otp:", error);
        res.status(500).json({ status: false, message: "Internal Server Error: " + error.message });
    }
});

router.post('/register', (req, res) => {
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
        return res.json({ status: false, message: "Code expired. Please try again." });
    }

    if (pending.code !== code.toString()) {
        return res.json({ status: false, message: "Invalid Verification Code." });
    }

    const users = getUsers();

    // Double check just in case
    if (users.find(u => u.username.toLowerCase() === pending.username.toLowerCase())) {
        return res.json({ status: false, message: "Username already taken." });
    }

    // Admin Check
    const isAdmin = normalizedEmail === 'easiriqbalmahi@gmail.com';

    const newUser = {
        username: pending.username,
        password: pending.password,
        name: pending.name,
        email: normalizedEmail,
        role: isAdmin ? "admin" : "user", // Auto-grant admin
        apikey: generateApiKey()
    };

    users.push(newUser);
    saveUsers(users);

    otpStore.delete(normalizedEmail);

    res.json({
        status: true,
        message: isAdmin ? "Registration Successful (Admin Access Granted)" : "Registration Successful",
        apikey: newUser.apikey
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Case insensitive matching
    const normalizedInput = username.toLowerCase();

    const users = getUsers();
    const user = users.find(u =>
        (u.username.toLowerCase() === normalizedInput || u.email.toLowerCase() === normalizedInput) &&
        u.password === password
    );

    if (user) {
        return res.json({
            status: true,
            message: "Login Successful",
            token: generateToken(),
            user: {
                username: user.username,
                role: user.role,
                name: user.name,
                apikey: user.apikey
            }
        });
    }

    return res.status(401).json({
        status: false,
        message: "Invalid Credentials"
    });
});

module.exports = router;
