const settings = require('../settings.json');

const adminAuth = (req, res, next) => {
    // Simple header-based auth for now. 
    // In production, use session/JWT which we will implement in the frontend logic.
    const authHeader = req.headers['x-admin-key'];
    const adminKey = settings.apiSettings.adminKey || "easir-secret-key-123";

    if (authHeader === adminKey) {
        next();
    } else {
        res.status(403).json({ status: false, message: "Unauthorized Access" });
    }
};

module.exports = adminAuth;
