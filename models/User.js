
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: 'user' },
    apikey: { type: String, unique: true },
    banned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    credits: { type: Number, default: 1000 },
    creditLimit: { type: Number, default: -1 },
    lastRequest: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
