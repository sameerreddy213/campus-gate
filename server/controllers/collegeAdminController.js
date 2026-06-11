const { Readable } = require('stream');
const csv = require('csv-parser');
const User = require('../models/User');
const Student = require('../models/Student');
const OutingRequest = require('../models/OutingRequest');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');

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

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Add Warden
// @route   POST /api/college-admin/wardens
// @access  Private (College Admin)
exports.addWarden = asyncHandler(async (req, res, next) => {
    const { name, email, phone, password } = req.body;

    const warden = await User.create({
        name,
        email,
        phone,
        password,
        role: 'warden',
        collegeId: req.collegeId
    });

    const wardenData = warden.toObject();
    delete wardenData.password;

    res.status(201).json({
        success: true,
        data: wardenData
    });
});

// @desc    Get Wardens
// @route   GET /api/college-admin/wardens
// @access  Private (College Admin)
exports.getWardens = asyncHandler(async (req, res, next) => {
    const wardens = await User.find({ collegeId: req.collegeId, role: 'warden' });

    const formattedWardens = wardens.map(w => ({
        ...w.toObject(),
        id: w._id
    }));

    res.status(200).json({
        success: true,
        data: formattedWardens
    });
});

// @desc    Add Student
// @route   POST /api/college-admin/students
// @access  Private (College Admin)
exports.addStudent = asyncHandler(async (req, res, next) => {
    const { name, email, phone, rollNumber, department, year, parentName, parentPhone, parentEmail, password, wardenId } = req.body;

    // Create User account for student first
    // Use rollNumber as default password if not provided? Prompt says create student. 
    // Student also needs User account to login.
    const user = await User.create({
        name,
        email,
        phone,
        password: password || rollNumber, // Default password is roll number
        role: 'student',
        collegeId: req.collegeId
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

    res.status(201).json({
        success: true,
        data: student
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

            const user = await User.create({
                name: row.name,
                email: row.email,
                phone: row.phone,
                password: row.rollNumber, // Default password
                role: 'student',
                collegeId: req.collegeId
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

    // Update students
    await Student.updateMany(
        { _id: { $in: studentIds }, collegeId: req.collegeId },
        { wardenId: wardenId }
    );

    // Also update warden's assignedStudents list for query performance if needed
    // But keeping it normalized in Student model is usually better. 
    // The User model has 'assignedStudents' field in my plan, let's update it.

    // First remove these student Ids from any other warden's list if previously assigned?
    // Implementation choice: We can just use the Student.wardenId as the source of truth.
    // Syncing User.assignedStudents manually:

    await User.findByIdAndUpdate(wardenId, {
        $addToSet: { assignedStudents: { $each: studentIds } }
    });

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

// @desc    Export Reports
// @route   GET /api/college-admin/reports
// @access  Private (College Admin)
exports.getReports = asyncHandler(async (req, res, next) => {
    // Generate CSV report of all requests
    // Just return JSON for now, frontend converts to CSV? 
    // Prompt says "Export reports as CSV".  Let's allow basic filtering.

    const { fromDate, toDate, status } = req.query;

    let query = { collegeId: req.collegeId };

    if (fromDate && toDate) {
        query.createdAt = {
            $gte: new Date(fromDate),
            $lte: new Date(toDate)
        };
    }

    if (status) {
        query.status = status;
    }

    const requests = await OutingRequest.find(query)
        .populate('studentId')
        .populate('wardenId', 'name');

    // Transform for CSV
    const csvData = requests.map(req => ({
        Student: req.studentId?.rollNumber, // Accessing populated data might fail if student deleted
        Warden: req.wardenId?.name,
        Purpose: req.purpose,
        Destination: req.destination,
        OutDate: req.outDate,
        ReturnDate: req.returnDate,
        Status: req.status,
        Created: req.createdAt
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
    const { name, email, phone, password } = req.body;

    const watchman = await User.create({
        name,
        email,
        phone,
        password,
        role: 'watchman',
        collegeId: req.collegeId
    });

    const watchmanData = watchman.toObject();
    delete watchmanData.password;

    res.status(201).json({
        success: true,
        data: watchmanData
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
    const { enableGateSecurity } = req.body;

    const college = await require('../models/College').findById(req.collegeId);

    if (!college) {
        return next(new ErrorResponse('College not found', 404));
    }

    if (enableGateSecurity !== undefined) {
        college.config.enableGateSecurity = enableGateSecurity;
    }

    await college.save();

    res.status(200).json({
        success: true,
        data: college.config
    });
});
