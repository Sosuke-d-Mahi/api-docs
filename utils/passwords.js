const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

const toBuffer = (value) => Buffer.from(String(value || ''), 'utf8');

const safeEqual = (left, right) => {
    const leftBuffer = toBuffer(left);
    const rightBuffer = toBuffer(right);
    if (leftBuffer.length !== rightBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const isPasswordHashed = (value) => typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);

const hashPassword = async (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = await scrypt(String(password), salt, KEY_LENGTH);
    return `${HASH_PREFIX}$${salt}$${derived.toString('hex')}`;
};

const verifyPassword = async (password, storedPassword) => {
    if (!storedPassword) {
        return false;
    }

    if (!isPasswordHashed(storedPassword)) {
        return safeEqual(password, storedPassword);
    }

    const parts = storedPassword.split('$');
    if (parts.length !== 3) {
        return false;
    }

    const [, salt, hashHex] = parts;
    const derived = await scrypt(String(password), salt, KEY_LENGTH);
    const expected = Buffer.from(hashHex, 'hex');

    if (derived.length !== expected.length) {
        return false;
    }

    return crypto.timingSafeEqual(derived, expected);
};

module.exports = {
    hashPassword,
    isPasswordHashed,
    verifyPassword
};
