# CampusGate — Smart Gate Pass Management System 🛡️

**CampusGate** is a multi-tenant, digital gate-pass system for educational institutions. It digitises the entire outing-request workflow between **students, parents, wardens, security staff (watchmen), college admins, and a platform developer-admin** — with a QR-based, server-verified gate pass, role-based dashboards, multi-tenant isolation, and full audit + security telemetry.

**[🚀 Live Demo: campus-gate-app.azurewebsites.net](https://campus-gate-app.azurewebsites.net)**

> Independent project maintained by a single developer. It is **not open for public sign-up**. To request access for your institution, email **[contact@sameerreddy.in](mailto:contact@sameerreddy.in)**.

> 📚 **For a deep technical walkthrough** (architecture, data model, request lifecycle, every flow, security design, and interview Q&A) see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## ✨ Features

**Students**
- Raise outing requests (purpose, destination, out/expected-return times).
- Track live status through the approval pipeline.
- Time-limited **QR gate pass** carrying a signed, expiring token (verified server-side at the gate).
- Full request history.

**Parents**
- OTP-based login (linked to their child by phone number).
- Approve or decline their child's requests.
- Activity history.

**Wardens**
- Review and approve/reject requests assigned to them.
- Mark students out/returned (only when gate security is disabled).
- See **overstay** flags for students out past their expected return.

**Watchmen (Gate Security)**
- **Scan a student's QR pass** — the encoded token is verified on the server (signature + expiry + tenant + state) before any action.
- Search by name/roll as a manual fallback.
- One-tap mark out / mark returned; overstay highlighting.

**College Admins**
- Manage wardens, watchmen, and students (single add or **bulk CSV upload**, drag-and-drop supported).
- Assign students to wardens.
- View all requests, export **CSV reports** with date/status filters.
- View a college-scoped **audit log**.
- Toggle **gate-security mode** (watchman-gated vs warden-gated out/return).

**Developer Admin (super-tenant)**
- Create, **suspend/reactivate**, and manage colleges and college admins.
- Platform-wide **analytics** (status breakdown, per-college volume, monthly trend).
- Global **audit log**.
- **Security & Logs** dashboard — live threat telemetry (failed logins, unauthorized/forbidden access, rate-limit blocks, OTP brute-force, blocked injection attempts), top source IPs, a 14-day event timeline, a platform snapshot, and CSV export.

**Platform**
- JWT auth, role-based access control, multi-tenant isolation by college.
- **Suspended-college lockout** enforced at login and on every authenticated request.
- Token invalidation on password change (`tokenVersion`).
- Self-service **password reset** (email) and **parent OTP** (SMS) via a pluggable provider layer.
- In-app **notifications** (bell, polled), with parents pre-provisioned so the first request's alert is never lost.
- **Scheduled** auto-expiry of stale requests and overstay detection/notification (independent of page views).
- Dark mode, loading skeletons, friendly empty/error states.

## 🛠️ Tech Stack

- **Frontend:** React 18 (Vite), TypeScript, Tailwind CSS, shadcn/ui, Recharts, Framer Motion, React Router, TanStack Query, axios.
- **Backend:** Node.js, Express, Mongoose.
- **Database:** MongoDB.
- **Auth:** JWT (Bearer), bcrypt.
- **Security:** helmet, CORS allowlist, express-rate-limit, express-mongo-sanitize, xss-clean, hpp.
- **Messaging:** nodemailer (SMTP) for email, Twilio REST for SMS (both pluggable, with a console fallback in dev).
- **Jobs:** node-cron.
- **Tests:** Vitest + Testing Library (client), Node's built-in test runner (server).
- **Hosting:** Azure App Service (CI/CD via GitHub Actions).

---

## 📂 Project Structure

```
campus-gate/
├── api/        # Vercel serverless entry (re-exports the Express app)
├── client/     # React + Vite frontend
│   └── src/
│       ├── pages/        # Route pages, grouped by role
│       ├── components/   # Shared + shadcn/ui components
│       ├── contexts/     # AuthContext
│       ├── layouts/      # DashboardLayout (sidebar/nav)
│       └── lib/          # axios client, helpers
├── server/     # Express API
│   ├── config/         # db connection
│   ├── controllers/    # route handlers per role
│   ├── middleware/     # auth, tenant, validation, error
│   ├── models/         # Mongoose schemas
│   ├── routes/         # express routers
│   ├── utils/          # gatePass, mailer, sms, scheduler, security, audit, expiry, parents
│   ├── scripts/        # setDevAdmin, clearData
│   └── test/           # server tests (node --test)
├── docs/       # ARCHITECTURE.md — detailed technical guide
└── .github/    # CI/CD workflow (quality gate + Azure deploy)
```

This is an npm **workspaces** monorepo — `npm install` at the root installs both `client` and `server`.

---

## 🚀 Local Setup

### Prerequisites
- Node.js v18+ (v20 recommended)
- MongoDB (local or an Atlas connection string)

### 1. Clone & install
```bash
git clone https://github.com/sameerreddy213/campus-gate.git
cd campus-gate
npm install        # installs client + server via workspaces
```

### 2. Configure environment
Create `server/.env` (see the full reference below):
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_secret
JWT_EXPIRE=30d
NODE_ENV=development
```

(Optional) create `client/.env` to override the API base — by default the client calls `/api` and Vite proxies it to `http://localhost:5000` in development.

### 3. Seed the first admin
The database starts empty. Create the **Developer Admin** account:
```bash
cd server
node scripts/setDevAdmin.js you@example.com YourStrongPassword
# or omit args to use DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD env vars,
# or omit the password to have a random one generated and printed.
```
This script is safe against a live database — it only touches the dev-admin account.

### 4. Run
From the repo root (runs client + server together):
```bash
npm run dev
```
- Frontend: http://localhost:8080
- Backend:  http://localhost:5000

### Without an email/SMS provider
In development, if no SMTP/Twilio credentials are set, password-reset links and parent OTPs are **logged to the server console** (and the OTP is returned in the dev API response) so every flow works end to end locally.

---

## 🧪 Testing & Quality

```bash
# Client (Vitest + Testing Library)
npm run test  --prefix client
npm run lint  --prefix client

# Server (Node's built-in test runner)
npm test --prefix server
```

CI (GitHub Actions) runs a **quality gate** — lint, typecheck, client tests, server tests — on every push and pull request. A deploy only happens after the quality gate passes on `main`.

---

## ☁️ Deployment

CI/CD is handled by **[.github/workflows/main_campus-gate-app.yml](.github/workflows/main_campus-gate-app.yml)**. On every push to `main` (after the quality gate passes) it:
1. Installs deps (with npm cache), builds the client, prunes dev dependencies.
2. Authenticates to Azure via OIDC and deploys to the App Service as a single job (no slow artifact round-trip).

**Required App Service settings** (Configuration → Environment variables): at minimum `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRE`, and `NODE_ENV=production` (enables secure cookies and hides server error details). The Express server serves `client/dist` whenever that build is present, so the SPA and API ship from the same origin.

Azure's server-side build is disabled via the committed [.deployment](.deployment) file (`SCM_DO_BUILD_DURING_DEPLOYMENT=false`), so the pre-built, pruned CI package ships as-is.

> **Vercel:** [vercel.json](vercel.json) wires `api/index.js` as the serverless API entry. To serve the SPA on Vercel too you must build the client and serve `client/dist` as static output (the committed config focuses on the API); Azure is the primary, fully-wired target.

### Environment variables reference
| Var | Where | Purpose |
| --- | --- | --- |
| `MONGO_URI` | server | MongoDB connection string |
| `JWT_SECRET` | server | JWT signing secret (**required**; the server refuses to start without it) |
| `JWT_EXPIRE` | server | Token lifetime (e.g. `30d`) |
| `NODE_ENV` | server | `production` in deployment |
| `PORT` | server | API port (default 5000) |
| `CORS_ORIGINS` | server | Optional. Comma-separated allowlist of cross-origin sites allowed to call the API in production. Same-origin is always allowed; non-production allows all. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | server | Email (password-reset) delivery via SMTP. If unset, reset links are logged to the console. |
| `SMTP_SECURE` / `MAIL_FROM` | server | Optional. `SMTP_SECURE=true` for port 465; `MAIL_FROM` sets the From address. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | server | Parent-OTP SMS delivery via Twilio. If unset, OTPs are logged to the console. |
| `ENABLE_SCHEDULER` | server | Set to `false` to disable the background expiry/overstay job. Defaults to enabled. |
| `EXPOSE_RESET_TOKEN` | server | **Local testing only** — `true` returns password-reset tokens in the API response. Never set in production. |
| `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD` | server | Optional, used by `scripts/setDevAdmin.js` |

---

## 📌 Notes & Limitations

- **Messaging providers are optional but real.** Email (SMTP/nodemailer) and SMS (Twilio REST) are integrated behind a small provider layer (`server/utils/mailer.js`, `server/utils/sms.js`). Without credentials they fall back to console logging so local flows work; set the env vars above to deliver for real.
- **Notifications are in-app + polled** (30s) — there is no websocket/push channel yet. Out-of-app delivery relies on the email/SMS providers above.
- **Default credentials must be changed.** Use `scripts/setDevAdmin.js` to set your own dev-admin.
- `server/scripts/clearData.js` is **destructive** (wipes all data) and is guarded: it refuses to run in production and requires `--confirm`.

---

## 📝 License

Licensed under the MIT License — see [LICENSE](LICENSE).

---

Made with ❤️ by [Sameer Reddy](https://github.com/sameerreddy213) · Access requests: [contact@sameerreddy.in](mailto:contact@sameerreddy.in)
