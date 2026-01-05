const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const usersFile = path.join(__dirname, '../data/users.json');
const settingsFile = path.join(__dirname, '../settings.json');

const otpStore = new Map();

const getSettings = () => {
    try {
        return JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    } catch (e) {
        return {};
    }
};

let transporter = null;

const initTransporter = () => {
    const settings = getSettings();
    if (settings.credentials && settings.credentials.gmailAccount) {
        const creds = settings.credentials.gmailAccount;
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: creds.email,
                clientId: creds.clientId,
                clientSecret: creds.clientSecret,
                refreshToken: creds.refreshToken
            }
        });
    }
};

initTransporter();

const getUsers = () => {
    try {
        if (!fs.existsSync(usersFile)) return [];
        return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    } catch (e) {
        return [];
    }
};

const saveUsers = (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
};

const generateApiKey = () => {
    const random = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36).substring(4);
    return `god-mahi-${random}-${timestamp}`;
};

const generateToken = () => 'easir-token-' + Math.random().toString(36).substr(2) + Date.now().toString(36);

router.post('/send-otp', async (req, res) => {
    const { username, email, name, password } = req.body;

    if (!username || !email || !password) {
        return res.json({ status: false, message: "Missing fields" });
    }

    if (!email.endsWith('@gmail.com')) {
        return res.json({ status: false, message: "Only @gmail.com addresses are allowed." });
    }

    if (!transporter) initTransporter();
    if (!transporter) {
        return res.status(500).json({ status: false, message: "Server Email Config Missing" });
    }

    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return res.json({ status: false, message: "Username already taken." });
    }
    if (users.find(u => u.email === email)) {
        return res.json({ status: false, message: "Email already registered." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(email, {
        code,
        username,
        password,
        name: name || username,
        expires: Date.now() + 5 * 60 * 1000
    });

    try {
        await transporter.sendMail({
            from: "Easir API <noreply@easiriqbal.com>",
            to: email,
            subject: "Your Verification Code - Easir API",
            html: `
                <div style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #6d28d9;">Welcome to Easir API</h2>
                    <p>Use the following code to complete your registration:</p>
                    <h1 style="background: #fff; padding: 10px; border-radius: 5px; display: inline-block; letter-spacing: 5px;">${code}</h1>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">This code expires in 5 minutes.</p>
                </div>
            `
        });

        res.json({ status: true, message: "Verification code sent to " + email });

    } catch (error) {
        console.error("Email Error:", error);
        res.json({ status: false, message: "Failed to send email: " + error.message });
    }
});

router.post('/register', (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ status: false, message: "Email and Code required" });
    }

    const pending = otpStore.get(email);

    if (!pending) {
        return res.json({ status: false, message: "Registration session expired or invalid." });
    }

    if (Date.now() > pending.expires) {
        otpStore.delete(email);
        return res.json({ status: false, message: "Code expired. Please try again." });
    }

    if (pending.code !== code.toString()) {
        return res.json({ status: false, message: "Invalid Verification Code." });
    }

    const users = getUsers();

    if (users.find(u => u.username === pending.username)) {
        return res.json({ status: false, message: "Username already taken." });
    }

    const newUser = {
        username: pending.username,
        password: pending.password,
        name: pending.name,
        email: email,
        role: "user",
        apikey: generateApiKey()
    };

    users.push(newUser);
    saveUsers(users);

    otpStore.delete(email);

    res.json({
        status: true,
        message: "Registration Successful",
        apikey: newUser.apikey
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const users = getUsers();
    const user = users.find(u => (u.username === username || u.email === username) && u.password === password);

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
