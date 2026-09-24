const express = require('express');
const {
  saveFcmToken,
  removeFcmToken,
  sendNotification,
  getUserNotifications,
  deleteNotification,
  listNotifications,
} = require('../controllers/notificationController');
const { protectUser, protectAdmin } = require('../middleware/auth');

const router = express.Router();

// App user: register/unregister this device for push notifications
router.post('/user/fcm-token', protectUser, saveFcmToken);
router.delete('/user/fcm-token', protectUser, removeFcmToken);

// App user: fetch/delete notifications
router.get('/user/notifications', protectUser, getUserNotifications);
router.delete('/user/notifications/:id', protectUser, deleteNotification);

// Admin panel: broadcast a notification to every user + view send history
router.post('/admin/notifications/send', protectAdmin, sendNotification);
router.get('/admin/notifications', protectAdmin, listNotifications);

module.exports = router;
