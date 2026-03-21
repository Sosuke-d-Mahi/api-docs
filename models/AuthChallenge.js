const mongoose = require('mongoose');

const AuthChallengeSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    codeHash: { type: String, required: true },
    attemptCount: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    resendAvailableAt: { type: Date, required: true },
    ipAddress: { type: String, default: '' },
    expiresAt: { type: Date, required: true }
}, {
    timestamps: true
});

AuthChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuthChallenge', AuthChallengeSchema);
