// @desc    Health Check
// @route   GET /api/system/health
// @access  Public
exports.healthCheck = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'System is healthy',
        timestamp: new Date().toISOString()
    });
};
