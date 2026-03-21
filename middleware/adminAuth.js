const User = require('../models/User');
const { extractApiKey, extractBearerToken } = require('../utils/requestIdentity');
const { verifyAuthToken } = require('../utils/tokenService');
const { findUserByApiKey } = require('../utils/userStore');

const adminAuth = async (req, res, next) => {
    const token = extractBearerToken(req);

    if (token) {
        try {
            const payload = verifyAuthToken(token);
            const user = await User.findById(payload.sub);

            if (user && user.tokenVersion === payload.tokenVersion && !user.banned && user.role === 'admin') {
                req.user = user;
                return next();
            }
        } catch (error) {
            return res.status(401).json({ status: false, message: "Invalid or expired session" });
        }
    }

    const apiKey = extractApiKey(req);
    if (apiKey) {
        const user = await findUserByApiKey(apiKey);
        if (user && !user.banned && user.role === 'admin') {
            req.user = user;
            return next();
        }
    }

    return res.status(403).json({ status: false, message: "Admin Access Required" });
};

module.exports = adminAuth;
