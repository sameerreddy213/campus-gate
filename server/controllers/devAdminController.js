const College = require('../models/College');
const User = require('../models/User');
const Student = require('../models/Student');
const OutingRequest = require('../models/OutingRequest');
const AuditLog = require('../models/AuditLog');
const SecurityEvent = require('../models/SecurityEvent');
const asyncHandler = require('../utils/asyncHandler');
const { ErrorResponse } = require('../middleware/errorMiddleware');
const { logAudit } = require('../utils/audit');

// @desc    Create a new college
// @route   POST /api/dev-admin/colleges
// @access  Private (Dev Admin)
exports.createCollege = asyncHandler(async (req, res, next) => {
    const { name, code, city } = req.body;
    const college = await College.create({ name, code, city });

    await logAudit(req, 'college.create', { collegeId: college._id, name: college.name });

    res.status(201).json({
        success: true,
        data: college
    });
});

// @desc    Get all colleges
// @route   GET /api/dev-admin/colleges
// @access  Private (Dev Admin)
exports.getColleges = asyncHandler(async (req, res, next) => {
    // Fetch everything in a fixed number of queries (no per-college round-trips).
    const [colleges, studentAgg, wardenAgg, admins] = await Promise.all([
        College.find().sort({ createdAt: -1 }),
        Student.aggregate([{ $group: { _id: '$collegeId', count: { $sum: 1 } } }]),
        User.aggregate([
            { $match: { role: 'warden' } },
            { $group: { _id: '$collegeId', count: { $sum: 1 } } }
        ]),
        User.find({ role: 'college-admin' }).select('name collegeId')
    ]);

    // Index the aggregates by collegeId for O(1) lookups during the merge.
    const studentMap = new Map(studentAgg.map((s) => [String(s._id), s.count]));
    const wardenMap = new Map(wardenAgg.map((w) => [String(w._id), w.count]));
    const adminMap = new Map();
    admins.forEach((a) => {
        if (a.collegeId && !adminMap.has(String(a.collegeId))) {
            adminMap.set(String(a.collegeId), a);
        }
    });

    const populatedColleges = colleges.map((college) => {
        const id = String(college._id);
        const admin = adminMap.get(id);
        return {
            ...college.toObject(),
            studentCount: studentMap.get(id) || 0,
            wardenCount: wardenMap.get(id) || 0,
            adminName: admin ? admin.name : 'N/A',
            adminId: admin ? admin._id : null
        };
    });

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

    await logAudit(req, 'admin.create', { userId: user._id, email: user.email, collegeId });

    res.status(201).json({
        success: true,
        data: userData
    });
});

// @desc    Global Analytics
// @route   GET /api/dev-admin/analytics
// @access  Private (Dev Admin)
exports.getGlobalAnalytics = asyncHandler(async (req, res, next) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
        collegesCount,
        activeColleges,
        studentsCount,
        usersByRole,
        requestsCount,
        requestsToday
    ] = await Promise.all([
        College.countDocuments(),
        College.countDocuments({ status: 'active' }),
        Student.countDocuments(),
        User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
        OutingRequest.countDocuments(),
        OutingRequest.countDocuments({ createdAt: { $gte: startOfToday } })
    ]);

    const roleMap = {};
    usersByRole.forEach((r) => { roleMap[r._id] = r.count; });

    res.status(200).json({
        success: true,
        data: {
            // Original fields (kept for backward compatibility with the dashboard).
            colleges: collegesCount,
            students: studentsCount,
            wardens: roleMap.warden || 0,
            totalRequests: requestsCount,
            // Enriched platform stats.
            activeColleges,
            suspendedColleges: collegesCount - activeColleges,
            watchmen: roleMap.watchman || 0,
            parents: roleMap.parent || 0,
            collegeAdmins: roleMap['college-admin'] || 0,
            totalUsers: usersByRole.reduce((sum, r) => sum + r.count, 0),
            requestsToday
        }
    });
});

// @desc    Detailed analytics (status breakdown, per-college, monthly trend)
// @route   GET /api/dev-admin/analytics/breakdown
// @access  Private (Dev Admin)
exports.getAnalyticsBreakdown = asyncHandler(async (req, res, next) => {
    // Status breakdown
    const statusAgg = await OutingRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusData = statusAgg.map(s => ({ status: s._id, count: s.count }));

    // Per-college request counts (top 8)
    const perCollegeAgg = await OutingRequest.aggregate([
        { $group: { _id: '$collegeId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 }
    ]);
    const collegeIds = perCollegeAgg.map(c => c._id);
    const colleges = await College.find({ _id: { $in: collegeIds } }).select('name code');
    const collegeMap = {};
    colleges.forEach(c => { collegeMap[c._id.toString()] = c.code || c.name; });
    const collegeData = perCollegeAgg.map(c => ({
        college: c._id ? (collegeMap[c._id.toString()] || 'Unknown') : 'Unknown',
        requests: c.count
    }));

    // Monthly trend for the last 6 months
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthAgg = await OutingRequest.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
            $group: {
                _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                count: { $sum: 1 }
            }
        }
    ]);
    const monthLookup = {};
    monthAgg.forEach(m => { monthLookup[`${m._id.year}-${m._id.month}`] = m.count; });
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyData.push({
            month: monthNames[d.getMonth()],
            requests: monthLookup[`${d.getFullYear()}-${d.getMonth() + 1}`] || 0
        });
    }

    res.status(200).json({
        success: true,
        data: { statusData, collegeData, monthlyData }
    });
});

// @desc    View audit logs (global)
// @route   GET /api/dev-admin/audit-logs
// @access  Private (Dev Admin)
exports.getAuditLogs = asyncHandler(async (req, res, next) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;

    const logs = await AuditLog.find(filter)
        .populate('userId', 'name email role')
        .populate('collegeId', 'name code')
        .sort({ createdAt: -1 })
        .limit(limit);

    res.status(200).json({ success: true, data: logs });
});

// @desc    Security overview — threat telemetry + platform snapshot for dev-admin
// @route   GET /api/dev-admin/security
// @access  Private (Dev Admin)
exports.getSecurityOverview = asyncHandler(async (req, res, next) => {
    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000);
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    // Start of the day 13 days ago => a full 14-day window for the timeline.
    const since14d = new Date(now - 13 * 24 * 60 * 60 * 1000);
    since14d.setHours(0, 0, 0, 0);

    const [facet] = await SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: since14d } } },
        {
            $facet: {
                byType24h: [
                    { $match: { createdAt: { $gte: since24h } } },
                    { $group: { _id: '$type', count: { $sum: 1 } } }
                ],
                byType7d: [
                    { $match: { createdAt: { $gte: since7d } } },
                    { $group: { _id: '$type', count: { $sum: 1 } } }
                ],
                topIps: [
                    { $match: { createdAt: { $gte: since7d } } },
                    {
                        $group: {
                            _id: '$ip',
                            count: { $sum: 1 },
                            types: { $addToSet: '$type' },
                            lastSeen: { $max: '$createdAt' },
                            highSeverity: {
                                $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
                            }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ],
                uniqueIps7d: [
                    { $match: { createdAt: { $gte: since7d } } },
                    { $group: { _id: '$ip' } },
                    { $count: 'n' }
                ],
                timeline: [
                    {
                        $group: {
                            _id: {
                                day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                type: '$type'
                            },
                            count: { $sum: 1 }
                        }
                    }
                ]
            }
        }
    ]);

    const toMap = (arr) => {
        const m = {};
        (arr || []).forEach((x) => { m[x._id || 'other'] = x.count; });
        return m;
    };
    const byType24h = toMap(facet.byType24h);
    const byType7d = toMap(facet.byType7d);
    const sum = (m) => Object.values(m).reduce((a, b) => a + b, 0);

    // Build a dense 14-day timeline with a per-type breakdown (gaps filled with 0).
    const TYPES = SecurityEvent.EVENT_TYPES;
    const timelineMap = {};
    (facet.timeline || []).forEach((row) => {
        const day = row._id.day;
        if (!timelineMap[day]) timelineMap[day] = { date: day, total: 0 };
        timelineMap[day][row._id.type || 'other'] = row.count;
        timelineMap[day].total += row.count;
    });
    const timeline = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        const entry = timelineMap[key] || { date: key, total: 0 };
        TYPES.forEach((t) => { if (entry[t] === undefined) entry[t] = 0; });
        timeline.push(entry);
    }

    const topIps = (facet.topIps || []).map((r) => ({
        ip: r._id || 'unknown',
        count: r.count,
        types: r.types,
        highSeverity: r.highSeverity,
        lastSeen: r.lastSeen
    }));

    // Most recent events, with the acting user resolved when one was attached.
    const recent = await SecurityEvent.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('userId', 'name email role');

    // Lightweight platform snapshot so the page is self-contained.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [totalUsers, colleges, totalRequests, requestsToday] = await Promise.all([
        User.countDocuments(),
        College.countDocuments(),
        OutingRequest.countDocuments(),
        OutingRequest.countDocuments({ createdAt: { $gte: startOfToday } })
    ]);

    res.status(200).json({
        success: true,
        data: {
            summary: {
                last24h: { byType: byType24h, total: sum(byType24h) },
                last7d: { byType: byType7d, total: sum(byType7d) },
                uniqueIps7d: (facet.uniqueIps7d && facet.uniqueIps7d[0] && facet.uniqueIps7d[0].n) || 0
            },
            timeline,
            topIps,
            recent,
            platform: { totalUsers, colleges, totalRequests, requestsToday }
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
    await Student.deleteMany({ collegeId: college._id });
    await OutingRequest.deleteMany({ collegeId: college._id });

    await college.deleteOne();

    await logAudit(req, 'college.delete', { collegeId: college._id, name: college.name });

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

    await logAudit(req, 'college.status_toggle', { collegeId: college._id, status: college.status });

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
