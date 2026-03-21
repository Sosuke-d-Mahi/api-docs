const mongoose = require('mongoose');

const RateLimitWindowSchema = new mongoose.Schema({
    scope: { type: String, required: true },
    key: { type: String, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true }
}, {
    timestamps: true
});

RateLimitWindowSchema.index({ scope: 1, key: 1, windowStart: 1 }, { unique: true });
RateLimitWindowSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RateLimitWindow', RateLimitWindowSchema);
