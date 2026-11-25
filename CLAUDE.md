# Clinic Booking Website ("طبّي")

Arabic, RTL web app where patients search for doctors by specialty and area, pick a 30-minute slot, and book. Patients can book as guests or with an account. Admins manage doctors, weekly schedules, and appointments.

Read `SPEC.md` for every product and API decision. Read `PHASES.md` for the build order. Do not invent requirements that contradict `SPEC.md`. If something is missing, choose the simplest option, keep going, and list the assumption in your final report for the phase.

## Allowed technology (hard constraint)

The project must stay inside this course list. Not every item has to be used, but nothing outside it may be added as a technology, framework, or language:

HTML5, CSS, UX/UI design principles, JavaScript, TypeScript, Bootstrap, React, Node.js + Express, code style and best practices, Docker, documentation and unit testing, Git and GitHub.

Allowed supporting tooling and libraries (they are not separate technologies): npm, Vite (React + TypeScript build tool), React Router, Bootstrap 5 RTL build, Mongoose and MongoDB Atlas (database, already approved), bcrypt, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit, Luxon, ESLint, Prettier, Vitest, Supertest, mongodb-memory-server, React Testing Library, @fontsource/cairo.

Not allowed: Tailwind, Next.js, Redux or other state libraries, UI kits other than Bootstrap, GraphQL, any other database, any language other than TypeScript, CSS-in-JS libraries, Playwright or Cypress.

Before adding any package outside the lists above, stop and ask.

## Repository layout

```
/
  client/        React + TypeScript + Vite + Bootstrap RTL
  server/        Node.js + Express + TypeScript + Mongoose
  design/        reference screenshots (read-only, do not edit)
  docker-compose.yml
  README.md
  SPEC.md
  PHASES.md
  CLAUDE.md
```

## Code rules

- All code, identifiers, file names, commit messages, and API field names are in English.
- Do not write comments or explanatory notes inside code files. Express intent through clear names and small functions.
- All user-facing text is Arabic. Keep Arabic strings in one place per app (`client/src/content/ar.ts`, `server/src/content/ar.ts`) so they are never scattered inside components or handlers.
- TypeScript `strict` mode on in both apps. No `any`. No non-null assertions unless unavoidable.
- Prefer small, single-purpose modules. Server layers: routes, controllers, services, models, middleware. Controllers never touch Mongoose directly; services do.
- Use async/await, never raw promise chains. Central error-handling middleware on the server; controllers throw typed errors.
- ESLint and Prettier configured from Phase 0. Code must pass `npm run lint` and `npm run format:check` before any commit.
- Named exports only, except React page components when the router needs a default.
- Never commit `.env` files. Always keep `.env.example` current.

## UI rules

- Bootstrap 5 RTL build only (`bootstrap/dist/css/bootstrap.rtl.min.css`). `<html lang="ar" dir="rtl">`.
- Use CSS logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`) in custom CSS, never `left` and `right`.
- Font: Cairo via the `@fontsource/cairo` package. No external font or image CDNs.
- Visual identity comes from the screenshots in `design/`: teal primary, dark navy text, mint chips, light blue-grey page background, amber for ratings. Sample colors from the screenshots and define them once as CSS variables in `client/src/styles/theme.css`.
- Build mobile-first and responsive. The 390px width must have no horizontal scroll. Touch targets at least 44px high.
- Every data-driven view has four states: loading, error, empty, success. Forms show inline errors beside each field.
- Illustrations are inline SVG, written by hand. No external images.
- Numerals: display Western digits (0-9) everywhere in the UI for consistency, even in Arabic text.

## Testing rules

- Vitest for both apps. Server uses Supertest and mongodb-memory-server so tests never touch Atlas.
- Every API endpoint has at least one success test and one failure test.
- The double-booking guard, the 3-hour cancellation rule, the slot generator, phone validation, and auth guards must each have dedicated tests.
- Client tests with React Testing Library cover: search form, slot selection state, booking form validation, and the confirmation page.
- `npm test` must pass in both apps before every commit.

## Git workflow

- One branch per phase: `phase-0-setup`, `phase-1-api-core`, and so on. Never commit directly to `main`.
- Small commits using Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).
- At the end of each phase: run lint, format check, and tests; commit; print a short report; stop and wait for the owner to review.

## Phase report format

At the end of each phase, report in English: what was built, how to run it, what tests exist and their result, assumptions made, anything left undone, and the exact commands the owner should run to verify.
