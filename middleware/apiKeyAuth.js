const User = require('../models/User');
const configLoader = require('../utils/configLoader');
const { extractApiKey, getRequestIp } = require('../utils/requestIdentity');
const { hitRateLimit } = require('../utils/rateLimitStore');
const { findUserByApiKey } = require('../utils/userStore');

const apiKeyAuth = async (req, res, next) => {
    const io = req.app.get('io');
    const apiKey = extractApiKey(req);
    const clientIp = getRequestIp(req);
    let latestCredits;

    res.on('finish', () => {
        if (!io || !apiKey) {
            return;
        }

        io.to(`apikey:${apiKey}`).emit('api_usage', {
            method: req.method,
            path: (req.originalUrl || req.url || '').split('?')[0],
            timestamp: Date.now(),
            status: res.statusCode,
            ip: clientIp || 'Unknown',
            newCredits: latestCredits
        });
    });

    if (!apiKey) {
        return res.status(401).json({ status: false, message: "API Key Required. Use x-api-key, Authorization: ApiKey, or ?apikey=..." });
    }

    const user = await findUserByApiKey(apiKey);
    if (!user) {
        return res.status(401).json({ status: false, message: "Invalid API Key" });
    }

    if (user.banned) {
        return res.status(403).json({
            status: false,
            message: "Account suspended. Reason: " + (user.banReason || "Contact admin")
        });
    }

    if (user.role !== 'admin') {
        const rate = await hitRateLimit({
            scope: 'api-key',
            key: apiKey,
            limit: configLoader.getApiRateLimit(),
            windowMs: configLoader.getApiRateWindowMs()
        });

        res.setHeader('X-RateLimit-Limit', rate.limit);
        res.setHeader('X-RateLimit-Remaining', rate.remaining);
        res.setHeader('X-RateLimit-Reset', Date.now() + rate.retryAfterMs);

        if (!rate.allowed) {
            res.setHeader('Retry-After', Math.ceil(rate.retryAfterMs / 1000));
            return res.status(429).json({ status: false, message: "Rate limit exceeded. Please slow down." });
        }

        if (user.credits !== -1) {
            const updatedUser = await User.findOneAndUpdate(
                {
                    _id: user._id,
                    $or: [
                        { credits: { $gt: 0 } },
                        { credits: -1 }
                    ]
                },
                {
                    $inc: { credits: -1 },
                    $set: { lastRequest: new Date() }
                },
                { new: true }
            );

            if (!updatedUser || updatedUser.credits < 0) {
                return res.status(402).json({ status: false, message: "Out of credits. Please refill." });
            }

            req.user = updatedUser;
            latestCredits = updatedUser.credits;
            req.apiKey = apiKey;
            return next();
        }
    }

    user.lastRequest = new Date();
    await user.save();
    latestCredits = user.credits;
    req.user = user;
    req.apiKey = apiKey;
    return next();
};

module.exports = apiKeyAuth;
