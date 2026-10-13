const mongoose = require('mongoose');

const NOTIFICATION_TYPES = ['broadcast', 'password_reset_approved', 'password_reset_rejected'];

// One row per notification. Two kinds live in this collection:
//   - Broadcasts sent from the admin panel (recipientUser = null). One row is
//     shared by every user, so a user "deleting" it only hides it for them
//     (their id goes into `deletedBy`) — it must never vanish for everyone else.
//   - Private notifications for one user (recipientUser = that user), e.g. the
//     password-reset approved / rejected decision.
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: '' },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'broadcast' },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: { type: String, default: '' },
    recipientCount: { type: Number, default: 0 }, // devices targeted at send time
    successCount: { type: Number, default: 0 }, // devices FCM accepted
    failureCount: { type: Number, default: 0 }, // devices FCM rejected
    // Users who removed this (broadcast) notification from their own list.
    deletedBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [], select: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientUser: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
