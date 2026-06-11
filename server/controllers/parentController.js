const OutingRequest = require('../models/OutingRequest');
const Student = require('../models/Student');
const { createNotification } = require('./notificationController');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// Helper to find student(s) linked to parent phone
// req.user has phone
const getLinkedStudents = async (phone) => {
    return await Student.find({ parentPhone: phone });
};

// @desc    Get Parent Dashboard (Pending Requests)
// @route   GET /api/parent/dashboard
// @access  Private (Parent)
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
    const students = await getLinkedStudents(req.user.phone);
    const studentIds = students.map(s => s._id);

    const pendingRequests = await OutingRequest.find({
        studentId: { $in: studentIds },
        status: 'pending-parent'
    })
        .populate('studentId', 'rollNumber userId') // We need name but name is in User model linked by userId
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        });

    const flattenedPending = pendingRequests.map(r => {
        const reqObj = r.toObject();
        reqObj.studentName = r.studentId?.userId?.name || 'Unknown';
        return reqObj;
    });

    res.status(200).json({
        success: true,
        data: {
            pendingRequests: flattenedPending
        }
    });
});

// @desc    Approve/Decline Request
// @route   PUT /api/parent/requests/:id
// @access  Private (Parent)
exports.updateRequestStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body; // 'parent-approved', 'parent-declined'

    if (!['parent-approved', 'parent-declined'].includes(status)) {
        return next(new ErrorResponse('Invalid status', 400));
    }

    const request = await OutingRequest.findById(req.params.id).populate('studentId');

    if (!request) {
        return next(new ErrorResponse('Request not found', 404));
    }

    // Verify parent owns this student
    if (request.studentId.parentPhone !== req.user.phone) {
        return next(new ErrorResponse('Not authorized', 403));
    }

    // Strict Cross-College Check
    if (request.collegeId.toString() !== req.user.collegeId.toString()) {
        return next(new ErrorResponse('Cross-college access denied', 403));
    }

    if (request.status !== 'pending-parent') {
        return next(new ErrorResponse('Request is not pending parent approval', 400));
    }

    request.status = status;
    request.parentDecisionAt = Date.now();

    // If approved by parent, it moves to 'pending-warden'
    if (status === 'parent-approved') {
        request.status = 'pending-warden';
    }

    await request.save();

    // Notify Student
    await createNotification(
        request.studentId.userId,
        `Your request has been ${status === 'parent-approved' ? 'approved' : 'declined'} by your parent`,
        status === 'parent-approved' ? 'success' : 'error',
        request._id
    );

    // Notify Warden if Approved
    if (status === 'parent-approved') {
        const student = await Student.findById(request.studentId._id).populate('userId', 'name');
        if (student && student.wardenId) {
            await createNotification(
                student.wardenId,
                `New pending request from ${student.userId?.name || 'a student'} (Parent Approved)`,
                'info',
                request._id
            );
        }
    }

    res.status(200).json({
        success: true,
        data: request
    });
});

// @desc    Get History
// @route   GET /api/parent/history
// @access  Private (Parent)
exports.getHistory = asyncHandler(async (req, res, next) => {
    const students = await getLinkedStudents(req.user.phone);
    const studentIds = students.map(s => s._id);

    const requests = await OutingRequest.find({
        studentId: { $in: studentIds },
        status: { $ne: 'pending-parent' }
    })
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .sort({ createdAt: -1 });

    const flattenedRequests = requests.map(r => {
        const reqObj = r.toObject();
        reqObj.studentName = r.studentId?.userId?.name || 'Unknown';
        return reqObj;
    });

    res.status(200).json({
        success: true,
        data: flattenedRequests
    });
});
