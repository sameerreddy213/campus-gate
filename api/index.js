const app = require('../server/app');
const connectDB = require('../server/config/db');

// Env vars come from the Vercel dashboard in deployment
// (server/app.js already calls dotenv.config() for local use)

// Connect to database (mongoose buffers queries until connected)
connectDB();

module.exports = app;
