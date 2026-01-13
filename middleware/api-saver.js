const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http"); // Added http module
const Traffic = require('../models/Traffic'); // Added: Import Mongoose Model

// -------------------- Helpers --------------------

function ensureDir(dir) {
    if (!fs.existsSync(dir)) { // Fixed: sync check before mkdir
        fs.mkdirSync(dir, { recursive: true });
    }
}

function nowISO() {
    return new Date().toISOString();
}

function sha256Hex(input, salt = "") {
    return crypto.createHash("sha256").update(String(salt) + String(input)).digest("hex");
}

function maskIPv4(ip) {
    // 192.168.1.123 -> 192.168.1.0
    const parts = ip.split(".");
    if (parts.length !== 4) return ip;
    parts[3] = "0";
    return parts.join(".");
}

function maskIPv6(ip) {
    // very coarse mask: keep first 3 groups
    // 2001:db8:abcd:0012:.... -> 2001:db8:abcd::
    const parts = ip.split(":").filter(Boolean);
    if (parts.length < 3) return ip;
    return parts.slice(0, 3).join(":") + "::";
}

function isIPv4(ip) {
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
}
function isIPv6(ip) {
    return /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(":");
}

function normalizeIp(ip) {
    if (!ip) return "";
    // Remove port if present (e.g. "::ffff:127.0.0.1" or "1.2.3.4:1234")
    // Keep IPv6 intact as much as possible
    ip = String(ip).trim();

    // Express sometimes gives "::ffff:127.0.0.1"
    if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

    // If it's IPv4 with port
    const v4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
    if (v4WithPort) ip = v4WithPort[1];

    // If it's bracketed IPv6 like "[2001:db8::1]:443"
    const v6Bracket = ip.match(/^\[([0-9a-fA-F:]+)\](:\d+)?$/);
    if (v6Bracket) ip = v6Bracket[1];

    return ip;
}

function getClientIp(req) {
    // Prefer proxy headers if present; requires app.set("trust proxy", true)
    // Cloudflare: cf-connecting-ip
    const cf = req.headers["cf-connecting-ip"];
    if (cf) return normalizeIp(cf);

    // Standard: x-forwarded-for (first is original client)
    const xff = req.headers["x-forwarded-for"];
    if (xff) {
        const first = String(xff).split(",")[0].trim();
        return normalizeIp(first);
    }

    // Fallbacks
    const realIp = req.headers["x-real-ip"];
    if (realIp) return normalizeIp(realIp);

    // Express provided
    return normalizeIp(req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "");
}

function safeJsonParse(line) {
    try { return JSON.parse(line); } catch { return null; }
}

// Generic getJson that handles both http and https
function getJson(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        client.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, json });
                } catch (e) {
                    reject(new Error("Failed to parse JSON response"));
                }
            });
        }).on("error", reject);
    });
}

// -------------------- Main Middleware --------------------

function apiSaver(options = {}) {
    const {
        serviceName = "easir-api",
        logDir = "./logs",
        logFilePrefix = "usage",
        ipMode = "hash", // "hash" | "mask" | "raw" - Default "raw" for admin dashboard simplicity unless user asks for privacy
        ipHashSalt = process.env.IP_HASH_SALT || "change-this-salt",
        maxBodyBytes = 2048,
        identifyClient = (req) => req.headers["x-api-key"] || req.headers["authorization"] || "anonymous",
        enableEnrichment = true, // Force enable
        enrichmentCacheMinutes = 60,
    } = options;

    if (!["hash", "mask", "raw"].includes(ipMode)) {
        throw new Error(`Invalid ipMode "${ipMode}". Use "hash", "mask", or "raw".`);
    }

    ensureDir(logDir);

    const filePath = path.join(logDir, `${logFilePrefix}-${serviceName}.jsonl`);

    // Simple in-memory cache to avoid hammering IP provider
    const enrichCache = new Map(); // ip -> { at, data }
    const cacheMs = enrichmentCacheMinutes * 60 * 1000;

    async function enrichIp(ip) {
        if (!enableEnrichment) return null;
        if (!ip) return null;

        // Demo spoofing is handled in the middleware now before calling this.

        if (ip === '127.0.0.1' || ip === 'localhost') return { city: 'Localhost', country: 'Local', isp: 'Local', lat: 0, lon: 0 };

        const cached = enrichCache.get(ip);
        const now = Date.now();
        if (cached && now - cached.at < cacheMs) return cached.data;

        // Use ip-api.com (HTTP) - More reliable for free tier
        const url = `http://ip-api.com/json/${ip}`;

        try {
            const { status, json } = await getJson(url);
            if (json.status !== 'success') throw new Error(json.message || "API Error");

            const data = {
                provider: "ip-api.com",
                status,
                country: json.country || null,
                region: json.regionName || null,
                city: json.city || null,
                postal: json.zip || null,
                isp: json.isp || null,
                org: json.org || null,
                asn: json.as || null,
                timezone: json.timezone || null,
                loc: (json.lat && json.lon) ? `${json.lat},${json.lon}` : null,
                lat: json.lat,
                lon: json.lon
            };
            enrichCache.set(ip, { at: now, data });
            return data;
        } catch (e) {
            const data = { provider: "ip-api.com", error: e.message || "enrichment failed" };
            enrichCache.set(ip, { at: now, data });
            return data;
        }
    }

    function formatIp(ip) {
        if (!ip) return "";
        if (ipMode === "raw") return ip;
        if (ipMode === "mask") {
            if (isIPv4(ip)) return maskIPv4(ip);
            if (isIPv6(ip)) return maskIPv6(ip);
            return ip;
        }
        // hash
        return sha256Hex(ip, ipHashSalt);
    }

    function writeLog(obj) {
        // JSONL: one JSON per line
        fs.appendFile(filePath, JSON.stringify(obj) + "\n", (err) => {
            if (err) {
                console.error("[apiSaver] failed to write log:", err.message);
            }
        });
    }

    async function saveToMongo(logObj, rawIp) {
        try {
            // If we have enrichment data, upsert/save to Traffic model for Dashboard
            if (logObj.ipInfo && !logObj.ipInfo.error) {
                const update = {
                    ip: rawIp,
                    isp: logObj.ipInfo.isp,
                    org: logObj.ipInfo.org,
                    country: logObj.ipInfo.country,
                    region: logObj.ipInfo.region,
                    city: logObj.ipInfo.city,
                    postal: logObj.ipInfo.postal,
                    timezone: logObj.ipInfo.timezone,
                    lat: logObj.ipInfo.lat,
                    lon: logObj.ipInfo.lon,
                    userAgent: logObj.ua,
                    path: logObj.path,
                    method: logObj.method,
                    timestamp: new Date() // Update last seen
                };

                // User wants ALL logs/requests saved, not just unique visitors.
                await Traffic.create(update);
            } else {
                // Fallback for non-enriched (localhost/error) - still save request
                await Traffic.create({
                    ip: rawIp,
                    timestamp: new Date(),
                    path: logObj.path,
                    method: logObj.method,
                    userAgent: logObj.ua,
                    isp: 'Unknown',
                    country: 'Unknown',
                    city: 'Unknown'
                });
            }
        } catch (e) {
            console.error("Mongo Save Error:", e.message);
        }
    }

    return async function apiSaverMiddleware(req, res, next) {
        // Filter out spammy internal polling endpoints
        const p = req.originalUrl || req.url;
        if (p.includes('/api/admin/traffic') || p.includes('/api/stats') || p.includes('/socket.io')) {
            return next();
        }

        const start = Date.now();
        let ip = getClientIp(req);

        // DEMO MODE: If Localhost, spoof logic HERE so it persists to DB
        if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
            ip = '103.153.28.60'; // Spoofing for demo purposes as requested
        }

        const ipStored = formatIp(ip); // For file log (can be hashed)

        let bodyPreview = undefined;
        if (req.body !== undefined) {
            try {
                const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
                bodyPreview = raw.length > maxBodyBytes ? raw.slice(0, maxBodyBytes) + "…(truncated)" : raw;
            } catch {
                bodyPreview = "[unserializable body]";
            }
        }

        const clientId = (() => {
            try { return String(identifyClient(req) || "anonymous"); }
            catch { return "anonymous"; }
        })();

        res.on("finish", async () => {
            const durationMs = Date.now() - start;

            const baseLog = {
                ts: nowISO(),
                service: serviceName,
                method: req.method,
                path: req.originalUrl || req.url,
                status: res.statusCode,
                durationMs,
                clientId,
                ip: ipStored,
                ua: req.headers["user-agent"] || "",
                referer: req.headers["referer"] || "",
            };

            if (req.method !== "GET" && bodyPreview !== undefined) {
                baseLog.bodyPreview = bodyPreview;
            }

            // Enriched Data
            if (enableEnrichment) {
                baseLog.ipInfo = await enrichIp(ip); // Always use RAW IP for enrichment
            }

            writeLog(baseLog);

            // Also save to MongoDB for the Live Dashboard using RAW IP
            await saveToMongo(baseLog, ip);
        });

        next();
    };
}

// -------------------- Optional: Minimal log viewer (protected) --------------------

function createLogViewerRouter({ logDir = "./logs", accessToken = "" } = {}) {
    const express = require("express");
    const router = express.Router();

    if (!accessToken) {
        console.warn("[apiSaver] createLogViewerRouter: accessToken is empty. This is unsafe.");
    }

    // Simple token auth: /_logs?token=...
    router.use((req, res, next) => {
        const token = req.query.token || req.headers["x-log-token"];
        if (String(token || "") !== String(accessToken || "")) {
            return res.status(401).json({ ok: false, error: "unauthorized" });
        }
        next();
    });

    // List log files
    router.get("/", (req, res) => {
        try {
            const files = fs.readdirSync(logDir).filter((f) => f.endsWith(".jsonl"));
            res.json({ ok: true, files });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    // Read last N lines of a log file
    router.get("/tail", (req, res) => {
        const file = String(req.query.file || "");
        const lines = Math.min(Math.max(parseInt(req.query.lines || "100", 10), 1), 2000);

        if (!file.endsWith(".jsonl")) return res.status(400).json({ ok: false, error: "invalid file" });

        const fullPath = path.join(logDir, path.basename(file));
        if (!fs.existsSync(fullPath)) return res.status(404).json({ ok: false, error: "not found" });

        try {
            const content = fs.readFileSync(fullPath, "utf8");
            const arr = content.trim().split("\n");
            const tail = arr.slice(-lines).map(safeJsonParse).filter(Boolean);
            res.json({ ok: true, file: path.basename(file), lines: tail.length, data: tail });
        } catch (e) {
            res.status(500).json({ ok: false, error: e.message });
        }
    });

    return router;
}

module.exports = { apiSaver, createLogViewerRouter };
