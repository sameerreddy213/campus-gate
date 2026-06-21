# CampusGate — Architecture & Technical Guide

A deep, interview-ready walkthrough of how CampusGate is built and why. Read the
[README](../README.md) first for setup; this document explains the *internals*.

**Contents**
1. [What it is & the problem it solves](#1-what-it-is--the-problem-it-solves)
2. [Tech stack & why](#2-tech-stack--why)
3. [System topology](#3-system-topology)
4. [Request lifecycle (middleware pipeline)](#4-request-lifecycle-middleware-pipeline)
5. [Authentication & authorization](#5-authentication--authorization)
6. [Roles & permissions](#6-roles--permissions)
7. [Data model](#7-data-model)
8. [The outing-request state machine](#8-the-outing-request-state-machine)
9. [Key flows](#9-key-flows)
10. [QR gate pass (signed & server-verified)](#10-qr-gate-pass-signed--server-verified)
11. [Security design (defense in depth)](#11-security-design-defense-in-depth)
12. [Performance](#12-performance)
13. [Background jobs](#13-background-jobs)
14. [Messaging abstraction](#14-messaging-abstraction)
15. [API reference](#15-api-reference)
16. [Frontend architecture](#16-frontend-architecture)
17. [Testing & CI/CD](#17-testing--cicd)
18. [Limitations & future work](#18-limitations--future-work)
19. [Interview talking points & Q&A](#19-interview-talking-points--qa)

---

## 1. What it is & the problem it solves

Hostels and campuses traditionally manage student outings with **paper gate-pass
registers**: a student fills a slip, a warden signs it, a guard logs exit/entry
by hand. This is slow, easy to forge, impossible to audit, and gives parents no
visibility.

**CampusGate** replaces that with a digital workflow:

> student raises a request → parent approves (OTP) → warden approves → student
> gets a **QR gate pass** → watchman scans it to mark **out**, then **returned**.

It is **multi-tenant**: one deployment serves many colleges, each fully isolated,
with a platform-level *developer admin* on top.

---

## 2. Tech stack & why

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | **React 18 + Vite + TypeScript** | Fast dev server/HMR, typed UI, large ecosystem. |
| UI | **Tailwind + shadcn/ui + Recharts + Framer Motion** | Utility-first styling, accessible unstyled primitives I own in-repo, charts for analytics, motion for polish. |
| Data fetching | **axios** (+ a thin client) and **TanStack Query** (provider in place) | Interceptors for auth/401 handling; query cache where used. |
| Backend | **Node.js + Express** | Minimal, ubiquitous, easy to reason about; matches the serverless target. |
| ODM/DB | **Mongoose + MongoDB** | Flexible document model fits the evolving request schema; schema validation + indexes + TTL. |
| Auth | **JWT (Bearer) + bcrypt** | Stateless API auth; bcrypt for password hashing. |
| Security mw | helmet, CORS allowlist, express-rate-limit, express-mongo-sanitize, xss-clean, hpp | Layered hardening (details in §11). |
| Messaging | **nodemailer** (SMTP), **Twilio REST** (SMS) | Standard email transport; SMS via REST so no heavy SDK. Both pluggable. |
| Jobs | **node-cron** | In-process scheduled maintenance. |
| Tests | **Vitest + Testing Library** (client), **node:test** (server) | Fast Vite-native tests; zero-dependency server tests. |
| Hosting | **Azure App Service** via GitHub Actions OIDC | Single-job CI/CD; SPA served by Express from the same origin. |

---

## 3. System topology

It is an **npm workspaces monorepo** with three packages:

- **`client/`** — the React SPA. In dev it runs on Vite (port 8080) and proxies
  `/api` to the backend. In production it is built to `client/dist`.
- **`server/`** — the Express API and all business logic. `server/app.js` builds
  the Express app (middleware + routes); `server/server.js` is the long-running
  entry that connects to Mongo, starts the scheduler, and listens.
- **`api/`** — a thin Vercel serverless entry that re-exports the Express app.

**Same-origin serving:** `server/app.js` serves `client/dist` as static files and
falls back to `index.html` for non-`/api` routes **whenever that build exists on
disk**. So in production the SPA and API ship from one origin (no CORS needed for
the app itself), and the check is on file existence — a missing `NODE_ENV` can
never silently blank the site.

```
Browser ──HTTP──> Express (server/app.js)
                    ├── /api/*           → routers → controllers → Mongoose → MongoDB
                    └── everything else  → static client/dist  (SPA fallback)
```

---

## 4. Request lifecycle (middleware pipeline)

Order matters. Every API request flows through `server/app.js` in this sequence:

1. **helmet()** — secure HTTP headers.
2. **CORS** — allowlist function (same-origin always allowed; configured origins
   in production; permissive in dev).
3. **body parsers** — `express.json` / `urlencoded`, both capped at `1mb`.
4. **express-mongo-sanitize** — strips `$`/`.` operator keys from input (NoSQL
   injection). Its `onSanitize` hook logs a `injection_blocked` security event.
5. **xss-clean** — strips HTML/script from inputs.
6. **hpp** — guards against HTTP parameter pollution.
7. **morgan** — request logging (dev only).
8. **rate limiters** — a global limiter (300/min/IP) and a stricter auth limiter
   (30/15min/IP on `/auth`). Both use a shared handler that logs a `rate_limited`
   security event and returns 429.
9. **routers** — mounted under both `/api/*` and unprefixed paths (the latter so a
   Vercel rewrite that strips `/api` still resolves).
10. **SPA static + fallback** — only if `client/dist` exists.
11. **404 handler** → **central error handler** — normalizes Mongoose errors and,
    in production, never leaks 5xx internals to the client.

Per-route, protected endpoints then run: **`protect`** (JWT) → **`authorize(...roles)`**
→ (tenant routes) **`tenant`** → controller.

---

## 5. Authentication & authorization

**Tokens.** On login the server signs a JWT containing `{ id, role, collegeId, tv }`
(`tv` = token version) with `JWT_SECRET`, default 30-day expiry. The client stores
it in `localStorage` and sends it as `Authorization: Bearer <token>`.

**`protect` middleware** (`middleware/authMiddleware.js`):
- extracts the Bearer token; missing/!valid → 401 + `unauthorized` security event;
- `jwt.verify`, loads the user;
- **token-version check:** rejects the token if `decoded.tv !== user.tokenVersion`.
  `tokenVersion` is incremented on password change/reset, so **changing a password
  invalidates every previously issued token** — stateless revocation without a
  server-side session store.

**`authorize(...roles)`** — checks `req.user.role`; mismatch → 403 + `forbidden`
security event.

**`tenant`** (`middleware/tenantMiddleware.js`) — for non-dev-admin roles: requires
a `collegeId`, **rejects requests from a suspended college (403)**, and sets
`req.collegeId` used by controllers to scope every query.

**Suspended-college lockout** is enforced in two places: at **login** (immediate
feedback) and in **`tenant`** (so an already-issued token is also blocked mid-session).

**Boot guard:** `server.js` refuses to start if `JWT_SECRET` is unset — fail fast
rather than signing/verifying with an empty key.

**Parents** never use a password — they log in by **phone OTP** (§9).

---

## 6. Roles & permissions

| Role | Scope | Can do |
| --- | --- | --- |
| **dev-admin** | platform (no college) | CRUD colleges, suspend/reactivate, create college admins, view global analytics, global audit log, **Security & Logs** dashboard |
| **college-admin** | one college | manage wardens/watchmen/students (incl. bulk CSV), assign students to wardens, view all requests, CSV reports, college audit log, toggle gate security |
| **warden** | own assigned students | approve/reject requests; mark out/return *when gate security is off*; view history |
| **watchman** | own college | scan QR / search; mark out/return *when gate security is on* |
| **student** | self | raise/cancel requests; view QR pass + history |
| **parent** | own child (by phone) | OTP login; approve/decline requests; history |

RBAC is enforced server-side by `authorize` + `tenant` + per-controller ownership
checks (e.g. a warden can only act on requests where `wardenId === req.user.id`).
The frontend also guards routes by role, but that is UX only — the server is the
source of truth.

---

## 7. Data model

MongoDB collections (Mongoose schemas in `server/models/`):

**User** — every human except the implicit "system".
`name, email (unique), phone, password (bcrypt, select:false), role (enum: dev-admin|college-admin|warden|student|parent|watchman), collegeId (required unless dev-admin), resetPasswordToken/Expire, tokenVersion`. Hooks: bcrypt hash on save; `matchPassword`, `getResetPasswordToken`.

**College** — a tenant.
`name (unique), code (unique, uppercase), city, address?, status (active|suspended), config.enableGateSecurity`.

**Student** — student profile (1:1 with a `User`).
`userId (unique → User), rollNumber, department, year, collegeId, wardenId (→ User), parentName, parentPhone, parentEmail`. Indexes on `collegeId`, `wardenId`, `parentPhone`. Parents are linked to students **by phone number**, not a hard reference.

**OutingRequest** — the core domain object.
`studentId, collegeId, wardenId, purpose (enum: Vacation|Exam|Mess|Other), destination, outDate, returnDate, status (10-state enum), parentDecisionAt, wardenDecisionAt, outAt, returnedAt, overstay, overstayNotified`. Compound indexes: `{collegeId,status}`, `{wardenId,status}`, `{studentId,createdAt}`.

**OtpLog** — parent OTPs. `phone, otp, expiresAt (TTL index → auto-delete), verified`.

**Notification** — in-app alerts. `recipient (→ User), message, type, relatedId, read`.

**AuditLog** — who did what. `userId, action, details, ip, collegeId`. Indexed on `createdAt`, `action+createdAt`, `collegeId+createdAt`.

**SecurityEvent** — hostile/anomalous activity. `type (login_failed|otp_failed|unauthorized|forbidden|rate_limited|injection_blocked|other), severity, ip, identifier, method, path, userAgent, userId, details`. Indexed on time/type/ip + a **90-day TTL** so it self-prunes.

**Relationships (text ER):**
```
College 1───* User           (collegeId)
College 1───* Student         (collegeId)
User    1───1 Student         (Student.userId)
User(warden) 1───* Student    (Student.wardenId)
Student 1───* OutingRequest   (studentId)
User(parent) ~~~ Student      (matched by phone, not a FK)
User    1───* Notification / AuditLog / SecurityEvent
```

---

## 8. The outing-request state machine

`status` is the heart of the system. Transitions and who triggers them:

```
                       (purpose = Mess|Exam → parent step skipped)
   create ──────────────┬─────────────────────────────► pending-warden
        │               │
        ▼               │
   pending-parent       │
        │ parent approve│ parent decline
        ▼               ▼
   pending-warden   parent-declined (terminal)
        │ warden approve │ warden reject
        ▼               ▼
     approved        rejected (terminal)
        │ gate mark-out (watchman if gate-security ON, else warden)
        ▼
       out ── gate mark-returned ──► returned (terminal)
        │
        └─(past returnDate)─► overstay flag set (still "out")

   pending-* (past outDate + 24h grace) ──► expired (terminal, by scheduler)
   any pre-out state ── student cancels ──► cancelled (terminal)
```

Notes:
- **`parent-approved` is transient:** parent approval sets the status and then
  immediately rewrites it to `pending-warden`, so `parent-approved` is never
  persisted. (Dead references to it were removed.)
- **Conditional parent skip:** `Mess`/`Exam` purposes start at `pending-warden`
  (no parent approval needed).
- **One active request** per student is enforced at creation.
- **Expiry is conservative:** only *pre-departure* states expire; an `approved`
  pass is never auto-expired because it is still a valid pass the gate can action.

---

## 9. Key flows

**Outing request (happy path).** Student `POST /student/requests` → validation
(dates, single-active) → create (status by purpose) → notify parent (and warden if
auto-forwarded). Parent `PUT /parent/requests/:id` approve → status →
`pending-warden`, notify student + warden. Warden `PUT /warden/requests/:id`
approve → `approved`, notify student. Gate marks out then returned (§10).

**Parent OTP login.** `POST /auth/parent/send-otp` → verifies the phone belongs to
a student, generates a **crypto-random 6-digit OTP**, stores it in `OtpLog` (5-min
expiry), and sends it via SMS (or logs in dev). `POST /auth/parent/verify-otp` →
finds the latest unverified, unexpired OTP, marks it used (single-use, no replay),
and finds/creates the parent `User`, then issues a JWT. Parents are also
**pre-provisioned** when a student is created, so the very first request's
notification is never dropped.

**Password reset.** `POST /auth/forgotpassword` → always returns a generic message
(no account enumeration); if the user exists, it stores a **hashed** reset token
(30-min expiry) and emails the link (the raw token is only ever sent out-of-band).
`PUT /auth/resetpassword/:token` → hashes the incoming token, matches an unexpired
record, sets the new password, and **bumps `tokenVersion`** (invalidating old JWTs).

**Gate-security modes.** A college toggles `config.enableGateSecurity`:
- **ON** (default): the **watchman** marks students out/returned; the warden is
  blocked from those actions (403). The watchman module appears in the UI.
- **OFF**: the **warden** marks out/returned; the watchman endpoints are blocked
  (403) and the watchman nav item is hidden. Both guards are enforced server-side.

---

## 10. QR gate pass (signed & server-verified)

A naïve QR pass that just encodes the request id is forgeable and only checked
client-side. CampusGate uses a **signed, expiring token**:

**Signing** (`server/utils/gatePass.js`): the token is
`base64url("<requestId>.<expiryEpochMs>") . base64url(HMAC_SHA256(payload, JWT_SECRET))`,
issued with a 12-hour validity window. The student's `OutingRequest` payload
includes this `gatePass` token **only while the request is `approved` or `out`**,
and the student's QR encodes it.

**Verification** (`POST /watchman/verify`): the server recomputes the HMAC and
compares it in **constant time** (`crypto.timingSafeEqual`), checks expiry, loads
the request, confirms it belongs to the watchman's college, and confirms it is in
an actionable state. Only then does it return the request for the watchman to act
on. Manual name/roll search remains as a staff fallback.

**Why this matters (interview gold):** the pass cannot be forged without the
server secret, cannot be replayed after expiry, and cannot be used cross-tenant —
all verified server-side, not in the browser.

---

## 11. Security design (defense in depth)

| Concern | Mitigation |
| --- | --- |
| Transport/headers | **helmet** secure headers |
| Cross-origin abuse | **CORS allowlist** (env-configurable; same-origin always allowed; permissive only in dev) |
| Brute force / floods | **rate limiting** — global 300/min/IP, auth 30/15min/IP |
| NoSQL injection | **express-mongo-sanitize** (operator stripping) + logs the attempt |
| XSS | **xss-clean** input sanitization + React's escaping on output |
| Param pollution | **hpp** |
| Password storage | **bcrypt** (salted) |
| Token theft after pw change | **`tokenVersion`** invalidation (stateless revocation) |
| Pass forgery/replay | **HMAC-signed, expiring gate pass** verified server-side (§10) |
| Suspended tenants | **login + per-request lockout** for suspended colleges |
| Account enumeration | generic responses on login + forgot-password |
| Error leakage | central handler hides 5xx internals in production |
| Misconfiguration | **fail-fast** if `JWT_SECRET` is missing |
| Visibility / forensics | **SecurityEvent** logging + dev-admin **Security & Logs** dashboard |

**Security telemetry.** `server/utils/security.js` records hostile events
(failed logins, unauthorized/forbidden access, rate-limit blocks, OTP failures,
blocked injection). It is **fire-and-forget** (never breaks the request) and
**throttled in-memory per (type, IP)** so an attack flood can't amplify into
unbounded DB writes — a flood of blocked requests collapses to one stored event
per minute with a coalesced count. The dev-admin dashboard (`GET /dev-admin/security`)
aggregates this into 24h/7d counts, top source IPs, a 14-day timeline, recent
events, and a platform snapshot, exportable to CSV.

**Audit vs security logs.** *Audit* logs legitimate actions (who approved/created/
deleted what), scoped per college for admins and global for dev-admin. *Security*
events log anomalies and are dev-admin-only.

---

## 12. Performance

- **Indexes** on every hot query path (request lookups by college/warden/student,
  audit and security logs by time/type/ip, student lookups, OTP TTL).
- **Aggregation over N+1.** Dashboards that need per-college / per-warden counts use
  a single `$group` aggregation instead of a query per row (e.g. `getColleges`,
  `getWardens`).
- **Lazy + scheduled expiry.** Stale requests are swept both opportunistically on
  list reads (cheap `updateMany`, no-op when nothing matches) and by the cron job.
- **Throttled security logging** prevents write-amplification under attack (§11).
- **Single-job CI/CD** avoids shipping a ~120MB `node_modules` artifact between
  jobs; the client is built once, dev-deps pruned, and the package deployed as-is.
- **Payload caps** (1MB body limit) and **TTL collections** (OTPs, security events)
  keep storage and abuse bounded.

---

## 13. Background jobs

`server/utils/scheduler.js` (node-cron, started in `server.js`, every 15 min):
1. **Expire stale requests** globally (independent of anyone opening a page).
2. **Overstay sweep** — find requests still `out` past `returnDate` that haven't
   been flagged, set `overstay`/`overstayNotified`, and notify the warden + parent
   exactly once.

Disabled in serverless / via `ENABLE_SCHEDULER=false`. `runMaintenance` is exported
so it can be triggered or tested directly.

---

## 14. Messaging abstraction

Both channels live behind a one-function interface so callers never care about the
provider:

- **`utils/mailer.js → sendMail()`** — SMTP via nodemailer when `SMTP_HOST` is set;
  otherwise logs to console. Used for password-reset links.
- **`utils/sms.js → sendSms()`** — Twilio REST (via global `fetch`, no SDK) when
  Twilio env is set; otherwise logs to console. Used for parent OTPs.

Both are **fail-soft** (a provider outage logs and returns `delivered:false` rather
than breaking the request) and swappable (add a branch for a different provider).
This is why every auth flow works end to end locally with zero credentials.

---

## 15. API reference

All `/api/*` (also mounted unprefixed for Vercel). P = requires auth, R = role.

**Auth** (`/auth`)
- `POST /login` · `POST /parent/send-otp` · `POST /parent/verify-otp`
- `POST /forgotpassword` · `PUT /resetpassword/:token`
- `PUT /updatepassword` (P) · `PUT /updatedetails` (P) · `GET /me` (P)

**Dev-admin** (`/dev-admin`, R=dev-admin)
- `GET|POST /colleges` · `PUT|DELETE /colleges/:id` · `PUT /colleges/:id/status`
- `POST /create-admin`
- `GET /analytics` · `GET /analytics/breakdown` · `GET /audit-logs` · `GET /security`

**College-admin** (`/college-admin`, R=college-admin, tenant-scoped)
- `GET /dashboard`
- `GET|POST /wardens` · `DELETE /wardens/:id`
- `GET|POST /watchmen` · `DELETE /watchmen/:id`
- `GET|POST /students` · `POST /students/bulk` · `DELETE /students/:id`
- `POST /assign` · `GET /requests` · `GET /reports`
- `GET|PUT /settings` · `GET /audit-logs`

**Warden** (`/warden`, R=warden, tenant-scoped)
- `GET /dashboard` · `GET /students` · `GET /requests` · `GET /history` · `GET /settings`
- `PUT /requests/:id` (approve/reject) · `PUT /requests/:id/out` · `PUT /requests/:id/returned`

**Student** (`/student`, R=student)
- `GET /dashboard` · `POST /requests` · `GET /requests` · `GET /history` · `PUT /requests/:id/cancel`

**Parent** (`/parent`, R=parent)
- `GET /dashboard` · `PUT /requests/:id` (approve/decline) · `GET /history`

**Watchman** (`/watchman`, R=watchman, tenant-scoped)
- `GET /dashboard` · `GET /requests/approved` · `GET /requests/out`
- `POST /verify` (scan a gate pass) · `PUT /requests/:id/out` · `PUT /requests/:id/returned`

**Notifications** (`/notifications`, P) — `GET /` · `PUT /:id/read` · `PUT /read-all`
**System** — `GET /system/health`

---

## 16. Frontend architecture

- **Routing** (`App.tsx`) — React Router; role sections (`/dev-admin/*`,
  `/college-admin/*`, …) render inside a shared `DashboardLayout`.
- **AuthContext** (`contexts/AuthContext.tsx`) — holds the user, runs `GET /auth/me`
  on mount to rehydrate from the stored token, and exposes `login`, `verifyOtp`,
  `logout`, and `refreshUser` (used after a profile edit).
- **DashboardLayout** — renders the sidebar from a per-role `navConfig`, the
  notification bell (polled every 30s), and a role guard that keeps users inside
  their own section.
- **API client** (`lib/api.ts`) — axios instance; a request interceptor attaches
  the Bearer token; a response interceptor clears the token and fires an
  `auth:unauthorized` event on 401 so the app logs the user out cleanly.
- **Pages** are grouped by role under `src/pages/`. Charts use Recharts; tables and
  dialogs use shadcn/ui; lists show skeletons and friendly empty/error states.

---

## 17. Testing & CI/CD

- **Client tests** — Vitest + Testing Library (jsdom). Examples: `EmptyState`
  rendering, `formatDate` formatting.
- **Server tests** — Node's built-in `node --test` (zero dependencies). Examples:
  gate-pass sign/verify/tamper/expiry/secret, and the security-logging throttle.
- **CI** (`.github/workflows/main_campus-gate-app.yml`) — a **quality gate** job
  (lint → typecheck → client tests → server tests) runs on every push and PR; the
  Azure deploy job `needs: quality` and only runs on push to `main` / manual
  dispatch. Deploy authenticates via OIDC (no stored cloud credentials).

---

## 18. Limitations & future work

- **Notifications are in-app + polled** (30s); no websocket/SSE/push yet.
- **Email/SMS** require provider credentials to deliver for real (console fallback
  otherwise).
- **No refresh-token rotation** — tokens are long-lived but revocable via
  `tokenVersion`; short-lived access + refresh tokens would be the next step.
- **Test coverage is a meaningful starter set**, not exhaustive; API-level
  integration tests (supertest + in-memory Mongo) are a natural addition.
- **Vercel** config targets the API; serving the SPA there needs a static build step.

---

## 19. Interview talking points & Q&A

**"Walk me through the architecture."** Monorepo with a React/Vite SPA, an Express
API, and a thin serverless entry. In production Express serves the built SPA from
the same origin. Requests pass a layered middleware pipeline (helmet → CORS →
sanitization → rate limiting → auth → tenant) before hitting role controllers that
talk to MongoDB via Mongoose.

**"How does auth work?"** Stateless JWT in `Authorization: Bearer`. `protect`
verifies and loads the user; `authorize` checks role; `tenant` scopes to the
college and blocks suspended tenants. Passwords are bcrypt-hashed; parents log in
by phone OTP. I added a `tokenVersion` claim so a password change invalidates all
existing tokens without a session store.

**"How do you stop a forged QR pass?"** The QR encodes an HMAC-signed token bound
to the request id with a 12-hour expiry. The watchman's scan calls a `/verify`
endpoint that recomputes the HMAC in constant time, checks expiry, and confirms the
pass belongs to the same college and an actionable state — all server-side.

**"How is multi-tenancy enforced?"** Every non-dev-admin user carries a `collegeId`;
`tenant` middleware sets `req.collegeId` and every query filters by it, plus
per-record ownership checks. Dev-admin is the only cross-tenant role.

**"What did you do for security?"** Defense in depth (§11): helmet, CORS allowlist,
rate limiting, input sanitization (NoSQL + XSS + HPP), bcrypt, JWT revocation,
signed gate passes, suspended-college lockout, fail-fast on missing secrets,
generic auth responses, and a security-telemetry pipeline feeding a dev-admin
dashboard — with the logging throttled so it can't be turned into a DoS amplifier.

**"How does it scale / where are the bottlenecks?"** Indexed query paths,
aggregations instead of N+1, TTL collections, payload caps, throttled logging, and
a single-job deploy. The next bottleneck would be notification polling — I'd move
that to SSE/websockets.

**"What's the request state machine?"** See §8 — a 10-state lifecycle from
`pending-parent` through `approved`/`out`/`returned`, with conditional parent-skip
for Mess/Exam, student cancellation, scheduled expiry, and overstay detection.

**"What would you build next?"** Refresh-token rotation, real-time notifications,
broader integration tests, and curfew/quota policies per college.
