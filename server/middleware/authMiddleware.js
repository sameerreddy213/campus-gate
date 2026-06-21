const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('./errorMiddleware');
const User = require('../models/User');
const { logSecurityEvent } = require('../utils/security');

// The only actions allowed while an account is pending a forced password change:
// view your own profile and change the password. Matched against originalUrl so
// it covers both the /api-prefixed and unprefixed route mounts.
const isPasswordChangeFlow = (req) => {
    const url = req.originalUrl || '';
    if (req.method === 'PUT' && /\/auth\/updatepassword$/.test(url)) return true;
    if (req.method === 'GET' && /\/auth\/me$/.test(url)) return true;
    return false;
};

// Protect routes
exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        logSecurityEvent(req, 'unauthorized', { details: { reason: 'missing_token' } });
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            logSecurityEvent(req, 'unauthorized', { details: { reason: 'user_not_found' } });
            return next(new ErrorResponse('User not found', 404));
        }

        // Reject tokens issued before the user's last credential change.
        if ((decoded.tv || 0) !== (req.user.tokenVersion || 0)) {
            logSecurityEvent(req, 'unauthorized', { details: { reason: 'stale_token' } });
            return next(new ErrorResponse('Session expired, please log in again', 401));
        }

        // Accounts on a system-generated temporary password must rotate it before
        // doing anything else. Allow only: view own profile + change password.
        if (req.user.mustChangePassword && !isPasswordChangeFlow(req)) {
            return next(new ErrorResponse('Password change required before continuing', 403));
        }

        next();
    } catch (err) {
        // Invalid/expired/tampered token — a common probing signal.
        logSecurityEvent(req, 'unauthorized', { details: { reason: 'invalid_token' } });
        return next(new ErrorResponse('Not authorized to access this route', 401));
    }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            // Authenticated but reaching for a route above their role — worth flagging.
            logSecurityEvent(req, 'forbidden', {
                identifier: req.user.email,
                details: { role: req.user.role, required: roles }
            });
            return next(
                new ErrorResponse(
                    `User role ${req.user.role} is not authorized to access this route`,
                    403
                )
            );
        }
        next();
    };
};
