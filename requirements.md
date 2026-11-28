# ClinicFlow Requirements

ClinicFlow (Arabic: طبّي) is an Arabic-only, RTL web application for booking 30-minute clinic appointments. This document is the single source of truth for **what** the product must do. Technical choices and structure live in [architecture.md](architecture.md); build order and gates live in [PHASES.md](PHASES.md); agent working rules live in [AGENTS.md](AGENTS.md).

## 1. Scope

| Item | Decision |
|---|---|
| Users | Guest, registered patient, admin |
| Language and direction | Arabic UI only, RTL layout, Western digits (0-9) |
| Booking | Guest books with name + mobile; registration is optional; patients may also book with an account |
| Slot length | 30 minutes |
| Horizon | Today plus the next 6 Cairo days (7 days total) |
| Cancellation | Non-admin cancellation only when the appointment starts at least 3 hours from now |
| Guest lookup/cancel | Booking code + mobile number |
| Admin | Manage doctors and weekly schedules; view and cancel appointments; specialties and areas are fixed seeded lists |
| Runtime | Local only: `npm run dev` or `docker compose up` |
| Database | MongoDB. Local MongoDB is supported for development; MongoDB Atlas is the target for grading/demo |
| Timezone | Business logic uses `Africa/Cairo`; storage uses UTC; Luxon handles conversion |
| Ratings | Static doctor fields (`rating`, `reviewCount`); no review system |
| Doctor photos | None; show the first letter of the doctor name in a circle |

## 2. Functional requirements

### 2.1 Public discovery

| ID | Requirement | Acceptance |
|---|---|---|
| FR-P1 | Expose `GET /api/metadata` returning the seeded specialty and area lists as `{id, nameAr}` pairs. | Both arrays are returned; empty database returns empty arrays. |
| FR-P2 | Expose `GET /api/doctors` with filters `specialtyId`, `areaId`, `minRating`, `maxFee`, sort (`earliest` default, `rating`, `fee`), `page` (default 1), `pageSize` (default 10, max 20). | Only `isActive: true` doctors are returned; each item includes `nextAvailableSlot`; with `earliest`, doctors whose slot is `null` sort last. |
| FR-P3 | Expose `GET /api/doctors/:id` with the full DTO plus `weeklySchedule`. | Unknown or malformed id returns `404 NOT_FOUND`. |
| FR-P4 | Expose `GET /api/doctors/:id/slots` for the 7-day horizon. | Slots are UTC ISO strings grouped by Cairo date label; days with no slots are omitted. |
| FR-P5 | Search results show a count, active filter chips, sort control, pagination, and doctor cards. | Query parameters drive state so results pages are shareable. |

### 2.2 Booking and guest management

| ID | Requirement | Acceptance |
|---|---|---|
| FR-B1 | `POST /api/appointments` accepts `{doctorId, startsAt, patientName, patientPhone}` with or without an auth cookie. | `startsAt` must be an exact generated future slot inside the horizon; success is `201 {appointment}`. |
| FR-B2 | Each appointment has a unique 8-character code from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, generated with `crypto.randomBytes`. | Codes are unique and never reused. |
| FR-B3 | Double booking is prevented by a unique partial index on `{doctor, startsAt}` for `status: "confirmed"`. | Two concurrent requests for the same slot produce exactly one success; the loser receives `409 SLOT_TAKEN`. A pre-check alone is insufficient. |
| FR-B4 | `GET /api/appointments/lookup?code=&phone=` returns `{appointment}`. | A wrong code and a wrong phone both return the same `404 NOT_FOUND` so codes cannot be probed. |
| FR-B5 | `POST /api/appointments/cancel` accepts `{code, phone}`. | Returns `200 {appointment}` with `status: "cancelled"`; the slot becomes available again. |
| FR-B6 | The confirmation page shows the code, copy button, patient details, doctor, date/time, clinic, cancellation control when `canCancel` is true, and a reminder to keep the code. | Guest can complete the flow without an account. |
| FR-B7 | On `SLOT_TAKEN`, the client shows an inline Arabic alert, refreshes slots, and clears the selection. | Confirm button stays disabled until a new slot is chosen. |

### 2.3 Cancellation

| ID | Requirement | Acceptance |
|---|---|---|
| FR-C1 | For guest and patient cancellation, `startsAt - now >= 3 hours`. | Below the threshold returns `422 CANCEL_WINDOW_PASSED`; exactly 3 hours is allowed. |
| FR-C2 | Cancellation records `cancelledAt` and `cancelledBy` (`guest`, `patient`, or `admin`). | Admin cancellation ignores the 3-hour rule. |
| FR-C3 | The UI hides or disables cancel when `canCancel` is false and explains why. | Confirmation dialog used before cancelling. |

### 2.4 Accounts

| ID | Requirement | Acceptance |
|---|---|---|
| FR-A1 | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. | JWT is stored in an httpOnly `sameSite=lax` cookie named `token`, valid 7 days; user DTO is `{id, name, email, role}`. |
| FR-A2 | Login is rate-limited to 10 attempts per 15 minutes per IP. | Further attempts return `429 RATE_LIMITED`. |
| FR-A3 | A logged-in patient can book; the appointment stores `user` and prefills the patient name in the UI. | Guest bookings are never linked to an account later in v1. |
| FR-A4 | `GET /api/me/appointments` returns `{upcoming, past}`; `POST /api/me/appointments/:code/cancel` is owner-only. | Upcoming ascending, past descending; another patient's code returns `403 FORBIDDEN`. |
| FR-A5 | Login/register pages show inline validation and map server error fields to the correct inputs. | Successful login redirects admin to `/admin/doctors`, patient to the previous page. |

### 2.5 Admin

| ID | Requirement | Acceptance |
|---|---|---|
| FR-AD1 | Admin endpoints: list doctors (including inactive), create, edit, replace schedule, soft-delete, list appointments with filters, cancel any appointment. | Non-admin receives `401` or `403`; role comes from the verified token. |
| FR-AD2 | Doctor deletion is a soft delete (`isActive: false`). | `409 HAS_FUTURE_APPOINTMENTS` if future confirmed appointments exist. |
| FR-AD3 | Schedule replacement accepts only entries with `startTime < endTime`, 30-minute boundaries, one entry per weekday (`0 = Sunday`). | Invalid schedules return `400 VALIDATION_ERROR` with a field map. |
| FR-AD4 | The admin UI provides a doctors table, doctor form with weekly schedule editor, and appointments table with filters and cancel. | An admin can add a doctor with a schedule and a guest can book that doctor immediately. |

### 2.6 Data and seed

| ID | Requirement | Acceptance |
|---|---|---|
| FR-D1 | All collections carry `createdAt` and `updatedAt`. | Enforced by Mongoose timestamps. |
| FR-D2 | Models: `User`, `Specialty`, `Area`, `Doctor`, `Appointment` with the fields and indexes in [architecture.md](architecture.md#6-data-model). | `passwordHash` is never returned by any API response. |
| FR-D3 | `npm run seed` is idempotent: clears/recreates specialties, areas, doctors, appointments, and keeps/recreates the admin. | Running it twice yields the same dataset. |
| FR-D4 | Seed data: specialties عيون، باطنة، جلدية، أطفال، أسنان; areas مدينة نصر، مصر الجديدة، التجمع الخامس، المعادي، الدقي، الجيزة; 24 doctors. | Searching أطفال in مدينة نصر returns about 12 doctors; at least one doctor has no schedule today; a few confirmed sample appointments exist. |
| FR-D5 | Admin credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD`; bcrypt cost is at least 10. | Admin never registers through the UI. |

### 2.7 Frontend pages

| Route | Page | Requirement |
|---|---|---|
| `/` | Home | Inline hand-written SVG hero, search card fed by `/api/metadata`, popular specialties, suggested doctors. |
| `/doctors` | Results | Filters, sort chips, pagination, query-param state. |
| `/doctors/:id` | Doctor + booking | Doctor card → 7 day chips → time chips → patient form → summary → confirm button last. |
| `/booking/:code` | Confirmation | See FR-B6. |
| `/lookup` | Guest lookup/cancel | Code + mobile form with confirmation dialog. |
| `/login`, `/register` | Auth | See FR-A5. |
| `/my-appointments` | My appointments | Upcoming/past split, cancel only when `canCancel`. |
| `/admin` → `/admin/doctors` | Admin | Redirect and guarded admin area. |
| `/admin/doctors/new`, `/admin/doctors/:id/edit` | Doctor form | Includes weekly schedule editor. |
| `/admin/appointments` | Admin appointments | Filters and admin cancel. |

## 3. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-S1 | Security | Passwords hashed with bcrypt cost ≥ 10; `passwordHash` never returned or logged. |
| NFR-S2 | Security | `helmet`, `cookie-parser`, CORS restricted to `CLIENT_ORIGIN` with credentials, login rate limiting. |
| NFR-S3 | Security | Every body, query, and parameter is validated on the server even when the client validates. |
| NFR-S4 | Security | Guest lookup and cancellation return identical 404 responses for wrong code and wrong phone. |
| NFR-R1 | Reliability | Booking correctness relies on the database unique partial index; cancelled appointments free their slot. |
| NFR-R2 | Reliability | Every data-driven view implements four states: loading, error, empty, success. Server-unreachable errors show an Arabic fallback message. |
| NFR-P1 | Performance | Public read endpoints respond within 500 ms on local hardware with a warm database; slot generation is pure and computed on request. |
| NFR-U1 | Usability | Bootstrap 5 RTL build only, `<html lang="ar" dir="rtl">`, logical CSS properties, Cairo font from `@fontsource/cairo`, no external font/image CDNs. |
| NFR-U2 | Usability | Mobile-first: no horizontal scroll at 390px, touch targets at least 44px, chips never clip text. |
| NFR-U3 | Usability | All user-facing strings live in `client/src/content/ar.ts` or `server/src/content/ar.ts`; Western digits everywhere. |
| NFR-T1 | Testability | Vitest in both apps; Supertest + mongodb-memory-server on the server; every endpoint has at least one success and one failure test. |
| NFR-T2 | Testability | Dedicated tests for double booking, the 3-hour rule, slot generation, phone validation, auth guards, and the client booking flow. |
| NFR-M1 | Maintainability | TypeScript strict, no `any`; server layers routes → controllers → services → models; controllers never touch Mongoose directly. |
| NFR-M2 | Maintainability | Named exports, small single-purpose modules, English identifiers and commit messages, no inline code comments. |
| NFR-D1 | Deployment | Node 20 Alpine Dockerfiles with cached dependency layer; `docker-compose.yml` runs server on 4000 and client on 5173; no database container. |
| NFR-D2 | Deployment | Both `.env.example` files stay current; secrets are never committed. |

## 4. Constraints and exclusions

Allowed technologies and packages are listed in [AGENTS.md](AGENTS.md); anything outside that list requires owner approval.

Out of scope for v1: password recovery, email verification, SMS, payments, reviews, doctor photo upload, managing specialties or areas from the UI, linking old guest bookings to a new account, deployment, multiple languages.

## 5. Status mapping

| Phase | Scope | Status |
|---|---|---|
| 0 | Repo setup and tooling | Merged into `main` |
| 1 | API core (models, validation, slots, seed, public reads) | Merged into `main` |
| 2 | Auth, booking, cancellation, admin API | Next |
| 3 | Client foundation | Planned |
| 4 | Public pages | Planned |
| 5 | Accounts, appointments, admin UI | Planned |
| 6 | Polish, QA, docs | Planned |

Detailed entry and exit gates are in [PHASES.md](PHASES.md).
