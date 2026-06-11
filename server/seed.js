const crypto = require('crypto');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
    try {
        const email = process.env.DEV_ADMIN_EMAIL || 'admin@campusgate.com';
        // Use DEV_ADMIN_PASSWORD if provided, otherwise generate a random one
        const password = process.env.DEV_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');

        await User.deleteMany({ role: 'dev-admin' });

        await User.create({
            name: 'Dev Admin',
            email,
            password,
            phone: process.env.DEV_ADMIN_PHONE || '1234567890',
            role: 'dev-admin'
        });

        console.log('Dev Admin Created:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

importData();
