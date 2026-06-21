const OutingRequest = require('../models/OutingRequest');
const Student = require('../models/Student');
const { createNotification, notifyParent } = require('./notificationController');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');
const { logAudit } = require('../utils/audit');
const { expireStaleRequests } = require('../utils/expiry');

// @desc    Get Warden Dashboard Stats
// @route   GET /api/warden/dashboard
// @access  Private (Warden)
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
    await expireStaleRequests(req.collegeId);

    const pendingRequests = await OutingRequest.countDocuments({
        wardenId: req.user.id,
        status: 'pending-warden'
    });

    const studentsOut = await OutingRequest.countDocuments({
        wardenId: req.user.id,
        status: 'out'
    });

    // Students assigned to this warden
    const assignedStudents = await Student.countDocuments({ wardenId: req.user.id });

    // Recent requests
    const recentRequests = await OutingRequest.find({ wardenId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        });

    const flattenedRecent = recentRequests.map(r => {
        const reqObj = r.toObject();
        reqObj.studentName = r.studentId?.userId?.name || 'Unknown';
        reqObj.studentRoll = r.studentId?.rollNumber || 'Unknown';
        return reqObj;
    });

    res.status(200).json({
        success: true,
        data: {
            assignedStudents,
            pendingRequests,
            studentsOut,
            recentRequests: flattenedRecent
        }
    });
});

// @desc    Get Assigned Students
// @route   GET /api/warden/students
// @access  Private (Warden)
exports.getAssignedStudents = asyncHandler(async (req, res, next) => {
    const students = await Student.find({ wardenId: req.user.id })
        .populate('userId', 'name email phone');

    const flattenedStudents = students.map(s => {
        const sObj = s.toObject();
        sObj.name = s.userId?.name || 'Unknown';
        sObj.email = s.userId?.email || '';
        sObj.phone = s.userId?.phone || '';
        return sObj;
    });

    res.status(200).json({
        success: true,
        data: flattenedStudents
    });
});

// @desc    Get Warden Requests
// @route   GET /api/warden/requests
// @access  Private (Warden)
exports.getRequests = asyncHandler(async (req, res, next) => {
    // Filter by status if provided
    const { status, type } = req.query;
    let query = {
        wardenId: req.user.id,
        collegeId: req.collegeId // Strict tenant isolation
    };

    if (type === 'pending') {
        // Parent approval transitions straight to 'pending-warden', so that is the
        // only state a warden ever sees as pending.
        query.status = 'pending-warden';
    } else if (status) {
        query.status = status;
    }

    const requests = await OutingRequest.find(query)
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ createdAt: -1 });

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

// @desc    Approve/Reject Request
// @route   PUT /api/warden/requests/:id
// @access  Private (Warden)
exports.updateRequestStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body; // approved, rejected

    if (!['approved', 'rejected'].includes(status)) {
        return next(new ErrorResponse('Invalid status', 400));
    }

    const request = await OutingRequest.findById(req.params.id);

    if (!request) {
        return next(new ErrorResponse('Request not found', 404));
    }

    // Check ownership/assignment
    if (request.wardenId.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to update this request', 403));
    }

    // Verify current status
    // Allow changing 'pending-warden' or 'approved' (if not yet out)
    if (request.status !== 'pending-warden' && request.status !== 'approved') {
        return next(new ErrorResponse(`Cannot update request in ${request.status} state`, 400));
    }

    // If revoking (approved -> rejected), ensure student hasn't left
    if (request.status === 'approved' && status === 'rejected') {
        // Double check student status via OutingRequest (already checked by status !== 'out')
        // But also check if outAt is set? No, status 'out' manages that.
        // So we are good.
    }

    request.status = status;
    request.wardenDecisionAt = Date.now();
    await request.save();

    await logAudit(req, `request.${status}`, { requestId: request._id, studentId: request.studentId });

    // Notify Student
    if (status === 'approved' || status === 'rejected') {
        const student = await Student.findById(request.studentId);
        if (student) {
            await createNotification(
                student.userId,
                `Your outing request has been ${status} by the warden`,
                status === 'approved' ? 'success' : 'error',
                request._id
            );
        }
    }

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Mark Student Out
// @route   PUT /api/warden/requests/:id/out
// @access  Private (Warden)
exports.markStudentOut = asyncHandler(async (req, res, next) => {
    const request = await OutingRequest.findById(req.params.id);

    if (!request) {
        return next(new ErrorResponse('Request not found', 404));
    }

    if (request.wardenId.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    if (request.status !== 'approved') {
        return next(new ErrorResponse('Request must be approved before marking out', 400));
    }

    // Check College Config
    const college = await require('../models/College').findById(req.user.collegeId);
    if (college?.config?.enableGateSecurity) {
        return next(new ErrorResponse('Gate Security is enabled. Only Watchman can mark students out.', 403));
    }

    request.status = 'out';
    request.outAt = Date.now();
    await request.save();

    await logAudit(req, 'request.out', { requestId: request._id, by: 'warden' });

    // Notify Student & Parent
    const student = await Student.findById(request.studentId).populate('userId', 'name');
    if (student) {
        await createNotification(student.userId._id, "You have been marked OUT by Warden", "warning", request._id);
        await notifyParent(student, `${student.userId.name} is now OUT of campus`, "warning", request._id);
    }

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Mark Student Returned
// @route   PUT /api/warden/requests/:id/returned
// @access  Private (Warden)
exports.markStudentReturned = asyncHandler(async (req, res, next) => {
    const request = await OutingRequest.findById(req.params.id);

    if (!request) {
        return next(new ErrorResponse('Request not found', 404));
    }

    if (request.wardenId.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    if (request.status !== 'out') {
        return next(new ErrorResponse('Student must be out before marking returned', 400));
    }

    // Check College Config
    const college = await require('../models/College').findById(req.user.collegeId);
    if (college?.config?.enableGateSecurity) {
        return next(new ErrorResponse('Gate Security is enabled. Only Watchman can mark students returned.', 403));
    }

    request.status = 'returned';
    request.returnedAt = Date.now();
    await request.save();

    await logAudit(req, 'request.returned', { requestId: request._id, by: 'warden' });

    // Notify Student & Parent
    const student = await Student.findById(request.studentId).populate('userId', 'name');
    if (student) {
        await createNotification(student.userId._id, "You have been marked RETURNED by Warden", "success", request._id);
        await notifyParent(student, `${student.userId.name} has RETURNED to campus`, "success", request._id);
    }

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Get History
exports.getHistory = asyncHandler(async (req, res, next) => {
    // Just reuse getRequests with status filter or separate logic
    // Let's filter for completed statuses
    const requests = await OutingRequest.find({
        wardenId: req.user.id,
        collegeId: req.collegeId, // Strict tenant isolation
        status: { $in: ['approved', 'out', 'returned', 'rejected', 'expired'] }
    })
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ updatedAt: -1 });

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

// @desc    Get Warden Settings
// @route   GET /api/warden/settings
// @access  Private (Warden)
exports.getSettings = asyncHandler(async (req, res, next) => {
    const college = await require('../models/College').findById(req.user.collegeId);

    res.status(200).json({
        success: true,
        data: college?.config || {}
    });
});
