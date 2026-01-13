const mongoose = require('mongoose');

const TrafficSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    isp: { type: String },
    org: { type: String }, // Organization/ASN
    hostname: { type: String },
    country: { type: String },
    region: { type: String }, // State/Province
    city: { type: String },
    postal: { type: String }, // Zip Code
    timezone: { type: String },
    lat: { type: Number },
    lon: { type: Number },
    userAgent: { type: String },
    path: { type: String }, // Page visited
    method: { type: String }, // GET/POST
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Traffic', TrafficSchema);
