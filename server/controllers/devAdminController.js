const College = require('../models/College');
const User = require('../models/User');
const OutingRequest = require('../models/OutingRequest');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');

// @desc    Create a new college
// @route   POST /api/dev-admin/colleges
// @access  Private (Dev Admin)
exports.createCollege = asyncHandler(async (req, res, next) => {
    const { name, code, city } = req.body;
    const college = await College.create({ name, code, city });

    res.status(201).json({
        success: true,
        data: college
    });
});

// @desc    Get all colleges
// @route   GET /api/dev-admin/colleges
// @access  Private (Dev Admin)
exports.getColleges = asyncHandler(async (req, res, next) => {
    const colleges = await College.find();

    // Enhance with counts
    // This could be optimized with aggregation
    const populatedColleges = await Promise.all(colleges.map(async (college) => {
        const studentCount = await User.countDocuments({ collegeId: college._id, role: 'student' }); // User role student isn't the Student model count
        // Wait, User has role 'student', but Student model has the details. 
        // Student model doesn't have role, it links to User.
        // Actually the prompt says "Student" model.
        // Let's count 'Student' documents for studentCount.
        const Student = require('../models/Student');
        const sCount = await Student.countDocuments({ collegeId: college._id });
        const wCount = await User.countDocuments({ collegeId: college._id, role: 'warden' });

        // Find admin name
        const admin = await User.findOne({ collegeId: college._id, role: 'college-admin' });

        return {
            ...college.toObject(),
            studentCount: sCount,
            wardenCount: wCount,
            adminName: admin ? admin.name : 'N/A',
            adminId: admin ? admin._id : null
        };
    }));

    res.status(200).json({
        success: true,
        data: populatedColleges
    });
});

// @desc    Create college admin
// @route   POST /api/dev-admin/create-admin
// @access  Private (Dev Admin)
exports.createCollegeAdmin = asyncHandler(async (req, res, next) => {
    const { name, email, password, phone, collegeId } = req.body;

    const user = await User.create({
        name,
        email,
        password,
        phone,
        collegeId,
        role: 'college-admin'
    });

    const userData = user.toObject();
    delete userData.password;

    res.status(201).json({
        success: true,
        data: userData
    });
});

// @desc    Global Analytics
// @route   GET /api/dev-admin/analytics
// @access  Private (Dev Admin)
exports.getGlobalAnalytics = asyncHandler(async (req, res, next) => {
    const collegesCount = await College.countDocuments();
    const Student = require('../models/Student');
    const studentsCount = await Student.countDocuments();
    const wardensCount = await User.countDocuments({ role: 'warden' });
    const requestsCount = await OutingRequest.countDocuments();

    res.status(200).json({
        success: true,
        data: {
            colleges: collegesCount,
            students: studentsCount,
            wardens: wardensCount,
            totalRequests: requestsCount
        }
    });
});

// @desc    Delete College
// @route   DELETE /api/dev-admin/colleges/:id
// @access  Private (Dev Admin)
exports.deleteCollege = asyncHandler(async (req, res, next) => {
    const college = await College.findById(req.params.id);

    if (!college) {
        return next(new ErrorResponse('College not found', 404));
    }

    // Delete all associated data
    await User.deleteMany({ collegeId: college._id });
    // Dynamically require to avoid circular deps if any
    const Student = require('../models/Student');
    await Student.deleteMany({ collegeId: college._id });
    await OutingRequest.deleteMany({ collegeId: college._id });

    await college.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Toggle college status (active/suspended)
// @route   PUT /api/dev-admin/colleges/:id/status
// @access  Private (Dev Admin)
exports.toggleCollegeStatus = asyncHandler(async (req, res, next) => {
    const college = await College.findById(req.params.id);

    if (!college) {
        return next(new ErrorResponse(`College not found with id of ${req.params.id}`, 404));
    }

    // Toggle status
    college.status = college.status === 'active' ? 'suspended' : 'active';
    await college.save();

    res.status(200).json({
        success: true,
        data: college
    });
});

// @desc    Update College
// @route   PUT /api/dev-admin/colleges/:id
// @access  Private (Dev Admin)
exports.updateCollege = asyncHandler(async (req, res, next) => {
    const { name, code, city, status } = req.body;

    let college = await College.findById(req.params.id);

    if (!college) {
        return next(new ErrorResponse(`College not found with id of ${req.params.id}`, 404));
    }

    // Update fields
    if (name) college.name = name;
    if (code) college.code = code;
    if (city) college.city = city;
    if (status) college.status = status;

    await college.save();

    res.status(200).json({
        success: true,
        data: college
    });
});
