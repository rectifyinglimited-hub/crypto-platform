# Nexus — Full-Stack Foundation

A production-grade, dark-mode React + Node starter with defensive backend architecture and an immersive Framer-Motion SignUp UI.

## Structure

```
outputs/
├── backend/
│   ├── server.js                # Express bootstrap (port 5001, DB-fault-tolerant)
│   ├── routes/auth.js           # Register / login / me / logout / ping
│   ├── models/User.js           # Mongoose schema
│   ├── middleware/auth.js       # JWT bearer guard
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── lib/api.js           # Central Axios + auto-Bearer interceptor
    │   ├── components/SignUp.jsx  # Animated SignUp module
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── .env.example
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev   # requires nodemon; or: npm start
# → http://localhost:5001   (health: /health, auth: /api/auth/*)
```

If MongoDB is not running, the server logs a warning and **stays up** on port 5001. `/health` reports `database: "offline"`; register/login return a clean `503`.

## Frontend

```bash
cd frontend
cp .env.example .env         # optional — falls back to http://localhost:5001/api
npm install
npm run dev
# → http://localhost:5173
```

Token storage key: `nexus_token` in `localStorage`. The Axios instance auto-attaches `Authorization: Bearer <token>` on every request, and clears the token on any `401`.

## Endpoints

| Method | Path                | Description                        |
|-------:|---------------------|------------------------------------|
| GET    | `/health`           | Liveness + DB status               |
| GET    | `/api/auth/ping`    | Auth-module heartbeat              |
| POST   | `/api/auth/register`| Create account (returns JWT)       |
| POST   | `/api/auth/login`   | Sign in (returns JWT)              |
| GET    | `/api/auth/me`      | Current user (bearer required)     |
| POST   | `/api/auth/logout`  | Stateless — discard client token   |
