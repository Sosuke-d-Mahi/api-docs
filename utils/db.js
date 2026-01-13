const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async (uri) => {
    try {
        await mongoose.connect(uri);
        logger.system('MongoDB Connected Successfully');
        return true;
    } catch (err) {
        logger.error('MongoDB Connection Failed: ' + err.message);
        return false;
    }
};

module.exports = connectDB;
