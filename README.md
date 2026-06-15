# CampusGate — Smart Gate Pass Management System 🛡️

**CampusGate** is a multi-tenant, digital gate-pass system for educational institutions. It streamlines the outing-request workflow between **students, parents, wardens, and security staff (watchmen)** — with QR-based gate verification, role-based dashboards, and full audit trails.

**[🚀 Live Demo: campus-gate-app.azurewebsites.net](https://campus-gate-app.azurewebsites.net)**

> This is an independent project maintained by a single developer. It is **not open for public sign-up**. To request access for your institution, email **[contact@sameerreddy.in](mailto:contact@sameerreddy.in)**.

---

## ✨ Features

**Students**
- Raise outing requests with purpose, destination, and out/expected-return times.
- Track live status through the approval pipeline.
- Time-gated **QR gate pass** for exit/entry.
- Full request history.

**Parents**
- OTP-based login (linked by phone number).
- Approve or decline their child's requests.
- Activity history.

**Wardens**
- Review and approve/reject requests assigned to them.
- Mark students out/returned (when gate security is disabled).
- See **overstay** flags for students out past their expected return.

**Watchmen (Gate Security)**
- Scan a student's **QR code** (or search by name/roll) to verify a pass.
- One-tap mark out / mark returned.
- Overstay highlighting.

**College Admins**
- Manage wardens, watchmen, and students (single add or **bulk CSV upload**).
- Assign students to wardens.
- View all requests, export **CSV reports** with date/status filters.
- View a college-scoped **audit log**.
- Toggle gate-security mode.

**Developer Admin (super-tenant)**
- Manage colleges and college admins.
- Platform-wide **analytics** (status breakdown, per-college volume, monthly trend).
- Global **audit log**.
- **Security & Logs** dashboard — live threat telemetry (failed logins, unauthorized/forbidden access, rate-limit blocks, OTP brute-force, blocked injection attempts), top source IPs, a 14-day event timeline, and a platform-stats snapshot. Exportable to CSV.

**Platform**
- JWT auth, role-based access control, multi-tenant isolation by college.
- Self-service **password reset** flow (delivery is stubbed — see note below).
- Automatic expiry of stale/unused requests; overstay detection.
- **Dark mode**, loading skeletons, and friendly empty/error states.

## 🛠️ Tech Stack

- **Frontend:** React 18 (Vite), TypeScript, Tailwind CSS, shadcn/ui, Recharts, Framer Motion.
- **Backend:** Node.js, Express.
- **Database:** MongoDB (Mongoose).
- **Auth:** JWT.
- **Hosting:** Azure App Service (also deployable to Vercel).

---

## 📂 Project Structure

```
campus-gate/
├── api/        # Vercel serverless entry (re-exports the Express app)
├── client/     # React + Vite frontend
├── server/     # Express API, Mongoose models, controllers, routes
└── .github/    # CI/CD workflow (Azure deploy)
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
Create `server/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_secret
JWT_EXPIRE=30d
NODE_ENV=development
```

(Optional) create `client/.env` if you need to override the API base — by default the client calls `/api` and Vite proxies it to `http://localhost:5000` in development.

### 3. Seed the first admin
The database starts empty. Create the **Developer Admin** account:
```bash
cd server
node scripts/setDevAdmin.js you@example.com YourStrongPassword
# or omit args to use DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD env vars,
# or omit the password to have a random one generated and printed.
```
This script is safe to run against a live database — it only touches the dev-admin account.

### 4. Run
From the repo root (runs client + server together):
```bash
npm run dev
```
- Frontend: http://localhost:8080
- Backend:  http://localhost:5000

---

## ☁️ Deployment

CI/CD is handled by **[.github/workflows/main_campus-gate-app.yml](.github/workflows/main_campus-gate-app.yml)**, which on every push to `main`:
1. Installs deps (with npm cache), builds the client, prunes dev dependencies.
2. Authenticates to Azure via OIDC and deploys to the App Service.

It runs as a single job (no slow build-artifact round-trip) for fast deploys.

**Required App Service settings** (Configuration → Environment variables):
- `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRE`
- `NODE_ENV=production` — recommended (enables secure cookies and hides server error details). The UI no longer depends on it: the server serves `client/dist` whenever that build is present.

Azure's server-side build is disabled via the committed [.deployment](.deployment) file (`SCM_DO_BUILD_DURING_DEPLOYMENT=false`), so the pre-built, pruned package from CI ships as-is. The app is also deployable to Vercel via [vercel.json](vercel.json) (`api/index.js` is the serverless entry).

### Environment variables reference
| Var | Where | Purpose |
| --- | --- | --- |
| `MONGO_URI` | server | MongoDB connection string |
| `JWT_SECRET` | server | JWT signing secret |
| `JWT_EXPIRE` | server | Token lifetime (e.g. `30d`) |
| `NODE_ENV` | server | `production` in deployment |
| `CORS_ORIGINS` | server | Optional. Comma-separated allowlist of cross-origin sites permitted to call the API in production (e.g. `https://app.example.com,https://admin.example.com`). Same-origin requests are always allowed; in non-production all origins are allowed. |
| `EXPOSE_RESET_TOKEN` | server | **Local testing only** — set to `true` to return password-reset tokens in the API response. Never set in production. |
| `DEV_ADMIN_EMAIL` / `DEV_ADMIN_PASSWORD` | server | Optional, used by `scripts/setDevAdmin.js` |

---

## 📌 Notes & Limitations

- **Messaging is not wired to a provider.** Parent OTPs and password-reset links are logged to the server console in development (and the reset token is returned in dev responses for testing). To go fully live, integrate an SMS/email provider in `authController` where these are logged.
- **Default credentials must be changed.** Older builds shipped a public seed with well-known credentials; use `scripts/setDevAdmin.js` to set your own.

---

## 📝 License

Licensed under the MIT License — see [LICENSE](LICENSE).

---

Made with ❤️ by [Sameer Reddy](https://github.com/sameerreddy213) · Access requests: [contact@sameerreddy.in](mailto:contact@sameerreddy.in)
