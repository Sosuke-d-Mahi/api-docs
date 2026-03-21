const User = require('../models/User');
const { extractBearerToken } = require('../utils/requestIdentity');
const { verifyAuthToken } = require('../utils/tokenService');

const requireAuth = async (req, res, next) => {
    const token = extractBearerToken(req);
    if (!token) {
        return res.status(401).json({ status: false, message: "Authentication required" });
    }

    try {
        const payload = verifyAuthToken(token);
        const user = await User.findById(payload.sub);

        if (!user || user.tokenVersion !== payload.tokenVersion) {
            return res.status(401).json({ status: false, message: "Session expired. Please sign in again." });
        }

        if (user.banned) {
            return res.status(403).json({
                status: false,
                message: "Account suspended. Reason: " + (user.banReason || "Contact admin")
            });
        }

        req.user = user;
        req.authToken = token;
        next();
    } catch (error) {
        return res.status(401).json({ status: false, message: "Invalid or expired session" });
    }
};

module.exports = requireAuth;
