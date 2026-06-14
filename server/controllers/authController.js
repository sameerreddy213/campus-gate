const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // Assuming jwt is installed
const User = require('../models/User');
const OtpLog = require('../models/OtpLog');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');
const { logAudit } = require('../utils/audit');

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
    const token = jwt.sign(
        { id: user._id, role: user.role, collegeId: user.collegeId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    const options = {
        expires: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
        ),
        httpOnly: true
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
        return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return next(new ErrorResponse('Invalid credentials', 401));
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

    // NOTE: No email/SMS provider is configured. In production you would email
    // the link below to the user. In development we return/log it for testing.
    const resetUrl = `${req.headers.origin || ''}/reset-password/${resetToken}`;
    console.log(`Password reset link for ${email}: ${resetUrl}`);

    await logAudit(req, 'auth.forgot_password', { userId: user._id });

    const payload = { ...genericResponse };
    if (process.env.NODE_ENV !== 'production') {
        payload.resetToken = resetToken; // dev convenience only
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

    // Generate 6 digit OTP (cryptographically secure)
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Save OTP to DB
    await OtpLog.create({
        phone,
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // In production, send SMS here
    if (process.env.NODE_ENV !== 'production') {
        console.log(`DEV MODE: OTP for ${phone} is ${otp}`);
    }

    res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        // In dev mode, return OTP in response for testing
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

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(currentPassword))) {
        return next(new ErrorResponse('Invalid current password', 401));
    }

    user.password = newPassword;
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
