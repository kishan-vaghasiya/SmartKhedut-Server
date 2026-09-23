const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const {
  sendToAllUsers,
  subscribeToAllUsersTopic,
  unsubscribeFromAllUsersTopic,
} = require('../utils/pushNotification');

// POST /api/user/fcm-token  (protected app user)  { fcmToken }
// Called by the app right after login and whenever Firebase refreshes the
// device token. Saves the token and subscribes the device to the
// "all_users" broadcast topic so admin notifications reach it.
const saveFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) {
    return error(res, { statusCode: 400, message: 'fcmToken is required' });
  }

  // If another user previously registered this exact device token (e.g.
  // shared/reset device, different account logged in), clear it from them
  // first so we never double-subscribe or notify the wrong account.
  if (req.user.fcmToken !== fcmToken) {
    await User.updateMany({ fcmToken, _id: { $ne: req.user._id } }, { $set: { fcmToken: null } });
  }

  req.user.fcmToken = fcmToken;
  await req.user.save();

  await subscribeToAllUsersTopic(fcmToken);

  return success(res, { message: 'Device registered for notifications' });
});

// DELETE /api/user/fcm-token  (protected app user)
// Called on logout so a signed-out device stops receiving broadcasts.
const removeFcmToken = asyncHandler(async (req, res) => {
  const token = req.user.fcmToken;
  if (token) {
    await unsubscribeFromAllUsersTopic(token);
    req.user.fcmToken = null;
    await req.user.save();
  }
  return success(res, { message: 'Device unregistered' });
});

// POST /api/admin/notifications/send  (protected admin)  { title, body, imageUrl? }
// Broadcasts a push notification to every user of the app via the
// "all_users" FCM topic, and logs the attempt for the admin panel's history list.
const sendNotification = asyncHandler(async (req, res) => {
  const { title, body, imageUrl } = req.body;

  if (!title || !body) {
    return error(res, { statusCode: 400, message: 'title and body are required' });
  }
  if (title.length > 100) {
    return error(res, { statusCode: 400, message: 'title must be 100 characters or fewer' });
  }
  if (body.length > 500) {
    return error(res, { statusCode: 400, message: 'body must be 500 characters or fewer' });
  }

  const recipientCount = await User.countDocuments({ fcmToken: { $ne: null }, status: 'active' });

  const result = await sendToAllUsers({ title, body, imageUrl });

  const record = await Notification.create({
    title,
    body,
    imageUrl: imageUrl || '',
    sentBy: req.admin._id,
    status: result.success ? 'sent' : 'failed',
    error: result.success ? '' : result.error,
    recipientCount,
  });

  if (!result.success) {
    return error(res, {
      statusCode: 502,
      message: `Notification could not be delivered: ${result.error}`,
    });
  }

  return success(res, {
    statusCode: 201,
    message: `Notification sent to all users (${recipientCount} device${recipientCount === 1 ? '' : 's'} registered)`,
    data: record,
  });
});

// GET /api/admin/notifications  (protected admin) ?page=&limit=
// History of notifications sent from the admin panel, newest first.
const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });

  const [items, total] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('sentBy', 'name email'),
    Notification.countDocuments(),
  ]);

  return success(res, {
    message: 'Notifications fetched',
    data: items,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

module.exports = { saveFcmToken, removeFcmToken, sendNotification, listNotifications };
