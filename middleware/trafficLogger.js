const Traffic = require('../models/Traffic');
const axios = require('axios');
const logger = require('../utils/logger');

const memoryCache = {};

const trafficLogger = async (req, res, next) => {
    try {
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

        if (clientIp && clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim();
        }

        if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
            clientIp = '127.0.0.1';
        }

        if (!memoryCache[clientIp]) {
            memoryCache[clientIp] = { count: 0, lastSeen: Date.now() };
        }
        memoryCache[clientIp].count++;
        memoryCache[clientIp].lastSeen = Date.now();

        if (memoryCache[clientIp].count === 1) {
            processTraffic(clientIp, req.headers['user-agent'], req.method + ' ' + req.originalUrl);
        }

    } catch (e) {
        console.error("Traffic Logger Error:", e.message);
    }
    next();
};

const processTraffic = async (ip, userAgent, path) => {
    try {
        let visit = await Traffic.findOne({ ip });

        if (!visit) {
            let geoData = {};
            if (ip !== '127.0.0.1') {
                try {
                    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
                    if (!response.data.error) {
                        geoData = {
                            isp: response.data.org,
                            country: response.data.country_name,
                            city: response.data.city,
                            lat: response.data.latitude,
                            lon: response.data.longitude
                        };
                    }
                } catch (apiErr) {
                    console.error("GeoIP Fetch Failed:", apiErr.message);
                }
            } else {
                geoData = {
                    isp: 'Localhost',
                    country: 'Local',
                    city: 'Local',
                    lat: 0,
                    lon: 0
                };
            }

            visit = new Traffic({
                ip,
                userAgent,
                path,
                ...geoData
            });
            await visit.save();
            logger.info(`New Visitor Recorded: ${ip} (${geoData.city})`);
        }
    } catch (e) {
        console.error("DB Process Error:", e);
    }
};

module.exports = { trafficLogger, getTraffic: () => [] };
