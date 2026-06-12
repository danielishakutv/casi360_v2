# CASI 360 — June 2026 Update Batch (handoff)

Branch: **`feature/jun2026-updates`** in BOTH repos (frontend `casi360_v4` and backend `casi360`).
Nothing is deployed yet — production is untouched until you review, merge, and run the deploy scripts.

This batch addresses the 7 issues raised. Phases 0–5 are **built and committed**; Phases 6–7 (payslips, bank transfer) are **planned and intentionally deferred** (see why below).

---

## How to deploy (when you're ready)

Both repos have a `feature/jun2026-updates` branch. Review the diffs, then either merge to `main` via PR or fast-forward. After `main` has the changes:

```
~/deploy-api.sh     # backend — runs php artisan migrate (applies all new tables/columns/permissions)
~/deploy-web.sh     # frontend — npm build + dist swap
```

Run **both** (backend first). The migrations are additive and idempotent; existing data is preserved. No seeders are required on the live server — every new permission/grant is applied by a migration.

### What the migrations do (all additive, safe to run on production)
- `..._074` adds the **country_director** role + its permissions.
- `..._075` adds **currency + exchange_rate** to BOQs.
- `..._076` lets **every department raise a BOQ** (grants staff `boq.create/edit`).
- `..._077` adds **Operations as the 4th PR approval stage** + its permission.
- `..._078` grants managers the **boq.approve** entitlement (narrowed to Operations in code).
- `..._079` creates the **attendances** table.
- `..._080` adds **attendance/timesheet permissions**.

### After deploying — set up the new roles/people
1. In **Settings → Administration**, set the **Country Director** account's role to `country_director`.
2. Make sure the **Operations Director / leads** are role `manager` with department `Operations` (code `OPERATIONS`) — that's what makes them the final PR/BOQ approver and gives them the org-wide dashboard.
3. (Optional) Adjust per-role permissions in Settings if you want to fine-tune.

---

## What shipped (Phases 0–5)

### ① Department-scoped dashboards (issue 1) — `Phase 3`
- New `GET /api/v1/dashboard/summary`. Privileged users (admin, **Country Director**, **Operations managers**) get the **org-wide** view (all departments). Everyone else (e.g. Programs) gets a **"what concerns me"** view: their own PRs/BOQs, their department's projects, and notices targeted at them — **no** finance/procurement/operations/HR cross-department analytics.
- Operations & Country Director "see all departments"; this is enforced server-side by a new shared `DepartmentScope` service.

### ② BOQ & PR in USD with ₦ value (issue 2) — `Phase 2`
- Amounts are entered/stored in **US Dollars**; each document stores the **budget exchange rate (USD→₦)**. Screens and PDFs show **$ primary + ₦ secondary** (₦ derived from the rate).
- BOQ gained `currency` + `exchange_rate`; PR already had them. Scope limited to BOQ & PR (PO/RFQ/RFP/GRN/Invoice unchanged).

### ③ Real-time forum/messages (issue 3) — `Phase 1`
- Messages, Forums, and the unread badge now **auto-refresh every ~8s** while the tab is open (pauses when hidden, refreshes on return). The server-side 30s cache was removed from these read endpoints so new posts appear within seconds — **no manual refresh needed**.
- This is the pragmatic step; the long-term upgrade is true WebSockets (see roadmap).

### ④ Every department can raise BOQ & PR (issue 4) — `Phase 3`
- Staff could already raise PRs; now they can raise **BOQs** too. Dashboard **Quick Actions** expose "Raise Purchase Request" and "Raise BOQ" to everyone. Each person still only sees **their own** documents (view-all stays restricted).

### ⑤ Approval chains (issue 5) — `Phase 4`
- **PR** chain is now **Budget Holder → Finance → Procurement → Operations (final)**. In-flight PRs created before the change finalise at Procurement (no disruption).
- **BOQ** is now approved by **Operations** (admins included).
- **Country Director** is the final approver on **payment documents**: Invoices and Disbursements (already wired via the new role's permissions).
- ⚠️ **RFQ and RFP formal approval chains are deferred** — they have **no** approval workflow in the system today, so adding one properly needs design + testing (see roadmap, Phase 4b).

### ⑥ HR — Attendance + Monthly Timesheets (issue 6, first slice) — `Phase 5`
- **Sign in / sign out**: every staff member can clock in/out (Africa/Lagos day; "late" after 09:15). New **Attendance** page.
- **All-staff view** for HR: today's sign-ins/outs + a summary (signed in, not signed in, late, still clocked in). Shown on the Attendance page and as a widget on the HR Overview.
- **Monthly timesheets**: derived automatically from attendance (days present/late/on-leave, total hours) — all-staff grid for HR, own timesheet for staff. **No separate data entry.**
- Payslips and bank transfer are the **next two slices** — deferred (see below).

### ⑦ Date & time everywhere (issue 7) — `Phase 3`
- Dashboards now show **date + time** ("as of …", per-row created timestamps) via a new `fmtDateTime` helper. Timestamps already existed on the records; they're now surfaced consistently.

### Foundation — `Phase 0`
- New **`country_director`** role (executive oversight; sees all departments; approves payment docs; **not** a system admin).
- New **`DepartmentScope`** service: single source of truth for "org-wide vs own-department" visibility. Org-wide = admin, country_director, Operations managers/leads.
- The auth payload now exposes `department_code`, `can_see_all_departments`, `is_operations_approver` so the UI can scope cleanly.

---

## Deferred — and WHY (do these next, with review)

I did **not** build these autonomously because they handle **payroll and real money**; an untested PAYE/pension engine or bank-transfer flow is exactly where "secure / global best practice" means *review before build*. Each is a clean next slice.

### Phase 4b — RFQ & RFP/CD approval chains
- **RFQ**: add a formal approval ending at **Operations** (mirror the BOQ approach: an `isOperationsApprover` gate on the RFQ approve action). RFQ currently has no approval workflow.
- **RFP (Request for Payment)**: route final approval to the **Country Director**. Decide: simple status gate (CD-only approve) vs a multi-step chain. The `country_director` role and `is_operations_approver`-style helpers are already in place to build on.

### Phase 6 — Payslips
- Tables: `payroll_runs` (month, status), `payslips` (employee, gross, total_deductions, net, status), `payslip_components` (basic, allowances, deductions, …).
- **Needs your input**: the exact salary structure and **Nigerian PAYE / pension (8%) / NHF** formulas, allowances, and whether tax is computed or entered. This is why it must be reviewed, not guessed.
- Generate payslips from `employees.salary` + components; PDF download; HR-only.

### Phase 7 — Bank transfer
- Add bank fields to `employees`: `bank_name`, `account_number`, `account_name`, `bvn` (additive, safe).
- **Records-only first** (recommended): a monthly **transfer schedule/batch** + export (CSV/bank template) — **no** live gateway. This is safe to build and review.
- **Live gateway (Paystack/Flutterwave) is a separate, explicitly-reviewed step** — it moves real money and must never be wired autonomously.

---

## Long-term roadmap (gradual, weekly)

1. **WebSockets** (replace polling): Laravel **Reverb** + Echo for instant messages/notifications. Needs a websocket process + Apache `mod_proxy_wstunnel`. (Already on your notes.)
2. **Email**: integrate **Zeptomail** for transactional email (already on your notes).
3. **Backups to Google Drive**: scheduled DB + uploads backup (mysqldump → rclone to Google Drive, nightly cron). Add off-site retention.
4. **Phase 4b / 6 / 7** above.
5. **Audit hardening**: 2FA for admin/CD, rate-limit review, session policy.
6. **Currency**: optionally extend the USD/₦ display to PO/RFP for full consistency.

---

## Notes for review
- All work is on `feature/jun2026-updates` (both repos). Commits are grouped per phase with descriptive messages.
- No production data or files were touched; deploy scripts were not run.
- I couldn't run the app locally (no PHP/Node test env here, per your workflow), so please smoke-test on the server after deploying: log in as a department user (Programs), an Operations manager, and the Country Director to confirm dashboards/approvals scope correctly.
