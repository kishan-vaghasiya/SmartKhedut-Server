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
| PUT | /api/trade/posts/:id | owner only |
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

### Schemes
`GET /api/schemes` (public, paginated), `POST/PUT/DELETE/PATCH .../toggle` under `/api/admin/schemes` (admin token).

## 5. Postman
Import `SmartKhedut.postman_collection.json` and `SmartKhedut.postman_environment.json`.
Run **Auth > Register** or **Auth > Login**, then **Admin > Admin Login** — both automatically
save `{{token}}` / `{{adminToken}}` into the environment via a small test script, so every
other request in the collection just works.

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
