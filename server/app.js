const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');
const { logSecurityEvent } = require('./utils/security');

// Load env vars
dotenv.config();

// Connect to database
// connectDB(); // Called in server.js

const path = require('path');
const fs = require('fs');

const app = express();

// Running behind a reverse proxy (Azure/Vercel) — needed for correct req.ip / rate limiting
app.set('trust proxy', 1);

// Serve the built frontend assets FIRST — before CORS and rate-limiting — because:
//   (a) static assets (hashed filenames) are immutable public files that need no auth or CORS, and
//   (b) Vite adds `crossorigin` to <script>/<link> tags, causing the browser to send an Origin
//       header even for same-origin asset requests, which the CORS allowlist below would reject.
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist, {
        maxAge: '1y',    // hashed filenames are safe to cache aggressively
        immutable: true, // tells CDNs/browsers the file will never change at this URL
    }));
}

// Security Middleware
app.use(helmet());

// CORS: lock down to an explicit allowlist instead of reflecting every origin.
// The SPA is normally served from this same origin (see client/dist below), so
// same-origin requests (which carry no Origin header) are always allowed. Extra
// cross-origin clients can be permitted via the CORS_ORIGINS env var (comma list).
// In non-production we stay permissive to keep local tooling frictionless.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
app.use(cors({
    origin(origin, callback) {
        // No Origin header => same-origin / curl / mobile app => allow.
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Prevent NoSQL injection. onSanitize fires when an operator key ($, .) is
// stripped from the payload — a strong signal someone is probing the API.
app.use(require('express-mongo-sanitize')({
    onSanitize: ({ req, key }) => {
        // Log once per request even if several keys are stripped.
        if (req && !req._injectionLogged) {
            req._injectionLogged = true;
            logSecurityEvent(req, 'injection_blocked', { details: { key } });
        }
    }
}));
app.use(require('xss-clean')()); // Prevent XSS attacks
app.use(require('hpp')()); // Prevent HTTP Parameter Pollution
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Shared handler: record the block as a security event, then send 429.
const rateLimitHandler = (req, res, next, options) => {
    logSecurityEvent(req, 'rate_limited', {
        details: { limit: options.limit ?? options.max, windowMs: options.windowMs }
    });
    res.status(options.statusCode).json(
        typeof options.message === 'object'
            ? options.message
            : { success: false, message: options.message }
    );
};

// Rate Limiting (global, so it also covers the unprefixed route mounts below)
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // limit each IP to 300 requests per windowMs
    message: { success: false, message: 'Too many requests, please slow down' },
    handler: rateLimitHandler
});
app.use(limiter);

// Stricter limit for authentication endpoints (login / OTP brute-force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    message: { success: false, message: 'Too many attempts, please try again later' },
    handler: rateLimitHandler
});
app.use(['/api/auth', '/auth'], authLimiter);

// Routes
// Routes
const auth = require('./routes/auth');
const devAdmin = require('./routes/devAdmin');
const collegeAdmin = require('./routes/collegeAdmin');
const warden = require('./routes/warden');
const student = require('./routes/student');
const parent = require('./routes/parent');
const watchman = require('./routes/watchman');
const notification = require('./routes/notificationRoutes');
const system = require('./routes/system');

// Mount routes with /api prefix (for standard express/local)
app.use('/api/auth', auth);
app.use('/api/dev-admin', devAdmin);
app.use('/api/college-admin', collegeAdmin);
app.use('/api/warden', warden);
app.use('/api/student', student);
app.use('/api/parent', parent);
app.use('/api/watchman', watchman);
app.use('/api/notifications', notification);
app.use('/api/system', system);

// Mount routes WITHOUT /api prefix (for Vercel if prefix is stripped)
app.use('/auth', auth);
app.use('/dev-admin', devAdmin);
app.use('/college-admin', collegeAdmin);
app.use('/warden', warden);
app.use('/student', student);
app.use('/parent', parent);
app.use('/watchman', watchman);
app.use('/notifications', notification);
app.use('/system', system);

// Basic route
// Basic route removed to allow frontend serving
// app.get('/', (req, res) => {
//     res.json({ message: 'CampusGate API is running' });
// });

// Handle /api root request explicitly for health check
app.get('/api', (req, res) => {
    res.json({ message: 'CampusGate API is running at /api' });
});

// SPA fallback: for any non-API GET that express.static didn't satisfy (deep links,
// client-side routes), serve index.html so the React router can handle it.
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.get('*', (req, res, next) => {
        if (req.url.startsWith('/api')) return next();
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

// Catch 404 and forward to error handler
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
});

// Error Handler
app.use(errorHandler);

module.exports = app;
