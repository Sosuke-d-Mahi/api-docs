const RateLimitWindow = require('../models/RateLimitWindow');

const hitRateLimit = async ({ scope, key, limit, windowMs }) => {
    const now = Date.now();
    const windowStartMs = now - (now % windowMs);
    const windowStart = new Date(windowStartMs);
    const expiresAt = new Date(windowStartMs + (windowMs * 2));

    const doc = await RateLimitWindow.findOneAndUpdate(
        { scope, key, windowStart },
        {
            $inc: { count: 1 },
            $setOnInsert: { expiresAt }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    const retryAfterMs = (windowStartMs + windowMs) - now;

    return {
        allowed: doc.count <= limit,
        count: doc.count,
        limit,
        remaining: Math.max(0, limit - doc.count),
        retryAfterMs
    };
};

module.exports = {
    hitRateLimit
};
