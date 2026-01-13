const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const bannedPath = path.join(__dirname, '../data/banned_ips.json');

const ipGuard = (req, res, next) => {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    if (clientIp.substr(0, 7) == "::ffff:") {
        clientIp = clientIp.substr(7);
    }

    try {
        const bannedIps = JSON.parse(fs.readFileSync(bannedPath, 'utf8'));
        if (bannedIps.includes(clientIp)) {
            logger.warn(`Blocked request from banned IP: ${clientIp}`);
            return res.status(403).json({
                status: false,
                error: "Access Denied",
                message: "Your IP address has been banned from this service."
            });
        }
    } catch (e) {
        console.error("IP Guard Error:", e.message);
    }

    req.clientIp = clientIp;
    next();
};

module.exports = ipGuard;
