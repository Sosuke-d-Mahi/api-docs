const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
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
    collection: 'settings'
});

module.exports = mongoose.model('Settings', SettingsSchema);
