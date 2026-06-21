const crypto = require('crypto');
const User = require('../models/User');

// Parents are linked to students by phone number and historically were created
// lazily on their first OTP login. That dropped the very first request's
// parent-approval notification (there was no parent User to notify yet). This
// helper idempotently ensures a parent User exists for a student's parent phone
// so notifications work from the first request, and OTP login simply finds the
// existing account.
//
// Best-effort and idempotent: returns the existing parent if present, otherwise
// creates one with a random password (the parent only ever logs in via OTP).
const ensureParentUser = async (student) => {
    if (!student || !student.parentPhone) return null;

    const existing = await User.findOne({ phone: student.parentPhone, role: 'parent' });
    if (existing) return existing;

    const baseEmail = student.parentEmail || `parent.${student.parentPhone}@campusgate.com`;
    const emailTaken = await User.findOne({ email: baseEmail });
    const email = emailTaken
        ? `parent.${student.parentPhone}.${Date.now()}@campusgate.com`
        : baseEmail;

    return User.create({
        name: student.parentName || 'Parent',
        email,
        phone: student.parentPhone,
        role: 'parent',
        password: crypto.randomBytes(16).toString('hex'),
        collegeId: student.collegeId
    });
};

module.exports = { ensureParentUser };
