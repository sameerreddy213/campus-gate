/**
 * DESTRUCTIVE: wipes ALL users, colleges, students, and outing requests.
 *
 * Guarded so it cannot be run by accident:
 *   - refuses to run when NODE_ENV=production
 *   - requires an explicit --confirm flag
 *
 * Usage:  node scripts/clearData.js --confirm
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const College = require('../models/College');
const Student = require('../models/Student');
const OutingRequest = require('../models/OutingRequest');

dotenv.config();

const clearData = async () => {
    if (process.env.NODE_ENV === 'production') {
        console.error('Refusing to run clearData in production.');
        process.exit(1);
    }
    if (!process.argv.includes('--confirm')) {
        console.error('This will DELETE ALL DATA. Re-run with --confirm to proceed:');
        console.error('  node scripts/clearData.js --confirm');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        await User.deleteMany();
        await College.deleteMany();
        await Student.deleteMany();
        await OutingRequest.deleteMany();

        console.log('Data Destroyed...');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

clearData();
