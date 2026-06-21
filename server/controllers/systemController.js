const mongoose = require('mongoose');

// @desc    Health Check
// @route   GET /api/system/health
// @access  Public
// Reports the real database connection state (readyState 1 === connected) so an
// orchestrator/uptime probe can detect a DB outage instead of always seeing 200.
exports.healthCheck = (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
        success: dbConnected,
        message: dbConnected ? 'System is healthy' : 'Database unavailable',
        db: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
};
