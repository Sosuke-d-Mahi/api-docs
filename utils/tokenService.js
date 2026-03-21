const crypto = require('crypto');
const configLoader = require('./configLoader');

const encodeSegment = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decodeSegment = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

const getSecret = () => configLoader.getAuthTokenSecret();

const sign = (input) => crypto.createHmac('sha256', getSecret()).update(input).digest('base64url');

const createAuthToken = (user) => {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = configLoader.getAuthTokenTtlSeconds();
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: String(user._id),
        role: user.role,
        tokenVersion: user.tokenVersion || 0,
        iat: now,
        exp: now + expiresIn
    };
    const headerSegment = encodeSegment(header);
    const payloadSegment = encodeSegment(payload);
    const signature = sign(`${headerSegment}.${payloadSegment}`);
    return `${headerSegment}.${payloadSegment}.${signature}`;
};

const verifyAuthToken = (token) => {
    if (!token || typeof token !== 'string') {
        throw new Error('Missing token');
    }

    const segments = token.split('.');
    if (segments.length !== 3) {
        throw new Error('Malformed token');
    }

    const [headerSegment, payloadSegment, signature] = segments;
    const expectedSignature = sign(`${headerSegment}.${payloadSegment}`);

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        throw new Error('Invalid signature');
    }

    const header = decodeSegment(headerSegment);
    if (header.alg !== 'HS256') {
        throw new Error('Unsupported algorithm');
    }

    const payload = decodeSegment(payloadSegment);
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
        throw new Error('Token expired');
    }

    return payload;
};

module.exports = {
    createAuthToken,
    verifyAuthToken
};
