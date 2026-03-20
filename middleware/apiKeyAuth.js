const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const usersFile = path.join(__dirname, '../data/users.json');
const rateLimit = new Map(); // { apikey: { count: 0, lastReset: timestamp } }

const getUsers = () => {
    try {
        if (!fs.existsSync(usersFile)) return [];
        return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    } catch (e) {
        return [];
    }
};

const saveUsers = async (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    try {
        for (const user of users) {
             await User.findOneAndUpdate({ email: user.email }, user, { upsert: true });
        }
    } catch (err) {
        console.error("[Auth] Background Mongo Sync Error:", err.message);
    }
};

const apiKeyAuth = async (req, res, next) => {
    const io = req.app.get('io');
    const apikey = req.query.apikey;

    // Helper to send logs to frontend
    const sendLog = (status, credits) => {
        if (io && apikey) {
            io.to(apikey).emit('api_usage', {
                method: req.method,
                path: req.originalUrl.split('?')[0],
                timestamp: Date.now(),
                status: status,
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                newCredits: credits
            });
        }
    };

    // Capture response status to send to terminal
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        // We attempt to find the user credits if possible for late logging
        const users = getUsers();
        const user = users.find(u => u.apikey === apikey);
        sendLog(res.statusCode, user ? user.credits : undefined);
        originalEnd.call(this, chunk, encoding);
    };

    if (req.path.startsWith('/api/auth')) {
        return next();
    }

    if (!apikey) {
        return res.status(401).json({ status: false, message: "API Key Required. Use ?apikey=..." });
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.apikey === apikey);
    const user = users[userIndex];

    if (!user) {
        return res.status(401).json({ status: false, message: "Invalid API Key" });
    }

    // --- Rate Limiting (10 req/sec) ---
    if (user.role !== 'admin') {
        const now = Date.now();
        const stats = rateLimit.get(apikey) || { count: 0, lastReset: now };
        
        if (now - stats.lastReset > 1000) {
            stats.count = 1;
            stats.lastReset = now;
        } else {
            stats.count++;
        }
        rateLimit.set(apikey, stats);

        if (stats.count > 10) {
            return res.status(429).json({ status: false, message: "Rate limit exceeded (10 req/s max)" });
        }

        // --- Credits Checking & Decrement ---
        if (user.credits !== -1) {
            if (user.credits <= 0) {
                return res.status(402).json({ status: false, message: "Out of credits. Please refill." });
            }
            
            user.credits -= 1;
            users[userIndex] = user;
            saveUsers(users);
        }
    }

    req.user = user;
    next();
};

module.exports = apiKeyAuth;
