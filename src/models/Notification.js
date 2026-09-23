const mongoose = require('mongoose');

// One row per broadcast the admin sends from the admin panel. Kept purely
// as a history/audit log — the actual delivery is via the FCM "all_users"
// topic (see src/utils/pushNotification.js), not per-row fan-out.
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: '' },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: { type: String, default: '' },
    recipientCount: { type: Number, default: 0 }, // active users with a saved fcmToken at send time
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notification', notificationSchema);
