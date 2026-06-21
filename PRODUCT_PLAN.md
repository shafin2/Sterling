# Sterling — Product Plan (Updated)

> Date: June 2026 | Mode: Hackathon sprint → production SaaS

---

## What's Already Shipped

| Module | Status |
|---|---|
| Auth (email/password, email verification, password reset) | ✅ |
| Multi-tenancy + Row-Level Security (Postgres RLS) | ✅ |
| RBAC — enforced server-side (owner/admin/accountant/hr/viewer) | ✅ |
| Clients, Employees, Departments, Salary Structures | ✅ |
| Invoice Management (CRUD, PDF, QR, share link, payments) | ✅ |
| WYSIWYG Invoice Designer (dnd-kit, themes, live preview) | ✅ |
| Payroll + Salary Slip PDF | ✅ |
| Tax Rules engine | ✅ |
| Dashboard (KPI cards, Recharts charts, AI payroll insights via Groq) | ✅ |
| Reports + CSV/Excel export | ✅ |
| Audit Logs | ✅ |
| AI Invoice generation from natural language (Claude Haiku) | ✅ |
| Dark mode + fully responsive | ✅ |
| Marketing landing page (Three.js hero, GSAP, pricing) | ✅ |
| EC2 deployment (HTTPS, Docker, GitHub Actions CI/CD) | ✅ |

---

## What's Partial (exists in code, not usable yet)

| Feature | What exists | What's missing |
|---|---|---|
| Team invites | `invited_by` column in DB, email text placeholder | No invite endpoint, no token-accept flow, no UI |
| Tenant switcher | `/tenants/my-tenants` API | No topbar dropdown UI |
| Roles UI | Server-enforced permissions | No UI to view/change member roles |
| Notifications | Overdue count in topbar bell | No general feed |
| AI on inputs | Invoice generation dialog | No inline ✦ AI button on text fields |

---

## Build Order (Priority)

```
Phase 1  →  Google OAuth + Foundation polish          (1 day)
Phase 2  →  Admin Panel                               (2 days)
Phase 3  →  AI Features (chatbot + inline assistant)  (2 days)
Phase 4  →  Support Chat (Stream Chat)                (1 day)
Phase 5  →  Stripe + Subscription Plans               (2 days)
Phase 6  →  Teams, Roles, Invites                     (2 days)
```

---

## Phase 1 — Google OAuth + Foundation Polish
*1 day | Start here — unblocks everything else and fixes visible gaps*

### 1.1 Continue with Google
**Why first:** Login friction is the #1 drop-off point. Google OAuth also skips email verification entirely (Google already verified it), making the register → dashboard path instant.

**Backend**
- Install `passport-google-oauth20` + `@nestjs/passport`
- `GET /api/v1/auth/google` — redirects to Google consent screen
- `GET /api/v1/auth/google/callback` — receives code, upserts user (`google_id` column on users table), creates tenant if first login, issues JWT cookies, redirects to `/app`
- If email already exists with password login: link the Google account to the existing user
- No email verification step for Google-authed users (trust Google's verification)

**Frontend**
- Login and Register pages: add a "Continue with Google" button above the form divider
- Styled with Google's brand guidelines (white button, Google G icon, specific font)
- On callback redirect: the existing token-from-cookie flow handles the rest — no changes needed

**Environment variables needed — you set these:**
```
GOOGLE_CLIENT_ID=       ← from Google Cloud Console
GOOGLE_CLIENT_SECRET=   ← from Google Cloud Console
```

> **Setup steps for you:**
> 1. Go to console.cloud.google.com → New project (or existing)
> 2. APIs & Services → Credentials → Create OAuth 2.0 Client ID → Web application
> 3. Authorized redirect URIs: `https://sterling.shafinzaman.dev/api/v1/auth/google/callback`
>    (also add `http://localhost:4000/api/v1/auth/google/callback` for local dev)
> 4. Copy Client ID and Client Secret → add to `.env` on EC2

### 1.2 Tenant Switcher UI
- Topbar company name → click opens a Popover
- Lists all companies the logged-in user belongs to, with plan badge
- Highlight active one; click any other to switch
- "＋ Create new company" at bottom → register wizard
- API (`/tenants/my-tenants`) already exists — pure frontend work

### 1.3 Notification Feed
- Schema: `notifications(id, tenant_id, user_id, type, title, body, entity_id, read_at, created_at)`
- Worker creates entries on: invoice paid, payroll completed, reminder sent, member joined
- `GET /notifications`, `PATCH /notifications/read-all`
- Topbar bell: unread badge, dropdown with feed, mark read on click

---

## Phase 2 — Admin Panel
*2 days | Directly answers "Admin Dashboard" in the problem statement — judges will look for this*

Separate section at `/admin` — protected by a `superadmin` role (seeded user, no tenant).

### 2.1 Platform Dashboard
- **KPI cards:** Total tenants, Active this month, Total invoices generated, MRR, Churn
- **Charts:** New signups by week (line), Plan breakdown (pie: Free / Pro / Business)
- **Recent signups table:** company name, owner email, plan, registered at

### 2.2 Tenant Management
- Full searchable/filterable table: company name, owner email, plan, invoice count, last active, status
- Row actions: View detail, Suspend/Activate, Override plan
- **Tenant detail page:**
  - Member list (name, email, role, joined)
  - Usage stats (invoices this month, payrolls run, storage)
  - Subscription history
  - Recent audit log (last 20 actions)

### 2.3 Subscription Overview
- MRR chart by month
- Active subscriptions table with Stripe status
- Manual plan override (for support/comps)
- Churn list: cancelled in last 30 days

### 2.4 Support Inbox (Stream Chat)
- Tab in admin: "Support Queries"
- Two sub-tabs: **App users** (authenticated) and **Marketing site guests** (anonymous)
- Shows all open conversations from Stream Chat
- Admin can click any conversation to open a reply panel (embedded Stream Chat component)
- Unread count badge on the tab

### 2.5 Platform Settings
- Manage superadmin accounts
- Platform-wide feature flags (e.g., "disable AI for free plan globally")
- Announcement banner text (displayed to all logged-in users)

---

## Phase 3 — AI Features
*2 days | Biggest differentiator — no competitor has this*

Two separate AI experiences:

### 3.1 AI Financial Chatbot (Dedicated Page)

**New page: `/app/ai` in the sidebar nav**

A full-page chat interface — think ChatGPT but it knows your business data.

**Layout:**
- Left: conversation history list (each chat is named after the first question, deletable)
- Right: active chat (messages, input box, suggested questions)
- Empty state: "What would you like to know about your business?" with 8 suggested question chips

**Suggested questions (shown when chat is empty):**
- "Which clients owe me the most money?"
- "What was my best revenue month this year?"
- "Show me payroll trends over the last 6 months"
- "Which invoices are at risk of going overdue?"
- "How does this month's payroll compare to last month?"
- "What's my average invoice payment time?"
- "Which employees have the highest salary cost?"
- "Summarize my financial health this quarter"

**Backend:**
- `POST /api/v1/ai/chat` — receives `{ messages: [...], context: 'finance' }`
- Before sending to AI: fetches real tenant data (revenue totals, top overdue clients, payroll summary, invoice stats) and injects as system context
- Streams response using Groq (fast) with `llama3-70b` (better reasoning than 8b for finance)
- Stores conversation: `ai_conversations(id, tenant_id, user_id, title, created_at)` + `ai_messages(id, conversation_id, role, content, created_at)`

**Frontend:**
- Streaming response with typing indicator
- Markdown rendering for formatted answers (tables, bullet lists)
- Message actions: copy, thumbs up/down (for future fine-tuning signal)
- Conversation is persisted — user can come back and continue
- Mobile-responsive layout

### 3.2 Inline AI Writing Assistant (✦ button on text fields)

Every textarea and rich text field in the app gets a small `✦ AI` button in the top-right corner.

**Fields targeted:**
- Invoice: notes, terms & conditions, line item descriptions
- Client: notes field
- Employee: bio/notes
- Email body when sending an invoice
- Payroll run: remarks

**Actions (dropdown from the ✦ button):**
- ✨ Improve writing
- 🔤 Fix grammar & spelling
- 📝 Make it shorter
- 📄 Make it formal / professional
- 🌐 Translate → (submenu: Urdu, Arabic, Hindi, French, Spanish)
- 💡 Expand this

**Implementation:**
- Shared `<AITextAssist value={...} onChange={...} />` wrapper component — wrap any `<Textarea>` with it
- `POST /api/v1/ai/assist` endpoint with `{ text, action, targetLanguage? }`
- Uses Groq for <500ms response — fast enough to feel instant
- While generating: shimmer/skeleton on the field, "Generating..." label
- After: "Undo" button appears for 5 seconds

### 3.3 AI Payroll Anomaly Check
- In the payroll run wizard, before the "Confirm & Process" step, an AI check runs automatically
- Sends computed payslips vs last month's data to Claude Haiku
- Returns flagged items: "Employee X's net pay dropped 35% — deduction change detected", "3 employees from last run are missing"
- Shown as a collapsible "AI Review" panel with severity badges
- User can dismiss each flag or investigate

### 3.4 AI Invoice Email Composer
- When sending an invoice via email, add "✦ Draft with AI" button
- Fills in a professional email: "Dear [Client Name], Please find attached invoice #INV-0042 for [Amount], due on [Date]..."
- Tone selector: Friendly / Professional / Firm (for overdue follow-ups)
- Editable before sending

---

## Phase 4 — Support Chat (Stream Chat)
*1 day | Needs Stream Chat account from you first*

Stream Chat is a fully-built real-time chat SDK — no building the infra, just integration.

### 4.1 What Gets Built

**A. Marketing site widget (bottom-right corner)**
- Floating chat bubble on all `/` landing pages
- Opens a chat window: "Hi! How can we help you?" + name/email fields
- Guest users (not logged in) — anonymous channel
- Powered by Stream Chat's pre-built `@stream-io/stream-chat-react` components

**B. In-app support widget (bottom-right corner inside `/app`)**
- Same floating bubble but user is already identified (name, email, tenant from session)
- Channel is pre-created with user's info — they don't need to fill anything
- Shows previous conversations history
- "Your previous conversations" list if they've chatted before

**C. Admin support inbox at `/admin/support`**
- Two tabs: "App Users" and "Guest (Marketing Site)"
- All open conversations listed with: user name/email, last message preview, time, unread badge
- Click → full chat panel opens on the right to reply
- Admin can assign to self, mark resolved, add internal note

### 4.2 Backend
- `POST /api/v1/support/token` — creates a Stream Chat user token for the logged-in user (so Stream knows who they are)
- Stream Chat webhook → our API to log new conversations in DB for admin notification
- Superadmin has a Stream Chat agent account created during seeding

### 4.3 Environment variables needed — you set these:
```
STREAM_API_KEY=        ← from getstream.io dashboard
STREAM_API_SECRET=     ← from getstream.io dashboard
```

> **Setup steps for you:**
> 1. Go to getstream.io → Sign up / Log in
> 2. Create a new app → name it "Sterling"
> 3. Select "Chat Messaging" as the product
> 4. Copy the **API Key** and **API Secret** from the dashboard
> 5. Send them to me and I'll wire everything up

---

## Phase 5 — Stripe + Subscription Plans
*2 days | Monetization layer — shows real SaaS thinking to judges*

### 5.1 Plans

| | Free | Pro ($29/mo) | Business ($79/mo) |
|---|---|---|---|
| Invoices/month | 5 | Unlimited | Unlimited |
| Team members | 1 (just owner) | 5 | Unlimited |
| AI features (chatbot + inline) | ❌ | ✅ | ✅ |
| Invoice templates | 1 | 10 | Unlimited |
| PDF downloads | 5/mo | Unlimited | Unlimited |
| Payroll runs/month | 1 | Unlimited | Unlimited |
| CSV/Excel export | ❌ | ✅ | ✅ |
| Support chat | Community | Priority | Dedicated |
| Remove "Sterling" branding from PDFs | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |

14-day Pro trial on signup (no card required).

### 5.2 Backend
- `subscription_plans` and `tenant_subscriptions` tables
- `POST /billing/checkout` → Stripe Checkout session URL
- `POST /billing/portal` → Stripe Customer Portal (manage/cancel)
- `POST /billing/webhook` → handles `subscription.created`, `subscription.updated`, `subscription.deleted`
- `GET /billing/subscription` → current plan + usage
- `@RequiresPlan('pro')` decorator on guarded endpoints (returns `402` with upgrade CTA if on free)
- Usage tracking: invoice count, member count, template count per tenant per month

### 5.3 Frontend
- Landing page pricing section → "Get Started" wired to Stripe Checkout
- **Settings → Billing tab:**
  - Current plan card with renewal date
  - Usage meters (e.g., "3 of 5 invoices used this month")
  - Upgrade / Manage Subscription buttons
- **Upgrade wall modal:** appears when hitting a plan limit — plan comparison table + "Upgrade Now" CTA
- **Plan badge** in sidebar footer (Free / Pro / Business chip)
- **Trial countdown banner** for new users: "12 days left in your Pro trial"

### 5.4 Environment variables needed — you set these:
```
STRIPE_SECRET_KEY=           ← sk_live_... from Stripe dashboard
STRIPE_PUBLISHABLE_KEY=      ← pk_live_... (used in frontend)
STRIPE_WEBHOOK_SECRET=       ← whsec_... after setting up webhook endpoint
STRIPE_PRO_PRICE_ID=         ← price_... for $29/mo plan
STRIPE_BUSINESS_PRICE_ID=    ← price_... for $79/mo plan
```

> **Setup steps for you:**
> 1. stripe.com → Create account → Activate (or use test mode for now)
> 2. Products → Create product "Sterling Pro" → Add price $29/month recurring → copy Price ID
> 3. Products → Create product "Sterling Business" → Add price $79/month → copy Price ID
> 4. Developers → API Keys → copy Secret Key and Publishable Key
> 5. Developers → Webhooks → Add endpoint: `https://sterling.shafinzaman.dev/api/v1/billing/webhook`
>    → Select events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`
>    → Copy Signing Secret
> 6. Send all keys to me → I wire everything

---

## Phase 6 — Teams, Roles & Invites
*2 days | Do last — backend scaffolding already exists, purely UX work*

### 6.1 Team Invite Flow (Full)
**Backend (all missing)**
- `invites` table: `(id, tenant_id, email, role, token, invited_by, expires_at, accepted_at)`
- `POST /invites` — create invite, send branded email with accept link
- `GET /invites/accept?token=xxx` — validate token, create membership, redirect to `/app`
- `GET /invites` — list pending invites (owner/admin only)
- `DELETE /invites/:id` — revoke

**Frontend**
- Settings → Team tab (currently missing entirely):
  - Active members table: avatar, name, email, role badge, joined date, Remove button
  - Pending invites section: email, role, sent X days ago, Revoke button
  - "Invite Member" button → dialog: email field + role dropdown (admin/accountant/hr/viewer)
- Role badge on member row is clickable (owner only) → dropdown to reassign role
- Accept-invite page at `/auth/accept-invite?token=xxx`:
  - If logged in as the invited email → auto-accepts, redirects to `/app`
  - If not logged in → show "You've been invited to join [Company]" → login or register to accept

### 6.2 Roles & Permissions UI
- Settings → Roles tab: visual permission matrix table
  - Rows: each role (owner/admin/accountant/hr/viewer)
  - Columns: each module (Invoices, Clients, Employees, Payroll, Designer, Reports, Settings)
  - Cells: can View / can Edit / can Delete / no access
- Read-only for now (roles are fixed; this is for transparency / onboarding)
- Future: custom roles (Business plan feature)

### 6.3 Tenant Switcher + Multi-Company
- Complete the topbar switcher UI (Phase 1 does this, Phase 6 extends it)
- "Create new company" in switcher → dedicated onboarding for adding a second company
- Per-tenant logo shown in topbar when switched

---

## Credentials Checklist (What I Need from You)

Before I can build each phase, here's exactly what you need to set up:

| Phase | Service | What to get | Where |
|---|---|---|---|
| Phase 1 | Google Cloud | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | console.cloud.google.com |
| Phase 4 | Stream Chat | `STREAM_API_KEY` + `STREAM_API_SECRET` | getstream.io |
| Phase 5 | Stripe | `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` + 2 Price IDs | stripe.com |

All three can be started in parallel — they're independent accounts. Start with Google since it's the fastest (5 minutes).

---

## What I'm Building First

**Starting now: Phase 2 — Admin Panel**

Reason: zero external credentials needed, builds on existing codebase, and is the most visible missing piece for judges. By the time you set up Google and Stream credentials, the admin panel will be done and I'll wire those in immediately.

Order of what gets coded:
1. Admin Panel (Phase 2) — no external deps
2. AI Chatbot + Inline Assistant (Phase 3) — Groq/Claude already configured
3. Google OAuth (Phase 1) — once you provide Google creds
4. Support Chat (Phase 4) — once you provide Stream creds
5. Stripe (Phase 5) — once you set up Stripe products and provide keys
6. Teams & Invites (Phase 6) — pure code, no external deps

---

## Technical Notes

**AI providers already in the codebase:**
- Claude Haiku (`@anthropic-ai/sdk`) → invoice generation, complex reasoning
- Groq (`groq-sdk`, `llama3-8b-8192`) → payroll insights, streaming chat

**Recommended split for new AI features:**
| Use Case | Provider |
|---|---|
| AI chatbot (financial Q&A) | Groq llama3-70b (fast streaming) |
| Inline text assist (grammar, beautify) | Groq llama3-8b (fastest, cheapest) |
| Payroll anomaly detection | Claude Haiku (better at structured analysis) |
| AI email composer | Groq llama3-8b |

**Single shared endpoint for inline assist:**
`POST /api/v1/ai/assist` with `{ text, action }` — handles all field-level AI actions, no per-field endpoints needed.

**Stream Chat channels:**
- App users: channel type `messaging`, channel ID = `support-{userId}`
- Marketing guests: channel type `messaging`, channel ID = `guest-{uuid}` (created client-side)
- Admin reads all channels of type `messaging` with a server-side client

---

*Updated: June 2026*
