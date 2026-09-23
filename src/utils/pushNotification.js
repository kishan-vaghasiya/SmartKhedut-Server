// Thin wrapper around Firebase Cloud Messaging.
//
// Strategy: every app install subscribes itself to the FCM topic
// "all_users" as soon as it has a device token (see
// POST /api/user/fcm-token in notificationController.js). To notify
// everyone, the backend just publishes ONE message to that topic — Firebase
// fans it out to every subscribed device. This scales to any number of
// users without the backend needing to loop over tokens or hit FCM's
// 500-tokens-per-call multicast limit.

const { getFirebaseAdmin } = require('../config/firebase');

const ALL_USERS_TOPIC = 'all_users';

// Sends { title, body } (+ optional data payload) to every subscribed device.
// Returns { success, messageId } or { success: false, error }.
async function sendToAllUsers({ title, body, imageUrl, data = {} }) {
  const admin = getFirebaseAdmin();
  if (!admin) {
    return { success: false, error: 'Firebase is not configured on the server (see FIREBASE_SETUP.md)' };
  }

  const message = {
    topic: ALL_USERS_TOPIC,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    // Extra key/value data the app can read (e.g. to deep-link on tap).
    // FCM data payloads must be strings.
    data: Object.fromEntries(Object.entries({ ...data, type: data.type || 'admin_broadcast' }).map(([k, v]) => [k, String(v)])),
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
    apns: {
      payload: {
        aps: { sound: 'default' },
      },
      ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
    },
  };

  try {
    const messageId = await admin.messaging().send(message);
    return { success: true, messageId };
  } catch (err) {
    console.error('[push] Failed to send FCM broadcast:', err.message);
    return { success: false, error: err.message };
  }
}

// Subscribes a single device token to the broadcast topic. Called right
// after the app saves/refreshes its FCM token.
async function subscribeToAllUsersTopic(token) {
  const admin = getFirebaseAdmin();
  if (!admin || !token) return;
  try {
    await admin.messaging().subscribeToTopic(token, ALL_USERS_TOPIC);
  } catch (err) {
    console.error('[push] Failed to subscribe token to topic:', err.message);
  }
}

// Unsubscribes a token (e.g. on logout) so a signed-out device stops
// receiving broadcasts meant for logged-in users.
async function unsubscribeFromAllUsersTopic(token) {
  const admin = getFirebaseAdmin();
  if (!admin || !token) return;
  try {
    await admin.messaging().unsubscribeFromTopic(token, ALL_USERS_TOPIC);
  } catch (err) {
    console.error('[push] Failed to unsubscribe token from topic:', err.message);
  }
}

module.exports = { sendToAllUsers, subscribeToAllUsersTopic, unsubscribeFromAllUsersTopic, ALL_USERS_TOPIC };
