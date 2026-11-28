# Agent Rules — ClinicFlow

## Start here

Read these files before making changes:

- `requirements.md` — product and API behaviour; settle any product question here.
- `architecture.md` — module boundaries, data model, and diagrams; settle any structural question here.
- `PHASES.md` — build order, current status, entry gates, and exit gates.

Treat `requirements.md` as the product contract and `PHASES.md` as the work queue. If a request conflicts with either, ask the owner before proceeding.

## Phase workflow

1. Pick the current phase from `PHASES.md` and check its entry gate.
2. Work only inside that phase's scope. Leave later phases untouched.
3. Run every verification command listed for the phase. **Done** means lint, format check, tests, and build all exit 0 for both apps where applicable.
4. Commit with a Conventional Commit prefix (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).
5. Report: what changed, how to verify it, test results, assumptions, and anything left undone. Then stop for owner review.

Create or merge a pull request only when the owner explicitly asks for it. Otherwise the owner handles the PR. Never force-push.

## Technology boundary

Allowed as technologies: HTML5, CSS, UX/UI design principles, JavaScript, TypeScript, Bootstrap, React, Node.js + Express, Docker, documentation, unit testing, Git, GitHub.

Allowed supporting libraries: npm, Vite, React Router, Bootstrap 5 RTL, Mongoose, MongoDB, bcrypt, jsonwebtoken, cookie-parser, cors, helmet, express-rate-limit, Luxon, ESLint, Prettier, Vitest, Supertest, mongodb-memory-server, React Testing Library, `@fontsource/cairo`.

Outside this list, stop and ask before adding a package or switching a tool.

## Code rules

- English for identifiers, file names, commits, and API fields. Arabic only for user-facing strings, centralized in `client/src/content/ar.ts` and `server/src/content/ar.ts`.
- TypeScript strict in both apps. Use clear names and small functions instead of inline comments.
- Server layers: routes → controllers → services → models. Services own Mongoose access; controllers stay thin.
- Use async/await and the central error handler. Throw typed errors with English codes and Arabic messages.
- Named exports, except React page components required by the router.
- Keep `.env.example` current. Commit examples, never real `.env` files or secrets.

## UI rules

- Bootstrap 5 RTL build only, `<html lang="ar" dir="rtl">`, Cairo via `@fontsource/cairo`, and logical CSS properties such as `margin-inline-start`.
- Colors come from the `design/` screenshots and are defined once in `client/src/styles/theme.css`. The screenshots are a Phase 3 prerequisite.
- Mobile-first: no horizontal scroll at 390px, touch targets at least 44px, chips that wrap instead of clipping.
- Every data-driven view has loading, error, empty, and success states. Forms show inline field errors.
- Illustrations are hand-written inline SVG. Show Western digits (0-9).

## Verification rules

- Vitest in both apps; server tests use Supertest + mongodb-memory-server and never touch Atlas.
- Every endpoint needs at least one success and one failure test. Double booking, the 3-hour rule, slot generation, phone validation, and auth guards need dedicated tests.
- Run `npm run lint`, `npm run format:check`, `npm test`, and `npm run build` in both apps before committing.

## Reporting

End each phase with an English report covering: what was built, exact verification commands and their results, assumptions, remaining gaps, and what the owner should check next.
