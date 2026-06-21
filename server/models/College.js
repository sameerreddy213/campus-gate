const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a college name'],
        unique: true,
        trim: true,
        maxlength: [100, 'Name can not be more than 100 characters']
    },
    code: {
        type: String,
        required: [true, 'Please add a college code'],
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: [10, 'Code can not be more than 10 characters']
    },
    city: {
        type: String,
        required: [true, 'Please add a city'],
        trim: true
    },
    address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address can not be more than 200 characters']
    },
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active'
    },
    config: {
        enableGateSecurity: {
            type: Boolean,
            default: true
        },
        // When false, the warden-approval step is skipped: a request is auto-approved
        // as soon as the parent approves (or immediately, for parent-skipped purposes).
        requireWardenApproval: {
            type: Boolean,
            default: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtuals for counts will be added later or handled via aggregation

module.exports = mongoose.model('College', collegeSchema);
