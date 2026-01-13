const express = require('express');
const router = express.Router();
const Traffic = require('../models/Traffic');
const logger = require('../utils/logger');

router.post('/visit', async (req, res) => {
    try {
        const { ip, isp, country, city, lat, lon, userAgent, path } = req.body;

        // Basic validation
        if (!ip) {
            return res.status(400).json({ status: false, message: "IP Required" });
        }

        const newVisit = new Traffic({
            ip, isp, country, city, lat, lon, userAgent, path
        });

        await newVisit.save();

        res.json({ status: true, message: "Visit recorded" });
    } catch (e) {
        logger.error("Tracking Error: " + e.message);
        res.status(500).json({ status: false, error: "Server Error" });
    }
});

module.exports = router;
