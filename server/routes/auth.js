const express = require('express');
const {
    login,
    getMe,
    sendOtp,
    verifyOtp,
    updatePassword,
    updateDetails
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
// const { loginValidator, otpValidator } = require('../utils/validators'); 

const router = express.Router();

const { check } = require('express-validator');
const { validate } = require('../middleware/validationMiddleware');

// router.post('/login', loginValidator, login);
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
    validate
], login);
router.post('/parent/send-otp', [
    check('phone', 'Phone number is required').not().isEmpty(),
    validate
], sendOtp);
router.post('/parent/verify-otp', [
    check('phone', 'Phone number is required').not().isEmpty(),
    check('otp', 'OTP is required').isLength({ min: 6, max: 6 }),
    validate
], verifyOtp);
router.put('/updatepassword', protect, updatePassword);
router.put('/updatedetails', protect, updateDetails);
router.get('/me', protect, getMe);

module.exports = router;
