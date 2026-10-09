const express = require('express');
const { register, login, getProfile, updateProfile, changePassword } = require('../controllers/authController');
const { createPasswordResetRequest } = require('../controllers/passwordResetController');
const { protectUser } = require('../middleware/auth');

const router = express.Router();

// Public
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/password-reset-requests', createPasswordResetRequest);

// Protected (app user)
router.get('/user/profile', protectUser, getProfile);
router.put('/user/profile', protectUser, updateProfile);
router.put('/user/change-password', protectUser, changePassword);

module.exports = router;
