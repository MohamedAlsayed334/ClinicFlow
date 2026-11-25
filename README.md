# ClinicFlow


## About

**طبّي (Tabby)** is an Arabic, RTL clinic booking web application. Patients search for doctors by specialty and area, pick a 30-minute time slot, and book an appointment. Patients can book as guests or with a registered account. Admins manage doctors, weekly schedules, and appointments through a dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Bootstrap 5 RTL, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (local or Atlas) |
| Font | Cairo (via @fontsource/cairo) |
| Testing | Vitest, Supertest, mongodb-memory-server, React Testing Library |
| Containerization | Docker, Docker Compose |

## Prerequisites

- **Node.js** 20 or newer
- **npm** (comes with Node.js)
- **Git**
- **MongoDB** — choose one:
  - **Local MongoDB**: Install [MongoDB Community Edition](https://www.mongodb.com/try/download/community) and ensure `mongod` is running on the default port (27017). The default connection string is `mongodb://127.0.0.1:27017/clinicflow`.
  - **MongoDB Atlas** (optional): Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com), set up a database user, allow your IP, and copy the connection string.
- **Docker Desktop** (optional, for containerized running)

## Environment Setup

### Server

1. Copy the example env file:
   ```bash
   cp server/.env.example server/.env
   ```
2. Fill in the values in `server/.env`:
   - `MONGODB_URI` — your MongoDB connection string (local: `mongodb://127.0.0.1:27017/clinicflow`, or your Atlas URI)
   - `JWT_SECRET` — a random secret string for signing JWTs
   - `ADMIN_EMAIL` — email for the seeded admin account
   - `ADMIN_PASSWORD` — password for the seeded admin account

### Client

1. Copy the example env file:
   ```bash
   cp client/.env.example client/.env
   ```
2. The defaults should work for local development.

## Running the App

### Without Docker

Open two terminals:

**Server** (terminal 1):
```bash
cd server
npm install
npm run dev
```
Server runs at http://localhost:4000. Test it: `GET http://localhost:4000/api/health`

**Client** (terminal 2):
```bash
cd client
npm install
npm run dev
```
Client runs at http://localhost:5173.

### With Docker

```bash
docker compose up --build
```
- Client: http://localhost:5173
- Server: http://localhost:4000

> **Note:** Make sure `server/.env` and `client/.env` files exist before running Docker.

## Running Tests

```bash
cd server && npm test
cd client && npm test
```

## Linting and Formatting

```bash
# In either server/ or client/:
npm run lint
npm run format        # auto-fix formatting
npm run format:check  # check formatting without fixing
```

## Folder Structure

```
/
├── client/          React + TypeScript + Vite + Bootstrap RTL
├── server/          Node.js + Express + TypeScript + Mongoose
├── design/          Reference screenshots (read-only)
├── docker-compose.yml
├── README.md
├── SPEC.md          Full product specification
├── PHASES.md        Build phases
└── AGENTS.md        Agent rules and constraints
```

## API

See [SPEC.md](SPEC.md) for the full API specification, data model, and validation rules.

## Git Workflow

- One branch per phase: `phase-0-setup`, `phase-1-api-core`, etc.
- Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`
- Merge into `main` only through pull requests after review.
