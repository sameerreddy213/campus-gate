/**
 * Set or reset the Developer Admin account.
 *
 * Safe to run against a live database: it ONLY touches the single dev-admin
 * user and never deletes colleges, students, wardens, or requests.
 *
 * Usage (from the `server` directory, with MONGO_URI set in .env):
 *
 *   # Use explicit credentials
 *   DEV_ADMIN_EMAIL=you@example.com DEV_ADMIN_PASSWORD=YourStrongPass node scripts/setDevAdmin.js
 *
 *   # Or pass them as arguments
 *   node scripts/setDevAdmin.js you@example.com YourStrongPass
 *
 *   # Or let it generate a random password (printed to the console)
 *   node scripts/setDevAdmin.js
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const run = async () => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set. Add it to server/.env first.');
        process.exit(1);
    }

    const email = process.argv[2] || process.env.DEV_ADMIN_EMAIL || 'admin@campusgate.com';
    const password =
        process.argv[3] ||
        process.env.DEV_ADMIN_PASSWORD ||
        crypto.randomBytes(9).toString('base64url'); // random if not supplied

    try {
        await mongoose.connect(process.env.MONGO_URI);

        let admin = await User.findOne({ role: 'dev-admin' });

        if (admin) {
            admin.email = email;
            admin.password = password; // hashed by the pre-save hook
            await admin.save();
            console.log('Existing Dev Admin updated.');
        } else {
            admin = await User.create({
                name: 'Dev Admin',
                email,
                password,
                phone: process.env.DEV_ADMIN_PHONE || '1234567890',
                role: 'dev-admin'
            });
            console.log('Dev Admin created.');
        }

        console.log('--------------------------------');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log('--------------------------------');
        console.log('Store these somewhere safe. Log in at /login (Staff / Student tab).');

        process.exit(0);
    } catch (err) {
        console.error('Failed to set Dev Admin:', err.message);
        process.exit(1);
    }
};

run();
