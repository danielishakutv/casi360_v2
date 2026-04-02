# CASI360 — Development Gaps

> **Last updated:** 2 April 2026
>
> This document lists every feature the frontend is ready for but the backend
> does not yet support. Each section includes the endpoints needed, the exact
> fields the frontend sends/expects, and any third-party integration required.
>
> **Legend:**
> ⏳ Demo — Page works but runs on hardcoded data
> 🔲 Placeholder — Stub page with no functionality
> ❌ Missing fields — Endpoint exists but ignores some frontend fields

---

## Status Overview

| # | Feature | Module | Status | Priority |
|---|---------|--------|--------|----------|
| 1 | Leave Types & Holidays | HR | ⏳ Demo | High |
| 2 | Vendor Categories | Procurement | ⏳ Demo | High |
| 3 | Bill of Quantities (BOQ) | Procurement | ⏳ Demo | High |
| 4 | Request for Quotation (RFQ) | Procurement | ⏳ Demo | High |
| 5 | Goods Received Note (GRN) | Procurement | ⏳ Demo | High |
| 6 | Request for Payment (RFP) | Procurement | ⏳ Demo | High |
| 7 | Procurement Overview stats | Procurement | ⏳ Partial | Medium |
| 8 | Send Email | Communication | ⏳ Demo | Medium |
| 9 | Send SMS | Communication | ⏳ Demo | Medium |
| 10 | Vendor extra fields | Procurement | ❌ Missing fields | Medium |
| 11 | Requisition extra fields | Procurement | ❌ Missing fields | Medium |
| 12 | Roles & Access settings | Settings | ⏳ Demo | Low |
| 13 | Audit Log | Settings | ⏳ Demo | Low |
| 14 | Data & Backup | Settings | ⏳ Demo | Low |
| 15 | Beneficiaries | Programs | 🔲 Placeholder | Low |
| 16 | Program Reports | Programs | 🔲 Placeholder | Low |
| 17 | Help Center | Shared | 🔲 Placeholder | Low |

---

## 1. HR — Leave Types & Holidays

**Page:** `src/pages/hr/Settings.jsx`
**Demo constants:** `DEMO_LEAVE_TYPES` (8 items), `DEMO_HOLIDAYS` (10 items)

### 1.1 Leave Types

**Endpoints needed:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/hr/leave-types` | List (search, pagination) |
| POST | `/hr/leave-types` | Create |
| PATCH | `/hr/leave-types/{id}` | Update |
| DELETE | `/hr/leave-types/{id}` | Soft-delete |

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | e.g. "Annual Leave" |
| `days_allowed` | integer | Yes | Max days per year |
| `carry_over_max` | integer | No | Max days carried to next year |
| `paid` | boolean | Yes | Whether leave is paid |
| `requires_approval` | boolean | Yes | |
| `status` | enum | Yes | `active`, `inactive` |
| `description` | text | No | |

### 1.2 Holidays

**Endpoints needed:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/hr/holidays` | List (year filter, pagination) |
| POST | `/hr/holidays` | Create |
| PATCH | `/hr/holidays/{id}` | Update |
| DELETE | `/hr/holidays/{id}` | Soft-delete |

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | e.g. "Independence Day" |
| `date` | date | Yes | |
| `type` | enum | Yes | `public`, `company` |
| `status` | enum | Yes | `active`, `inactive` |

---

## 2. Procurement — Vendor Categories

**Page:** `src/pages/procurement/VendorCategories.jsx`
**Demo constant:** `demoVendorCategories` (15 items)

**Endpoints needed:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/procurement/vendor-categories` | List (search, status filter, pagination) |
| POST | `/procurement/vendor-categories` | Create |
| PATCH | `/procurement/vendor-categories/{id}` | Update |
| DELETE | `/procurement/vendor-categories/{id}` | Soft-delete |

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | |
| `description` | text | No | |
| `status` | enum | Yes | `active`, `inactive` |

**Response should include:** `vendor_count` (computed — number of vendors in category)

---

## 3. Procurement — Bill of Quantities (BOQ)

**Pages:** `src/pages/procurement/BillOfQuantities.jsx` (list), `CreateBillOfQuantities.jsx` (create)
**Demo constant:** `demoBOQ` (6 items, imported from `procurementDemo.js`)

### Endpoints needed

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/procurement/boq` | List (search, status filter, pagination) |
| GET | `/procurement/boq/{id}` | Single with line items |
| POST | `/procurement/boq` | Create with line items |
| PATCH | `/procurement/boq/{id}` | Update |
| DELETE | `/procurement/boq/{id}` | Soft-delete |

### BOQ Header Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `boq_number` | string | Auto | Auto-generated (e.g. `BOQ-2026-001`) |
| `title` | string | Yes | |
| `pr_reference` | string/FK | No | Links to a Purchase Request |
| `project_code` | string/FK | No | Project association |
| `department` | string | No | |
| `prepared_by` | string | Yes | |
| `status` | enum | Yes | `draft`, `submitted`, `approved`, `revised` |
| `date` | date | Yes | |
| `category` | string | No | Work category grouping |
| `notes` | text | No | |

### BOQ Line Items (nested array `items[]`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `category` | string | No | Section grouping (e.g. "Civil Works") |
| `description` | string | Yes | Item description |
| `unit` | string | Yes | Unit of measure |
| `quantity` | decimal | Yes | |
| `unit_rate` | decimal | Yes | |
| `total` | decimal | Auto | Computed: quantity × unit_rate |

### Signoff Sections (nested)

| Section | Fields |
|---------|--------|
| Quantity Surveyor | name, position, date, signature |
| Reviewing Surveyor | name, position, date, signature |
| Budget Holder | name, position, date, signature |

---

## 4. Procurement — Request for Quotation (RFQ)

**Pages:** `src/pages/procurement/RequestForQuotation.jsx` (list), `CreateRequestForQuotation.jsx` (create)
**Demo constant:** `demoRFQ` (5 items, imported from `procurementDemo.js`)

### Endpoints needed

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/procurement/rfq` | List (search, status filter, pagination) |
| GET | `/procurement/rfq/{id}` | Single with line items |
| POST | `/procurement/rfq` | Create with line items |
| PATCH | `/procurement/rfq/{id}` | Update |
| DELETE | `/procurement/rfq/{id}` | Soft-delete |

### RFQ Header Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `rfq_number` | string | Auto | Auto-generated |
| `title` | string | Yes | |
| `pr_reference` | string/FK | No | Source Purchase Request |
| `project_code` | string/FK | No | |
| `structure` | string | No | Office/location |
| `currency` | enum | Yes | `NGN`, `USD` |
| `request_types` | array | Yes | Multi-select: Goods, Services, Works, Consultancy |
| `deadline` | date | Yes | Submission deadline |
| `status` | enum | Yes | `draft`, `sent`, `received`, `evaluated`, `cancelled` |
| `notes` | text | No | |

### RFQ Supplier Info (nested)

| Field | Type | Required |
|-------|------|----------|
| `supplier_name` | string | Yes |
| `supplier_address` | string | No |
| `supplier_phone` | string | No |
| `supplier_email` | string | No |
| `contact_person` | string | No |

### RFQ Line Items (nested array `items[]`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `item_number` | string | No | Item reference |
| `description` | string | Yes | |
| `unit` | string | Yes | |
| `quantity` | decimal | Yes | |
| `unit_cost` | decimal | Yes | |
| `total` | decimal | Auto | quantity × unit_cost |

### Delivery Info

| Field | Type |
|-------|------|
| `delivery_address` | string |
| `delivery_date` | date |
| `delivery_terms` | text |
| `payment_terms` | text |

### Signoff Sections

| Section | Fields |
|---------|--------|
| Prepared By | name, position, date, signature |
| Authorized By | name, position, date, signature |

---

## 5. Procurement — Goods Received Note (GRN)

**Pages:** `src/pages/procurement/GoodsReceivedNote.jsx` (list), `CreateGoodsReceivedNote.jsx` (create)
**Demo constant:** `demoGRN` (5 items, imported from `procurementDemo.js`)

### Endpoints needed

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/procurement/grn` | List (search, status filter, pagination) |
| GET | `/procurement/grn/{id}` | Single with line items |
| POST | `/procurement/grn` | Create with line items |
| PATCH | `/procurement/grn/{id}` | Update |
| DELETE | `/procurement/grn/{id}` | Soft-delete |

### GRN Header Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `grn_number` | string | Auto | Auto-generated |
| `po_reference` | string/FK | Yes | Links to Purchase Order |
| `vendor` | string/FK | Yes | Supplier |
| `office` | string | No | Receiving office/location |
| `received_date` | date | Yes | |
| `delivery_note_no` | string | No | Vendor's delivery note number |
| `status` | enum | Yes | `draft`, `inspected`, `accepted`, `rejected`, `partial` |
| `notes` | text | No | |

### GRN Line Items (nested array `items[]`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `description` | string | Yes | Matches PO line item |
| `ordered_qty` | integer | Yes | From PO |
| `received_qty` | integer | Yes | Actually received |
| `quality_status` | enum | Yes | `good`, `damaged`, `defective`, `wrong_item` |
| `accepted_qty` | integer | Auto | Computed based on quality |
| `rejected_qty` | integer | Auto | ordered_qty − accepted_qty |
| `rejection_reason` | text | No | If any rejected |

### Signoff Sections

| Section | Fields |
|---------|--------|
| Checked By | name, position, date, signature |
| Approved By | name, position, date, signature |

---

## 6. Procurement — Request for Payment (RFP)

**Pages:** `src/pages/procurement/RequestForPayment.jsx` (list), `CreateRequestForPayment.jsx` (create)
**Demo constant:** `demoRFP` (from `procurementDemo.js`)

### Endpoints needed

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/procurement/rfp` | List (search, status filter, pagination) |
| GET | `/procurement/rfp/{id}` | Single with line items |
| POST | `/procurement/rfp` | Create with line items |
| PATCH | `/procurement/rfp/{id}` | Update |
| DELETE | `/procurement/rfp/{id}` | Soft-delete |

### RFP Header Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `rfp_number` | string | Auto | Auto-generated |
| `po_reference` | string/FK | No | Links to PO |
| `project_code` | string/FK | No | |
| `payee` | string | Yes | Vendor / payee name |
| `payment_mode` | enum | Yes | `Bank Transfer`, `Cash`, `Cheque` |
| `currency` | enum | Yes | `NGN`, `USD` |
| `exchange_rate` | decimal | No | For non-NGN |
| `department` | string | No | |
| `budget_line` | string | No | |
| `date` | date | Yes | |
| `status` | enum | Yes | `draft`, `pending`, `approved`, `paid`, `rejected`, `on_hold` |
| `notes` | text | No | |
| `supporting_docs` | array | No | Checklist: PR, PO, GRN, Invoice, Receipt, Contract |

### RFP Line Items (nested array `items[]`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `description` | string | Yes | |
| `project_code` | string | No | Per-line project allocation |
| `budget_line` | string | No | |
| `quantity` | integer | Yes | |
| `unit_cost` | decimal | Yes | |
| `dept` | string | No | |
| `total` | decimal | Auto | quantity × unit_cost |

### Tax Calculation (auto-computed)

| Field | Type | Notes |
|-------|------|-------|
| `subtotal` | decimal | Sum of line item totals |
| `sales_tax_rate` | decimal | Default 5% |
| `sales_tax` | decimal | subtotal × rate |
| `total_amount` | decimal | subtotal + sales_tax |

### Signoff Sections

| Section | Fields |
|---------|--------|
| Prepared By | name, position, date, signature |
| Verified By | name, position, date, signature |
| Approved By | name, position, date, signature |

---

## 7. Procurement Overview — Demo Stats

**Page:** `src/pages/procurement/Overview.jsx`

The overview page shows stats cards for all procurement entities. PR and PO stats
are live, but BOQ, RFQ, GRN, and RFP stats are computed from the demo arrays.

**Once items 3–6 above are built**, the overview needs an aggregate stats endpoint
or should derive counts from list endpoints:

| Stat | Source |
|------|--------|
| Total BOQs / by status | `/procurement/boq?per_page=0` or dedicated stats endpoint |
| Total RFQs / by status | `/procurement/rfq?per_page=0` or dedicated stats endpoint |
| Total GRNs / by status | `/procurement/grn?per_page=0` or dedicated stats endpoint |
| Total RFPs / by status | `/procurement/rfp?per_page=0` or dedicated stats endpoint |

---

## 8. Communication — Send Email

**Page:** `src/pages/communication/SendEmail.jsx`
**Demo constants:** `demoEmails`, `demoStaffList`, `demoDepartments`

### Endpoints needed

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/communication/emails` | List sent emails (pagination) |
| POST | `/communication/emails` | Compose & send |
| DELETE | `/communication/emails/{id}` | Delete record |

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `subject` | string | Yes | |
| `body` | text | Yes | HTML or plain text |
| `audience` | enum | Yes | `general` (all staff), `department`, `individual` |
| `recipient_ids` | array | Conditional | Required when audience = `individual` |
| `department_ids` | array | Conditional | Required when audience = `department` |

### Integration required

An email delivery service must be configured on the backend:
- Laravel Mail (SMTP, Mailgun, SES, Postmark, etc.)
- Queue worker for async delivery
- Delivery status tracking (sent, delivered, failed)

---

## 9. Communication — Send SMS

**Page:** `src/pages/communication/SendSMS.jsx`
**Demo constants:** `demoSmsMessages`, `demoStaffList`, `demoDepartments`

### Endpoints needed

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/communication/sms` | List sent messages (pagination) |
| POST | `/communication/sms` | Compose & send |
| DELETE | `/communication/sms/{id}` | Delete record |

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `message` | string | Yes | Max 480 characters |
| `audience` | enum | Yes | `general`, `department`, `individual` |
| `recipient_ids` | array | Conditional | When audience = `individual` |
| `department_ids` | array | Conditional | When audience = `department` |

### Integration required

An SMS gateway must be configured:
- Africa's Talking, Twilio, Termii, or similar
- Queue worker for async delivery
- Delivery status tracking (sent, delivered, failed)
- Character count / message-part calculation

---

## 10. Vendors — Missing Backend Fields

**Page:** `src/pages/procurement/Vendors.jsx`
**Endpoint:** `/procurement/vendors` (exists and works)

The frontend collects these fields but the backend does not accept them:

| Field | Type | Notes |
|-------|------|-------|
| `vendor_code` | string | Should be auto-generated by backend (e.g. `VND-001`) |
| `category` | string/FK | Links to vendor categories (depends on item 2) |
| `rating` | integer | 1–5 star rating |
| `blacklisted` | enum | Status value — backend only supports `active`/`inactive` |

**Backend changes needed:**
1. Add `vendor_code` column (auto-generated on create)
2. Add `category_id` FK to vendor_categories table
3. Add `rating` column (integer, nullable)
4. Extend `status` enum to include `blacklisted`

---

## 11. Requisitions — Missing Backend Fields

**Page:** `src/pages/procurement/CreatePurchaseRequest.jsx`
**Endpoint:** `/procurement/requisitions` (exists and works)

The frontend collects these fields but they are not sent to the backend:

### Header fields

| Field | Type | Notes |
|-------|------|-------|
| `delivery_location` | string | Where goods are delivered |
| `purchase_scenario` | enum | Direct Purchase, Competitive Bidding, Framework Agreement, Emergency, Sole Source |
| `logistics_involved` | boolean | Yes/No toggle |
| `boq` | boolean | Whether a BOQ is attached |
| `project_code` | string/FK | Project association |
| `donor` | string | Funding source |
| `currency` | enum | `NGN`, `USD`, `EUR` |
| `exchange_rate` | decimal | For non-NGN currencies |

### Per-line item fields

| Field | Type | Notes |
|-------|------|-------|
| `project_code` | string | Per-line project allocation |
| `budget_line` | string | Budget category |

### Signoff sections (5 total)

| Section | Fields |
|---------|--------|
| Validation | name, position, date, signature |
| Requester | name, position, date, signature |
| Budget Holder | name, position, date, signature |
| Finance | name, position, date, signature |
| Logistics | name, position, date, signature |

**Backend changes needed:**
1. Add all header columns to `requisitions` table
2. Add `project_code` and `budget_line` to `requisition_items` table
3. Create `requisition_signoffs` table (requisition_id, section, name, position, date, signature)

---

## 12. Settings — Roles & Access

**Page:** `src/pages/Settings.jsx` (Roles tab)
**Demo constant:** `DEMO_ROLES` (5 hardcoded roles)

Currently the frontend shows a read-only list of roles with user counts.
The Permissions Settings page (`/settings/permissions`) already handles
per-role permission toggling via a live API.

**What's missing:** The ability to create/edit/delete roles themselves.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/roles` | List roles with user counts |
| POST | `/roles` | Create role |
| PATCH | `/roles/{id}` | Update role name/description |
| DELETE | `/roles/{id}` | Delete role (if no users assigned) |

---

## 13. Settings — Audit Log

**Page:** `src/pages/Settings.jsx` (Audit tab)
**Demo constant:** `DEMO_AUDIT` (8 hardcoded log entries)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/audit-log` | List (search, user filter, action filter, date range, pagination) |

**Fields expected per entry:**

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `user` | string | User who performed action |
| `action` | string | e.g. "Updated employee record" |
| `target` | string | Resource affected |
| `ip_address` | string | |
| `timestamp` | datetime | |

---

## 14. Settings — Data & Backup

**Page:** `src/pages/Settings.jsx` (Data tab)

Three buttons exist with toast-only stubs:
- **Export Data** — Download org data as CSV/JSON
- **Import Data** — Upload and merge data
- **Create Backup** — Trigger a server-side backup

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/settings/export` | Download data archive |
| POST | `/settings/import` | Upload data file |
| POST | `/settings/backup` | Trigger server backup |

---

## 15. Programs — Beneficiaries

**Page:** `src/pages/programs/Beneficiaries.jsx`
**Status:** Placeholder stub — no functionality

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/programs/beneficiaries` | List (search, program filter, status filter, pagination) |
| GET | `/programs/beneficiaries/{id}` | Single |
| POST | `/programs/beneficiaries` | Create |
| PATCH | `/programs/beneficiaries/{id}` | Update |
| DELETE | `/programs/beneficiaries/{id}` | Soft-delete |

**Suggested fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | Full name |
| `project_id` | uuid/FK | Yes | Program/project |
| `gender` | enum | No | male, female, other |
| `age` | integer | No | |
| `location` | string | No | Community / LGA |
| `phone` | string | No | |
| `enrollment_date` | date | Yes | |
| `status` | enum | Yes | active, inactive, graduated, withdrawn |
| `notes` | text | No | |

---

## 16. Programs — Reports

**Page:** `src/pages/programs/Reports.jsx`
**Status:** Placeholder stub — no functionality

Depends on what reporting the organization needs. Possible endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/programs/reports/summary` | Aggregate stats (beneficiaries per project, enrollment trends) |
| GET | `/programs/reports/export` | Download report as PDF/CSV |

---

## 17. Help Center

**Page:** `src/pages/HelpCenter.jsx`
**Status:** Placeholder stub

Can be implemented as static content initially. If dynamic:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/help/articles` | FAQ / knowledge base |
| GET | `/help/articles/{id}` | Single article |
| POST | `/help/tickets` | Submit support ticket |

---

## Recommended Development Order

**Phase 1 — High-impact procurement workflow** (items 2–6)
These form a connected chain: Vendor Categories → BOQ → RFQ → GRN → RFP.
Build in that order since later entities reference earlier ones.

**Phase 2 — HR completion** (item 1)
Leave types and holidays complete the HR module.

**Phase 3 — Communication channels** (items 8–9)
Require third-party service integration (email provider + SMS gateway).

**Phase 4 — Existing endpoint enhancements** (items 10–11)
Add missing columns to vendors and requisitions tables.

**Phase 5 — Settings & admin** (items 12–14)
Roles CRUD, audit logging, data export/backup.

**Phase 6 — Programs expansion** (items 15–16)
Beneficiaries + program reports.

**Phase 7 — Nice to have** (item 17)
Help center / knowledge base.
