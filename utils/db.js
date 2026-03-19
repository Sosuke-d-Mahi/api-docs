const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async (uri) => {
    if (!uri) {
        logger.error('MongoDB URI not provided');
        return false;
    }
    
    try {
        const dns = require('dns');
        if (dns.setServers) {
            try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
        }
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 20000,
            family: 4
        });
        logger.system('MongoDB Connected Successfully');
        return true;
    } catch (err) {
        logger.error('MongoDB Connection Failed: ' + err.message);
        return false;
    }
};

module.exports = connectDB;
