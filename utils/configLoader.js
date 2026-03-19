const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

let config = {};

const loadConfig = () => {
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
    } catch (e) {
        console.error('[Config] Failed to load config.json:', e.message);
        config = {};
    }
};

const get = (key, defaultValue = null) => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
        if (value === undefined || value === null) return defaultValue;
        value = value[k];
    }
    return value !== undefined ? value : defaultValue;
};

const getMongoUri = () => {
    return process.env.MONGO_URI || config.mongoUri || '';
};

const getAdminCredentials = () => {
    return {
        username: process.env.ADMIN_USERNAME || config.admin?.username || 'mahi',
        password: process.env.ADMIN_PASSWORD || config.admin?.password || '6244'
    };
};

const getLogViewerToken = () => {
    return process.env.LOG_VIEWER_TOKEN || config.security?.logViewerToken || 'easir-secret-key-123';
};

const getServerPort = () => {
    return parseInt(process.env.PORT || config.server?.port || 6969);
};

const getStatsInterval = () => {
    return parseInt(process.env.STATS_INTERVAL_MS || config.server?.statsIntervalMs || 5000);
};

const getMaxMemory = () => {
    return parseInt(process.env.MAX_MEMORY_MB || config.server?.maxMemoryMB || 460);
};

loadConfig();

module.exports = {
    get,
    loadConfig,
    getMongoUri,
    getAdminCredentials,
    getLogViewerToken,
    getServerPort,
    getStatsInterval,
    getMaxMemory
};
