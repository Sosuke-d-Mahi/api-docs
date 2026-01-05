const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const usersFile = path.join(__dirname, '../data/users.json');

const getUsers = () => {
    try {
        if (!fs.existsSync(usersFile)) return [];
        return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    } catch (e) {
        return [];
    }
};

const apiKeyAuth = (req, res, next) => {
    if (req.path.startsWith('/api/auth') ||
        req.path.startsWith('/api/admin') ||
        req.path === '/api/stats'
    ) {
        return next();
    }

    const { apikey } = req.query;

    if (!apikey) {
        return res.status(401).json({
            status: false,
            message: "API Key Required. Add ?apikey=god-mahi-..."
        });
    }

    const users = getUsers();
    const user = users.find(u => u.apikey === apikey);

    if (!user) {
        return res.status(403).json({
            status: false,
            message: "Invalid API Key"
        });
    }

    req.user = user;

    const io = req.app.get('io');
    if (io) {
        io.to(user.apikey).emit('api_usage', {
            method: req.method,
            path: req.originalUrl,
            timestamp: Date.now(),
            status: 200,
            ip: req.clientIp || req.ip
        });
    }

    next();
};

module.exports = apiKeyAuth;
