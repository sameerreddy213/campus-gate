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
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active'
    },
    config: {
        enableGateSecurity: {
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
