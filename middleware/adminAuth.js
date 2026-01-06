const settingsManager = require('../utils/settingsManager');

const fs = require('fs');
const path = require('path');
const usersFile = path.join(__dirname, '../data/users.json');

const getUsers = () => {
    try {
        if (!fs.existsSync(usersFile)) return [];
        return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    } catch (e) {
        return [];
    }
};

const adminAuth = (req, res, next) => {
    // 1. Check for Master Key (Legacy/System)
    const authHeader = req.headers['x-admin-key'];
    const settings = settingsManager.get();
    const adminKey = (settings.apiSettings && settings.apiSettings.adminKey) || "easir-secret-key-123";

    if (authHeader === adminKey) {
        return next();
    }

    // 2. Check for User API Key (Query or Header)
    const apiKey = req.query.apikey || req.headers['x-api-key'] || req.headers['authorization'];

    if (apiKey) {
        const users = getUsers();
        // Handle "Bearer " prefix if present
        const cleanKey = apiKey.replace('Bearer ', '');
        const user = users.find(u => u.apikey === cleanKey);

        if (user && user.role === 'admin') {
            req.user = user; // Attach user to request
            return next();
        }
    }

    // 3. Fallback: Fail
    res.status(403).json({ status: false, message: "Admin Access Required" });
};

module.exports = adminAuth;
