const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const si = require('systeminformation');
const adminAuth = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const { getTraffic } = require('../middleware/trafficLogger');

const settingsManager = require('../utils/settingsManager');
const bannedPath = path.join(__dirname, '../data/banned_ips.json');

router.get('/stats', adminAuth, async (req, res) => {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const os = await si.osInfo();
        const uptime = si.time().uptime;

        res.json({
            status: true,
            data: {
                cpu: cpu.currentLoad.toFixed(2),
                ram: {
                    total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + " GB",
                    used: (mem.active / 1024 / 1024 / 1024).toFixed(2) + " GB",
                    percent: ((mem.active / mem.total) * 100).toFixed(2)
                },
                os: os.distro,
                uptime: uptime
            }
        });
    } catch (e) {
        logger.error("Stats Error: " + e.message);
        res.status(500).json({ status: false, error: "Failed to fetch stats" });
    }
});

router.get('/settings', adminAuth, (req, res) => {
    try {
        const settings = settingsManager.get();
        res.json({ status: true, data: settings });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to read settings" });
    }
});

router.post('/settings', adminAuth, async (req, res) => {
    try {
        const newSettings = req.body;
        await settingsManager.update(newSettings);
        res.json({ status: true, message: "Settings updated successfully" });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to save settings" });
    }
});

const Traffic = require('../models/Traffic');

router.get('/traffic', adminAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const total = await Traffic.countDocuments();
        const visits = await Traffic.find()
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            status: true,
            data: visits,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            source: 'db'
        });
    } catch (e) {
        // Fallback to local cache if DB fails
        res.json({ status: true, data: getTraffic(), source: 'local' });
    }
});

router.get('/banned-ips', adminAuth, (req, res) => {
    try {
        const list = JSON.parse(fs.readFileSync(bannedPath, 'utf8'));
        res.json({ status: true, data: list });
    } catch (e) {
        res.json({ status: true, data: [] });
    }
});

router.post('/ban-ip', adminAuth, (req, res) => {
    try {
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ status: false, error: "IP required" });

        const list = JSON.parse(fs.readFileSync(bannedPath, 'utf8'));
        if (!list.includes(ip)) {
            list.push(ip);
            fs.writeFileSync(bannedPath, JSON.stringify(list, null, 2));
        }
        res.json({ status: true, message: `IP ${ip} banned.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to ban IP" });
    }
});

router.post('/unban-ip', adminAuth, (req, res) => {
    try {
        const { ip } = req.body;
        const list = JSON.parse(fs.readFileSync(bannedPath, 'utf8'));
        const newList = list.filter(i => i !== ip);
        fs.writeFileSync(bannedPath, JSON.stringify(newList, null, 2));
        res.json({ status: true, message: `IP ${ip} unbanned.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to unban IP" });
    }
});

module.exports = router;
