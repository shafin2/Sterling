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
- API at `:4000` under `/api/v1` (Swagger at `/api/docs`); web at `:3000`.

---

## 🚀 Run it locally (no Docker)

**Prereqs:** Node ≥ 22, pnpm ≥ 10, and local **PostgreSQL 16**, **Redis**, **Mailhog**, **MinIO**.

```bash
# 1. install
pnpm install

# 2. configure
cp .env.example .env        # fill in DB / Redis / SMTP / S3 values

# 3. database
pnpm --filter api db:migrate
pnpm --filter api db:seed   # demo tenant, roles, sample data

# 4. run everything (api + worker + web)
pnpm dev
```

- Web → http://localhost:3000  ·  API docs → http://localhost:4000/api/docs
- Mailhog UI → http://localhost:8025  ·  MinIO console → http://localhost:9001

> Local runs use host services (no Docker). **Deployment** uses Docker Compose.

---

## 📦 Deploy (Docker)

```bash
cp .env.production.example .env.production
docker compose -f docker-compose.prod.yml up -d --build
```

Brings up **postgres, redis, api, worker, web** behind an nginx reverse proxy. Migrations + seed
run on release; health checks and volume-backed Postgres/Redis included.

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
| `pnpm dev` | Run api + worker + web in watch mode |
| `pnpm build` | Build all workspaces |
| `pnpm lint` | Lint/type-check all workspaces |
| `pnpm test` | Run Vitest across workspaces |
| `pnpm --filter api db:migrate` | Apply Drizzle migrations |
| `pnpm --filter api db:seed` | Seed demo data |

---

<div align="center">
<sub>Sterling — a practical, deployable, business-ready Invoice & Payroll platform.</sub>
</div>
