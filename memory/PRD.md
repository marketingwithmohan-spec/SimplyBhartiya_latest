# Simply Bhartiya — Inventory & Traceability System

## Original Problem Statement
Mobile-first web application to track cold-pressed oil production using a 3-stage QR code workflow, linking raw seed procurement → oil extraction → bottled product. Role-based access (Admin vs Staff), customer-facing public traceability, and Excel export.

## Architecture
- **Frontend**: React 19 (PWA), Tailwind CSS, shadcn/ui, recharts, html5-qrcode, qrcode.react, sonner toasts, react-router v7
- **Backend**: FastAPI + Motor (async MongoDB), JWT auth, bcrypt password hashing, `qrcode` for QR PNGs, `openpyxl` for Excel export
- **Database**: MongoDB (collections: `users`, `batches`)

## User Personas
1. **Admin (Owner)** — `Admin` / `Administrator@321` — Full access (financials, vendors, analytics, Excel export, QR printing for all stages)
2. **Staff (Worker)** — `Staff` / `SimplyBhartiya@321` — Restricted: scan QR, complete Stage 2/3. Cannot see prices, vendor names, total amounts
3. **Customer (Public)** — No login. Scans QR on bottle → `/trace/:batchId` → sees Batch#, Seed Type, Origin PIN, Extraction & Packaging Dates only

## Core Requirements (static)
- Batch ID format: `[Prefix][YYYYMMDDHHMMSS]-[Pincode]`
- Prefixes: BM, WS, GN, CO, AL (Black Mustard, White Sesame, Groundnut, Coconut, Almond)
- View filter: one DB entry, different UI per role
- 3-stage state machine (cannot skip or repeat stages)
- Auto-calculation: total_quantity_kg = bags × size_per_bag; total_amount = qty × price/kg

## Implemented (Feb 2026)
### Backend (`/app/backend/server.py`)
- `POST /api/auth/login` — JWT issuance; seeds Admin & Staff on first startup (idempotent)
- `GET /api/auth/me` — current user
- `POST /api/batches` — Stage 1 (Admin only)
- `GET /api/batches` + `GET /api/batches/:id` — role-filtered (strips vendor/price/amount for staff)
- `PATCH /api/batches/:id/stage2` — extraction
- `PATCH /api/batches/:id/stage3` — packaging (requires stage ≥ 2)
- `GET /api/batches/:id/qr/:stage` — PNG QR code (stage 3 embeds public trace URL)
- `GET /api/trace/:id` — **PUBLIC** (no auth); only non-sensitive fields
- `GET /api/analytics?period=week|month|year` — Admin only
- `GET /api/export/excel` — Admin only, returns .xlsx

### Frontend
- `/login` — branded login page (peacock logo, green palette)
- `/dashboard` — Admin stats cards, procurement timeline bar chart, seed-type pie, stage distribution, period toggle, Excel export
- `/batches` — list with stage progress bars + search/filter
- `/procurement` — Stage 1 form with live total calculation
- `/batch/:id` — timeline with 3 stages + QR modal (print-ready)
- `/batch/:id/stage2` — extraction form (Machine#, Worker)
- `/batch/:id/stage3` — packaging form (Packer, Capacity dropdown)
- `/scan` — camera QR scanner (html5-qrcode) + manual fallback; auto-routes to next incomplete stage
- `/trace/:id` — public customer page (hero, trust badges, wooden ghani timeline, Indian aesthetic)

## Design
Followed `/app/design_guidelines.json`: deep green `#1A4331` primary, leaf green `#4C8A53`, saffron `#F28C28` accent, cream `#FDFBF7` background. Fonts: Cormorant Garamond (serif headings), Work Sans (body), Outfit (data). Logo: rendered with CSS clip-path to remove the rounded rectangle border.

## Testing (iteration_1)
- Backend: 32/32 pytest passed
- Frontend: 14/14 Playwright flows passed
- Critical data-privacy requirement verified (staff sees no financial/vendor data)

## Prioritized Backlog
### P0 (Blockers) — none
### P1 (High value, next phase)
- [ ] PWA manifest + service worker (offline scanning)
- [ ] Multi-user roles (multiple Admins/Staff accounts management UI)
- [ ] Password change flow
- [ ] Batch delete/edit (admin) with audit log
- [ ] Charts: revenue-over-time line chart in dashboard
### P2 (Nice to have)
- [ ] Email notifications on stage completion
- [ ] Stage rollback / correction workflow with audit trail
- [ ] Multi-language (Hindi/English toggle) on public trace page
- [ ] Customer reviews section on `/trace/:id`
- [ ] Barcode fallback (in addition to QR)
- [ ] Inventory level dashboard (seeds in stock, oil in tanks)
- [ ] Vendor CRM & seed-quality grading

## Next Tasks
Depends on user priority — strongest near-term wins: PWA install support, password change UI, and deployment to production.
