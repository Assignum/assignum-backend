# Assignum Backend

REST API for the Assignum academic activity management system.

**Stack:** Node.js · Express 5 · TypeScript · Firebase Admin SDK · Firestore · DDD by bounded context

---

## Architecture

```
Flutter App → REST API (this backend) → Firebase Admin SDK → Firebase (Auth + Firestore)
```

The backend is the **only** intermediary. The Flutter app never touches Firebase directly.

## Bounded Contexts

| Context | Prefix | Description |
|---|---|---|
| `iam` | `/api/auth`, `/api/users` | Authentication and user profiles |
| `activities` | `/api/activities` | Activities, tasks, members, invitations |
| `notifications` | `/api/notifications` | Pending invitations for the authenticated user |
| `dashboard` | `/api/dashboard` | Home screen statistics |
| `chatbox` | `/api/chat` | Predefined-response assistant with Firestore history |

Each module follows 4 layers: `domain/` → `application/` → `infrastructure/` → `interfaces/`

---

## Prerequisites

- Node.js >= 18
- A Firebase project with **Firestore** and **Firebase Authentication** enabled
- Firebase Web API Key
- Firebase Service Account JSON (Admin SDK)

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the template and fill in your Firebase credentials:

```bash
cp .env.example config/.env.development
```

Edit `config/.env.development`:

```env
PORT=3000

# Paste the entire service account JSON as a single-line string
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Firebase Web API Key (from Firebase console → Project Settings → Web API Key)
FIREBASE_API_KEY=AIzaSy...
```

### 3. Run in development mode

```bash
npm run dev
```

The server starts at `http://localhost:3000` with hot reload.

---

## Production Build

```bash
npm run build
npm run start
```

---

## Deployment on Render

1. Create a new **Web Service** pointing to this repository.
2. Set **Build Command:** `npm install && npm run build`
3. Set **Start Command:** `npm run start`
4. Add the following **Environment Variables** in Render dashboard:

| Variable | Description |
|---|---|
| `PORT` | Render sets this automatically |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full service account JSON as string |
| `FIREBASE_API_KEY` | Firebase Web API Key |
| `CLIENT_ORIGIN` | Flutter app origin for CORS (optional, defaults to `*`) |

5. Add a **Health Check Path:** `/health`

---

## API Reference

### Health
`GET /health` → `{ status: "ok" }`

### Auth (`/api/auth`)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/register` | — | `{ email, password }` |
| POST | `/login` | — | `{ email, password }` |
| POST | `/logout` | ✓ | — |
| POST | `/forgot-password` | — | `{ email }` |

### Users (`/api/users`)
| Method | Path | Body |
|---|---|---|
| GET | `/me` | — |
| POST | `/me/profile` | `{ fullName, birthDate?, disponibilidad, cargaAcademica, trabajoEnEquipo, comunicacion, horasEstudio }` |
| PUT | `/me/profile` | same fields, all optional |
| GET | `/search?email=` | — |

### Activities (`/api/activities`)
All endpoints require `Authorization: Bearer <idToken>`.

See full endpoint list in the specification (create, get, update, delete, finalize, tasks CRUD, assign, verify, members, invitations).

### Notifications
`GET /api/notifications` → `[{ activityId, activityName, leaderName, dueDate }]`

### Dashboard
`GET /api/dashboard/stats` → `{ totalActivities, pendingTasks, upcomingActivities }`

### Chat
| Method | Path | Body |
|---|---|---|
| POST | `/api/chat/message` | `{ message: string }` |
| GET | `/api/chat/history` | — |
| DELETE | `/api/chat/history` | — |

---

## Authentication

All protected endpoints require the header:

```
Authorization: Bearer <Firebase idToken>
```

The backend verifies the token via `admin.auth().verifyIdToken(token)`.
