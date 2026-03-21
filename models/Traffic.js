const mongoose = require('mongoose');

const TrafficSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    isp: { type: String },
    org: { type: String },
    hostname: { type: String },
    country: { type: String },
    region: { type: String },
    city: { type: String },
    postal: { type: String },
    timezone: { type: String },
    lat: { type: Number },
    lon: { type: Number },
    userAgent: { type: String },
    path: { type: String },
    method: { type: String },
    timestamp: { type: Date, default: Date.now }
});

TrafficSchema.index({ timestamp: -1, _id: -1 });
TrafficSchema.index({ ip: 1, timestamp: -1 });
TrafficSchema.index({ method: 1, timestamp: -1 });
TrafficSchema.index({ path: 1, timestamp: -1 });

module.exports = mongoose.model('Traffic', TrafficSchema);
