const OutingRequest = require('../models/OutingRequest');
const Student = require('../models/Student');
const { createNotification, notifyParent } = require('./notificationController');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// @desc    Get Watchman Dashboard Stats
// @route   GET /api/watchman/dashboard
// @access  Private (Watchman)
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
    // req.collegeId is set by tenantMiddleware

    // Approved requests (Ready to go out)
    const approvedRequests = await OutingRequest.countDocuments({
        collegeId: req.collegeId,
        status: 'approved'
    });

    // Students currently out
    const studentsOut = await OutingRequest.countDocuments({
        collegeId: req.collegeId,
        status: 'out'
    });

    // Returned Today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const returnedToday = await OutingRequest.countDocuments({
        collegeId: req.collegeId,
        status: 'returned',
        returnedAt: { $gte: startOfDay }
    });

    res.status(200).json({
        success: true,
        data: {
            approvedRequests,
            studentsOut,
            returnedToday
        }
    });
});

// @desc    Get Approved Requests (Ready to Out)
// @route   GET /api/watchman/requests/approved
// @access  Private (Watchman)
exports.getApprovedRequests = asyncHandler(async (req, res, next) => {
    const requests = await OutingRequest.find({
        collegeId: req.collegeId,
        status: 'approved'
    })
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ updatedAt: -1 }); // Recently approved first

    const flattenedRequests = requests.map(r => {
        const reqObj = r.toObject();
        reqObj.studentName = r.studentId?.userId?.name || 'Unknown';
        reqObj.studentRoll = r.studentId?.rollNumber || 'Unknown';
        return reqObj;
    });

    res.status(200).json({
        success: true,
        data: flattenedRequests
    });
});

// @desc    Get Out Requests (Ready to Return)
// @route   GET /api/watchman/requests/out
// @access  Private (Watchman)
exports.getOutRequests = asyncHandler(async (req, res, next) => {
    const requests = await OutingRequest.find({
        collegeId: req.collegeId,
        status: 'out'
    })
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ outAt: -1 });

    const flattenedRequests = requests.map(r => {
        const reqObj = r.toObject();
        reqObj.studentName = r.studentId?.userId?.name || 'Unknown';
        reqObj.studentRoll = r.studentId?.rollNumber || 'Unknown';
        return reqObj;
    });

    res.status(200).json({
        success: true,
        data: flattenedRequests
    });
});

// @desc    Mark Student Out
// @route   PUT /api/watchman/requests/:id/out
// @access  Private (Watchman)
exports.markStudentOut = asyncHandler(async (req, res, next) => {
    const request = await OutingRequest.findById(req.params.id);

    if (!request) {
        return next(new ErrorResponse('Request not found', 404));
    }

    if (request.collegeId.toString() !== req.collegeId.toString()) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    if (request.status !== 'approved') {
        return next(new ErrorResponse('Request must be approved before marking out', 400));
    }

    request.status = 'out';
    request.outAt = Date.now();
    await request.save();

    // Notify Student & Parent
    const student = await Student.findById(request.studentId).populate('userId', 'name');
    if (student) {
        await createNotification(student.userId._id, "You have been marked OUT by Watchman", "warning", request._id);
        await notifyParent(student, `${student.userId.name} is now OUT of campus`, "warning", request._id);
    }

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Mark Student Returned
// @route   PUT /api/watchman/requests/:id/returned
// @access  Private (Watchman)
exports.markStudentReturned = asyncHandler(async (req, res, next) => {
    const request = await OutingRequest.findById(req.params.id);

    if (!request) {
        return next(new ErrorResponse('Request not found', 404));
    }

    if (request.collegeId.toString() !== req.collegeId.toString()) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    if (request.status !== 'out') {
        return next(new ErrorResponse('Student must be out before marking returned', 400));
    }

    request.status = 'returned';
    request.returnedAt = Date.now();
    await request.save();

    // Notify Student & Parent
    const student = await Student.findById(request.studentId).populate('userId', 'name');
    if (student) {
        await createNotification(student.userId._id, "You have been marked RETURNED by Watchman", "success", request._id);
        await notifyParent(student, `${student.userId.name} has RETURNED to campus`, "success", request._id);
    }

    res.status(200).json({
        success: true,
        data: request
    });
});
