const { Readable } = require('stream');
const csv = require('csv-parser');
const User = require('../models/User');
const Student = require('../models/Student');
const OutingRequest = require('../models/OutingRequest');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');
const { logAudit } = require('../utils/audit');
const { ensureParentUser } = require('../utils/parents');
const { generateTempPassword } = require('../utils/password');
const { sendMail } = require('../utils/mailer');

// @desc    Get Dashboard Stats
// @route   GET /api/college-admin/dashboard
// @access  Private (College Admin)
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
    // req.collegeId is set by tenantMiddleware
    const students = await Student.countDocuments({ collegeId: req.collegeId });
    const wardens = await User.countDocuments({ collegeId: req.collegeId, role: 'warden' });
    const pendingRequests = await OutingRequest.countDocuments({
        collegeId: req.collegeId,
        status: { $in: ['pending-parent', 'pending-warden'] }
    });

    // Approved Today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const approvedToday = await OutingRequest.countDocuments({
        collegeId: req.collegeId,
        status: 'approved',
        updatedAt: { $gte: startOfDay }
    });

    const recentRequests = await OutingRequest.find({ collegeId: req.collegeId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        });

    // Map recent requests to expected format
    const formattedRequests = recentRequests.map(req => ({
        id: req._id,
        studentName: req.studentId?.userId?.name || 'Unknown',
        purpose: req.purpose,
        status: req.status,
        date: req.createdAt
    }));

    res.status(200).json({
        success: true,
        data: {
            students,
            wardens,
            pendingRequests,
            approvedToday,
            recentRequests: formattedRequests
        }
    });
});

// @desc    Delete Warden
// @route   DELETE /api/college-admin/wardens/:id
// @access  Private (College Admin)
exports.deleteWarden = asyncHandler(async (req, res, next) => {
    const warden = await User.findById(req.params.id);

    if (!warden || warden.role !== 'warden' || warden.collegeId.toString() !== req.collegeId.toString()) {
        return next(new ErrorResponse('Warden not found', 404));
    }

    // Unassign students from this warden
    await Student.updateMany({ wardenId: warden._id }, { $unset: { wardenId: 1 } });

    await warden.deleteOne();

    await logAudit(req, 'warden.delete', { userId: warden._id });

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Delete Student
// @route   DELETE /api/college-admin/students/:id
// @access  Private (College Admin)
exports.deleteStudent = asyncHandler(async (req, res, next) => {
    const student = await Student.findById(req.params.id);

    if (!student || student.collegeId.toString() !== req.collegeId.toString()) {
        return next(new ErrorResponse('Student not found', 404));
    }

    // Delete associated user account
    await User.findByIdAndDelete(student.userId);

    // Delete student requests
    await OutingRequest.deleteMany({ studentId: student._id });

    await student.deleteOne();

    await logAudit(req, 'student.delete', { studentId: student._id });

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Add Warden
// @route   POST /api/college-admin/wardens
// @access  Private (College Admin)
exports.addWarden = asyncHandler(async (req, res, next) => {
    const { name, email, phone } = req.body;

    // Staff are always provisioned with a system-generated temp password and must
    // rotate it on first login — admins never set the initial password directly.
    const tempPassword = generateTempPassword();
    const warden = await User.create({
        name,
        email,
        phone,
        password: tempPassword,
        role: 'warden',
        collegeId: req.collegeId,
        mustChangePassword: true
    });

    await sendMail({
        to: email,
        subject: 'Your CampusGate warden account',
        text: `A warden account was created for you on CampusGate.\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nYou will be asked to set a new password on first login.`
    });

    const wardenData = warden.toObject();
    delete wardenData.password;

    await logAudit(req, 'warden.create', { userId: warden._id, email: warden.email });

    res.status(201).json({
        success: true,
        data: wardenData,
        tempPassword
    });
});

// @desc    Get Wardens
// @route   GET /api/college-admin/wardens
// @access  Private (College Admin)
exports.getWardens = asyncHandler(async (req, res, next) => {
    const wardens = await User.find({ collegeId: req.collegeId, role: 'warden' });

    // Real per-warden student count (source of truth is Student.wardenId), in one
    // aggregate instead of a stale array maintained on the User document.
    const counts = await Student.aggregate([
        { $match: { collegeId: req.collegeId } },
        { $group: { _id: '$wardenId', count: { $sum: 1 } } }
    ]);
    const countMap = new Map(counts.map(c => [String(c._id), c.count]));

    const formattedWardens = wardens.map(w => {
        const obj = w.toObject();
        return {
            ...obj,
            id: w._id,
            assignedStudents: countMap.get(String(w._id)) || 0
        };
    });

    res.status(200).json({
        success: true,
        data: formattedWardens
    });
});

// @desc    Add Student
// @route   POST /api/college-admin/students
// @access  Private (College Admin)
exports.addStudent = asyncHandler(async (req, res, next) => {
    const { name, email, phone, rollNumber, department, year, parentName, parentPhone, parentEmail, wardenId } = req.body;

    // Provision with a high-entropy temporary password (NOT the roll number, which
    // is predictable/public). The account is flagged so it must be rotated on first
    // login; the temp password is emailed to the student and returned once to the
    // admin who created it (so it can be relayed if email delivery is unavailable).
    const tempPassword = generateTempPassword();
    const user = await User.create({
        name,
        email,
        phone,
        password: tempPassword,
        role: 'student',
        collegeId: req.collegeId,
        mustChangePassword: true
    });

    await sendMail({
        to: email,
        subject: 'Your CampusGate account',
        text: `An account was created for you on CampusGate.\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nYou will be asked to set a new password on first login.`
    });

    // Create Student profile
    const student = await Student.create({
        userId: user._id,
        rollNumber,
        department,
        year,
        collegeId: req.collegeId,
        parentName,
        parentPhone,
        parentEmail,
        wardenId: wardenId || undefined // Optional
    });

    // Pre-provision the parent account so first-request notifications aren't lost
    // (best-effort: never fail student creation if this hiccups).
    try {
        await ensureParentUser(student);
    } catch (err) {
        console.error('ensureParentUser failed for student', student._id, err.message);
    }

    await logAudit(req, 'student.create', { studentId: student._id, rollNumber });

    res.status(201).json({
        success: true,
        data: student,
        // Shown once to the admin so they can relay it; never stored client-side.
        tempPassword
    });
});

// @desc    Bulk Upload Students
// @route   POST /api/college-admin/students/bulk
// @access  Private (College Admin)
exports.bulkUploadStudents = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return next(new ErrorResponse('Please upload a CSV file', 400));
    }

    // Parse the uploaded CSV from memory (serverless filesystems are read-only)
    const results = await new Promise((resolve, reject) => {
        const rows = [];
        Readable.from(req.file.buffer)
            .pipe(csv())
            .on('data', (data) => rows.push(data))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });

    // Process each row
    // Expected structure: name, email, phone, rollNumber, department, year, parentName, parentPhone
    const successful = [];
    const failed = [];

    for (const row of results) {
        try {
            // Basic validation
            if (!row.email || !row.rollNumber) {
                failed.push({ row, error: 'Missing email or rollNumber' });
                continue;
            }

            // Check if user exists
            const existingUser = await User.findOne({ email: row.email });
            if (existingUser) {
                failed.push({ row, error: 'User already exists' });
                continue;
            }

            // High-entropy temp password (not the roll number) + forced rotation.
            const tempPassword = generateTempPassword();
            const user = await User.create({
                name: row.name,
                email: row.email,
                phone: row.phone,
                password: tempPassword,
                role: 'student',
                collegeId: req.collegeId,
                mustChangePassword: true
            });

            try {
                const student = await Student.create({
                    userId: user._id,
                    rollNumber: row.rollNumber,
                    department: row.department,
                    year: row.year,
                    collegeId: req.collegeId,
                    parentName: row.parentName,
                    parentPhone: row.parentPhone,
                    parentEmail: row.parentEmail
                });
                try {
                    await ensureParentUser(student);
                } catch (err) {
                    console.error('ensureParentUser failed (bulk) for student', student._id, err.message);
                }
                // Email each student their temp password (best-effort; never blocks import).
                sendMail({
                    to: row.email,
                    subject: 'Your CampusGate account',
                    text: `An account was created for you on CampusGate.\n\nEmail: ${row.email}\nTemporary password: ${tempPassword}\n\nYou will be asked to set a new password on first login.`
                }).catch(() => {});
                successful.push(student);
            } catch (err) {
                // Roll back the user account so the row can be re-imported after fixing
                await User.findByIdAndDelete(user._id);
                throw err;
            }
        } catch (err) {
            failed.push({ row, error: err.message });
        }
    }

    res.status(200).json({
        success: true,
        data: {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            failedRows: failed
        }
    });
});

// @desc    Get Students
// @route   GET /api/college-admin/students
// @access  Private (College Admin)
exports.getStudents = asyncHandler(async (req, res, next) => {
    const students = await Student.find({ collegeId: req.collegeId })
        .populate('userId', 'name email phone')
        .populate('wardenId', 'name');

    const flattenedStudents = students.map(s => {
        const sObj = s.toObject();
        sObj.id = s._id;
        sObj.name = s.userId?.name || 'Unknown';
        sObj.email = s.userId?.email || '';
        sObj.phone = s.userId?.phone || '';
        sObj.wardenName = s.wardenId?.name || '';
        return sObj;
    });

    res.status(200).json({
        success: true,
        data: flattenedStudents
    });
});

// @desc    Assign Students to Warden
// @route   POST /api/college-admin/assign
// @access  Private (College Admin)
exports.assignStudentsToWarden = asyncHandler(async (req, res, next) => {
    const { wardenId, studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return next(new ErrorResponse('Please provide a non-empty array of student IDs', 400));
    }

    const warden = await User.findById(wardenId);
    if (!warden || warden.role !== 'warden' || warden.collegeId.toString() !== req.collegeId.toString()) {
        return next(new ErrorResponse('Invalid warden', 400));
    }

    // Student.wardenId is the single source of truth for the assignment, so a
    // simple reassignment is all that's needed — counts are derived on read.
    await Student.updateMany(
        { _id: { $in: studentIds }, collegeId: req.collegeId },
        { wardenId: wardenId }
    );

    await logAudit(req, 'student.assign', { wardenId, count: studentIds.length });

    res.status(200).json({
        success: true,
        message: `Assigned ${studentIds.length} students to warden`
    });
});

// @desc    View Outing Requests
// @route   GET /api/college-admin/requests
// @access  Private (College Admin)
exports.getRequests = asyncHandler(async (req, res, next) => {
    const requests = await OutingRequest.find({ collegeId: req.collegeId })
        .populate({
            path: 'studentId',
            populate: { path: 'userId', select: 'name' }
        })
        .populate('wardenId', 'name')
        .sort({ createdAt: -1 });

    const flattenedRequests = requests.map(r => {
        const reqObj = r.toObject();
        reqObj.id = r._id;
        reqObj.studentName = r.studentId?.userId?.name || 'Unknown';
        reqObj.wardenName = r.wardenId?.name || 'Unassigned';
        reqObj.rollNumber = r.studentId?.rollNumber || 'N/A';
        return reqObj;
    });

    res.status(200).json({
        success: true,
        data: flattenedRequests
    });
});

// @desc    Export Reports (filterable JSON the client renders/exports as CSV)
// @route   GET /api/college-admin/reports
// @access  Private (College Admin)
exports.getReports = asyncHandler(async (req, res, next) => {
    const { fromDate, toDate, status } = req.query;

    let query = { collegeId: req.collegeId };

    if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        // Include the whole "to" day
        to.setHours(23, 59, 59, 999);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
            query.createdAt = { $gte: from, $lte: to };
        }
    }

    if (status) {
        query.status = status;
    }

    const requests = await OutingRequest.find(query)
        .populate({ path: 'studentId', populate: { path: 'userId', select: 'name' } })
        .populate('wardenId', 'name')
        .sort({ createdAt: -1 });

    // Transform to flat rows the client can display and export.
    const csvData = requests.map(reqDoc => ({
        _id: reqDoc._id,
        studentName: reqDoc.studentId?.userId?.name || 'Unknown',
        rollNumber: reqDoc.studentId?.rollNumber || 'N/A',
        wardenName: reqDoc.wardenId?.name || 'Unassigned',
        purpose: reqDoc.purpose,
        destination: reqDoc.destination,
        outDate: reqDoc.outDate,
        returnDate: reqDoc.returnDate,
        status: reqDoc.status,
        createdAt: reqDoc.createdAt
    }));

    res.status(200).json({
        success: true,
        data: csvData
    });
});

// @desc    Add Watchman
// @route   POST /api/college-admin/watchmen
// @access  Private (College Admin)
exports.addWatchman = asyncHandler(async (req, res, next) => {
    const { name, email, phone } = req.body;

    const tempPassword = generateTempPassword();
    const watchman = await User.create({
        name,
        email,
        phone,
        password: tempPassword,
        role: 'watchman',
        collegeId: req.collegeId,
        mustChangePassword: true
    });

    await sendMail({
        to: email,
        subject: 'Your CampusGate watchman account',
        text: `A watchman account was created for you on CampusGate.\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nYou will be asked to set a new password on first login.`
    });

    const watchmanData = watchman.toObject();
    delete watchmanData.password;

    await logAudit(req, 'watchman.create', { userId: watchman._id, email: watchman.email });

    res.status(201).json({
        success: true,
        data: watchmanData,
        tempPassword
    });
});

// @desc    Get Watchmen
// @route   GET /api/college-admin/watchmen
// @access  Private (College Admin)
exports.getWatchmen = asyncHandler(async (req, res, next) => {
    const watchmen = await User.find({ collegeId: req.collegeId, role: 'watchman' });

    res.status(200).json({
        success: true,
        data: watchmen
    });
});

// @desc    Delete Watchman
// @route   DELETE /api/college-admin/watchmen/:id
// @access  Private (College Admin)
exports.deleteWatchman = asyncHandler(async (req, res, next) => {
    const watchman = await User.findById(req.params.id);

    if (!watchman || watchman.role !== 'watchman' || watchman.collegeId.toString() !== req.collegeId.toString()) {
        return next(new ErrorResponse('Watchman not found', 404));
    }

    await watchman.deleteOne();

    await logAudit(req, 'watchman.delete', { userId: watchman._id });

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Get College Settings
// @route   GET /api/college-admin/settings
// @access  Private (College Admin)
exports.getSettings = asyncHandler(async (req, res, next) => {
    const college = await require('../models/College').findById(req.collegeId);

    if (!college) {
        return next(new ErrorResponse('College not found', 404));
    }

    res.status(200).json({
        success: true,
        data: college.config
    });
});

// @desc    Update College Settings
// @route   PUT /api/college-admin/settings
// @access  Private (College Admin)
exports.updateSettings = asyncHandler(async (req, res, next) => {
    const { enableGateSecurity, requireWardenApproval } = req.body;

    const college = await require('../models/College').findById(req.collegeId);

    if (!college) {
        return next(new ErrorResponse('College not found', 404));
    }

    if (enableGateSecurity !== undefined) {
        college.config.enableGateSecurity = enableGateSecurity;
    }
    if (requireWardenApproval !== undefined) {
        college.config.requireWardenApproval = requireWardenApproval;
    }

    await college.save();

    await logAudit(req, 'settings.update', {
        enableGateSecurity: college.config.enableGateSecurity,
        requireWardenApproval: college.config.requireWardenApproval
    });

    res.status(200).json({
        success: true,
        data: college.config
    });
});

// @desc    View audit logs for this college
// @route   GET /api/college-admin/audit-logs
// @access  Private (College Admin)
exports.getAuditLogs = asyncHandler(async (req, res, next) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);

    const logs = await AuditLog.find({ collegeId: req.collegeId })
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .limit(limit);

    res.status(200).json({ success: true, data: logs });
});
