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
const { trafficLogger } = require('./middleware/trafficLogger');

const settingsPath = path.join(__dirname, 'settings.json');
let settings = {};
try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch (e) {
    logger.error('Failed to load settings.json: ' + e.message);
    process.exit(1);
}

const app = express();
const server = http.createServer(app);

app.enable("trust proxy");
app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
        if (data && typeof data === 'object') {
            const responseData = {
                status: data.status !== undefined ? data.status : true,
                creator: settings.apiSettings.operator || "Easir Iqbal Mahi",
                ...data
            };
            return originalJson.call(this, responseData);
        }
        return originalJson.call(this, data);
    };
    next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

app.use('/', express.static(path.join(__dirname, 'web/dist'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

app.use(ipGuard);
app.use(trafficLogger);

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

    const indexPath = path.join(__dirname, 'web/dist/index.html');
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

    socket.emit('config', settings);
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.system(`Server running on port ${PORT}`);
});

module.exports = app;
