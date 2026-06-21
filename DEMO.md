# 🎬 Sterling — Live Demo Script

> A presenter-ready, ~8-minute walkthrough that tells a story: from "SMBs drowning in spreadsheets" to a polished, automated, multi-tenant platform. Every step lists **what to click**, **what to say**, and **copy-paste content**.

---

## 1. Demo Prerequisites

**What must be running / seeded:**
- ✅ PostgreSQL 16 + Redis up
- ✅ Migrations applied + demo seed loaded (`pnpm --filter @sterling/api migrate` then `seed`)
- ✅ Super-admin seeded (`node apps/api/scripts/seed-admin.mjs`)
- ✅ **The BullMQ worker is running** (`pnpm --filter @sterling/api worker:dev`) — PDFs, emails & payroll won't process without it
- ✅ *(Local email)* Mailhog running, so invoice + salary-slip emails are visible

**URLs**

| Env | Web | API / Docs |
|---|---|---|
| **Local** | http://localhost:3000 | http://localhost:4000/api/docs |
| **Local — Mailhog** | http://localhost:8025 (inbox) | — |
| **Local — Queues** | http://localhost:4000/api/v1/queues | — |
| **Live (Production)** | https://sterling.shafinzaman.dev | https://sterling.shafinzaman.dev/api/docs |

> 💡 **Recommendation:** demo on **local** so you can show the Mailhog inbox and queue dashboard live. Keep the **production** URL open in a tab to prove it's deployed and real.

---

## 2. Login Credentials

| Role | Environment | Email | Password |
|---|---|---|---|
| **Tenant Owner** | Local | `shafin@test.com` | `Test@1234` |
| **Super-Admin** | Local | `superadmin@sterling.app` | `Admin@1234` |
| **Super-Admin** | Production | <!-- PROD_ADMIN_CRED --> *(TODO: fill in prod super-admin creds)* | — |

> The super-admin email default in `seed-admin.mjs` is `admin@sterling.app`. If you seeded with the override `superadmin@sterling.app`, use that. Confirm before the demo.

---

## 3. The Demo Flow (~8 min)

### ⏱️ (a) Landing Page — *0:00–0:45*
- **Click:** open `http://localhost:3000` (or the live URL).
- **Say:** *"Sterling is a premium, multi-tenant invoice & payroll platform for small businesses. First impression matters — this is a real 3D hero rendered with Three.js, not a stock template."*
- **Do:** scroll the marketing page, hover the CTAs to show interaction states.

### ⏱️ (b) Sign Up / Log In — *0:45–1:15*
- **Click:** "Log in" → enter the **Tenant Owner** credentials above.
- **Say:** *"Auth is JWT in httpOnly cookies — XSS-safe. We support Google OAuth, email verification, and password reset too. Every account belongs to a tenant, fully isolated by Postgres Row-Level Security."*

### ⏱️ (c) Dashboard Tour — *1:15–2:15*
- **Land on:** the dashboard.
- **Say:** *"This is the financial command center — revenue, outstanding, overdue, payroll cost, active clients and employees. The numbers count up with motion. This panel here is **AI Payroll Insights**, generated live by Groq. The revenue chart and the invoice-status donut are real, tenant-scoped data."*
- **Do:** point at the AI insights card and the charts.

### ⏱️ (d) Create a Client — *2:15–2:45*
- **Click:** Clients → New Client. Paste the **Acme Technologies** block from §4.
- **Say:** *"Clients carry billing and tax details, support CSV import, and track per-client outstanding balances."*

### ⏱️ (e) Invoice Designer — *2:45–3:30*
- **Click:** Designer.
- **Say:** *"Branding is the whole point of the brief. Four themes — Classic Sterling, Midnight Pro, Minimal, Emerald. Upload a logo, change colors and fonts, and this preview is **WYSIWYG** — what you design is exactly what prints, because the PDF renders from this same HTML."*
- **Do:** switch between two themes so the preview re-renders live. Save as default.

### ⏱️ (f) Create an Invoice — *3:30–4:30*
- **Click:** Invoices → New Invoice. Select **Acme Technologies**. Add the line item from §4.
- **Say:** *"Multi-currency — PKR, USD, GBP, EUR, AED — plus per-line tax and discounts. All money is stored as integer minor units, never floats, so there's zero rounding drift."*
- **Do (the wow moment):** type a rough note in the **Notes** field, then click the **✨ AI improve** button next to it. *"Every text field has an AI-improvement button — it rewrites notes and terms instantly."*

### ⏱️ (g) Send Invoice → Status Draft → Sent — *4:30–5:00*
- **Click:** Send.
- **Say:** *"Sending queues a job on BullMQ that emails the client a branded invoice. Status flips Draft → Sent. Notice the API didn't block — the email is async."*
- **Do (local):** open **Mailhog** (`http://localhost:8025`) and show the delivered invoice email. Optionally show the job in the **queue dashboard**.

### ⏱️ (h) Record Payment → Paid — *5:00–5:20*
- **Click:** open the invoice → Record Payment. Enter a partial amount first, then the rest.
- **Say:** *"We support partial and full payments — the balance and status update automatically. Once fully paid, it turns green: **Paid**."*

### ⏱️ (i) Share Link + QR + PDF — *5:20–5:50*
- **Click:** Share → copy public link / show **QR code** → Download PDF.
- **Say:** *"Each invoice has a public share link and a QR code — clients view it without an account. The PDF is rendered server-side by headless Chrome from the exact template we designed."*
- **Do:** open the public link in an incognito tab to prove no auth is needed.

### ⏱️ (j) Employees, Departments & Salary Structure — *5:50–6:30*
- **Click:** Employees → New Employee. Paste **Ahmed Raza** from §4. Assign a department.
- **Do:** open the salary editor and enter the **salary structure** from §4 (basic + allowances + deductions).
- **Say:** *"Salary structures are basic pay plus allowances minus deductions — the foundation for payroll."*

### ⏱️ (k) Run Payroll → Process → Salary Slip Email + PDF — *6:30–7:15*
- **Click:** Payroll → New Run → month **June 2026** → Process.
- **Say:** *"Payroll runs as a queued job. It computes gross, allowances, deductions, tax, and net for every employee, generates a **PDF salary slip**, and **auto-emails each employee their slip** — fully automated."*
- **Do (local):** show the salary-slip email in **Mailhog**, open the payslip **PDF**, and hit **CSV export**.

### ⏱️ (l) Reports + CSV/Excel Export — *7:15–7:35*
- **Click:** Reports.
- **Say:** *"Financial reports with one-click CSV/Excel export for invoices, clients, employees and payroll — for accounting handoff."*

### ⏱️ (m) AI Financial Assistant — *7:35–8:00*
- **Click:** AI.
- **Say:** *"This is a chat assistant grounded in *your* tenant's data."* Ask: **"What's my total outstanding, and which invoices are overdue?"**
- **Say:** *"It answers about your actual finances — not generic advice."*

### ⏱️ (n) Dark Mode + ⌘K + Responsive — *8:00–8:20*
- **Do:** toggle **dark mode** (*"a real navy-slate palette, not an inversion"*), press **⌘K** for the command palette, then resize/show on a phone viewport.
- **Say:** *"Polished to a product standard — glassmorphism, Framer Motion, skeleton loaders, fully responsive mobile to 4K, WCAG-AA accessible."*

### ⏱️ (o) Super-Admin Console + Live Support — *8:20–8:50*
- **Do:** log out, log in as **Super-Admin** → `/admin`.
- **Say:** *"The platform owner sees every tenant and their billing. The support inbox is a **live chat** powered by Stream Chat — real-time messaging with customers."*

### ⏱️ (p) Stripe Billing Upgrade — *8:50–9:15*
- **Click:** Settings → Billing → Upgrade to Pro.
- **Say:** *"Sterling itself is a SaaS — Free, Pro and Enterprise tiers billed through **Stripe**. This is the business model baked in."*
- **Do:** show the Stripe checkout (use a test card `4242 4242 4242 4242`).

---

## 4. Copy-Paste Content Block

**Client**
```
Name:    Acme Technologies
Email:   billing@acmetech.com
Phone:   +92 300 1234567
Address: 14 Innovation Avenue, Gulberg III, Lahore, Pakistan
Tax ID:  ACME-PK-0098
```

**Invoice line item**
```
Description: Website redesign — Q2 retainer
Quantity:    10
Unit price:  5000
Currency:    PKR
Tax:         16%
```

**Invoice note (then click the ✨ AI improve button)**
```
thanks for ur business pls pay within 14 days or late fee applies
```

**Employee**
```
Name:        Ahmed Raza
Title:       Senior Developer
Email:       ahmed.raza@acmetech.com
Department:  Engineering
```

**Salary structure** (minor units handled by the app — enter whole amounts)
```
Basic:           80000
House Rent:      20000   (allowance)
Transport:        8000   (allowance)
Income Tax:       5000   (deduction)
Provident Fund:   4000   (deduction)
→ Net ≈ 99000
```

**Payroll run**
```
Month: June 2026
```

---

## 5. Talking Points / Wow Moments

- 🛡️ **True multi-tenancy via Postgres Row-Level Security** — isolation enforced *in the database*, not just app code. No query can leak another tenant's data.
- 🖨️ **Real server-side PDFs from the same template** — headless Chrome renders invoices and salary slips from the exact HTML the designer edits. True WYSIWYG.
- ⚙️ **Queue-based async architecture** — PDFs, emails, payroll and reminders run on BullMQ workers that scale independently of the API. The stateless API behind nginx scales horizontally.
- 🤖 **AI everywhere** — payroll insights, a finance chat assistant grounded in your data, and one-click text-improvement on form fields (Groq + Anthropic Claude).
- 📬 **Full email automation** — verification, invites, password reset, invoice delivery, overdue reminders, and per-employee salary slips — all automatic.
- 💎 **Premium "Metallic Chic" design** — real dark mode, command palette, glassmorphism, motion, skeleton loaders, 3D hero — it looks like a paid product.
- 💳 **Real integrations** — Stripe billing tiers and Stream Chat live support, not mocks.
- 🚀 **Actually deployed** — live on AWS EC2 behind nginx with S3 storage, SSL, and GitHub Actions CI/CD auto-deploying on `main`.

---

## 6. Fallback Notes

- ⏳ **PDFs or emails seem slow?** They're **async jobs on the BullMQ queue** — give them a few seconds. This is a feature (the API never blocks), not a bug. Show the **queue dashboard** (`/api/v1/queues`) to prove the job is processing.
- 📭 **Email not showing?** Confirm the **worker is running** and (locally) **Mailhog** is up at `:8025`. No worker = no PDFs/emails.
- 🤖 **AI feels slow or errors?** It calls an external LLM (Groq/Claude) — needs network + API keys in `.env`. If a key is missing, skip the AI step and emphasize the architecture instead.
- 🌐 **Local acting up?** Fall back to the **live production site** at https://sterling.shafinzaman.dev — same build, already deployed.
- 💳 **Stripe checkout?** Use Stripe test mode and card `4242 4242 4242 4242`, any future expiry, any CVC.
- 🔄 **Data looks empty?** Re-run the seed (`pnpm --filter @sterling/api seed`) before the demo so the dashboard has numbers to show.
