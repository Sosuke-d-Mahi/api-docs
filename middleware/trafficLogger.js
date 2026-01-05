const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const trafficPath = path.join(__dirname, '../data/ip_traffic.json');
let trafficCache = {};

try {
    if (fs.existsSync(trafficPath)) {
        trafficCache = JSON.parse(fs.readFileSync(trafficPath, 'utf8'));
    }
} catch (e) {
    logger.error("Failed to load traffic data: " + e.message);
}

let curTimeout = null;
const saveTraffic = () => {
    if (curTimeout) clearTimeout(curTimeout);
    curTimeout = setTimeout(() => {
        try {
            fs.writeFileSync(trafficPath, JSON.stringify(trafficCache, null, 2));
        } catch (e) {
            console.error("Traffic Save Error:", e);
        }
    }, 5000);
};

const trafficLogger = (req, res, next) => {
    const clientIp = req.clientIp || req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

    if (!trafficCache[clientIp]) {
        trafficCache[clientIp] = {
            ip: clientIp,
            count: 0,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            paths: []
        };
    }

    trafficCache[clientIp].count++;
    trafficCache[clientIp].lastSeen = Date.now();

    trafficCache[clientIp].paths.unshift(req.method + " " + req.originalUrl);
    if (trafficCache[clientIp].paths.length > 5) trafficCache[clientIp].paths.pop();

    saveTraffic();

    const io = req.app.get('io');
    if (io) {
        io.emit('traffic_update', trafficCache[clientIp]);
    }

    next();
};

module.exports = { trafficLogger, getTraffic: () => trafficCache };
