const express = require('express');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const logger = require('./utils/logger');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const ipGuard = require('./middleware/ipGuard');
const { apiSaver, createLogViewerRouter } = require('./middleware/api-saver');
const connectDB = require('./utils/db');
const settingsManager = require('./utils/settingsManager');
const configLoader = require('./utils/configLoader');
const { isEmailConfigured } = require('./utils/emailSender');
const { router: authRouter, ensureAdminExists } = require('./routes/auth');
const { extractApiKey } = require('./utils/requestIdentity');
const { verifyAuthToken } = require('./utils/tokenService');
const User = require('./models/User');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const MONGO_URI = configLoader.getMongoUri();
if (MONGO_URI) {
    connectDB(MONGO_URI).then(async (connected) => {
        await settingsManager.init();
        if (connected) {
            await ensureAdminExists();
        }
    });
} else {
    console.log('[App] No MongoDB URI, starting without database');
    settingsManager.init();
}

const app = express();
const server = http.createServer(app);

app.set("trust proxy", true);
app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function wrapJson(data) {
        if (data && typeof data === 'object') {
            const currentSettings = settingsManager.get();
            const responseData = {
                status: data.status !== undefined ? data.status : true,
                creator: currentSettings.apiSettings?.operator || "Easir Iqbal Mahi",
                ...data
            };
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

app.use(apiSaver({
    serviceName: "easir-api",
    logDir: "./logs",
    ipMode: "raw",
    enableEnrichment: true,
    identifyClient: (req) => extractApiKey(req) || "anonymous"
}));

app.use("/admin/system-logs", createLogViewerRouter({
    logDir: "./logs",
    accessToken: configLoader.getLogViewerToken()
}));

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        emailConfigured: isEmailConfigured()
    });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tracking', require('./routes/tracking'));

const webDistPath = path.join(__dirname, 'dist');
logger.info('Checking Frontend Path: ' + webDistPath);
if (fs.existsSync(webDistPath)) {
    logger.info('Frontend directory exists at: ' + webDistPath);
    try {
        const files = fs.readdirSync(webDistPath);
        logger.info('Frontend files: ' + files.join(', '));
    } catch (e) {
        logger.error('Error listing frontend files: ' + e.message);
    }
} else {
    logger.error('Frontend directory NOT found at: ' + webDistPath);
    const webPath = path.join(__dirname, 'web');
    if (fs.existsSync(webPath)) {
        logger.info('Web directory exists. Contents: ' + fs.readdirSync(webPath).join(', '));
    } else {
        logger.error('Web directory NOT found at: ' + webPath);
        logger.info('Root contents: ' + fs.readdirSync(__dirname).join(', '));
    }
}

app.use('/', express.static(webDistPath, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

app.use(ipGuard);

app.get('/api/docs', (req, res) => {
    try {
        delete require.cache[require.resolve('./docs/api.js')];
        const doc = require('./docs/api.js');
        res.json(doc);
    } catch (error) {
        res.status(500).json({ error: 'Documentation file not found' });
    }
});

app.use('/api', apiKeyAuth, require('./apis/tiktok'));

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ status: false, message: "Endpoint Not Found" });
    }

    const indexPath = path.join(__dirname, 'dist/index.html');
    if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.sendFile(indexPath);
    }

    return res.status(404).send('Frontend Not Found');
});

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.set('io', io);

io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next();
    }

    try {
        const payload = verifyAuthToken(token);
        const user = await User.findById(payload.sub);
        if (user && user.tokenVersion === payload.tokenVersion && !user.banned) {
            socket.authUser = user;
        }
    } catch (error) {
    }

    return next();
});

let si;
const loadSi = async () => {
    try {
        si = require('systeminformation');
    } catch (e) {
        console.error('[Server] systeminformation not available:', e.message);
    }
};
loadSi();

io.on('connection', (socket) => {
    logger.info('Client Connected: ' + socket.id);

    socket.on('join_room', (room) => {
        if (!socket.authUser || !room || socket.authUser.apikey !== room) {
            socket.emit('room_error', { room });
            return;
        }

        socket.join(`apikey:${room}`);
        logger.info(`Socket ${socket.id} joined room apikey:${room}`);
    });

    socket.on('subscribe_admin_traffic', () => {
        if (!socket.authUser || socket.authUser.role !== 'admin') {
            socket.emit('admin_traffic_error');
            return;
        }

        socket.join('admin:traffic');
        logger.info(`Socket ${socket.id} subscribed to admin:traffic`);
    });

    socket.emit('config', settingsManager.get());
});

const STATS_INTERVAL = configLoader.getStatsInterval();

setInterval(async () => {
    if (!si) return;
    try {
        const load = await si.currentLoad();
        const mem = await si.mem();
        const uptime = si.time().uptime;

        const stats = {
            cpu: load.currentLoad.toFixed(2),
            ram: {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + " GB",
                used: (mem.active / 1024 / 1024 / 1024).toFixed(2) + " GB",
                percent: ((mem.active / mem.total) * 100).toFixed(2)
            },
            uptime
        };

        io.emit('stats', stats);
    } catch (e) {
    }
}, STATS_INTERVAL);

const PORT = configLoader.getServerPort();
server.listen(PORT, () => {
    logger.system(`Server running on port ${PORT}`);
    logger.system(`Health check: http://localhost:${PORT}/health`);
});

app.use((err, req, res, next) => {
    logger.error("Unhandled Server Error: " + err.message);
    if (!res.headersSent) {
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});

module.exports = app;
