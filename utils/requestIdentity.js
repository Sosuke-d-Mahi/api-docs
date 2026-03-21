const normalizeIp = (ip) => {
    if (!ip) {
        return '';
    }

    let value = String(ip).trim();

    if (value.includes(',')) {
        value = value.split(',')[0].trim();
    }

    if (value.startsWith('::ffff:')) {
        value = value.slice(7);
    }

    const ipv4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
    if (ipv4WithPort) {
        return ipv4WithPort[1];
    }

    const bracketedIpv6 = value.match(/^\[([0-9a-fA-F:]+)\](?::\d+)?$/);
    if (bracketedIpv6) {
        return bracketedIpv6[1];
    }

    return value;
};

const getRequestIp = (req) => {
    return normalizeIp(
        req.headers['cf-connecting-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.ip ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        ''
    );
};

const extractBearerToken = (req) => {
    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader.startsWith('Bearer ')) {
        return '';
    }
    return authHeader.slice(7).trim();
};

const extractApiKey = (req) => {
    const headerKey = req.headers['x-api-key'];
    if (headerKey) {
        return String(headerKey).trim();
    }

    if (req.query && req.query.apikey) {
        return String(req.query.apikey).trim();
    }

    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader) {
        return '';
    }

    if (authHeader.startsWith('ApiKey ')) {
        return authHeader.slice(7).trim();
    }

    if (authHeader.startsWith('Bearer ')) {
        const candidate = authHeader.slice(7).trim();
        if (candidate.split('.').length !== 3) {
            return candidate;
        }
        return '';
    }

    if (!authHeader.includes(' ')) {
        return authHeader;
    }

    return '';
};

module.exports = {
    extractApiKey,
    extractBearerToken,
    getRequestIp,
    normalizeIp
};
