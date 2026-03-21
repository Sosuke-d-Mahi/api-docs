const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const si = require('systeminformation');

const adminAuth = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const settingsManager = require('../utils/settingsManager');
const configLoader = require('../utils/configLoader');
const Traffic = require('../models/Traffic');
const User = require('../models/User');
const { normalizeUsername, sanitizeUser } = require('../utils/userStore');

const router = express.Router();
const bannedPath = path.join(__dirname, '../data/banned_ips.json');

const clamp = (value, min, max, fallback) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        return fallback;
    }
    return Math.min(Math.max(parsed, min), max);
};

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const encodeCursor = (entry) => Buffer.from(JSON.stringify({
    timestamp: new Date(entry.timestamp).toISOString(),
    id: String(entry._id)
})).toString('base64url');

const decodeCursor = (cursor) => {
    if (!cursor) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        if (!payload.timestamp || !payload.id || !mongoose.Types.ObjectId.isValid(payload.id)) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
};

const resolveDateRange = ({ range, from, to }) => {
    const now = Date.now();
    const result = {};

    if (range && range !== 'all') {
        const windows = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };

        if (windows[range]) {
            result.$gte = new Date(now - windows[range]);
        }
    }

    if (from) {
        const parsedFrom = new Date(from);
        if (!Number.isNaN(parsedFrom.getTime())) {
            result.$gte = parsedFrom;
        }
    }

    if (to) {
        const parsedTo = new Date(to);
        if (!Number.isNaN(parsedTo.getTime())) {
            result.$lte = parsedTo;
        }
    }

    return Object.keys(result).length > 0 ? result : null;
};

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
                uptime
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

router.get('/traffic', adminAuth, async (req, res) => {
    try {
        const limit = clamp(req.query.limit, 1, 100, 20);
        const method = String(req.query.method || '').trim().toUpperCase();
        const search = String(req.query.search || '').trim();
        const dateRange = resolveDateRange({
            range: req.query.range,
            from: req.query.from,
            to: req.query.to
        });
        const cursor = decodeCursor(req.query.cursor);

        const baseFilters = [];

        if (dateRange) {
            baseFilters.push({ timestamp: dateRange });
        }

        if (method && method !== 'ALL') {
            baseFilters.push({ method });
        }

        if (search) {
            const regex = new RegExp(escapeRegExp(search), 'i');
            baseFilters.push({
                $or: [
                    { ip: regex },
                    { city: regex },
                    { country: regex },
                    { isp: regex },
                    { path: regex }
                ]
            });
        }

        const filters = [...baseFilters];
        if (cursor) {
            const cursorDate = new Date(cursor.timestamp);
            filters.push({
                $or: [
                    { timestamp: { $lt: cursorDate } },
                    { timestamp: cursorDate, _id: { $lt: new mongoose.Types.ObjectId(cursor.id) } }
                ]
            });
        }

        const query = filters.length > 0 ? { $and: filters } : {};
        const baseQuery = baseFilters.length > 0 ? { $and: baseFilters } : {};

        const docs = await Traffic.find(query)
            .sort({ timestamp: -1, _id: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = docs.length > limit;
        const data = hasMore ? docs.slice(0, limit) : docs;
        const nextCursor = hasMore ? encodeCursor(data[data.length - 1]) : null;
        const total = await Traffic.countDocuments(baseQuery);

        res.json({
            status: true,
            data,
            pagination: {
                limit,
                nextCursor,
                hasMore,
                total
            },
            filters: {
                range: req.query.range || 'all',
                search,
                method: method || 'ALL'
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to fetch traffic" });
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
        if (!ip) {
            return res.status(400).json({ status: false, error: "IP required" });
        }

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
        const newList = list.filter((item) => item !== ip);
        fs.writeFileSync(bannedPath, JSON.stringify(newList, null, 2));
        res.json({ status: true, message: `IP ${ip} unbanned.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to unban IP" });
    }
});

router.get('/users', adminAuth, async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            status: true,
            data: users.map((user) => sanitizeUser(user))
        });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to fetch users" });
    }
});

router.post('/users/ban', adminAuth, async (req, res) => {
    try {
        const { username, reason } = req.body;
        if (!username) {
            return res.status(400).json({ status: false, error: "Username required" });
        }

        const normalized = normalizeUsername(username);
        const adminCreds = configLoader.getAdminCredentials();

        if (normalized === normalizeUsername(adminCreds.username)) {
            return res.status(403).json({ status: false, error: "Cannot ban admin user" });
        }

        const user = await User.findOneAndUpdate(
            { usernameLower: normalized },
            {
                $set: {
                    banned: true,
                    banReason: reason || 'Banned by admin'
                },
                $inc: { tokenVersion: 1 }
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ status: false, error: "User not found" });
        }

        logger.info(`[Admin] User ${user.username} banned. Reason: ${reason || 'None'}`);
        res.json({ status: true, message: `User ${user.username} has been banned.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to ban user" });
    }
});

router.post('/users/unban', adminAuth, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ status: false, error: "Username required" });
        }

        const user = await User.findOneAndUpdate(
            { usernameLower: normalizeUsername(username) },
            {
                $set: {
                    banned: false,
                    banReason: ''
                },
                $inc: { tokenVersion: 1 }
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ status: false, error: "User not found" });
        }

        logger.info(`[Admin] User ${user.username} unbanned.`);
        res.json({ status: true, message: `User ${user.username} has been unbanned.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to unban user" });
    }
});

router.post('/users/delete', adminAuth, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ status: false, error: "Username required" });
        }

        const normalized = normalizeUsername(username);
        const adminCreds = configLoader.getAdminCredentials();
        if (normalized === normalizeUsername(adminCreds.username)) {
            return res.status(403).json({ status: false, error: "Cannot delete admin user" });
        }

        const deletedUser = await User.findOneAndDelete({ usernameLower: normalized });
        if (!deletedUser) {
            return res.status(404).json({ status: false, error: "User not found" });
        }

        logger.info(`[Admin] User ${deletedUser.username} deleted.`);
        res.json({ status: true, message: `User ${deletedUser.username} has been deleted.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to delete user" });
    }
});

router.post('/users/credits', adminAuth, async (req, res) => {
    try {
        const { username, credits, creditLimit } = req.body;
        if (!username) {
            return res.status(400).json({ status: false, error: "Username required" });
        }

        const update = {};
        if (credits !== undefined) {
            const parsedCredits = parseInt(credits, 10);
            if (Number.isNaN(parsedCredits)) {
                return res.status(400).json({ status: false, error: "Invalid credits value" });
            }
            update.credits = parsedCredits;
        }

        if (creditLimit !== undefined) {
            const parsedLimit = parseInt(creditLimit, 10);
            if (Number.isNaN(parsedLimit)) {
                return res.status(400).json({ status: false, error: "Invalid credit limit value" });
            }
            update.creditLimit = parsedLimit;
        }

        const user = await User.findOneAndUpdate(
            { usernameLower: normalizeUsername(username) },
            { $set: update },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ status: false, error: "User not found" });
        }

        logger.info(`[Admin] User ${user.username} credits updated. Credits: ${user.credits}, Limit: ${user.creditLimit}`);

        res.json({
            status: true,
            message: `User ${user.username} credits updated.`,
            data: {
                credits: user.credits,
                creditLimit: user.creditLimit
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to update credits" });
    }
});

module.exports = router;
