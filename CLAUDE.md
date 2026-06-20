# Sterling — Smart Invoice & Payroll Platform

> *"Invoice & Payroll, refined."* — a premium, multi-tenant SaaS for SMBs to design branded
> invoices, manage clients & employees, run payroll, generate salary slips, track payments,
> and monitor financial performance from one dashboard.

This file is the **contract** for how Sterling gets built. Read it before writing any code.
Detailed, phase-by-phase scope lives in [`PHASES.md`](./PHASES.md). Nothing in the problem
statement is optional — **everything ships, production-ready.**

---

## Non-negotiables

1. **Production-ready, always.** No TODOs, no mocked data in shipped paths, no `any` escape
   hatches, no dead buttons. If a button exists, it works. If a screen exists, it has loading,
   empty, error, and success states.
2. **Premium frontend is the whole point.** This must *look and feel* like a paid product —
   not a CRUD admin panel. Sweat every detail (see **Design Bar** below).
3. **Multi-tenant from line one.** Every domain table carries `tenant_id`; every query is
   tenant-scoped via Postgres **Row-Level Security** + a request-scoped tenant context. No
   query may ever leak another tenant's data.
4. **Money is integer minor units** (paisa/cents) end-to-end. Never store currency as float.
   Format only at the view layer.
5. **WYSIWYG PDFs.** Invoices and salary slips render server-side via headless Chrome from the
   *same* HTML templates the designer edits — what you design is exactly what prints.
6. **Type-safe seams.** Zod at every boundary (API DTOs, env, forms). Shared types between
   web and api via the `packages/*` workspace.

---

## Tech Stack (locked)

**Monorepo:** pnpm workspace — `apps/api`, `apps/web`, `packages/*` (shared types/zod schemas).

**Backend** — NestJS 11 (modular, `src/modules/*`) · **Drizzle ORM** + PostgreSQL 16 ·
JWT **httpOnly cookie** auth (access + refresh) · global `AuthGuard` + `PermissionsGuard`
(tenant-scoped RBAC) + `AuditInterceptor` · **BullMQ + Redis** for queues/cron (payroll runs,
payment reminders, email, PDF generation) · **Puppeteer** (headless Chrome) for PDF · Nodemailer
(Mailhog local / SMTP prod) · pino logging · Helmet · Swagger at `/api/docs`. All routes under
`/api/v1`.

**Frontend** — Next.js 15 (App Router) · React 19 · TypeScript · Tailwind + **shadcn/ui** (core) ·
**Framer Motion** (in-app animation) · **Recharts/Tremor** (dashboard charts) · **TanStack Query**
+ **TanStack Table** (data) · **React Hook Form + Zod** (forms) · **dnd-kit** (invoice designer) ·
**Three.js / R3F** (landing hero only) · **lucide-react** icons everywhere · `ky` HTTP client.
GSAP optional on the marketing page only.

**Infra (local, no Docker):** Postgres + Redis + Mailhog + MinIO run on host; apps via `pnpm dev`.
**Infra (deploy):** Docker Compose (postgres, redis, api, web, worker) behind nginx.

---

## Brand & Design System — "Metallic Chic"

Tokenize all of this in Tailwind config + CSS vars. **Never hardcode hex in components.**

| Token | Light | Use |
|---|---|---|
| `primary` | `#3D52A0` | primary actions, active nav |
| `accent` | `#7091E6` | hover, focus rings, links |
| `muted` | `#8697C4` | secondary text |
| `border` | `#ADBBDA` | borders, dividers |
| `surface` | `#EDE8F5` | page/card surface |
| `success` | `#2E9E7B` | paid |
| `warning` | `#D99A4E` | pending / draft-sent |
| `danger`  | `#C9485B` | overdue / destructive |

**Dark mode** = a navy-slate neutral *tinted toward* `#3D52A0` — **not** a color inversion.
Build a real dark palette; test every screen in both.

**Status → color mapping (single source of truth):** Draft=muted · Sent=warning · Paid=success ·
Overdue=danger. Payroll: Pending=warning · Processed=accent · Paid=success.

### Design Bar (this is what "premium" means here)
- **Every interactive element has all states**: default, hover, active/pressed, focus-visible
  (visible ring), disabled, loading. No state left to the browser default.
- **Icons everywhere** (lucide): every nav item, button, table action, empty state, toast,
  status badge. Pair icon + label; never an unlabeled mystery-meat icon for primary actions.
- **Motion with restraint** (Framer Motion): page/section transitions, list stagger, number
  count-ups on dashboard, modal/drawer spring, toast slide. Respect `prefers-reduced-motion`.
- **Glassmorphism surgically**: nav bar, modals, command palette, overlays only — **never on
  data tables or dense forms** (legibility wins).
- **Empty / loading / error states are designed**, not afterthoughts — skeletons (not spinners)
  for tables/cards, illustrated empty states with a clear CTA, inline form errors.
- **Consistent spacing/radii/shadow scale**; one type scale; `tabular-nums` for all money.
- **Fully responsive** (mobile → 4K) and **accessible** (WCAG AA contrast, keyboard nav, ARIA,
  focus traps in modals, `aria-live` for async results).
- **Command palette (⌘K)**, toasts, and a polished sidebar + topbar shell across `/app`.

---

## Conventions

- **Tenant scoping:** resolve tenant from the authed user → set Postgres session var
  (`SET LOCAL app.tenant_id`) inside a per-request transaction; RLS policies do the rest.
- **RBAC:** roles per tenant (`owner`, `admin`, `accountant`, `hr`, `viewer`); `@Permissions()`
  decorator + `PermissionsGuard`. Every mutation passes through `AuditInterceptor`.
- **Validation:** Zod DTOs (`nestjs-zod`) on api; RHF + Zod (shared schema from `packages/*`) on web.
- **Errors:** typed problem responses; web surfaces them as inline + toast, never a blank screen.
- **PDFs & email & payroll** are **jobs** (BullMQ), never inline request work; show job status in UI.
- **Tests:** Vitest (unit/integration) on api; critical-path component tests on web. Money math,
  payroll calc, tax calc, and RLS isolation **must** have tests.
- **Commits:** conventional commits; one concern per PR; never commit secrets (`.env` is gitignored).

---

## Build order

Follow [`PHASES.md`](./PHASES.md) **in order** — each phase is independently demoable and leaves
`main` deployable. Phase 0 (foundation/multi-tenancy/design system) before any feature work.
Don't skip the bonus phase: AI generation, QR sharing, automated reminders/email, tax, audit log
UI, Excel/CSV export, and advanced analytics are part of the deliverable.
