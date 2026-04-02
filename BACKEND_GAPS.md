# CASI360 — Backend Gaps & Integration Status

> **Purpose:** Consolidated document tracking every frontend page's API integration status
> and what backend work is still needed across all modules.
>
> ✅ LIVE — Fully wired to backend API
> ⏳ DEMO — Uses hardcoded / demo data (backend endpoint missing)
> 🔲 PLACEHOLDER — Stub page ("Coming soon")

---

## 1. Module-by-Module Integration Status

### Procurement

| Page | Status | Notes |
|------|--------|-------|
| Vendors | ✅ | Full CRUD |
| Vendor Categories | ⏳ | No backend endpoint |
| Purchase Requests (list) | ✅ | Maps to `/procurement/requisitions` |
| Create Purchase Request | ✅ | Extra frontend fields ignored by backend |
| Purchase Orders (list) | ✅ | Includes disbursement view/create in detail modal |
| Create Purchase Order | ✅ | Vendor/dept/employee dropdowns live |
| Procurement Overview | ✅ | PR + PO live; BOQ/RFQ/GRN/RFP stats demo |
| Inventory Items | ✅ | New page added during integration |
| Pending Approvals | ✅ | New page added during integration |
| BOQ (list + create) | ⏳ | No backend endpoint |
| RFQ (list + create) | ⏳ | No backend endpoint |
| GRN (list + create) | ⏳ | No backend endpoint |
| RFP (list + create) | ⏳ | No backend endpoint |

### HR

| Page | Status | Notes |
|------|--------|-------|
| Overview | ✅ | Employee stats + recent staff |
| Staff List | ✅ | Full CRUD with filters |
| Departments | ✅ | Full CRUD |
| Designations | ✅ | Full CRUD |
| Notes | ✅ | Full CRUD |
| HR Settings | ⏳ | Leave types + holidays — no backend endpoint |

### Programs

| Page | Status | Notes |
|------|--------|-------|
| Overview | ✅ | Project stats + recent projects |
| Projects | ✅ | Full CRUD with department dropdown |
| Beneficiaries | 🔲 | Placeholder — no backend endpoint |
| Program Reports | 🔲 | Placeholder — no backend endpoint |

### Communication

| Page | Status | Notes |
|------|--------|-------|
| Overview | ✅ | Notice stats + recent notices |
| Send Notice | ✅ | Full CRUD with audiences |
| Send Email | ⏳ | Demo data — no backend email endpoint |
| Send SMS | ⏳ | Demo data — no backend SMS endpoint |

### Root / Shared Pages

| Page | Status | Notes |
|------|--------|-------|
| Dashboard | ✅ | Aggregates from employees, projects, notices APIs |
| Reports | ✅ | Preview + download via `/reports/` endpoints |
| Profile | ✅ | User profile update |
| Permissions Settings | ✅ | Bulk permission management |
| Settings (main) | ⏳ | Org, Notifications, Security, Display tabs — no general settings API |
| Help Center | 🔲 | Placeholder |

### Auth

| Page | Status | Notes |
|------|--------|-------|
| Login | ✅ | Sanctum cookie auth |
| Forgot Password | ✅ | |
| Reset Password | ✅ | |
| Force Change Password | ✅ | |

---

## 2. Summary Counts

| Status | Count |
|--------|-------|
| ✅ Live | 24 |
| ⏳ Demo | 8 |
| 🔲 Placeholder | 3 |

---

## 3. Backend Endpoints Needed

### 3.1 Procurement — Vendor Categories

Standard CRUD at `/procurement/vendor-categories`.
Fields: `name` (string, required), `description` (text), `status` (active/inactive).

### 3.2 Procurement — BOQ, RFQ, GRN, RFP

Full entity definitions documented in [BACKEND_PROCUREMENT_GAPS.md](BACKEND_PROCUREMENT_GAPS.md).

### 3.3 HR — Leave Types & Holidays

**Leave Types** (`/hr/leave-types`)
Fields: `name`, `days_allowed` (integer), `carry_forward` (boolean), `status` (active/inactive).

**Holidays** (`/hr/holidays`)
Fields: `name`, `date`, `type` (public/company), `status` (active/inactive).

### 3.4 Communication — Email & SMS

No backend endpoints exist. Frontend pages expect:
- **Email:** `/communication/emails` — compose + list sent emails (to staff/departments)
- **SMS:** `/communication/sms` — compose + list sent SMS (to staff phone numbers)

These require integration with an email service (e.g. Laravel Mail) and SMS gateway (e.g. Twilio, Africa's Talking).

### 3.5 General Settings

No backend endpoint. Frontend expects:
- **Organization:** `/settings/organization` — org name, logo, address, phone, email, website
- **Notifications:** `/settings/notifications` — email/push/in-app toggle preferences
- **Security:** `/settings/security` — password policy, session timeout, 2FA toggle
- **Display:** `/settings/display` — theme, language, date format, timezone

### 3.6 Beneficiaries

No backend endpoint. Frontend expects:
- `/programs/beneficiaries` — CRUD for beneficiary records (name, program, location, demographics, enrollment date, status)

### 3.7 Help Center

No backend endpoint needed initially — can be static content. If dynamic:
- `/help/articles` — FAQ/knowledge base articles
- `/help/tickets` — Support ticket submission

---

## 4. Frontend Fields Not Accepted by Existing Backend

### Vendors
`vendor_code` (auto-generated), `category` (FK to vendor categories), `rating` (1-5), `blacklisted` status.

### Requisitions (Purchase Requests)
`delivery_location`, `purchase_scenario`, `logistics_involved`, `boq`, `project_code`, `donor`, `currency`, `exchange_rate`, per-line `project_code` and `budget_line`.

Full field-level details in [BACKEND_PROCUREMENT_GAPS.md](BACKEND_PROCUREMENT_GAPS.md).
