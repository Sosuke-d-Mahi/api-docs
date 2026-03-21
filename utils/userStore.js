const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const User = require('../models/User');
const { hashPassword, isPasswordHashed } = require('./passwords');

const usersFile = path.join(__dirname, '../data/users.json');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

const generateApiKey = (prefix = 'velrith') => {
    const left = crypto.randomBytes(8).toString('hex');
    const right = crypto.randomBytes(8).toString('hex');
    return `${prefix}-${left}-${right}`;
};

const sanitizeUser = (user) => {
    const source = typeof user.toObject === 'function' ? user.toObject() : user;
    return {
        id: String(source._id),
        username: source.username,
        name: source.name,
        email: source.email,
        role: source.role,
        apikey: source.apikey,
        banned: source.banned || false,
        banReason: source.banReason || '',
        credits: source.credits,
        creditLimit: source.creditLimit,
        createdAt: source.createdAt,
        lastLoginAt: source.lastLoginAt || null
    };
};

const buildUserPayload = async (input = {}) => ({
    username: String(input.username || '').trim(),
    usernameLower: normalizeUsername(input.username),
    email: normalizeEmail(input.email),
    emailLower: normalizeEmail(input.email),
    name: String(input.name || '').trim(),
    password: isPasswordHashed(input.password) ? input.password : await hashPassword(input.password),
    role: input.role || 'user',
    apikey: input.apikey || generateApiKey(input.role === 'admin' ? 'velrith-admin' : 'velrith'),
    banned: Boolean(input.banned),
    banReason: input.banReason || '',
    credits: typeof input.credits === 'number' ? input.credits : 1000,
    creditLimit: typeof input.creditLimit === 'number' ? input.creditLimit : -1,
    tokenVersion: typeof input.tokenVersion === 'number' ? input.tokenVersion : 0,
    lastRequest: input.lastRequest || null,
    lastLoginAt: input.lastLoginAt || null
});

const findUserByLogin = async (identifier) => {
    const normalized = String(identifier || '').trim().toLowerCase();
    if (!normalized) {
        return null;
    }

    return User.findOne({
        $or: [
            { usernameLower: normalized },
            { emailLower: normalized }
        ]
    });
};

const findUserByApiKey = async (apiKey) => {
    if (!apiKey) {
        return null;
    }
    return User.findOne({ apikey: String(apiKey).trim() });
};

const migrateLegacyUsersFromFile = async () => {
    if (!fs.existsSync(usersFile)) {
        return;
    }

    let rawUsers;
    try {
        rawUsers = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    } catch {
        return;
    }

    if (!Array.isArray(rawUsers) || rawUsers.length === 0) {
        return;
    }

    for (const rawUser of rawUsers) {
        const usernameLower = normalizeUsername(rawUser.username);
        const emailLower = normalizeEmail(rawUser.email);

        if (!usernameLower || !emailLower || !rawUser.password) {
            continue;
        }

        const exists = await User.findOne({
            $or: [
                { usernameLower },
                { emailLower }
            ]
        }).select('_id');

        if (exists) {
            continue;
        }

        const payload = await buildUserPayload(rawUser);
        await User.create(payload);
    }
};

module.exports = {
    buildUserPayload,
    findUserByApiKey,
    findUserByLogin,
    generateApiKey,
    migrateLegacyUsersFromFile,
    normalizeEmail,
    normalizeUsername,
    sanitizeUser
};
