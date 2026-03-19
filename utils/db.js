const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async (uri) => {
    if (!uri) {
        logger.error('MongoDB URI not provided');
        return false;
    }
    
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000
        });
        logger.system('MongoDB Connected Successfully');
        return true;
    } catch (err) {
        logger.error('MongoDB Connection Failed: ' + err.message);
        return false;
    }
};

module.exports = connectDB;
