const mongoose = require('mongoose');

// Connect to MongoDB. On a failed INITIAL connection we exit non-zero so the
// platform (Azure App Service) restarts the instance instead of serving a
// process that 500s every request with no DB. Transient drops AFTER a successful
// connect are handled by the driver's own auto-reconnect (and surfaced via the
// /system/health readyState check), so we don't exit on those.
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`FATAL: initial MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
