const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    action: {
        type: String,
        required: true
    },
    details: {
        type: Object
    },
    ip: {
        type: String
    },
    collegeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'College'
    }
}, {
    timestamps: true
});

// Dashboards list newest-first, optionally filtered by action or scoped to a college.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ collegeId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
