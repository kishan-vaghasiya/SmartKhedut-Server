const express = require('express');
const {
  saveFcmToken,
  removeFcmToken,
  sendNotification,
  listNotifications,
} = require('../controllers/notificationController');
const { protectUser, protectAdmin } = require('../middleware/auth');

const router = express.Router();

// App user: register/unregister this device for push notifications
router.post('/user/fcm-token', protectUser, saveFcmToken);
router.delete('/user/fcm-token', protectUser, removeFcmToken);

// Admin panel: broadcast a notification to every user + view send history
router.post('/admin/notifications/send', protectAdmin, sendNotification);
router.get('/admin/notifications', protectAdmin, listNotifications);

module.exports = router;
