<div align="center">

# Sterling

### Invoice & Payroll, refined.

A premium, multi-tenant SaaS platform that lets small & medium businesses **design branded
invoices, manage clients & employees, run payroll, generate salary slips, track payments, and
monitor financial performance** — all from one centralized, beautifully designed dashboard.

Built for the *Smart Invoice & Payroll Management Platform* challenge (DotCode Solutions).

</div>

---

## ✨ What it does

| Module | Highlights |
|---|---|
| **Invoices** | Create/manage invoices · Draft → Sent → Paid → Overdue tracking · partial payments · history · server-rendered PDF · public share links + QR |
| **Custom Designer** | Drag-and-drop **WYSIWYG** invoice templates · logo & branding · colors/fonts/layouts/sections · multiple themes · preview before publish · save & reuse |
| **Clients** | Company & contact records · billing/tax details · CSV import · per-client outstanding & history |
| **Employees** | Profiles · departments · effective-dated salary structures (allowances & deductions) · documents |
| **Payroll** | Monthly runs · automated salary calculation · allowances/deductions · tax · history & reports |
| **Salary Slips** | Branded, WYSIWYG salary slips · PDF download · monthly records · per-employee history |
| **Dashboard** | Revenue, outstanding & aging, invoice analytics, payroll expense, financial summary — animated charts |
| **Access** | Auth (JWT cookies) · tenant-scoped RBAC · audit logs · admin dashboard |
| **Bonus** | AI invoice generation · AI payroll insights · QR sharing · automated email & payment reminders · tax engine · multi-company · Excel/CSV export · audit-log UI · dark mode · fully responsive |

Full scope and the staged build plan: [`PHASES.md`](./PHASES.md). Engineering contract & design
system: [`CLAUDE.md`](./CLAUDE.md).

---

## 🎨 Design — "Metallic Chic"

A cool, metallic brand system with purpose-built semantic colors and a real (non-inverted) dark mode.

```
primary #3D52A0   accent #7091E6   muted #8697C4   border #ADBBDA   surface #EDE8F5
success #2E9E7B   warning #D99A4E   danger #C9485B
```

Every interactive element ships all states (hover / active / focus / disabled / loading), icons
throughout (lucide), tasteful Framer Motion, surgical glassmorphism on nav/modals/overlays, and a
Three.js landing hero. Premium is the product.

---

## 🧱 Architecture

**pnpm-workspace monorepo:**

```
apps/
  api/      NestJS 11 · Drizzle ORM · PostgreSQL 16 · JWT cookie auth · RBAC + audit · RLS
  worker/   BullMQ workers (payroll · PDF · email · reminders)   [runs from api codebase]
  web/      Next.js 15 (App Router) · React 19 · Tailwind + shadcn/ui · TanStack · Recharts · Framer Motion
packages/
  shared/   Zod schemas + shared TS types (web ⇄ api)
  config/   shared eslint / tsconfig / tailwind preset
```

- **Multi-tenant** via a shared schema with `tenant_id` on every table + Postgres **Row-Level
  Security**; tenant resolved per request and applied with `SET LOCAL app.tenant_id`.
- **PDFs** (invoices + salary slips) render server-side with **headless Chrome (Puppeteer)** from
  the *same* HTML templates the designer edits — true WYSIWYG.
- **Queues/cron** (payroll runs, payment reminders, email, PDF) via **BullMQ + Redis**.
- **File storage** (generated PDFs, tenant logos) via **AWS S3** — see [Storage](#-file-storage--aws-s3) below.
- API at `:4000` under `/api/v1` (Swagger at `/api/docs`); web at `:3000`.

---

## 📁 File Storage — AWS S3

Generated PDFs (invoices, payslips) and tenant logos are stored in **AWS S3** (`ap-south-1`).

**Production (EC2):** An IAM role (`sterling-app-s3-role`) is attached directly to the EC2 instance
with `AmazonS3FullAccess`. No access keys are stored anywhere — the AWS SDK picks up credentials
automatically from the EC2 instance metadata service (IMDS). Just set:

```env
AWS_REGION=ap-south-1
S3_BUCKET=sterling-app-512738511897
# Leave AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY blank
```

**Local dev:** IAM role credentials are only available inside EC2. To test S3 locally, create an
IAM user with S3 access and temporarily fill in your credentials:

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-iam-user-key
AWS_SECRET_ACCESS_KEY=your-iam-user-secret
S3_BUCKET=sterling-app-512738511897
```

**Test S3 connectivity** (run on EC2, or locally with IAM user credentials in `.env`):

```bash
node apps/api/scripts/test-s3.mjs
```

The script does a full round-trip: upload → read → delete a small test object and reports pass/fail.

---

## 🌐 Live site

| URL | What |
|---|---|
| `https://sterling.shafinzaman.dev` | Web app |
| `https://sterling.shafinzaman.dev/api/v1/health` | API health check |
| `https://sterling.shafinzaman.dev/api/docs` | Swagger / API docs |
| `https://sterling.shafinzaman.dev/api/v1/queues?apiKey=<BULL_BOARD_API_KEY>` | BullMQ queue dashboard |

> Queue dashboard: include `?apiKey=<BULL_BOARD_API_KEY>` on the **first** visit — the browser gets a
> 2-hour session cookie so subsequent loads don't need the key in the URL.

---

## 🚀 Run it locally (no Docker)

**Prereqs:** Node ≥ 22, pnpm ≥ 10, local **PostgreSQL 16** and **Redis**.

> S3 (PDF storage) won't work locally without IAM user credentials — everything else runs fine.
> Email sending requires Mailhog or an SMTP server; leave blank to skip.

```bash
# 1. install
pnpm install

# 2. configure
cp .env.example .env        # fill in DATABASE_URL, Redis, JWT secrets, S3 (optional locally)

# 3. build the shared package first
pnpm --filter @sterling/shared build

# 4. database
node apps/api/scripts/migrate.mjs

# 5. run api + worker + web
pnpm --filter @sterling/api dev        # terminal 1 — NestJS API on :4000
pnpm --filter @sterling/api worker:dev # terminal 2 — BullMQ worker
pnpm --filter @sterling/web dev        # terminal 3 — Next.js on :3000
```

- Web → http://localhost:3000
- API docs (Swagger) → http://localhost:4000/api/docs
- Queue dashboard (Bull Board) → http://localhost:4000/api/v1/queues

---

## 📦 Deploy (EC2 / Docker)

```bash
cp .env.example .env
# edit .env — fill in JWT secrets, SMTP, S3, API keys
docker compose -f docker-compose.prod.yml up -d --build
```

Brings up **postgres, redis, api, worker, web** behind an nginx reverse proxy. Migrations run on
release; health checks and volume-backed Postgres/Redis included.

**S3 on EC2:** Attach the `sterling-app-s3-role` IAM role to your EC2 instance — no keys needed
in `.env`. The SDK discovers credentials automatically via IMDS.

---

## 🗺️ Status

Built in ordered, demoable phases — see [`PHASES.md`](./PHASES.md). Phase 0 (foundation,
multi-tenancy + RLS, design system) lands first; every later phase keeps `main` deployable and
holds the full Definition of Done (all UI states, light/dark, responsive, tested money/payroll math,
tenant isolation).

---

## 🧰 Scripts

| Command | Does |
|---|---|
| `pnpm --filter @sterling/api dev` | Run NestJS API in watch mode (:4000) |
| `pnpm --filter @sterling/api worker:dev` | Run BullMQ worker in watch mode |
| `pnpm --filter @sterling/web dev` | Run Next.js frontend in watch mode (:3000) |
| `pnpm build` | Build all workspaces |
| `pnpm lint` | Lint/type-check all workspaces |
| `pnpm test` | Run Vitest across workspaces |
| `node apps/api/scripts/migrate.mjs` | Apply all SQL migrations |
| `node apps/api/scripts/test-s3.mjs` | Test S3 connectivity (upload → read → delete) |

---

<div align="center">
<sub>Sterling — a practical, deployable, business-ready Invoice & Payroll platform.</sub>
</div>
