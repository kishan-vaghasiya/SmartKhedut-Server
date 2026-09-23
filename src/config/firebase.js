// Initializes the Firebase Admin SDK so the backend can send push
// notifications (FCM) to the SmartKisan mobile app.
//
// Setup (see FIREBASE_SETUP.md at the project root for the full walkthrough):
// 1. Firebase Console -> Project settings -> Service accounts -> "Generate
//    new private key". This downloads a serviceAccountKey.json file.
// 2. Place that file at the backend project root as `serviceAccountKey.json`
//    (already git-ignored), OR set the individual FIREBASE_* env vars below
//    (handy for hosts like Render/Railway where you can't upload a file).
//
// Nothing else in the codebase should call admin.initializeApp() directly —
// always `require('../config/firebase')` and use the exported `admin`.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let initialized = false;

function loadServiceAccount() {
  // Option A: full JSON pasted into a single env var (base64 or raw JSON).
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  }

  // Option B: individual env vars (project id / client email / private key).
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      // Render/most dashboards store multi-line keys with literal "\n" — convert back to real newlines.
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  // Option C: a serviceAccountKey.json file sitting at the project root.
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, '..', '..', 'serviceAccountKey.json');

  if (fs.existsSync(keyPath)) {
    return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }

  return null;
}

function getFirebaseAdmin() {
  if (initialized) return admin;

  const serviceAccount = loadServiceAccount();

  if (!serviceAccount) {
    console.warn(
      '[firebase] No Firebase service account found. Push notifications are DISABLED.\n' +
        '           Add serviceAccountKey.json at the project root, or set FIREBASE_SERVICE_ACCOUNT ' +
        '(or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY) in your .env. See FIREBASE_SETUP.md.',
    );
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
  console.log(`[firebase] Admin SDK initialized for project "${serviceAccount.project_id}"`);
  return admin;
}

module.exports = { getFirebaseAdmin };
