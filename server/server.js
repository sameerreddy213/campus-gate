const app = require('./app');
const connectDB = require('./config/db');
const { startScheduler } = require('./utils/scheduler');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Fail fast on missing critical secrets rather than silently signing/verifying
// JWTs with an empty key.
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
}

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;


const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start background maintenance (expiry + overstay sweeps).
    startScheduler();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
