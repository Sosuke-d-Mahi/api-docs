const settingsManager = require('../utils/settingsManager');
const configLoader = require('../utils/configLoader');

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
    const authHeader = req.headers['x-admin-key'];
    const settings = settingsManager.get();
    const adminKey = (settings.apiSettings && settings.apiSettings.adminKey) || configLoader.getLogViewerToken();

    if (authHeader === adminKey) {
        return next();
    }

    const apiKey = req.query.apikey || req.headers['x-api-key'] || req.headers['authorization'];

    if (apiKey) {
        const users = getUsers();
        const cleanKey = (apiKey.replace('Bearer ', '')).trim();
        const user = users.find(u => u.apikey === cleanKey);

        if (user && user.role === 'admin') {
            req.user = user;
            return next();
        }
    }

    res.status(403).json({ status: false, message: "Admin Access Required" });
};

module.exports = adminAuth;
