const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const si = require('systeminformation');
const adminAuth = require('../middleware/adminAuth');
const logger = require('../utils/logger');
const { getTraffic } = require('../middleware/trafficLogger');

const settingsManager = require('../utils/settingsManager');
const configLoader = require('../utils/configLoader');
const User = require('../models/User');

const bannedPath = path.join(__dirname, '../data/banned_ips.json');
const usersFile = path.join(__dirname, '../data/users.json');

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

const getUsers = () => {
    try {
        if (!fs.existsSync(usersFile)) return [];
        const content = fs.readFileSync(usersFile, 'utf-8');
        if (!content || content.trim() === "") return [];
        return JSON.parse(content);
    } catch (e) {
        return [];
    }
};

const saveUsers = async (users) => {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    try {
        for (const user of users) {
            await User.findOneAndUpdate(
                { email: user.email },
                user,
                { upsert: true, new: true }
            );
        }
    } catch (err) {
        console.error("[Admin] MongoDB Sync Error:", err.message);
    }
};

router.get('/users', adminAuth, (req, res) => {
    try {
        const users = getUsers().map(u => ({
            username: u.username,
            name: u.name,
            email: u.email,
            role: u.role,
            apikey: u.apikey,
            banned: u.banned || false,
            banReason: u.banReason || '',
            credits: u.credits !== undefined ? u.credits : 1000,
            creditLimit: u.creditLimit !== undefined ? u.creditLimit : -1,
            createdAt: u.createdAt
        }));
        res.json({ status: true, data: users });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to fetch users" });
    }
});

router.post('/users/ban', adminAuth, async (req, res) => {
    try {
        const { username, reason } = req.body;
        if (!username) return res.status(400).json({ status: false, error: "Username required" });

        const users = getUsers();
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ status: false, error: "User not found" });
        }

        const adminCreds = configLoader.getAdminCredentials();
        if (users[userIndex].username === adminCreds.username) {
            return res.status(403).json({ status: false, error: "Cannot ban admin user" });
        }

        users[userIndex].banned = true;
        users[userIndex].banReason = reason || 'Banned by admin';
        
        await saveUsers(users);
        logger.info(`[Admin] User ${username} banned. Reason: ${reason || 'None'}`);
        
        res.json({ status: true, message: `User ${username} has been banned.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to ban user" });
    }
});

router.post('/users/unban', adminAuth, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ status: false, error: "Username required" });

        const users = getUsers();
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ status: false, error: "User not found" });
        }

        users[userIndex].banned = false;
        users[userIndex].banReason = '';
        
        await saveUsers(users);
        logger.info(`[Admin] User ${username} unbanned.`);
        
        res.json({ status: true, message: `User ${username} has been unbanned.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to unban user" });
    }
});

router.post('/users/delete', adminAuth, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ status: false, error: "Username required" });

        const adminCreds = configLoader.getAdminCredentials();
        if (username === adminCreds.username) {
            return res.status(403).json({ status: false, error: "Cannot delete admin user" });
        }

        const users = getUsers();
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ status: false, error: "User not found" });
        }

        const deletedUser = users.splice(userIndex, 1)[0];
        
        await saveUsers(users);
        
        try {
            await User.deleteOne({ email: deletedUser.email });
        } catch (e) {
            console.error("[Admin] MongoDB delete error:", e.message);
        }
        
        logger.info(`[Admin] User ${username} deleted.`);
        
        res.json({ status: true, message: `User ${username} has been deleted.` });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to delete user" });
    }
});

router.post('/users/credits', adminAuth, async (req, res) => {
    try {
        const { username, credits, creditLimit } = req.body;
        if (!username) return res.status(400).json({ status: false, error: "Username required" });

        const users = getUsers();
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ status: false, error: "User not found" });
        }

        if (credits !== undefined) {
            users[userIndex].credits = parseInt(credits);
        }
        if (creditLimit !== undefined) {
            users[userIndex].creditLimit = parseInt(creditLimit);
        }
        
        await saveUsers(users);
        logger.info(`[Admin] User ${username} credits updated. Credits: ${users[userIndex].credits}, Limit: ${users[userIndex].creditLimit}`);
        
        res.json({ 
            status: true, 
            message: `User ${username} credits updated.`,
            data: {
                credits: users[userIndex].credits,
                creditLimit: users[userIndex].creditLimit
            }
        });
    } catch (e) {
        res.status(500).json({ status: false, error: "Failed to update credits" });
    }
});

module.exports = router;
