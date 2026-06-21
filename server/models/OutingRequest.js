const mongoose = require('mongoose');

const outingRequestSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College',
        required: true
    },
    wardenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    purpose: {
        type: String,
        enum: ['Vacation', 'Exam', 'Mess', 'Other'],
        required: [true, 'Please select a purpose']
    },
    destination: {
        type: String,
        required: [true, 'Please add a destination']
    },
    outDate: {
        type: Date,
        required: [true, 'Please add out date']
    },
    returnDate: {
        type: Date
    },
    status: {
        type: String,
        enum: [
            'pending-parent',
            'parent-approved',
            'parent-declined',
            'pending-warden',
            'approved',
            'rejected',
            'out',
            'returned',
            'expired',
            'cancelled'
        ],
        default: 'pending-parent'
    },
    parentDecisionAt: Date,
    wardenDecisionAt: Date,
    outAt: Date,
    returnedAt: Date,
    // Set by the scheduler when a student is 'out' past their expected return.
    overstay: {
        type: Boolean,
        default: false
    },
    // Guards against re-notifying about the same overstay every sweep.
    overstayNotified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for performance
outingRequestSchema.index({ collegeId: 1, status: 1 });
outingRequestSchema.index({ wardenId: 1, status: 1 });
outingRequestSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('OutingRequest', outingRequestSchema);
