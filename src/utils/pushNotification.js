// Thin wrapper around Firebase Cloud Messaging.
//
// Broadcasts go DIRECTLY to every saved device token (in batches of 500, the
// FCM multicast limit, all batches in parallel) instead of through a topic.
// Compared to topic fan-out this means:
//   - a device gets notifications as soon as its token is saved — there is no
//     second "subscribe" step that can silently fail;
//   - we learn exactly how many devices accepted / rejected the message;
//   - dead tokens (app uninstalled) are reported back so they can be cleaned up.

const { getFirebaseAdmin } = require('../config/firebase');

// Must match the channel the Android app creates in MainApplication.kt.
const ANDROID_CHANNEL_ID = 'smartkisan_alerts_v2';
// Must match android/app/src/main/res/drawable/ic_stat_notification.xml.
const ANDROID_SMALL_ICON = 'ic_stat_notification';
const NOTIFICATION_COLOR = '#2D6A10';
const FCM_MULTICAST_LIMIT = 500;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

const NOT_CONFIGURED_ERROR = 'Firebase is not configured on the server (see FIREBASE_SETUP.md)';

function stringifyData(data = {}) {
  // FCM data payload values must all be strings.
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

function buildMessage({ title, body, imageUrl, data }) {
  return {
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: stringifyData(data),
    android: {
      priority: 'high', // wake the device even in Doze so it shows while the app is closed
      ttl: ONE_DAY_MS, // still deliver if the phone was off for a few hours
      notification: {
        channelId: ANDROID_CHANNEL_ID,
        icon: ANDROID_SMALL_ICON,
        color: NOTIFICATION_COLOR,
        sound: 'default',
        priority: 'high',
        visibility: 'public',
        defaultVibrateTimings: true,
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default' } },
      ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
    },
  };
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Sends one notification to many device tokens.
// Returns {
//   success, notConfigured, error,
//   successCount, failureCount, invalidTokens: string[]
// }
// `success` is true when at least one device accepted it (or there was nobody to send to).
async function sendToTokens({ tokens, title, body, imageUrl, data }) {
  const admin = getFirebaseAdmin();
  if (!admin) {
    return {
      success: false,
      notConfigured: true,
      error: NOT_CONFIGURED_ERROR,
      successCount: 0,
      failureCount: 0,
      invalidTokens: [],
    };
  }

  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  if (uniqueTokens.length === 0) {
    return { success: true, error: '', successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const message = buildMessage({ title, body, imageUrl, data });

  const batches = await Promise.all(
    chunk(uniqueTokens, FCM_MULTICAST_LIMIT).map(async (batchTokens) => {
      try {
        const response = await admin.messaging().sendEachForMulticast({ ...message, tokens: batchTokens });
        const invalidTokens = [];
        let firstError = '';
        response.responses.forEach((result, index) => {
          if (result.success) return;
          if (!firstError) firstError = result.error?.message || 'Unknown FCM error';
          if (DEAD_TOKEN_CODES.has(result.error?.code)) invalidTokens.push(batchTokens[index]);
        });
        return {
          successCount: response.successCount,
          failureCount: response.failureCount,
          invalidTokens,
          error: firstError,
        };
      } catch (err) {
        console.error('[push] FCM batch failed:', err.message);
        return { successCount: 0, failureCount: batchTokens.length, invalidTokens: [], error: err.message };
      }
    }),
  );

  const totals = batches.reduce(
    (acc, batch) => ({
      successCount: acc.successCount + batch.successCount,
      failureCount: acc.failureCount + batch.failureCount,
      invalidTokens: acc.invalidTokens.concat(batch.invalidTokens),
      error: acc.error || batch.error,
    }),
    { successCount: 0, failureCount: 0, invalidTokens: [], error: '' },
  );

  return {
    ...totals,
    success: totals.successCount > 0,
    // Keep the error text only when nothing was delivered, so a few dead
    // tokens in a big broadcast don't make a successful send look broken.
    error: totals.successCount > 0 ? '' : totals.error,
  };
}

// Sends a private notification to ONE device (e.g. password-reset decision).
// Returns { success, error?, invalidToken? }
async function sendToUser({ token, title, body, data = {} }) {
  const result = await sendToTokens({ tokens: [token], title, body, data });
  if (!result.success) {
    console.error('[push] Failed to send user notification:', result.error);
  }
  return {
    success: result.success,
    ...(result.success ? {} : { error: result.error || 'Notification was not delivered' }),
    ...(result.invalidTokens.length > 0 ? { invalidToken: result.invalidTokens[0] } : {}),
  };
}

module.exports = {
  sendToTokens,
  sendToUser,
  ANDROID_CHANNEL_ID,
  ANDROID_SMALL_ICON,
};
