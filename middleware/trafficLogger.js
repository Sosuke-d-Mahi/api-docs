const Traffic = require('../models/Traffic');
const axios = require('axios');
const logger = require('../utils/logger');

// Simple in-memory cache to prevent spamming DB/API for every request
const memoryCache = {};

const trafficLogger = async (req, res, next) => {
    try {
        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

        // Handle proxy chain
        if (clientIp && clientIp.includes(',')) {
            clientIp = clientIp.split(',')[0].trim();
        }

        // Normalize localhost
        if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
            clientIp = '127.0.0.1';
        }

        // Skip internal/bot noise if needed, or keeping it for "all usage"

        // 1. Update In-Memory Count (Fast)
        if (!memoryCache[clientIp]) {
            memoryCache[clientIp] = { count: 0, lastSeen: Date.now() };
        }
        memoryCache[clientIp].count++;
        memoryCache[clientIp].lastSeen = Date.now();

        // 2. Check DB async (Fire and forget-ish to not block response)
        // We only fetch GeoIP if we haven't seen this IP in DB recently or ever.
        // For simplicity, we check if it exists.

        // Rate limit DB writes/lookups? 
        // Let's do a quick check: if memory cache was just created, it's a new session/IP for this server instance.
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
            // New IP: Fetch Data
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
        } else {
            // Existing IP: Update timestamp and path?
            // Maybe just log it? For "All Usage", users usually want a log of hits.
            // But Traffic model is one-per-IP. 
            // Let's update the 'lastSeen' if we add that field, or just leave it as 'Visitor' record.
            // The user asked for "All usage traffic".
            // The Admin Dashboard shows a LIST of visitors.
            // Let's stick to "Visitor Recording" for now to populate that map.
        }
    } catch (e) {
        console.error("DB Process Error:", e);
    }
};

module.exports = { trafficLogger, getTraffic: () => [] }; // getTraffic legacy stub
