const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    // We use a flexible schema to match the JSON structure exactly
    name: String,
    version: String,
    description: String,
    header: mongoose.Schema.Types.Mixed,
    apiSettings: mongoose.Schema.Types.Mixed,
    links: [mongoose.Schema.Types.Mixed],
    notifications: [mongoose.Schema.Types.Mixed],
    credentials: mongoose.Schema.Types.Mixed
}, {
    strict: false,
    timestamps: true,
    collection: 'settings' // Explicit collection name
});

module.exports = mongoose.model('Settings', SettingsSchema);
