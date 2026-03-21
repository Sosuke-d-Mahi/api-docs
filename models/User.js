const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    usernameLower: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    emailLower: { type: String, required: true, unique: true, index: true },
    role: { type: String, default: 'user', enum: ['admin', 'user'] },
    apikey: { type: String, unique: true, sparse: true },
    banned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    credits: { type: Number, default: 1000 },
    creditLimit: { type: Number, default: -1 },
    lastRequest: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });

userSchema.pre('validate', function syncNormalizedFields() {
    if (this.username) {
        this.username = String(this.username).trim();
        this.usernameLower = this.username.toLowerCase();
    }

    if (this.email) {
        this.email = String(this.email).trim().toLowerCase();
        this.emailLower = this.email;
    }
});

module.exports = mongoose.model('User', userSchema);
