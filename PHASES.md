# PHASES — build order and gates

Work one phase at a time. Each phase has an **entry gate** (what must be true before starting), a **work prompt** (what the agent implements), and an **exit gate** (what must be true before merging). The agent reads `AGENTS.md`, `requirements.md`, and `architecture.md` before starting.

Change nothing outside the current phase. If a phase is blocked, stop and report instead of stacking the next phase on top.

## Current status

| Phase | Branch / PR | Scope | Status |
|---|---|---|---|
| 0 | `phase-0-setup`, PR #1 | Repo setup and tooling | **Merged** |
| 1 | `phase-1-api-core`, PR #3 | API core | **Merged** |
| 2 | `phase-2-auth-booking` | Auth, booking, cancellation, admin API | **Next** |
| 3 | `phase-3-client-foundation` | Client foundation | Planned |
| 4 | `phase-4-public-pages` | Public pages | Planned |
| 5 | `phase-5-accounts-admin` | Accounts, appointments, admin UI | Planned |
| 6 | `phase-6-polish` | Polish, QA, docs | Planned |

PR #2 was closed because its commits predated the rebase of Phase 0; PR #3 carries the identical Phase 1 tree on top of current `main`.

## Owner prerequisites

- Node.js 20+ and Git installed.
- MongoDB available: local `mongod` on port 27017 for development, or an Atlas cluster for demo/grading.
- `design/` screenshots added before Phase 3: `home-desktop.png`, `results-desktop.png`, `booking-desktop.png`, `confirmation-desktop.png`. They are not in the repository yet.
- Docker Desktop optional until Phase 6.

---

## Phase 0 — Repo setup (done)

**Entry gate:** empty repository with a README heading.

**Work completed:** Vite + React + TypeScript client with Bootstrap RTL, Cairo, React Router, and a placeholder home; Express + TypeScript server with `/api/health`, central error handler, env loading, and Mongoose connection; ESLint, Prettier, Vitest, Dockerfiles, `docker-compose.yml`, `.env.example` files, and root documentation.

**Exit gate:** `npm run dev` works in both apps, `/api/health` returns OK, `docker compose up` starts both, lint and tests pass. Verified locally against MongoDB on port 27017. Atlas connectivity remains an owner check.

---

## Phase 1 — API core (done)

**Entry gate:** Phase 0 merged and green.

**Work completed:** Mongoose models with a unique partial confirmed-slot index; Arabic messages and validation helpers; pure Luxon slot generator; idempotent seed script; `GET /api/metadata`, `GET /api/doctors`, `GET /api/doctors/:id`, `GET /api/doctors/:id/slots`; Supertest integration tests.

**Exit gate:** 25/25 server tests pass, seed produces 24 doctors with about 12 pediatric doctors in مدينة نصر, slots are UTC ISO strings. The database-dependent acceptance check is an owner command (`cd server && npm run seed`) because no Atlas credentials were used by the agent.

**Carry-over:** model-level schedule validators and the health failure test are scheduled for Phases 2 and 6.

---

## Phase 2 — Auth, booking, cancellation, admin API (next)

**Branch:** `phase-2-auth-booking`

**Entry gate:** `main` contains Phases 0 and 1 and both apps pass lint, format check, tests, and build.

**Prompt:**

```
Read AGENTS.md, requirements.md, and PHASES.md. Do Phase 2 on branch phase-2-auth-booking.

Build in server/:
1. Auth: register, login, logout, me with bcrypt, JWT in an httpOnly cookie,
   login rate limiting, helmet, cookie-parser, and CORS with credentials.
   Add optionalAuth, requireAuth, and requireAdmin middleware.
2. Appointments: POST /api/appointments with optional auth, 8-character codes,
   double-booking protection via the unique partial index (translate
   duplicate-key errors to SLOT_TAKEN), lookup, guest cancel, my appointments,
   and patient cancel with the 3-hour rule.
3. Admin API: doctor list/create/edit/schedule-replace/soft-delete with the
   future-appointments check and schedule validation, appointments list with
   filters, and admin cancel without the 3-hour restriction.
4. Encode weeklySchedule validation in the Doctor model: one entry per day,
   startTime < endTime, and 30-minute boundaries.

Tests: concurrent booking of one slot (exactly one success), cancellation at
and just under 3 hours, wrong-phone lookup returning 404, ownership checks,
non-admin rejection on every admin endpoint, and validation field maps.
Finish with the phase report from AGENTS.md.
```

**Exit gate:** full HTTP flow works (register → login → book → list → cancel), concurrent-booking test passes, non-admin cannot reach admin routes, and all verification commands exit 0.

---

## Phase 3 — Client foundation

**Branch:** `phase-3-client-foundation`

**Entry gate:** Phase 2 merged; `design/` screenshots present; server API contract stable.

**Prompt:**

```
Read AGENTS.md, requirements.md, architecture.md, and every screenshot in design/.
Do Phase 3 on branch phase-3-client-foundation.

Build in client/:
1. theme.css with variables sampled from the screenshots, Bootstrap RTL
   overrides, global RTL, and Cairo font setup.
2. Typed API client: fetch wrapper with credentials and SPEC error parsing
   into the requirements.md error shape, with an Arabic fallback message.
3. Auth context and route guards for patient and admin.
4. Responsive header and footer per requirements.md.
5. Reusable Button, Card, Chip, FormField, Spinner, EmptyState, ErrorState,
   Alert, Pagination, and Avatar components.
6. Arabic content file, client phone validation helper with the same tests as
   the server, and all routes from requirements.md as placeholders.

Verify at 390px and desktop. Add tests for FormField, Chip selection, and the
phone helper. Finish with the phase report.
```

**Exit gate:** every route renders a placeholder inside the real layout, the header works on mobile, and component tests pass.

---

## Phase 4 — Public pages

**Branch:** `phase-4-public-pages`

**Entry gate:** Phase 3 merged; public endpoints verified.

**Prompt:**

```
Read AGENTS.md, requirements.md, architecture.md, and compare with design/.
Do Phase 4 on branch phase-4-public-pages.

Build:
1. Home with hand-written inline SVG hero, metadata-driven search card,
   popular specialties, and suggested doctors.
2. Results with count, active chips, filters, sort, pagination, doctor cards,
   and URL query-param state.
3. Doctor/booking page in the order from requirements.md: day chips, time
   chips, patient form, summary, confirm button last. Handle SLOT_TAKEN with
   an inline alert, slot refresh, and cleared selection.
4. Confirmation page and guest lookup/cancel with confirmation dialog.

Apply the UI rules from AGENTS.md and keep 390px free of horizontal scroll.
Add React Testing Library tests for search form, slot selection, booking form
validation, and confirmation rendering. Do not build auth or admin pages yet.
Finish with the phase report.
```

**Exit gate:** a guest can search, pick a slot, book, see the code, look the booking up, and cancel it on desktop and at 390px.

---

## Phase 5 — Accounts, appointments, admin UI

**Branch:** `phase-5-accounts-admin`

**Entry gate:** Phase 4 merged; auth and admin APIs verified.

**Prompt:**

```
Read AGENTS.md, requirements.md, and architecture.md. Do Phase 5 on branch phase-5-accounts-admin.

Build:
1. Login and register with inline validation, server error mapping, and
   redirects (admin to /admin/doctors, patient to the previous page).
2. My appointments with upcoming/past lists and cancel hidden or disabled
   when canCancel is false, with a short explanation.
3. Admin doctors table, doctor form with weekly schedule editor, and
   appointments table with filters and admin cancel.

All admin pages are guarded and responsive. Add tests for login validation,
route guards, and schedule editor validation. Finish with the phase report.
```

**Exit gate:** an admin can add a doctor with a schedule and a guest can book that doctor immediately; a patient sees and cancels their own appointments.

---

## Phase 6 — Polish, QA, docs

**Branch:** `phase-6-polish`

**Entry gate:** Phases 0–5 merged; feature-complete product.

**Prompt:**

```
Read AGENTS.md, requirements.md, architecture.md, and PHASES.md. Do Phase 6 on branch phase-6-polish.

1. Audit every page for loading, error, empty, success, server-unreachable,
   and slot-taken states. Fix gaps.
2. Audit at 390px, 768px, and 1280px: no horizontal scroll, no clipped chips,
   touch targets at least 44px.
3. Update README.md with Atlas/local setup, Docker, seeding, tests, structure,
   and links to requirements.md and architecture.md.
4. Add docs/QA-CHECKLIST.md covering guest booking, logged-in booking,
   double-booking race, cancellation boundaries, wrong-phone lookup, admin
   doctor/schedule/cancel, and mobile.
5. Confirm docker compose up works from a clean clone after filling both
   .env files. Run all tests, lint, and format checks in both apps.
6. Add the missing health failure test and any other uncovered required test.

Finish with the phase report and known limitations.
```

**Exit gate:** a fresh clone runs with `docker compose up` and every QA checklist item passes.

## Between phases

- Verify commands yourself; a phase report is not proof.
- Read the diff and be able to explain every file.
- Merge only through a reviewed pull request. Keep `main` linear with rebase-and-merge.
- Fix a broken phase before starting the next one.
- Ask the owner before adding anything outside the `AGENTS.md` technology boundary.
