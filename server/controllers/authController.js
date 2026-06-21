const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // Assuming jwt is installed
const User = require('../models/User');
const OtpLog = require('../models/OtpLog');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');
const { logAudit } = require('../utils/audit');
const { logSecurityEvent } = require('../utils/security');
const { sendMail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');

// Helper to get full user profile with role-specific data
const getUserProfile = async (user) => {
    let profileData = {};

    // 1. Fetch Role Specific Data
    if (user.role === 'student') {
        const student = await Student.findOne({ userId: user._id })
            .populate('wardenId', 'name email phone');
        if (student) profileData = { ...student.toObject() };
    } else if (user.role === 'warden') {
        const assignedCount = await Student.countDocuments({ wardenId: user._id });
        profileData = { assignedStudents: assignedCount };
    } else if (user.role === 'college-admin') {
        // College admin might want full college object, but we handle college below for everyone
    } else if (user.role === 'parent') {
        // Fetch the student associated with this parent (by phone)
        const student = await Student.findOne({ parentPhone: user.phone })
            .populate('userId', 'name email')
            .populate('wardenId', 'name email phone');
        if (student) {
            profileData = { student: student.toObject() };
        }
    }

    // 2. Fetch Common College Details (Name, Code, City) for ALL users properly linked to a college
    if (user.collegeId) {
        const College = require('../models/College');
        const college = await College.findById(user.collegeId).select('name code city address');
        if (college) {
            profileData.college = college;
        }
    }

    return profileData;
};

// Generate JWT Token
const sendTokenResponse = async (user, statusCode, res) => {
    // Default to a 7-day session (was 30d). Shorter-lived tokens bound the damage
    // of a stolen token; immediate revocation is still available via tokenVersion.
    // Tune with JWT_EXPIRE (jwt lib format, e.g. '12h', '7d').
    const jwtExpire = process.env.JWT_EXPIRE || '7d';
    const cookieDays = Number(process.env.JWT_COOKIE_DAYS) || 7;
    const token = jwt.sign(
        { id: user._id, role: user.role, collegeId: user.collegeId, tv: user.tokenVersion || 0 },
        process.env.JWT_SECRET,
        { expiresIn: jwtExpire }
    );

    const options = {
        expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
        httpOnly: true,
        // Mitigate CSRF on the cookie-borne token; the SPA uses the Bearer header.
        sameSite: 'lax'
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    // Fetch profile data to include in login response
    const profile = await getUserProfile(user);

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                collegeId: user.collegeId,
                createdAt: user.createdAt,
                mustChangePassword: !!user.mustChangePassword,
                profile: profile
            }
        });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
        return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        // Log the failed attempt for threat monitoring (no account enumeration:
        // the client still gets the same generic 'Invalid credentials').
        logSecurityEvent(req, 'login_failed', { identifier: email, details: { reason: 'no_such_user' } });
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        logSecurityEvent(req, 'login_failed', { identifier: email, details: { reason: 'bad_password' } });
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Block users whose college has been suspended by a dev-admin. Dev-admins
    // have no collegeId and are never blocked here.
    if (user.collegeId) {
        const College = require('../models/College');
        const college = await College.findById(user.collegeId).select('status');
        if (college && college.status === 'suspended') {
            logSecurityEvent(req, 'forbidden', { identifier: email, details: { reason: 'college_suspended' } });
            return next(new ErrorResponse('Your college account is suspended. Contact the administrator.', 403));
        }
    }

    await logAudit(req, 'auth.login', { userId: user._id, role: user.role });
    await sendTokenResponse(user, 200, res);
});

// @desc    Forgot password - issue a reset token
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new ErrorResponse('Please provide an email', 400));
    }

    const user = await User.findOne({ email });

    // Always respond the same way to avoid leaking which emails are registered.
    const genericResponse = {
        success: true,
        message: 'If an account with that email exists, a password reset link has been generated.'
    };

    if (!user) {
        return res.status(200).json(genericResponse);
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Email the reset link. With SMTP configured (see utils/mailer.js) a real
    // email is sent; otherwise the mailer logs to the console for local testing.
    //
    // SECURITY: the link base MUST come from a server-trusted value, never from a
    // request header. `Origin`/`Host` are attacker-controlled, so deriving the URL
    // from them lets an attacker trigger a real reset email pointing at their own
    // domain (reset-token exfiltration). PUBLIC_APP_URL is the canonical SPA origin;
    // in local dev it falls back to the Vite dev server.
    const appBase = (process.env.PUBLIC_APP_URL
        || (process.env.NODE_ENV !== 'production' ? 'http://localhost:8080' : ''))
        .replace(/\/+$/, '');
    const resetUrl = `${appBase}/reset-password/${resetToken}`;
    await sendMail({
        to: user.email,
        subject: 'CampusGate password reset',
        text: `You requested a password reset.\n\nReset your password using this link (valid for 30 minutes):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a> (valid for 30 minutes).</p><p>If you did not request this, you can safely ignore this email.</p>`
    });

    await logAudit(req, 'auth.forgot_password', { userId: user._id });

    const payload = { ...genericResponse };
    // Fail-closed: only expose the token when explicitly opted in (local testing).
    // Never gate a secret on the mere ABSENCE of NODE_ENV.
    if (process.env.EXPOSE_RESET_TOKEN === 'true') {
        payload.resetToken = resetToken;
    }
    res.status(200).json(payload);
});

// @desc    Reset password using a token
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    const { password } = req.body;

    if (!password || password.length < 6) {
        return next(new ErrorResponse('Password must be at least 6 characters', 400));
    }

    // Hash the incoming token to match the stored hash
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
        return next(new ErrorResponse('Invalid or expired token', 400));
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    // Invalidate any tokens issued before this password change.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await logAudit(req, 'auth.reset_password', { userId: user._id });

    await sendTokenResponse(user, 200, res);
});


// @desc    Send OTP to parent
// @route   POST /api/auth/parent/send-otp
// @access  Public
exports.sendOtp = asyncHandler(async (req, res, next) => {
    const { phone } = req.body;

    if (!phone) {
        return next(new ErrorResponse('Please provide a phone number', 400));
    }

    // Check if any student has this parent phone
    const student = await Student.findOne({ parentPhone: phone });
    if (!student) {
        return next(new ErrorResponse('Phone number not registered with any student', 404));
    }

    // Per-phone abuse controls (the IP rate-limiter alone can't stop SMS-bombing or
    // Twilio cost amplification when an attacker rotates source IPs):
    //   - cooldown: at most one OTP per phone per 60s
    //   - hourly cap: at most 5 OTPs per phone per rolling hour
    const now = Date.now();
    const recent = await OtpLog.find({ phone, createdAt: { $gte: new Date(now - 60 * 60 * 1000) } })
        .sort({ createdAt: -1 });
    if (recent[0] && (now - recent[0].createdAt.getTime()) < 60 * 1000) {
        logSecurityEvent(req, 'otp_failed', { identifier: phone, details: { reason: 'cooldown' } });
        return next(new ErrorResponse('Please wait a minute before requesting another OTP', 429));
    }
    if (recent.length >= 5) {
        logSecurityEvent(req, 'rate_limited', { identifier: phone, details: { reason: 'otp_hourly_cap' } });
        return next(new ErrorResponse('Too many OTP requests. Try again later.', 429));
    }

    // Generate 6 digit OTP (cryptographically secure)
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Invalidate any prior unverified OTPs for this phone so only the newest code
    // is ever acceptable (shrinks the brute-force surface — P-1).
    await OtpLog.updateMany({ phone, verified: false }, { verified: true });

    // Save OTP to DB
    await OtpLog.create({
        phone,
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Deliver the OTP. With Twilio configured (see utils/sms.js) a real SMS is
    // sent; otherwise the sms util logs it to the console for local testing.
    await sendSms({ to: phone, body: `Your CampusGate login OTP is ${otp}. It expires in 5 minutes.` });

    res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        // In dev mode (no SMS provider), return the OTP so testing works locally.
        devOtp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
});

// @desc    Verify OTP and Login Parent
// @route   POST /api/auth/parent/verify-otp
// @access  Public
exports.verifyOtp = asyncHandler(async (req, res, next) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return next(new ErrorResponse('Please provide phone and OTP', 400));
    }

    // Verify OTP against the latest unverified, unexpired record for this phone
    const otpRecord = await OtpLog.findOne({
        phone,
        verified: false,
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.otp !== otp) {
        logSecurityEvent(req, 'otp_failed', { identifier: phone });
        return next(new ErrorResponse('Invalid or expired OTP', 401));
    }

    // Mark OTP as used so it cannot be replayed
    otpRecord.verified = true;
    await otpRecord.save();

    // Check if a User with role 'parent' and this phone exists.
    let user = await User.findOne({ phone, role: 'parent' });

    if (!user) {
        // Fetch student to get parent details
        const student = await Student.findOne({ parentPhone: phone });
        if (!student) {
            return next(new ErrorResponse('No student linked to this phone', 404));
        }

        // Create new parent user
        const email = student.parentEmail || `parent.${phone}@campusgate.com`;

        // Double check email uniqueness just in case
        const emailExists = await User.findOne({ email });
        const finalEmail = emailExists ? `parent.${phone}.${Date.now()}@campusgate.com` : email;

        user = await User.create({
            name: student.parentName,
            email: finalEmail,
            phone: phone,
            role: 'parent',
            password: crypto.randomBytes(16).toString('hex'), // Random password
            collegeId: student.collegeId
        });
    }

    await sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    const profileData = await getUserProfile(user);

    res.status(200).json({
        success: true,
        data: { ...user.toObject(), profile: profileData }
    });
});

// @desc    Update Password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return next(new ErrorResponse('New password must be at least 6 characters', 400));
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(currentPassword))) {
        return next(new ErrorResponse('Invalid current password', 401));
    }

    user.password = newPassword;
    // Clear the forced-rotation flag now that a user-chosen password is set.
    user.mustChangePassword = false;
    // Invalidate previously-issued tokens; the fresh token below carries the new tv.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await sendTokenResponse(user, 200, res);
});

// @desc    Update User Details (Name, Phone)
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
    const { name, phone } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    res.status(200).json({
        success: true,
        data: user
    });
});
