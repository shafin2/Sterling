# Sterling — Build Plan (Phases)

Detailed, production-ready phase plan for the Smart Invoice & Payroll Platform. **Every requirement
in the problem statement — core modules and bonus features — is mapped to a phase. Nothing is
skipped.** Each phase ends in a demoable, deployable state with full UI states (loading / empty /
error / success), full button states, icons, and tests on critical logic.

Legend: 🔒 backend · 🎨 frontend · ⚙️ infra/jobs · ✅ acceptance gate.

---

## Phase 0 — Foundation, Multi-Tenancy & Design System
*Goal: a deployable empty shell with auth, tenant isolation, and the full premium design system.
No feature is built until this is solid.*

**⚙️ Repo & tooling**
- pnpm monorepo: `apps/api`, `apps/web`, `packages/shared` (Zod schemas + shared TS types),
  `packages/config` (eslint/tsconfig/tailwind preset).
- Local dev without Docker: Postgres 16, Redis, Mailhog, MinIO on host. `.env.example` committed.
- Prettier + ESLint + strict TS (`noUncheckedIndexedAccess`, no `any`). Husky + lint-staged.
- Deploy: `docker-compose.prod.yml` (postgres, redis, api, web, **worker**) + nginx template.

**🔒 Backend core**
- NestJS bootstrap: global prefix `/api/v1`, Helmet, cookie-parser, CORS (credentials), pino,
  global `ValidationPipe`, Swagger at `/api/docs`.
- Drizzle setup: `drizzle-kit` migrations, `db.module`, typed client, `migrate.ts`, `seed.ts`.
- **Multi-tenancy + RLS:** `tenants`, `users`, `memberships(user,tenant,role)` tables. Every
  domain table gets `tenant_id`. Enable RLS + policies keyed on `current_setting('app.tenant_id')`.
  Request-scoped interceptor opens a transaction and `SET LOCAL app.tenant_id`. **Cross-tenant
  isolation test is the gate.**
- **Auth:** email/password (argon2), JWT access + refresh in httpOnly cookies, refresh rotation,
  `/auth/register` (creates tenant + owner), `/auth/login`, `/auth/logout`, `/auth/me`,
  `/auth/refresh`, password reset (token email via job). `@Public()` bypass decorator.
- **RBAC:** seed roles `owner/admin/accountant/hr/viewer` + permission matrix. `@Permissions()`
  decorator + global `PermissionsGuard`. Global `AuditInterceptor` writing to `audit_logs`.
- **Jobs infra:** BullMQ + Redis; separate worker process; queues registered: `email`, `pdf`,
  `payroll`, `reminders`. Bull-Board mounted (admin-only) for queue visibility.

**🎨 Frontend core**
- Next 15 App Router, Tailwind + shadcn/ui, **Metallic Chic tokens** (light + true dark) in
  config & CSS vars. Type scale, spacing, radius, shadow, `tabular-nums` for money.
- Global providers: TanStack Query, theme (light/dark/system), toaster, tooltip.
- **App shell `/app`**: glass sidebar (icon+label nav, active/hover states), topbar (tenant
  switcher, ⌘K command palette, notifications, profile menu, theme toggle), breadcrumbs.
- Reusable primitives with **all interaction states**: Button (variants/sizes/loading), Input,
  Select, Combobox, DatePicker, Dialog/Drawer (glass), DataTable (TanStack — sticky header,
  sort, filter, paginate, row actions, bulk select), StatusBadge, MoneyText, EmptyState,
  Skeletons, ConfirmDialog, Toast, FormField (RHF+Zod). Storybook-style demo page.
- Auth screens: login, register (company onboarding wizard), forgot/reset — animated, validated.
- **✅ Gate:** register → land in themed dashboard shell; switch tenants; dark mode flawless;
  RLS proven by test; queues healthy; Lighthouse a11y ≥ 95.

---

## Phase 1 — Clients & Employees (Master Data)
*Goal: the records everything else hangs off of.*

**Module 2 (Clients) + Module 3 (Employees)**

**🔒 Backend**
- `clients`: company/person, contacts, billing address, tax id, currency, notes, status.
  CRUD + search + soft-delete; CSV import endpoint.
- `departments`: name, head, description. CRUD.
- `employees`: profile (code, name, contact, photo via MinIO upload), department, job title,
  join date, status; **salary structure** (basic + named allowances + deductions, all integer
  minor units, effective-dated). CRUD + history of structure changes.

**🎨 Frontend**
- Clients: TanStack Table (search/filter/sort/paginate, bulk actions, CSV import dropzone),
  create/edit drawer (RHF+Zod), detail page (profile + invoice history + outstanding total),
  designed empty/loading/error states, row actions menu with icons.
- Employees: directory (cards + table toggle), department management, employee detail
  (overview, salary structure editor with live net-pay preview, document uploads), avatars.
- **✅ Gate:** full CRUD with optimistic updates + toasts; CSV import with row-level validation
  report; every button state present.

---

## Phase 2 — Invoice Management (Core)
*Problem Module 1.*

**🔒 Backend**
- `invoices` (number sequence per tenant, client, issue/due dates, currency, line items,
  subtotal/tax/discount/total — integer minor units, **status: Draft / Sent / Paid / Overdue**,
  notes, terms, template ref). `invoice_items`, `payments` (partial payments, methods).
- State machine: Draft→Sent→Paid; auto-**Overdue** via daily BullMQ cron when past due & unpaid.
- Invoice numbering, duplicate-to-new, recurring-invoice scaffold (cron), record-payment endpoint.
- **PDF generation job** (Puppeteer renders the invoice template → PDF → MinIO → signed URL).
- **Public share link**: tokenized read-only invoice view + PDF download (no auth, tenant-safe).

**🎨 Frontend**
- Invoice list: rich table with status badges (color-mapped), filters (status/client/date range),
  totals row, bulk actions, quick-status, search; saved views.
- Invoice editor: client picker, dynamic line items (add/remove/reorder, qty×rate auto-calc),
  tax & discount, live total, template & currency picker, **live preview pane**, Save Draft /
  Send / Download PDF / Share. Full validation + autosave indicator.
- Invoice detail: timeline (created/sent/viewed/paid), payment recorder, send-email action,
  copy share link + **QR** (bonus tie-in), print, status controls.
- Status tracking views, history, and overdue surfacing.
- **✅ Gate:** create → send → record payment → status flows correct; PDF matches preview
  pixel-for-pixel; share link works logged-out; overdue cron flips status.

---

## Phase 3 — Custom Invoice Designer (WYSIWYG)
*Problem Module 2 — the differentiator. Make it feel magical.*

**🔒 Backend**
- `invoice_templates`: JSON layout schema (sections, blocks, bindings, styles), theme tokens,
  logo asset, fonts, colors, paper size. CRUD, clone, set-default, versioning.
- Render engine: one HTML/CSS template consumes the layout JSON + invoice data → used by **both**
  the live web preview *and* the Puppeteer PDF job (true WYSIWYG, no drift). Seed 3–4 themes.

**🎨 Frontend (dnd-kit)**
- Designer canvas: **drag-drop** sections/blocks (header, logo, company/client blocks, items
  table, totals, notes, footer, signature, QR). Inspector panel for selected block (typography,
  color from brand palette, spacing, alignment, visibility, data binding).
- Branding: logo upload, color theme picker (Metallic Chic presets + custom), font pairing,
  layout presets, multiple themes, save/duplicate/reuse templates.
- Live preview at real paper proportions; device/zoom controls; **"Preview before publishing"**;
  template gallery with thumbnails. Undo/redo, keyboard shortcuts.
- **✅ Gate:** design a template, apply to a real invoice, export PDF — identical to canvas;
  templates reusable across invoices; smooth drag with motion feedback.

---

## Phase 4 — Payroll & Salary Slips
*Problem Modules 4 & 5.*

**🔒 Backend**
- `payroll_runs` (tenant, period month/year, status: Draft→Processing→Completed, totals),
  `payslips` (employee, run, snapshot of structure, allowances, deductions, gross, tax, net —
  all integer minor units), recompute-safe.
- **Payroll engine**: compute per employee from effective salary structure + per-run adjustments
  (bonuses, one-off deductions, unpaid leave); pluggable **tax calculation** (bonus tie-in).
  Runs as a **BullMQ job** with progress; idempotent; locked once paid.
- Salary-slip **PDF job** (same WYSIWYG engine, branded slip template). Mark-paid, payroll history,
  payroll reports (per-period, per-department, YTD).

**🎨 Frontend**
- Payroll runs list (period cards + table, status badges, totals).
- Run wizard: pick month → preview computed payslips table (editable adjustments, live recompute)
  → confirm/process (job progress UI) → review → mark paid. Guardrails + confirm dialogs.
- Payslip detail + branded preview + PDF download; per-employee salary history timeline.
- Payroll reports with charts and export.
- **✅ Gate:** process a month end-to-end; numbers reconcile; slips match preview; re-running is
  idempotent; locked after paid.

---

## Phase 5 — Dashboard, Reporting & Financial Visibility
*Problem Module 6.*

**🔒 Backend**
- Aggregation endpoints: revenue (paid invoices) over time, outstanding/overdue totals & aging,
  invoice status breakdown, payroll expense by month/department, net cashflow, top clients,
  upcoming dues. All tenant-scoped, date-range params, server-computed (no client math on money).

**🎨 Frontend (Recharts/Tremor)**
- Dashboard: animated KPI cards (count-up, trend arrows) — Revenue, Outstanding, Overdue, Payroll
  this month, Active clients/employees. Charts: revenue line/area, status donut, payroll bar,
  aging buckets, cashflow. Date-range picker, refresh, drill-through to lists.
- Reports section: financial summary, invoice analytics, payroll analytics, outstanding/aging,
  each printable + **CSV/Excel export** (bonus tie-in). Designed empty/loading states for every card.
- **✅ Gate:** dashboard loads <1s with skeletons; numbers match underlying records exactly;
  charts responsive + dark-mode correct; exports valid.

---

## Phase 6 — Bonus Features (part of the deliverable, not optional)
*All problem "Bonus" items, built to the same bar.*

- **AI invoice generation** — natural-language → draft invoice (line items, amounts) via Claude;
  review-before-save. **AI payroll insights** — anomaly/trend narrative on the dashboard.
- **QR code invoice sharing** — QR on PDF + share page linking to the public invoice/pay view.
- **Automated email delivery** — send invoices/slips via email job (Nodemailer; Mailhog local).
- **Automated payment reminders** — scheduled BullMQ cron: pre-due, on-due, overdue cadence,
  per-tenant configurable; reminder log + opt-out.
- **Tax calculations** — configurable tax rules/rates per tenant, applied on invoices & payroll.
- **Multi-company support** — already structural (tenant switcher); add company profile/branding,
  per-company numbering, switch UX, invite teammates with roles.
- **Excel/CSV export** — invoices, clients, employees, payroll, reports.
- **Audit logs & activity UI** — searchable, filterable activity feed from `audit_logs`.
- **Dark mode** — shipped in Phase 0; verified across every screen.
- **Mobile responsive** — verified across all modules.
- **Advanced analytics** — forecasting, client profitability, payroll cost trends.

---

## Phase 7 — Marketing Site, Hardening & Deploy
*Goal: a sellable front door and a production deployment.*

- **🎨 Landing page** (`/`): hero with **Three.js / R3F** (subtle, performant; reduced-motion
  fallback), GSAP marketing scroll (optional), feature sections, pricing, testimonials, CTA →
  register. Glass nav. SEO/OG/sitemap. This is the premium first impression — polish hard.
- **Public invoice/pay page**: branded, QR, PDF download.
- **Hardening**: rate limiting, input fuzzing on money/payroll, RLS audit, secrets check, error
  boundaries, 404/500 designed pages, perf budget, accessibility pass, e2e smoke (Playwright).
- **Deploy**: Docker Compose (api, web, worker, postgres, redis) behind nginx; migration + seed
  on release; health checks; backups; `.env.production.example`; one-command deploy doc.
- **✅ Gate:** green build, all critical tests pass, deployed URL, Lighthouse perf+a11y ≥ 95,
  full demo script runs clean.

---

## Cross-cutting Definition of Done (every phase)
- [ ] All UI states: default / hover / active / focus-visible / disabled / loading / empty / error.
- [ ] Icons on every nav, button, action, badge, empty state (lucide).
- [ ] Light **and** dark mode verified; responsive mobile→desktop.
- [ ] Zod validation both ends; typed errors surfaced (inline + toast), no blank failures.
- [ ] Money in integer minor units; `tabular-nums`; formatted only at view layer.
- [ ] Tenant-scoped + RLS-safe; permission-guarded; audit-logged.
- [ ] Heavy work (PDF/email/payroll/reminders) runs as BullMQ jobs with visible status.
- [ ] Tests on money/payroll/tax math + RLS isolation; build + lint green; `main` deployable.
