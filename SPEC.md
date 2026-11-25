# SPEC: Clinic Booking Website

## 1. Product decisions

| Topic | Decision |
|---|---|
| Language and direction | Arabic UI only, RTL |
| Runs where | Local only (`docker compose up` or `npm run dev`), database on MongoDB Atlas |
| Users | Guest, patient (registered), admin |
| Booking | Guest can book with name + mobile. Registration is optional. Logged-in patients can also book. |
| Guest vs account | A guest booking is not linked to an account later (v1) |
| Auth | Email + password. No password recovery. No email verification. |
| Slot length | 30 minutes |
| Booking horizon | Today plus the next 6 days (7 days total) |
| Cancellation | Allowed only if the appointment starts at least 3 hours from now |
| Guest cancellation | Booking code + mobile number |
| Patient cancellation | From "My appointments" |
| Admin | Add, edit, delete doctors. Set weekly schedule per doctor. View all appointments and cancel any of them. No management of specialties or areas (fixed seeded lists). |
| Doctor photos | None. Show the first letter of the name inside a circle. |
| Timezone | `Africa/Cairo` everywhere in logic. Store dates in UTC. Use Luxon. |
| Results page | 10 per page, default sort "earliest available" |
| Ratings | Static fields on the doctor (`rating`, `reviewCount`). No review system. |

## 2. Roles and access

- Public: browse, search, view doctor, view slots, book as guest, look up and cancel a guest booking with code + mobile.
- Patient (logged in): everything public plus booking linked to the account, "My appointments", cancel own appointments.
- Admin (seeded, `role: "admin"`): admin API and admin pages. Admin account is created by the seed script from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Admins never register from the UI.

## 3. Data model (Mongoose)

All collections have `createdAt` and `updatedAt` timestamps.

**User**
- `name` string, required
- `email` string, required, unique, lowercase, trimmed
- `passwordHash` string, required, never returned by the API
- `role` `"patient" | "admin"`, default `"patient"`

**Specialty**
- `nameAr` string, unique

**Area**
- `nameAr` string, unique

**Doctor**
- `nameAr` string (e.g. "د. مريم أحمد")
- `titleAr` string (e.g. "طبيبة أطفال", "استشاري أطفال", "أخصائي أسنان")
- `specialty` ObjectId ref Specialty
- `area` ObjectId ref Area
- `yearsOfExperience` number
- `rating` number 0 to 5, one decimal
- `reviewCount` number
- `consultationFee` number (EGP)
- `clinicName` string
- `clinicAddress` string
- `weeklySchedule` array of `{ dayOfWeek: 0-6 (0 = Sunday), startTime: "HH:mm", endTime: "HH:mm" }`, at most one entry per day, `startTime < endTime`, both on 30-minute boundaries
- `isActive` boolean, default true (delete is a soft delete)

**Appointment**
- `code` string, unique, 8 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, generated with `crypto.randomBytes`
- `doctor` ObjectId ref Doctor
- `user` ObjectId ref User, optional (set when the booker is logged in)
- `patientName` string
- `patientPhone` string, normalized Egyptian mobile
- `startsAt` Date (UTC)
- `endsAt` Date (UTC, `startsAt` + 30 minutes)
- `status` `"confirmed" | "cancelled"`
- `cancelledAt` Date, optional
- `cancelledBy` `"patient" | "guest" | "admin"`, optional

Indexes:
- Unique partial index on `{ doctor: 1, startsAt: 1 }` where `status === "confirmed"`. This is the source of truth for preventing double booking. A cancelled appointment frees the slot.
- Index on `{ user: 1, startsAt: -1 }` and on `{ patientPhone: 1 }`.

## 4. Validation rules (single source of truth)

- **Mobile:** convert Arabic-Indic digits (٠-٩) to Western digits, strip spaces and dashes, then it must match `^01[0125]\d{8}$`. Same function and same tests in client and server.
- **Name:** trimmed, 3 to 60 characters.
- **Email:** standard email format, lowercase.
- **Password:** at least 8 characters.
- **startsAt:** must be an exact slot generated for that doctor, in the future, within the 7-day horizon.

## 5. Slot generation

Slots are not stored. They are computed on request.

1. Take today (Cairo) plus the next 6 days.
2. For each date, find the doctor's `weeklySchedule` entry for that weekday. No entry means no slots that day.
3. Split `[startTime, endTime)` into 30-minute slots.
4. Remove slots that start before "now".
5. Remove slots that have a confirmed appointment for that doctor.
6. Return times as ISO UTC strings plus the Cairo date label for grouping.

`nextAvailableSlot` for a doctor is the first remaining slot across the horizon, or `null`.

## 6. API

Base path `/api`. JSON in and out. Auth is a JWT in an httpOnly, `sameSite=lax` cookie named `token`, valid 7 days. CORS allows only `CLIENT_ORIGIN` with credentials.

### Error format

```json
{ "error": { "code": "SLOT_TAKEN", "message": "<Arabic message>", "fields": { "patientPhone": "<Arabic message>" } } }
```

`fields` is present only for validation errors. Messages are Arabic. Codes are English constants.

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | invalid input |
| 401 | `UNAUTHENTICATED` | no or bad token |
| 401 | `INVALID_CREDENTIALS` | wrong email or password |
| 403 | `FORBIDDEN` | not an admin, or not the owner |
| 404 | `NOT_FOUND` | doctor or appointment not found, or code + phone mismatch |
| 409 | `SLOT_TAKEN` | slot already booked |
| 409 | `EMAIL_TAKEN` | registration with an existing email |
| 409 | `ALREADY_CANCELLED` | appointment is already cancelled |
| 409 | `HAS_FUTURE_APPOINTMENTS` | deleting a doctor with future confirmed appointments |
| 422 | `CANCEL_WINDOW_PASSED` | less than 3 hours before the appointment |
| 429 | `RATE_LIMITED` | too many login attempts |

For lookup and guest cancel, a wrong code or wrong phone both return `404 NOT_FOUND`, so codes cannot be probed.

### Auth

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | 201 `{ user }`, sets cookie |
| POST | `/auth/login` | `{ email, password }` | 200 `{ user }`, sets cookie |
| POST | `/auth/logout` | none | 204, clears cookie |
| GET | `/auth/me` | none | 200 `{ user }` or 401 |

`user` is `{ id, name, email, role }`. Rate limit login: 10 attempts per 15 minutes per IP.

### Public

**GET `/metadata`** returns `{ specialties: [{id, nameAr}], areas: [{id, nameAr}] }`.

**GET `/doctors`** query params: `specialtyId`, `areaId`, `minRating` (number), `maxFee` (number), `sort` (`earliest` default, `rating`, `fee`), `page` (default 1), `pageSize` (default 10, max 20). Only active doctors. Returns:

```json
{
  "items": [{
    "id": "", "nameAr": "", "titleAr": "", "specialty": {"id":"","nameAr":""},
    "area": {"id":"","nameAr":""}, "yearsOfExperience": 8, "rating": 4.9,
    "reviewCount": 120, "consultationFee": 300, "clinicName": "",
    "clinicAddress": "", "workingHoursLabel": "10:00 - 18:00",
    "nextAvailableSlot": "2026-11-26T08:00:00.000Z"
  }],
  "total": 12, "page": 1, "pageSize": 10
}
```

With `sort=earliest`, doctors with `nextAvailableSlot: null` go last.

**GET `/doctors/:id`** returns the same doctor object plus `weeklySchedule`.

**GET `/doctors/:id/slots`** returns `{ days: [{ date: "2026-11-26", label: "الخميس 26", slots: [{ startsAt: "ISO" }] }] }`, only days that have at least one slot.

### Appointments

**POST `/appointments`**, body `{ doctorId, startsAt, patientName, patientPhone }`. Works with or without a cookie. If logged in, the appointment stores `user`. Success: 201 `{ appointment }`. Failure: 400, 404 (doctor), 409 `SLOT_TAKEN`. Creation must rely on the unique partial index and translate the duplicate-key error into `SLOT_TAKEN`. A pre-check alone is not enough.

`appointment` shape: `{ code, status, startsAt, endsAt, patientName, patientPhone, doctor: { id, nameAr, titleAr, clinicName, clinicAddress, consultationFee }, canCancel: boolean }`.

**GET `/appointments/lookup?code=&phone=`** returns `{ appointment }` or 404.

**POST `/appointments/cancel`**, body `{ code, phone }`, guest cancel. Returns `{ appointment }` with `status: "cancelled"`.

**GET `/me/appointments`** (auth) returns `{ upcoming: [], past: [] }`, upcoming sorted ascending, past descending.

**POST `/me/appointments/:code/cancel`** (auth, owner only).

Cancel rule for all non-admin cancels: `startsAt - now >= 3 hours`, otherwise 422 `CANCEL_WINDOW_PASSED`.

### Admin (role `admin` required, otherwise 401 or 403)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/doctors` | all doctors including inactive, with `page` |
| POST | `/admin/doctors` | create, body is the doctor fields plus `weeklySchedule` |
| PUT | `/admin/doctors/:id` | edit fields |
| PUT | `/admin/doctors/:id/schedule` | replace `weeklySchedule` |
| DELETE | `/admin/doctors/:id` | soft delete, 409 if future confirmed appointments exist |
| GET | `/admin/appointments` | filters `status`, `doctorId`, `date`; `page`; sorted by `startsAt` descending |
| POST | `/admin/appointments/:code/cancel` | no 3-hour restriction, sets `cancelledBy: "admin"` |

## 7. Frontend routes and pages

| Route | Page | Source design |
|---|---|---|
| `/` | Home: hero with inline SVG illustration, search card, popular specialties, suggested doctors | `design/` home |
| `/doctors` | Search results with filters (fee, rating), sort chips, pagination | `design/` results |
| `/doctors/:id` | Doctor + booking (see below) | `design/` booking |
| `/booking/:code` | Confirmation page | `design/` confirmation |
| `/lookup` | Guest lookup and cancel (code + mobile) | new, same style |
| `/login`, `/register` | Auth forms | new, same style |
| `/my-appointments` | Upcoming and past, cancel button | new, same style |
| `/admin` | Redirects to `/admin/doctors` | new |
| `/admin/doctors` | Table, add, edit, delete | new |
| `/admin/doctors/new`, `/admin/doctors/:id/edit` | Doctor form + weekly schedule editor | new |
| `/admin/appointments` | Table with filters and cancel | new |

Header: logo, links (الرئيسية، الأطباء، كيف يعمل، إلغاء حجز)، "احجز موعدًا" button to `/doctors`. On the right side of the header (start side in RTL): logo. When logged out, show "تسجيل الدخول". When logged in, show the user name with a menu (حجوزاتي، تسجيل الخروج). Admin sees "لوحة التحكم".

### Doctor and booking page order (improves the current design)

1. Doctor header card.
2. Choose day (7 chips), then time chips. The selected day and time have a clear selected style.
3. Patient details form (name, mobile).
4. Booking summary card.
5. "تأكيد الحجز" button, at the end, below the form and summary. Disabled until a time is chosen. Show inline field errors.
6. On `SLOT_TAKEN`: show an inline alert "الموعد ده اتحجز قبل لحظات، اختر موعد تاني", refresh the slots, clear the selection.
7. If logged in, prefill name from the account.

### Confirmation page

Shows booking code (large, copy button), patient name, patient mobile, doctor, date and time, clinic name and address, cancel button (visible only if `canCancel`), and "العودة للرئيسية". Tell the guest to keep the code for cancellation.

### UI fixes required over the current screenshots

- Correct RTL: start-aligned content, logo and first content on the right, filters sidebar on the right of the results, numbers and rating readable (rating then dot then review count).
- Padding inside all cards, no text touching card edges.
- Button labels centered. Success check and avatar letters centered in their circles.
- Search fields look like fields: border, icon, dropdown arrow, label above. Search button sits next to them (wraps on mobile).
- Chips never clip text. Wrap or scroll horizontally inside their own container only.
- Hero uses a hand-written medical inline SVG illustration instead of the plus placeholder.
- Mobile layouts for all four main screens plus the new ones at 390px.

## 8. Seed data (`npm run seed` in `server/`)

Idempotent. Clears and recreates specialties, areas, doctors, and appointments; keeps or recreates the admin user.

- Specialties: عيون، باطنة، جلدية، أطفال، أسنان.
- Areas: مدينة نصر، مصر الجديدة، التجمع الخامس، المعادي، الدقي، الجيزة.
- 24 doctors with realistic Arabic names, spread across specialties and areas. Include exactly these five from the design:
  - د. مريم أحمد: طبيبة أطفال, 8 years, 4.9, 120 reviews, fee 300, مدينة نصر, عيادة الشفاء, شارع مكرم عبيد
  - د. ياسر علي: استشاري أطفال, 12 years, 4.8, 95 reviews, fee 300, مدينة نصر
  - د. سلمى عادل: طبيبة أطفال, 5 years, 4.7, 62 reviews, fee 300, مدينة نصر
  - د. أحمد سامي: أخصائي أسنان, 6 years, 4.8, fee 250, مدينة نصر
  - د. نور خالد: أخصائية جلدية, 9 years, 4.9, fee 400, مصر الجديدة
- Make the "أطفال in مدينة نصر" search return around 12 doctors.
- Schedules: most doctors Sunday to Thursday 10:00-18:00; a few have shorter days or work Saturday; at least one doctor has no schedule today so the empty state can be seen.
- Admin user from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- A few sample confirmed appointments so some slots show as taken.

## 9. Environment variables

`server/.env.example`

```
PORT=4000
MONGODB_URI=
JWT_SECRET=
CLIENT_ORIGIN=http://localhost:5173
ADMIN_EMAIL=
ADMIN_PASSWORD=
NODE_ENV=development
```

`client/.env.example`

```
VITE_API_URL=http://localhost:4000/api
```

## 10. Security checklist

- Hash passwords with bcrypt, cost 10 or higher.
- `helmet` on, `cookie-parser`, CORS restricted, `express-rate-limit` on login.
- Never return `passwordHash`. Never log secrets.
- Validate every body, query, and param on the server even if the client validates.
- Admin routes check `role === "admin"` from the verified token, not from client input.
- Guest lookup and cancel return the same 404 for a wrong code or wrong phone.

## 11. Docker

- `server/Dockerfile` and `client/Dockerfile` (Node 20 Alpine, dependency layer cached).
- `docker-compose.yml` with two services, `server` (port 4000) and `client` (port 5173), reading `server/.env` and `client/.env`. MongoDB stays on Atlas, so there is no database container.
- README documents both ways to run: Docker, and plain `npm run dev` in each folder.

## 12. Documentation (README.md)

Project overview, tech stack, prerequisites, environment setup (including creating a free Atlas cluster and getting the connection string), how to run with and without Docker, how to seed, how to run tests, folder structure, API summary linking to this spec, and the Git workflow.

## 13. Out of scope for v1

Password recovery, email verification, SMS, payments, reviews, doctor photo upload, managing specialties and areas from the UI, linking old guest bookings to a new account, deployment, multiple languages.
