# Firebase Push Notifications — Full Setup Guide (A to Z)

Ye guide batati hai ki **Admin panel se bheji hui notification saare SmartKisan app
users tak kaise pahunche**. Teeno projects (backend, admin panel, mobile app) mein
code changes already ho chuke hain — ab sirf Firebase Console side ka setup aur
config files daalni hai.

**Kaise kaam karta hai (short mein):**
App khulte hi ek FCM token banta hai → app us token ko backend ko bhejta hai →
backend us device ko `all_users` naam ke ek Firebase "topic" mein subscribe kar
deta hai → Admin panel se jab bhi notification bheji jaati hai, backend ek hi
message us `all_users` topic ko bhejta hai → Firebase automatically har
subscribed device tak deliver kar deta hai. Isliye chahe 10 users ho ya 10 lakh,
backend ka kaam ek hi rehta hai.

---

## Step 1 — Firebase project banao

1. https://console.firebase.google.com par jao, Google account se login karo.
2. **Add project** → naam do (e.g. `SmartKhedut`) → Continue → Google Analytics
   optional hai, off bhi kar sakte ho → **Create project**.

## Step 2 — Android app add karo

1. Project overview page par Android icon (⚙️ ke paas) par click karo → **Add app → Android**.
2. **Android package name**: `com.smartkisan`
   (ye `SmartKisann/android/app/build.gradle` ke `applicationId` se match hona
   chahiye — already set hai, change mat karna).
3. App nickname: `SmartKisan` (optional).
4. Debug signing certificate SHA-1 (optional abhi ke liye — sirf Google
   Sign-In jaisi cheezon ke liye chahiye, push notification ke liye zaroori
   nahi hai). Skip kar sakte ho.
5. **Register app** → **Download `google-services.json`**.
6. Us file ko yahan rakho:
   ```
   SmartKisann/android/app/google-services.json
   ```
7. "Add Firebase SDK" step pe Next-Next kar ke skip kar do — SDK already
   `package.json` mein add ho chuka hai.

## Step 3 — iOS app add karo (agar iOS pe bhi chalana hai)

1. Same Firebase project mein → **Add app → iOS**.
2. **iOS bundle ID**: `Info.plist` mein jo `CFBundleIdentifier` hai wahi daalo
   (Xcode mein `ios/SmartKisan.xcodeproj` khol ke General tab mein bhi dikh
   jayega).
3. **Register app** → **Download `GoogleService-Info.plist`**.
4. Is file ko Xcode mein drag-drop karke add karo: Xcode kholo
   (`ios/SmartKisan.xcodeproj`), left sidebar mein `SmartKisan` folder (jahan
   `AppDelegate.swift` hai) par right-click → **Add Files to "SmartKisan"** →
   downloaded `GoogleService-Info.plist` select karo → **"Copy items if
   needed"** tick karo → Add.
5. Xcode mein **Signing & Capabilities** tab kholo → **+ Capability** →
   **Push Notifications** add karo, aur **Background Modes** bhi add karke
   usme **Remote notifications** tick karo.
6. Real device / TestFlight / production ke liye push kaam karne ke liye
   Apple Developer account se ek **APNs Authentication Key** banani hogi aur
   use Firebase Console → Project settings → Cloud Messaging tab → **Apple
   app configuration** mein upload karna hoga. (Simulator par push
   notifications kaam nahi karti — sirf real device par test karo.)

## Step 4 — Backend ke liye Service Account Key

1. Firebase Console → ⚙️ **Project settings** → **Service accounts** tab.
2. **Generate new private key** button dabao → ek `.json` file download hogi
   (isme private key hoti hai, isko kabhi GitHub par public push mat karna —
   `.gitignore` mein already add hai).
3. Us file ka naam badal ke `serviceAccountKey.json` rakho aur backend ke
   root folder mein daalo:
   ```
   smartkhedut-backend/serviceAccountKey.json
   ```
   (yahi jagah jahan `server.js` hai, `.env` ke bagal mein)

   **Ya phir** (agar Render/Railway jaisi hosting pe file upload nahi kar
   sakte), `.env` mein ye 3 values daal do (JSON file khol ke copy karo):
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

## Step 5 — Backend install & run

```bash
cd smartkhedut-backend
npm install
npm run dev
```

Server start hote hi console mein ye line dikhni chahiye:
```
[firebase] Admin SDK initialized for project "your-project-id"
```
Agar ye warning dikhe:
```
[firebase] No Firebase service account found. Push notifications are DISABLED.
```
to iska matlab Step 4 sahi se nahi hua — file/env vars check karo.

## Step 6 — Admin panel install & run

```bash
cd smartkhedut-admin
npm install
npm run dev
```
Login karke left sidebar mein **Notifications** tab khulega — wahan se title
+ message likh ke **"Send to all users"** dabao.

## Step 7 — Mobile app install & run

```bash
cd SmartKisann
npm install

# Android
npm run android

# iOS (sirf Mac par)
cd ios && pod install && cd ..
npm run ios
```

App khulne aur login karne ke baad app automatically:
- Notification permission maangega (Android 13+ aur iOS par popup aayega),
- FCM token generate karke backend ko bhej dega (`POST /api/user/fcm-token`),
- backend us token ko `all_users` topic mein subscribe kar dega.

## Step 8 — Test karo

1. App ko kisi real Android device ya emulator par login karo (emulator mein
   bhi Android push kaam karta hai, bas Google Play Services wala emulator
   image use karna — iOS simulator mein push kaam **nahi** karta, real
   device chahiye).
2. Admin panel → Notifications → koi bhi title/message likh ke bhejo.
3. Kuch second mein device par system notification aani chahiye — app
   background/closed ho to bhi.
4. Agar app **foreground** (khula hua) hai, to system banner ki jagah
   ek in-app toast dikhega (ye already wire kiya hua hai
   `src/utils/PushNotifications.ts` mein).

### Troubleshooting

| Problem | Fix |
|---|---|
| `[firebase] No Firebase service account found` | Step 4 dobara karo — file ka naam/location check karo |
| Admin panel se "Notification could not be delivered" | Backend console mein exact error dekho — usually service account galat project ka hai |
| App notification permission hi nahi maang raha | App uninstall karke fresh install karo (permission ek baar deny hone ke baad dobara popup nahi aata — settings se manually allow karna padega) |
| Android build fail ho raha `google-services.json` missing | Step 2.6 dobara check karo — file exactly `android/app/google-services.json` par honi chahiye |
| iOS build fail Firebase/Swift linkage error | `ios/Podfile` mein diya static-framework note follow karo, phir `pod install` dobara chalao |

---

## Kya-kya files change hui (reference)

**Backend:**
- `src/config/firebase.js` — Firebase Admin init
- `src/utils/pushNotification.js` — broadcast helper (`all_users` topic)
- `src/models/User.js` — `fcmToken` field
- `src/models/Notification.js` — sent-notification history
- `src/controllers/notificationController.js`, `src/routes/notificationRoutes.js`
- `server.js`, `.env.example`, `.gitignore`

**Admin panel:**
- `src/services/notificationService.js`
- `src/pages/Notifications.jsx` (naya page)
- `src/App.jsx`, `src/components/Sidebar.jsx` (route + nav link)

**Mobile app:**
- `package.json` — `@react-native-firebase/app`, `@react-native-firebase/messaging`
- `android/build.gradle`, `android/app/build.gradle` — google-services plugin
- `android/app/src/main/AndroidManifest.xml` — permission + default channel
- `ios/SmartKisan/AppDelegate.swift`, `ios/Podfile` — Firebase configure
- `src/utils/PushNotifications.ts` (naya) — permission, token sync, listeners
- `index.js` — background handler
- `App.tsx`, `src/navigation/StackNavigation.tsx` — listeners + navigationRef
- `src/context/AuthContext.tsx` — login/logout par register/unregister
- `src/api/ApiEndpoints.ts` — `SAVE_FCM_TOKEN`, `REMOVE_FCM_TOKEN`
