const express = require('express');
const { adminLogin, getMe } = require('../controllers/adminAuthController');
const {
  adminListUsers,
  adminGetUser,
  adminUpdateUserStatus,
  adminVerifyUser,
} = require('../controllers/userController');
const { getStats } = require('../controllers/dashboardController');
const { protectAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/admin/auth/login', adminLogin);
router.get('/admin/auth/me', protectAdmin, getMe);

router.get('/admin/dashboard/stats', protectAdmin, getStats);

router.get('/admin/users', protectAdmin, adminListUsers);
router.get('/admin/users/:id', protectAdmin, adminGetUser);
router.patch('/admin/users/:id/status', protectAdmin, adminUpdateUserStatus);
router.patch('/admin/users/:id/verify', protectAdmin, adminVerifyUser);

module.exports = router;
