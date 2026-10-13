// const User = require('../models/User');
// const Notification = require('../models/Notification');
// const asyncHandler = require('../middleware/asyncHandler');
// const { success, error } = require('../utils/apiResponse');
// const { getPagination, buildPaginationMeta } = require('../utils/pagination');
// const {
//   sendToAllUsers,
//   subscribeToAllUsersTopic,
//   unsubscribeFromAllUsersTopic,
// } = require('../utils/pushNotification');

// // POST /api/user/fcm-token  (protected app user)  { fcmToken }
// // Called by the app right after login and whenever Firebase refreshes the
// // device token. Saves the token and subscribes the device to the
// // "all_users" broadcast topic so admin notifications reach it.
// const saveFcmToken = asyncHandler(async (req, res) => {
//   const { fcmToken } = req.body;
//   if (!fcmToken) {
//     return error(res, { statusCode: 400, message: 'fcmToken is required' });
//   }

//   // If another user previously registered this exact device token (e.g.
//   // shared/reset device, different account logged in), clear it from them
//   // first so we never double-subscribe or notify the wrong account.
//   if (req.user.fcmToken !== fcmToken) {
//     await User.updateMany({ fcmToken, _id: { $ne: req.user._id } }, { $set: { fcmToken: null } });
//   }

//   req.user.fcmToken = fcmToken;
//   await req.user.save();

//   await subscribeToAllUsersTopic(fcmToken);

//   return success(res, { message: 'Device registered for notifications' });
// });

// // DELETE /api/user/fcm-token  (protected app user)
// // Called on logout so a signed-out device stops receiving broadcasts.
// const removeFcmToken = asyncHandler(async (req, res) => {
//   const token = req.user.fcmToken;
//   if (token) {
//     await unsubscribeFromAllUsersTopic(token);
//     req.user.fcmToken = null;
//     await req.user.save();
//   }
//   return success(res, { message: 'Device unregistered' });
// });

// // POST /api/admin/notifications/send  (protected admin)  { title, body, imageUrl? }
// // Broadcasts a push notification to every user of the app via the
// // "all_users" FCM topic, and logs the attempt for the admin panel's history list.
// const sendNotification = asyncHandler(async (req, res) => {
//   const { title, body, imageUrl } = req.body;

//   if (!title || !body) {
//     return error(res, { statusCode: 400, message: 'title and body are required' });
//   }
//   if (title.length > 100) {
//     return error(res, { statusCode: 400, message: 'title must be 100 characters or fewer' });
//   }
//   if (body.length > 500) {
//     return error(res, { statusCode: 400, message: 'body must be 500 characters or fewer' });
//   }

//   const recipientCount = await User.countDocuments({ fcmToken: { $ne: null }, status: 'active' });

//   const result = await sendToAllUsers({ title, body, imageUrl });

//   const record = await Notification.create({
//     title,
//     body,
//     imageUrl: imageUrl || '',
//     sentBy: req.admin._id,
//     status: result.success ? 'sent' : 'failed',
//     error: result.success ? '' : result.error,
//     recipientCount,
//   });

//   if (!result.success) {
//     return error(res, {
//       statusCode: 502,
//       message: `Notification could not be delivered: ${result.error}`,
//     });
//   }

//   return success(res, {
//     statusCode: 201,
//     message: `Notification sent to all users (${recipientCount} device${recipientCount === 1 ? '' : 's'} registered)`,
//     data: record,
//   });
// });

// // GET /api/user/notifications  (protected user) ?page=&limit=
// // Returns the global notification list to the app, newest first.
// const getUserNotifications = asyncHandler(async (req, res) => {
//   const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });

//   const [items, total] = await Promise.all([
//     Notification.find({
//       $or: [{ recipientUser: null }, { recipientUser: req.user._id }],
//     })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate('sentBy', 'name email'),
//     Notification.countDocuments({
//       $or: [{ recipientUser: null }, { recipientUser: req.user._id }],
//     }),
//   ]);

//   return success(res, {
//     message: 'Notifications fetched',
//     data: items,
//     pagination: buildPaginationMeta({ page, limit, total }),
//   });
// });

// // DELETE /api/user/notifications/:id  (protected user)
// const deleteNotification = asyncHandler(async (req, res) => {
//   const { id } = req.params;

//   const notification = await Notification.findOne({
//     _id: id,
//     $or: [{ recipientUser: null }, { recipientUser: req.user._id }],
//   });
//   if (!notification) {
//     return error(res, { statusCode: 404, message: 'Notification not found' });
//   }

//   await Notification.findByIdAndDelete(id);

//   return success(res, {
//     message: 'Notification deleted successfully',
//     data: { id },
//   });
// });

// // GET /api/admin/notifications  (protected admin) ?page=&limit=
// // History of notifications sent from the admin panel, newest first.
// const listNotifications = asyncHandler(async (req, res) => {
//   const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });

//   const [items, total] = await Promise.all([
//     Notification.find({ recipientUser: null })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate('sentBy', 'name email'),
//     Notification.countDocuments({ recipientUser: null }),
//   ]);

//   return success(res, {
//     message: 'Notifications fetched',
//     data: items,
//     pagination: buildPaginationMeta({ page, limit, total }),
//   });
// });

// module.exports = {
//   saveFcmToken,
//   removeFcmToken,
//   sendNotification,
//   getUserNotifications,
//   deleteNotification,
//   listNotifications,
// };
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const { success, error } = require('../utils/apiResponse');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sendToTokens } = require('../utils/pushNotification');

// Notifications a given app user is allowed to see: every broadcast plus the
// private ones addressed to them — minus anything they removed from their list
// and minus broadcasts that never reached FCM (status "failed").
function visibleToUser(userId) {
  return {
    status: { $ne: 'failed' },
    deletedBy: { $ne: userId },
    $or: [{ recipientUser: null }, { recipientUser: userId }],
  };
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (_err) {
    return false;
  }
}

// Removes tokens FCM reported as dead (app uninstalled / token rotated) so the
// next broadcast doesn't waste a slot on them.
async function clearDeadTokens(tokens) {
  if (!tokens || tokens.length === 0) return;
  await User.updateMany({ fcmToken: { $in: tokens } }, { $set: { fcmToken: null } });
}

// POST /api/user/fcm-token  (protected app user)  { fcmToken }
// Called by the app right after login, on every app start and whenever Firebase
// rotates the device token. Saving the token is all that is needed for the
// device to receive admin broadcasts and its own private notifications.
const saveFcmToken = asyncHandler(async (req, res) => {
  const fcmToken = req.body.fcmToken || req.body.token || req.body.deviceToken;
  if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.length > 4096) {
    return error(res, { statusCode: 400, message: 'fcmToken is required' });
  }

  // If another account previously registered this exact device token (shared
  // phone / account switch), clear it from them so the wrong person is never
  // notified.
  await User.updateMany({ fcmToken, _id: { $ne: req.user._id } }, { $set: { fcmToken: null } });

  if (req.user.fcmToken !== fcmToken) {
    req.user.fcmToken = fcmToken;
    await req.user.save();
  }

  return success(res, { message: 'Device registered for notifications' });
});

// DELETE /api/user/fcm-token  (protected app user)
// Called on logout so a signed-out device stops receiving notifications.
const removeFcmToken = asyncHandler(async (req, res) => {
  if (req.user.fcmToken) {
    req.user.fcmToken = null;
    await req.user.save();
  }
  return success(res, { message: 'Device unregistered' });
});

// POST /api/admin/notifications/send  (protected admin)  { title, body, imageUrl? }
// Pushes to EVERY active user's device at once and records the broadcast so it
// also shows up in each user's in-app notification list and the admin history.
const sendNotification = asyncHandler(async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  const imageUrl = typeof req.body.imageUrl === 'string' ? req.body.imageUrl.trim() : '';

  if (!title || !body) {
    return error(res, { statusCode: 400, message: 'title and body are required' });
  }
  if (title.length > 100) {
    return error(res, { statusCode: 400, message: 'title must be 100 characters or fewer' });
  }
  if (body.length > 500) {
    return error(res, { statusCode: 400, message: 'body must be 500 characters or fewer' });
  }
  if (imageUrl && !isHttpUrl(imageUrl)) {
    return error(res, { statusCode: 400, message: 'imageUrl must be a valid http(s) link' });
  }

  const users = await User.find({ fcmToken: { $nin: [null, ''] }, status: 'active' })
    .select('fcmToken')
    .lean();
  const tokens = users.map((user) => user.fcmToken);

  const result = await sendToTokens({
    tokens,
    title,
    body,
    imageUrl,
    data: { type: 'admin_broadcast' },
  });

  await clearDeadTokens(result.invalidTokens);

  const record = await Notification.create({
    title,
    body,
    imageUrl,
    type: 'broadcast',
    sentBy: req.admin._id,
    status: result.success ? 'sent' : 'failed',
    error: result.success ? '' : result.error,
    recipientCount: tokens.length,
    successCount: result.successCount,
    failureCount: result.failureCount,
  });

  if (!result.success) {
    return error(res, {
      statusCode: 502,
      message: `Notification could not be delivered: ${result.error}`,
    });
  }

  let message;
  if (tokens.length === 0) {
    message =
      'Saved. No devices are registered for push yet — users will see it in their notification list when they open the app.';
  } else if (result.failureCount > 0) {
    message = `Delivered to ${result.successCount} of ${tokens.length} devices (${result.failureCount} could not be reached).`;
  } else {
    message = `Delivered to all ${result.successCount} registered device${result.successCount === 1 ? '' : 's'}.`;
  }

  return success(res, { statusCode: 201, message, data: record });
});

// GET /api/user/notifications  (protected user) ?page=&limit=
// The app's notification list, newest first.
const getUserNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = visibleToUser(req.user._id);

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .select('title body imageUrl type recipientUser sentBy createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sentBy', 'name')
      .lean(),
    Notification.countDocuments(filter),
  ]);

  const data = items.map(({ recipientUser, ...item }) => ({
    ...item,
    // Rows created before `type` existed: private ones are generic, others are broadcasts.
    type: item.type || (recipientUser ? 'personal' : 'broadcast'),
    isPersonal: !!recipientUser,
  }));

  return success(res, {
    message: 'Notifications fetched',
    data,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

// DELETE /api/user/notifications/:id  (protected user)
// Private notifications are deleted; shared broadcasts are only hidden for this
// user so everybody else (and the admin history) keeps them.
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findOne({
    _id: id,
    $or: [{ recipientUser: null }, { recipientUser: req.user._id }],
  }).select('recipientUser');
  if (!notification) {
    return error(res, { statusCode: 404, message: 'Notification not found' });
  }

  if (notification.recipientUser) {
    await Notification.deleteOne({ _id: id });
  } else {
    await Notification.updateOne({ _id: id }, { $addToSet: { deletedBy: req.user._id } });
  }

  return success(res, { message: 'Notification deleted successfully', data: { id } });
});

// DELETE /api/user/notifications  (protected user)
// "Clear all" — same rules as deleting one, in two queries instead of N requests.
const clearUserNotifications = asyncHandler(async (req, res) => {
  await Promise.all([
    Notification.deleteMany({ recipientUser: req.user._id }),
    Notification.updateMany(
      { recipientUser: null, deletedBy: { $ne: req.user._id } },
      { $addToSet: { deletedBy: req.user._id } },
    ),
  ]);

  return success(res, { message: 'All notifications cleared' });
});

// GET /api/admin/notifications  (protected admin) ?page=&limit=
// History of notifications sent from the admin panel, newest first.
const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });

  const [items, total] = await Promise.all([
    Notification.find({ recipientUser: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sentBy', 'name email'),
    Notification.countDocuments({ recipientUser: null }),
  ]);

  return success(res, {
    message: 'Notifications fetched',
    data: items,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

module.exports = {
  saveFcmToken,
  removeFcmToken,
  sendNotification,
  getUserNotifications,
  deleteNotification,
  clearUserNotifications,
  listNotifications,
  clearDeadTokens,
};
