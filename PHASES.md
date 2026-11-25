# PHASES: build order and prompts for Claude Code

Work one phase at a time. Give Claude Code one prompt, wait for its report, run the verification commands yourself, review the code, then move on. Do not paste several phases at once.

## Before Phase 0 (owner does this by hand)

1. Create an empty GitHub repo and clone it.
2. Copy `CLAUDE.md`, `SPEC.md`, `PHASES.md` to the repo root.
3. Create a `design/` folder and put the design screenshots in it (names: `home-desktop.png`, `results-desktop.png`, `booking-desktop.png`, `confirmation-desktop.png`).
4. Create a free MongoDB Atlas cluster, a database user, allow your IP, and copy the connection string.
5. Install Node.js 20 or newer, Git, and Docker Desktop.

Mapping to the original task plan: SH-1 to SH-4 are settled in `SPEC.md`. BE-1 to BE-8 are Phases 1 and 2. FE-1 to FE-8 and UI-1 to UI-8 are Phases 3 to 6. QA and DOC tasks are spread through all phases and finish in Phase 6.

---

## Phase 0: Repo setup (DOC-3 foundations)

**Prompt**

```
Read CLAUDE.md and SPEC.md fully, then do Phase 0 from PHASES.md.

Create branch phase-0-setup. Scaffold:
- client/: Vite + React + TypeScript, Bootstrap 5 with the RTL build, @fontsource/cairo, React Router. html lang="ar" dir="rtl". A placeholder home page only.
- server/: Express + TypeScript, ts-node-dev or tsx for dev, a GET /api/health endpoint, central error-handling middleware, env loading, MongoDB connection via Mongoose using MONGODB_URI.
- ESLint and Prettier in both apps, with lint, format, format:check, and test scripts. Vitest configured in both, with one trivial passing test each.
- Dockerfile for each app and docker-compose.yml as described in SPEC.md section 11.
- .gitignore, .env.example files, and a first README.md skeleton.

Do not build any feature yet. Finish with the phase report format from CLAUDE.md.
```

**Done when:** `npm run dev` works in both folders, `GET /api/health` returns OK and the server connects to Atlas, `docker compose up` starts both, lint and tests pass.

---

## Phase 1: API core (BE-1 to BE-5, part of QA)

**Prompt**

```
Read CLAUDE.md and SPEC.md. Do Phase 1 from PHASES.md on branch phase-1-api-core.

Build in server/:
1. Mongoose models: User, Specialty, Area, Doctor, Appointment, with the indexes in SPEC.md section 3.
2. Shared Arabic content file for messages, and the validation helpers in SPEC.md section 4 (Egyptian mobile normalization and validation, name, email, password).
3. The slot generator service (SPEC.md section 5) using Luxon and Africa/Cairo, as a pure, well-tested function.
4. The seed script (SPEC.md section 8) and npm run seed.
5. Endpoints: GET /api/metadata, GET /api/doctors (all filters, sorting, pagination, nextAvailableSlot), GET /api/doctors/:id, GET /api/doctors/:id/slots.
6. The standard error format from SPEC.md section 6.

Tests: slot generator (weekday mapping, 30-minute boundaries, past slots removed, taken slots removed, DST-safe), phone validation (Arabic digits, valid and invalid prefixes), and every endpoint above with Supertest and mongodb-memory-server.

Do not build auth or booking yet. Finish with the phase report.
```

**Done when:** after `npm run seed`, the search for specialty أطفال in مدينة نصر returns about 12 doctors, slots are returned as UTC ISO strings, and all tests pass.

---

## Phase 2: Auth, booking, cancellation, admin API (BE-6 to BE-8)

**Prompt**

```
Read CLAUDE.md and SPEC.md. Do Phase 2 from PHASES.md on branch phase-2-auth-booking.

Build in server/:
1. Auth: register, login, logout, me. bcrypt, JWT in an httpOnly cookie, login rate limiting, helmet, cookie-parser, CORS with credentials. Middleware: optionalAuth, requireAuth, requireAdmin.
2. Appointments: POST /api/appointments with optional auth, booking code generation, and double-booking protection through the unique partial index (translate the duplicate-key error to SLOT_TAKEN). Lookup, guest cancel, my appointments, patient cancel, with the 3-hour rule and the exact error codes in SPEC.md.
3. Admin API: doctors CRUD with soft delete and the future-appointments check, schedule replacement with validation (30-minute boundaries, startTime < endTime), appointments list with filters, admin cancel.

Tests: concurrent booking of the same slot (two parallel requests, exactly one succeeds), cancellation exactly at 3 hours and just under, guest lookup with wrong phone returns 404, ownership checks on patient cancel, every admin endpoint rejects non-admins, validation failures return the fields map.

Finish with the phase report.
```

**Done when:** the full flow works through an HTTP client (register, login, book, list, cancel), the concurrent-booking test passes, and a non-admin cannot reach admin routes.

---

## Phase 3: Client foundation (FE-1, UI-1, UI-2 base)

**Prompt**

```
Read CLAUDE.md and SPEC.md, and study every screenshot in design/. Do Phase 3 from PHASES.md on branch phase-3-client-foundation.

Build in client/:
1. theme.css with CSS variables sampled from the screenshots, Bootstrap overrides, global RTL and Cairo setup.
2. A typed API client (fetch wrapper with credentials, error parsing into the SPEC.md error format, Arabic fallback message).
3. Auth context (me, login, register, logout) and route guards for patient and admin.
4. Layout: header (responsive, collapses on mobile, per SPEC.md section 7) and footer.
5. Reusable components: Button, Card, Chip, FormField with inline error, Spinner, EmptyState, ErrorState, Alert, Pagination, Avatar (name initial in a circle).
6. The Arabic content file, the client copy of the phone validation helpers with the same tests as the server, and the router with all routes from SPEC.md section 7 as placeholders.

Every component must be RTL-correct, padded, and have centered button text. Verify at 390px and at desktop width. Add component tests for FormField, Chip selection, and the phone helper.

Finish with the phase report.
```

**Done when:** all routes render a placeholder inside the real layout, the header works on mobile, and the component tests pass.

---

## Phase 4: Public pages (FE-2 to FE-5, UI-3, UI-4, UI-7, UI-8)

**Prompt**

```
Read CLAUDE.md and SPEC.md, and compare against the screenshots in design/. Do Phase 4 from PHASES.md on branch phase-4-public-pages.

Build:
1. Home page: hero with a hand-written medical inline SVG illustration (no plus placeholder), search card with specialty and area dropdowns loaded from /api/metadata, popular specialty chips, suggested doctors.
2. Search results page: results count, active filter chips, filters sidebar (fee, rating), sort (earliest, rating, fee), pagination, doctor cards. URL query params drive the state so the page is shareable.
3. Doctor and booking page in the exact order in SPEC.md section 7: day chips, time chips with a clear selected state, patient form, summary, then the confirm button. Handle SLOT_TAKEN as specified. Prefill name for logged-in users.
4. Confirmation page and the guest lookup and cancel page. Cancel flow with a confirmation dialog and the CANCEL_WINDOW_PASSED message.

Apply the UI fixes list in SPEC.md section 7. Make every page responsive at 390px with no horizontal scroll. Tests with React Testing Library: search form, slot selection state, booking form validation, confirmation page rendering.

Do not build auth pages or admin pages yet. Finish with the phase report.
```

**Done when:** a guest can search, pick a slot, book, see the confirmation with the code, look the booking up, and cancel it, all on desktop and at 390px.

---

## Phase 5: Auth pages, my appointments, admin dashboard

**Prompt**

```
Read CLAUDE.md and SPEC.md. Do Phase 5 from PHASES.md on branch phase-5-accounts-admin.

Build:
1. Login and register pages with inline validation and server error mapping, redirect after login (admin to /admin/doctors, patient back to where they came from).
2. My appointments page with upcoming and past lists, cancel with confirmation, and the 3-hour rule reflected in the UI (hide or disable the cancel button when canCancel is false, with a short explanation).
3. Admin area: doctors table (search, pagination, edit, delete with confirmation and the HAS_FUTURE_APPOINTMENTS message), doctor form with a weekly schedule editor (per weekday: on/off, start, end, 30-minute steps), and the appointments table with filters and admin cancel.

All admin pages are guarded and responsive (tables scroll inside their own container on mobile). Tests: login form validation, route guards, schedule editor validation.

Finish with the phase report.
```

**Done when:** an admin can add a doctor with a schedule and a guest can then book that doctor immediately; a patient sees and cancels their own bookings.

---

## Phase 6: States, mobile polish, Docker, docs, final QA (UI-5, UI-6, FE-6, FE-8, QA-1, QA-2, DOC-1 to DOC-3)

**Prompt**

```
Read CLAUDE.md and SPEC.md. Do Phase 6 from PHASES.md on branch phase-6-polish.

1. Audit every page for the four states (loading, error, empty, success), the server-unreachable case, and the slot-taken case. Fix gaps.
2. Audit every page at 390px, 768px, and 1280px. No horizontal scroll, no clipped chips, touch targets at least 44px.
3. Complete the README.md per SPEC.md section 12, including exact setup steps for Atlas, Docker, seeding, and tests.
4. Confirm docker compose up works end to end from a clean clone.
5. Run all tests, lint, and format check in both apps. Write the missing tests for any endpoint or flow listed in CLAUDE.md that is not yet covered.
6. Add docs/QA-CHECKLIST.md with a manual test checklist: guest booking, logged-in booking, double-booking race, cancel before and after the 3-hour limit, guest lookup with a wrong phone, admin add doctor, admin schedule edit, admin cancel, mobile pass.

Finish with the phase report and a list of known limitations.
```

**Done when:** a fresh clone can run with `docker compose up` after filling the two `.env` files, and every item in the QA checklist passes.

---

## Rules for the owner between phases

- Run the verification commands yourself. Do not trust the report alone.
- Read the diff. You must be able to explain every file to a teacher.
- Merge the phase branch into `main` through a GitHub pull request only when you are satisfied.
- If a phase goes wrong, do not stack the next phase on top. Ask Claude Code to fix it first.
- If Claude Code proposes a package outside the allowed list in `CLAUDE.md`, say no or check with your instructor first.
