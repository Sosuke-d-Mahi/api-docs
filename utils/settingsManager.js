const fs = require('fs');
const path = require('path');
const Settings = require('../models/Settings');
const logger = require('./logger');

const settingsPath = path.join(__dirname, '../settings.json');

class SettingsManager {
    constructor() {
        this.cache = {};
        this.useMongo = false;
        this.loaded = false;
        this.loadFromFile();
    }

    loadFromFile() {
        try {
            if (fs.existsSync(settingsPath)) {
                this.cache = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
                this.loaded = true;
                console.log('[Settings] Loaded from settings.json');
            } else {
                console.log('[Settings] settings.json not found');
            }
        } catch (e) {
            logger.error('[Settings] Failed to load settings.json: ' + e.message);
        }
    }

    async init() {
        if (process.env.GMAIL_EMAIL && process.env.GMAIL_CLIENT_ID) {
            if (!this.cache.credentials) this.cache.credentials = {};
            if (!this.cache.credentials.gmailAccount) this.cache.credentials.gmailAccount = {};

            this.cache.credentials.gmailAccount.email = process.env.GMAIL_EMAIL;
            this.cache.credentials.gmailAccount.clientId = process.env.GMAIL_CLIENT_ID;
            this.cache.credentials.gmailAccount.clientSecret = process.env.GMAIL_CLIENT_SECRET;
            this.cache.credentials.gmailAccount.refreshToken = process.env.GMAIL_REFRESH_TOKEN;

            console.log('[Settings] Email credentials loaded from Environment Variables');
            return;
        }

        try {
            const doc = await Settings.findOne();
            if (doc) {
                this.cache = doc.toObject();
                const { _id, __v, createdAt, updatedAt, ...cleanData } = this.cache;
                this.cache = cleanData;
                this.saveToFile(this.cache);
                this.useMongo = true;
                console.log('[Settings] Loaded from MongoDB');
            } else if (Object.keys(this.cache).length > 0) {
                await Settings.create(this.cache);
                this.useMongo = true;
                console.log('[Settings] Seeded to MongoDB');
            }
        } catch (e) {
            console.log('[Settings] MongoDB sync skipped (using file cache)');
        }
    }

    get() {
        return this.cache;
    }

    async update(newSettings) {
        this.cache = { ...this.cache, ...newSettings };
        this.saveToFile(this.cache);

        try {
            const { _id, ...updateData } = this.cache;
            await Settings.updateOne({}, { $set: updateData }, { upsert: true });
        } catch (e) {
            console.log('[Settings] MongoDB update skipped');
        }
    }

    saveToFile(data) {
        try {
            const { _id, __v, createdAt, updatedAt, ...cleanData } = data;
            fs.writeFileSync(settingsPath, JSON.stringify(cleanData, null, 2));
        } catch (e) {
            console.log('[Settings] Failed to save file: ' + e.message);
        }
    }
}

module.exports = new SettingsManager();
