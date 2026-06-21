const { ErrorResponse } = require('./errorMiddleware');
const College = require('../models/College');
const asyncHandler = require('../utils/asyncHandler');

// Enforce tenant isolation (and suspended-college lockout).
exports.tenant = asyncHandler(async (req, res, next) => {
    // Skip for dev-admin
    if (req.user.role === 'dev-admin') {
        return next();
    }

    if (!req.user.collegeId) {
        return next(new ErrorResponse('User not associated with any college', 400));
    }

    // Block all access for a suspended college, even with an otherwise-valid token.
    const college = await College.findById(req.user.collegeId).select('status');
    if (college && college.status === 'suspended') {
        return next(new ErrorResponse('Your college account is suspended. Contact the administrator.', 403));
    }

    // Attach collegeId to request object for easy access in controllers
    // This effectively scopes the request to the tenant
    req.collegeId = req.user.collegeId;
    next();
});
