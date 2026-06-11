const Student = require('../models/Student');
const OutingRequest = require('../models/OutingRequest');
const { createNotification, notifyParent } = require('./notificationController');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// Helper to get student profile from user ID
const getStudentProfile = async (userId) => {
    return await Student.findOne({ userId });
};

// @desc    Get Student Dashboard
// @route   GET /api/student/dashboard
// @access  Private (Student)
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
    const student = await getStudentProfile(req.user.id);
    if (!student) return next(new ErrorResponse('Student profile not found', 404));

    const activeRequest = await OutingRequest.findOne({
        studentId: student._id,
        status: { $nin: ['returned', 'rejected', 'parent-declined', 'expired'] }
    });

    const requestHistory = await OutingRequest.find({ studentId: student._id })
        .sort({ createdAt: -1 })
        .limit(5);

    res.status(200).json({
        success: true,
        data: {
            activeRequest,
            recentActivity: requestHistory
        }
    });
});

// @desc    Raise Outing Request
// @route   POST /api/student/requests
// @access  Private (Student)
exports.raiseRequest = asyncHandler(async (req, res, next) => {
    const { purpose, destination, outDate } = req.body;

    // Validate dates
    const out = new Date(outDate);
    const now = new Date();

    if (out < now) {
        return next(new ErrorResponse('Out date cannot be in the past', 400));
    }

    const student = await getStudentProfile(req.user.id);
    if (!student) return next(new ErrorResponse('Student profile not found', 404));

    if (!student.wardenId) {
        return next(new ErrorResponse('No warden assigned. Contact admin.', 400));
    }

    // Check for existing active request
    const existingRequest = await OutingRequest.findOne({
        studentId: student._id,
        status: { $nin: ['returned', 'rejected', 'parent-declined', 'expired'] }
    });

    if (existingRequest) {
        return next(new ErrorResponse('You already have an active request', 400));
    }

    // Conditional Approval Logic
    let initialStatus = 'pending-parent';
    if (['Mess', 'Exam'].includes(purpose)) {
        initialStatus = 'pending-warden';
    }

    const request = await OutingRequest.create({
        studentId: student._id,
        collegeId: req.user.collegeId,
        wardenId: student.wardenId,
        purpose,
        destination,
        outDate,
        status: initialStatus
    });

    // Notify Parent
    await notifyParent(
        student,
        `New outing request from ${req.user.name}: ${purpose}`,
        'info',
        request._id
    );

    // Notify Warden if Auto-Forwarded (e.g. Mess/Exam)
    if (initialStatus === 'pending-warden' && student.wardenId) {
        await createNotification(
            student.wardenId,
            `New request from ${req.user.name} (Auto-Approved by Parent rule)`,
            'info',
            request._id
        );
    }

    res.status(201).json({
        success: true,
        data: request
    });
});

// @desc    Cancel Request
// @route   PUT /api/student/requests/:id/cancel
// @access  Private (Student)
exports.cancelRequest = asyncHandler(async (req, res, next) => {
    const student = await getStudentProfile(req.user.id);
    if (!student) return next(new ErrorResponse('Student profile not found', 404));

    const request = await OutingRequest.findOne({
        _id: req.params.id,
        studentId: student._id
    });

    if (!request) {
        return next(new ErrorResponse('Request not found', 404));
    }

    // Check if cancellable
    if (['out', 'returned', 'rejected', 'parent-declined', 'expired', 'cancelled'].includes(request.status)) {
        return next(new ErrorResponse(`Cannot cancel request with status: ${request.status}`, 400));
    }

    // Store previous status to know who to notify
    const previousStatus = request.status;

    request.status = 'cancelled';
    await request.save();

    // Notify Parent
    await notifyParent(
        student,
        `${req.user.name} has CANCELLED their outing request to ${request.destination}`,
        'info',
        request._id
    );

    // Notify Warden if they had already approved it or if it was pending them
    if (['approved', 'pending-warden'].includes(previousStatus) && student.wardenId) {
        await createNotification(
            student.wardenId,
            `${req.user.name} has CANCELLED their outing request`,
            'info',
            request._id
        );
    }

    res.status(200).json({
        success: true,
        data: request,
        message: "Request cancelled successfully"
    });
});

// @desc    Get My Requests
// @route   GET /api/student/requests
// @access  Private (Student)
exports.getMyRequests = asyncHandler(async (req, res, next) => {
    const student = await getStudentProfile(req.user.id);
    if (!student) return next(new ErrorResponse('Student profile not found', 404));

    const requests = await OutingRequest.find({ studentId: student._id })
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: requests
    });
});

// @desc    Get History
// @route   GET /api/student/history
// @access  Private (Student)
exports.getHistory = asyncHandler(async (req, res, next) => {
    const student = await getStudentProfile(req.user.id);
    if (!student) return next(new ErrorResponse('Student profile not found', 404));

    const requests = await OutingRequest.find({
        studentId: student._id,
        status: { $in: ['returned', 'rejected', 'parent-declined', 'expired', 'cancelled'] }
    }).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        data: requests
    });
});
