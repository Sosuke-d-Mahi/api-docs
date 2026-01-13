const mongoose = require('mongoose');

const TrafficSchema = new mongoose.Schema({
    ip: { type: String, required: true },
    isp: { type: String },
    country: { type: String },
    city: { type: String },
    lat: { type: Number },
    lon: { type: Number },
    userAgent: { type: String },
    path: { type: String }, // Page visited
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Traffic', TrafficSchema);
