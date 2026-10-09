# SmartKhedut Backend API

Node.js + Express + MongoDB backend for the **SmartKisan** React Native app and the
**smartkhedut-admin** React admin panel.

## Features
- JWT auth for app users (register/login with `mobile` + `password`) and for admins (`email` + `password`)
- Trade (crop marketplace) categories + posts, up to 5 photos per post
- Market (Khedut Bazar) categories + advertisements, up to 4 photos per ad
- Admin moderation (approve / reject / verify) for both Trade and Market
- Users management, Schemes CRUD, Dashboard stats
- Pagination on every list endpoint (`?page=&limit=`)
- Image uploads served statically from `/uploads`

## 1. Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env -> set MONGO_URI to your local or Atlas connection string
```

## 2. Seed default data (default admin + categories)

```bash
npm run seed
```

This creates:
- Admin login: `admin@smartkhedut.in` / `Admin@123` (change via `.env` before seeding, or update in DB after)
- 7 Trade categories (Vegetables, Grains, Oilseeds, Cotton, Fruits, Pulses, Spices)
- 26 Market categories (Cow, Buffalo, Ox, Tractor, Drip Irrigation, ... grouped by Livestock/Animals/Crops/Machinery/Irrigation/Tools/Vehicles)

## 3. Run

```bash
npm run dev     # nodemon, auto-restart
# or
npm start
```

Server starts on `http://localhost:3000` (Android emulator: use `http://10.0.2.2:3000` from the app, iOS simulator: `http://localhost:3000`).

## 4. API overview

All responses share this shape:
```json
{ "success": true, "message": "...", "data": ..., "pagination": { "page":1,"limit":10,"total":42,"totalPages":5,"hasNextPage":true,"hasPrevPage":false } }
```
Errors:
```json
{ "success": false, "message": "..." , "errors": [ "optional field-level messages" ] }
```

### Auth (app)
| Method | Route | Body | Auth |
|---|---|---|---|
| POST | /api/auth/register | username, mobile, password | - |
| POST | /api/auth/login | mobile, password | - |
| POST | /api/auth/password-reset-requests | mobile, newPassword, confirmPassword | - |
| GET | /api/user/profile | - | Bearer user token |
| PUT | /api/user/profile | username?, location?, avatar? | Bearer user token |
| PUT | /api/user/change-password | currentPassword, newPassword | Bearer user token |

### Trade
| Method | Route | Notes |
|---|---|---|
| GET | /api/trade/categories | public, `?active=true` |
| GET | /api/trade/posts | public, `?page=&limit=&category=&search=&location=&sort=` (default status=active) |
| GET | /api/trade/posts/mine | user token, own posts any status |
| GET | /api/trade/posts/:id | public |
| POST | /api/trade/posts | user token, multipart `photos` (up to 5) + name, category, price, quantity, unit, description, location |
| PUT | /api/trade/posts/:id | owner only; updates name, price, quantity, unit, description, location; optional multipart `image` replaces photos or `photos` appends (up to 5 total) |
| DELETE | /api/trade/posts/:id | owner only |
| POST/PUT/DELETE | /api/admin/trade/categories | admin token |
| GET | /api/admin/trade/posts | admin token, `?status=&category=&search=&page=&limit=` |
| PATCH | /api/admin/trade/posts/:id/status | admin token, `{status, verified}` |

### Market
Same pattern as Trade, under `/api/market/categories` and `/api/market/ads`
(fields: title, category, price, year, location, phone, description, condition, negotiable; up to 4 photos).

### Admin
| Method | Route |
|---|---|
| POST | /api/admin/auth/login |
| GET | /api/admin/auth/me |
| GET | /api/admin/dashboard/stats |
| GET | /api/admin/users?search=&status=&page=&limit= |
| PATCH | /api/admin/users/:id/status |
| PATCH | /api/admin/users/:id/verify |
| GET | /api/admin/password-reset-requests?status=pending&page=&limit= | admin token |
| PATCH | /api/admin/password-reset-requests/:id/approve | admin token, `{ "identityVerified": true }` |
| PATCH | /api/admin/password-reset-requests/:id/reject | admin token |

Password recovery uses support/admin verification instead of OTP. The app submits
the registered mobile number and the new password to
`POST /api/auth/password-reset-requests`. The password is stored as a hash while
the request is pending; the user's password changes only after an admin
independently verifies the requester's identity and approves it. The public
endpoint returns the same response whether or not the mobile number has an
account, to avoid exposing registered numbers. Admins can list pending requests,
then approve or reject them using the protected endpoints above.

### Schemes
`GET /api/schemes` (public, paginated), `POST/PUT/DELETE/PATCH .../toggle` under `/api/admin/schemes` (admin token).

### News
`GET /api/news` fetches India-focused news from NewsData.io. Set `NEWSDATA_API_KEY` in `.env`; the key is used only by the backend. `language` accepts `gu`, `hi`, or `en` (default `gu`); `category` accepts `all`, `agriculture`, `farmer`, `farming`, `crop`, `market`, `government-schemes`, `weather`, `gujarat`, or a supported crop name in Gujarati, Hindi, or English. `q` can be used for a custom search and `page` accepts the upstream pagination token.

Examples (replace the host if needed):
```text
GET http://localhost:3000/api/news?language=gu
GET http://localhost:3000/api/news?language=hi
GET http://localhost:3000/api/news?language=en
GET http://localhost:3000/api/news?language=gu&category=agriculture
GET http://localhost:3000/api/news?language=gu&category=farmer
GET http://localhost:3000/api/news?language=gu&category=crop
GET http://localhost:3000/api/news?language=gu&category=market
GET http://localhost:3000/api/news?language=gu&category=government-schemes
GET http://localhost:3000/api/news?language=gu&category=weather
GET http://localhost:3000/api/news?language=gu&category=gujarat
GET http://localhost:3000/api/news?language=gu&q=ખેડૂત
GET http://localhost:3000/api/news?language=hi&category=agriculture
GET http://localhost:3000/api/news?language=hi&q=%E0%A4%95%E0%A4%BF%E0%A4%B8%E0%A4%BE%E0%A4%A8
GET http://localhost:3000/api/news?language=en&category=agriculture
GET http://localhost:3000/api/news?language=en&q=farmer
GET http://localhost:3000/api/news?language=gu&page=NEXT_PAGE_TOKEN
```

News items include the original article `url`; the app should open that URL rather than relying on full article content, which may not be available on the NewsData.io free plan.

## 5. Postman
Import `SmartKhedut_Trade_API.postman_collection.json` into Postman. Its `baseUrl` collection
variable defaults to `http://localhost:3000/api`; change it if your server uses another host or port.

Run **Auth > Register User** (or **Auth > Login User** for an existing account), then
**Trade Posts > List Trade Categories**, **Create Trade Post**, and
**Update Trade Post (Image Optional)**. The collection automatically saves the user token,
first category ID, and created post ID. For a text-only update, do not select a file in the
`image` field; to replace the post image, select a JPG, PNG, or WEBP file.

## 6. Folder structure
```
backend/
  server.js
  src/
    config/db.js
    models/            Mongoose schemas
    controllers/        business logic
    routes/              express routers
    middleware/         auth (JWT), upload (multer), error handling
    utils/                  pagination, response helpers, token helpers
    seed/seed.js
  uploads/trade, uploads/market   uploaded photos (served at /uploads/...)
```
