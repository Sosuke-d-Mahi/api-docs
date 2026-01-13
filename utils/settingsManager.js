const fs = require('fs');
const path = require('path');
const Settings = require('../models/Settings');
const logger = require('./logger');

const settingsPath = path.join(__dirname, '../settings.json');

class SettingsManager {
    constructor() {
        this.cache = {};
        this.useMongo = false;
        // Load initially from file to have something immediately
        try {
            if (fs.existsSync(settingsPath)) {
                this.cache = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            }
        } catch (e) {
            logger.error('Failed to load initial settings.json: ' + e.message);
        }
    }

    async init() {
        // Try to sync with Mongo
        try {
            const doc = await Settings.findOne();
            if (doc) {
                // Mongo has data, use it
                this.cache = doc.toObject();
                // Remove internal mongoose fields for clean file/cache
                const { _id, __v, createdAt, updatedAt, ...cleanData } = this.cache;
                this.cache = cleanData;

                // Update local file to match Mongo (Sync DB -> File)
                this.saveToFile(this.cache);
                this.useMongo = true;
                logger.info('Settings loaded from MongoDB');
            } else {
                // Mongo is empty, seed from file (Sync File -> DB)
                if (Object.keys(this.cache).length > 0) {
                    await Settings.create(this.cache);
                    this.useMongo = true;
                    logger.info('Settings seeded to MongoDB');
                }
            }
        } catch (e) {
            logger.error('Failed to sync settings with MongoDB: ' + e.message);
            // Fallback to file-only mode
        }

        // --- ENV VAR OVERRIDE (For Render/Production) ---
        if (process.env.GMAIL_EMAIL && process.env.GMAIL_CLIENT_ID) {
            if (!this.cache.credentials) this.cache.credentials = {};
            if (!this.cache.credentials.gmailAccount) this.cache.credentials.gmailAccount = {};

            this.cache.credentials.gmailAccount.email = process.env.GMAIL_EMAIL;
            this.cache.credentials.gmailAccount.clientId = process.env.GMAIL_CLIENT_ID;
            this.cache.credentials.gmailAccount.clientSecret = process.env.GMAIL_CLIENT_SECRET;
            this.cache.credentials.gmailAccount.refreshToken = process.env.GMAIL_REFRESH_TOKEN;

            logger.info('Email credentials loaded from Environment Variables');
        }
    }

    get() {
        return this.cache;
    }

    async update(newSettings) {
        // Merge updates
        this.cache = { ...this.cache, ...newSettings };

        // Save to File
        this.saveToFile(this.cache);

        // Save to Mongo
        try {
            // Upsert (update or insert if not exists)
            // We use replaceOne or updateOne. Since we want to keep the whole doc structure generally.
            // But if we just merge:
            const { _id, ...updateData } = this.cache;
            await Settings.updateOne({}, { $set: updateData }, { upsert: true });
            logger.info('Settings updated in MongoDB');
        } catch (e) {
            logger.error('Failed to update settings in MongoDB: ' + e.message);
        }
    }

    saveToFile(data) {
        try {
            const { _id, __v, createdAt, updatedAt, ...cleanData } = data;
            fs.writeFileSync(settingsPath, JSON.stringify(cleanData, null, 2));
        } catch (e) {
            logger.error('Failed to save settings.json: ' + e.message);
        }
    }
}

module.exports = new SettingsManager();
