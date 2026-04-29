# Procurement MVP — Data Model & Flow Spec

**Purpose:** lock the data model, status flows, and chain-enforcement rules
for the procurement module before further build work. This is the source of
truth for backend schema changes and frontend form updates.

**MVP scope (50% digital target):**

- Digital: document creation, parent-reference linking, status state machines,
  approvals, audit log, attachment upload, PDF export, in-app notifications.
- Manual / out-of-app: sending PDFs to vendors via email, physical inspection,
  Delivery Note (uploaded as scan), bank transfer execution.
- Out of scope (post-MVP): vendor self-service portal, OCR, automated 3-way
  match, mobile receiving, partial RFQ awards.

---

## 1. Roles & permissions

| Role                  | Who                                | Can create                    | Can approve                                  |
| --------------------- | ---------------------------------- | ----------------------------- | -------------------------------------------- |
| Procurement Officer   | Procurement team                   | BOQ, RFQ, PO, GRN, Invoice, RFP | —                                            |
| Requester             | Any staff                          | PR                            | GRN confirmation (own PR only)               |
| Budget Holder         | Selected per-PR (any employee)     | —                             | PR (Stage 1), GRN confirmation               |
| Department Lead       | HR-defined per department          | —                             | PR (Stage 1 fallback if no budget holder)    |
| Operations / ED       | Org leadership                     | —                             | RFP final approval                           |
| Finance               | Finance team                       | —                             | RFP review (before ED)                       |

**Default budget holder suggestion** when a project is selected on PR creation:
the linked project's **project manager**. The requester can override to any
active employee via the EmployeePicker.

---

## 2. Document chain & gating rules

```
BOQ ──┐
      ├──> PR ──> RFQ ──> PO ──> GRN ──> Invoice ──> RFP ──> Paid
      │          (opt.)
(opt.)┘
```

Each child document carries a **required FK** to its parent (except where
marked optional). The backend rejects creation if the parent isn't in the
allowed status.

| Child       | Parent FK              | Required? | Parent status gate                      |
| ----------- | ---------------------- | --------- | --------------------------------------- |
| PR          | `boq_id`               | optional  | BOQ must be `approved`                  |
| RFQ         | `pr_id`                | optional  | PR must be `approved`                   |
| PO          | `rfq_id`               | optional  | RFQ must be `awarded`                   |
| GRN         | `po_id`                | **required** | PO must be `sent_to_vendor` or later |
| Invoice     | `po_id`                | **required** | PO must be `sent_to_vendor` or later |
| RFP         | `grn_id` AND `invoice_id` | **both required** | GRN `confirmed`, Invoice `matched` |

> **Why optional in some cases:** small/emergency purchases skip BOQ; direct
> purchases skip RFQ. We do not allow skipping PO, GRN, Invoice, RFP — those
> are the audit-critical chain.

---

## 3. Status state machines

### BOQ
`draft → pending_approval → approved | rejected | revision_requested`

### Purchase Request
`draft → pending_approval → approved | rejected | revision_requested → cancelled`

Stage 1 approver = `budget_holder_id` (defaults to project manager, overridable).
Stage 2 approver = **always required** — Procurement Lead role. No amount-based
skipping. Every PR goes through both stages before becoming `approved`.

### RFQ
`draft → sent_to_vendors → quotes_received → bid_analysis → awarded | cancelled`

`bid_analysis_notes` and `awarded_quote_attachment_id` are required to move
from `bid_analysis → awarded`.

### Purchase Order
`draft → pending_approval → approved → sent_to_vendor → fulfilled | cancelled`

### Goods Received Note
`draft → pending_confirmation → requester_confirmed → budget_holder_confirmed → confirmed | partial | disputed`

Both requester *and* budget holder must confirm to reach `confirmed` or
`partial`. At confirmation time the confirmer chooses one of three receipt
outcomes:

1. **Fully received** → status `confirmed`, PO closes.
2. **Short-received, accept and close** → status `partial`, PO closes; only
   the received quantity is invoiceable. The shortfall quantity is recorded
   on the GRN line items but not pursued.
3. **Short-received, await balance** → GRN stays in `pending_confirmation`
   for the partial portion; PO remains open; a *second* GRN can later be
   raised against the same PO for the remaining quantity.

`disputed` is a separate path used for quality failures or wrong-item
deliveries (not quantity shortfalls). It blocks Invoice matching and RFP
creation until resolved.

### Vendor Invoice (new)
`received → matched | disputed → paid`

`matched` = Invoice line items reconcile against PO + GRN (procurement marks
this manually for MVP; automated 3-way match is post-MVP).

### Request for Payment
`draft → pending_finance_review → pending_ed_approval → approved → paid | rejected`

---

## 4. Per-entity schema deltas

> Current state was inferred from the existing `Create*.jsx` forms.
> ✅ keep, ➕ add, 🔄 change, ❌ remove.

### 4.1 BOQ — `procurement_boq`
Already substantial. Minor additions only.

- ✅ `title`, `date`, `department_id`, `project_id` / `project_code`,
  `category`, `prepared_by`, `delivery_location`, `notes`, `signoffs[]`,
  `items[]` (`section`, `unit`, `quantity`, `description`, `unit_rate`, `comment`)
- ✅ `status` (state machine above)
- ✅ Audit log (already implemented)
- ➕ `attachments[]` via generic attachments table
- 🔄 `pr_reference` is currently a free-text field — leave as-is (BOQ is
  *upstream* of PR; we don't want a hard FK pointing forward)

### 4.2 Purchase Request — `procurement_requisitions`
- ✅ `title`, `date`, `department_id`, `delivery_location`, `needed_by`,
  `purchase_scenario`, `logistics_involved`, `boq_id` (optional FK),
  `project_id`, `donor`, `currency`, `exchange_rate`, `priority`,
  `justification`, `notes`, `items[]` with budget lines
- ✅ `requested_by` (current user)
- ✅ `status`, audit log (already implemented)
- ➕ **`budget_holder_id`** — FK to employee, required. Defaults to project
  manager on form mount; overridable via EmployeePicker.
- 🔄 Stage 1 approval routing changes from `project.project_manager` to
  `requisition.budget_holder_id` (project manager remains the default *value*)
- ➕ `attachments[]`

### 4.3 RFQ — `procurement_rfq`
This is the entity needing the most rework. Current form stores supplier
as free text and has no real link to PR.

- ✅ `rfq_number`, `date`, `request_types[]`, `structure`, `currency`,
  `delivery_address`, `delivery_terms`, `signoffs[]`, `items[]`
- 🔄 **`pr_reference` (text) → `pr_id` (FK, optional)** with backend
  validation `PR.status = 'approved'`
- 🔄 **`supplier_name` / `supplier_address` / `contact_person` /
  `supplier_phone` (text) → `vendor_id` (FK, required)** — auto-fill the
  display fields from the Vendors table
- ➕ `status` (state machine above)
- ➕ `bid_analysis_notes` (text, required for `awarded` transition)
- ➕ `awarded_quote_attachment_id` (FK to attachments, required for `awarded`)
- ➕ `sent_to_vendor_at` (timestamp, set when procurement marks RFQ sent)
- ➕ `attachments[]` (vendor quote PDFs)
- ➕ Audit log

### 4.4 Purchase Order — `procurement_purchase_orders`
Mostly built. Needs the upstream FK and the chain to GRN/Invoice.

- ✅ `vendor_id`, `department_id`, `requested_by`, `order_date`,
  `expected_delivery_date`, `currency`, `tax_amount`, `discount_amount`,
  `notes`, `items[]`, payment & delivery terms, signoffs
- ✅ Approval routing already exists (`/approval-status`, `/approval`)
- ➕ **`rfq_id`** — FK, optional (mandatory when `purchase_scenario =
  'Competitive Bidding'`; backend enforces)
- 🔄 Per-line `pr_no` (text) → `requisition_id` (FK per line item) so a PO
  can fulfil one or many PRs
- ➕ `status` (state machine above; existing approval flow maps onto it)
- ➕ `attachments[]` (signed PO returned by vendor)
- ➕ Audit log

### 4.5 Goods Received Note — `procurement_grn`
Current form has good structure but uses text refs. Needs FK + dual confirmation.

- ✅ `grn_number`, `received_from`, `date_received`, `office`, `received_by`,
  `waybill_no`, `remark`, `signoffs[]`, `items[]` with quality status
- 🔄 **`po_reference` (text) → `po_id` (FK, required)** with status gate
- ➕ `requester_id` (denormalised from `po.requisition.requested_by`)
- ➕ `budget_holder_id` (denormalised from `po.requisition.budget_holder_id`)
- ➕ `requester_confirmed_at`, `requester_confirmed_by` (timestamp + user)
- ➕ `budget_holder_confirmed_at`, `budget_holder_confirmed_by`
- ➕ `receipt_outcome` (enum: `full` / `partial_close` / `partial_await`)
- ➕ `dispute_reason` (text, set when status = `disputed`)
- ➕ Per-line `shortfall_qty` (computed: `ordered_qty - received_qty`)
- ➕ `status` (state machine above)
- ➕ `attachments[]` (scanned vendor Delivery Note — important for MVP)
- ➕ Audit log

### 4.6 Vendor Invoice — `procurement_invoices` (NEW)
Brand new entity. Vendor sends a paper/PDF invoice; procurement records it.

| Field                    | Type                                           |
| ------------------------ | ---------------------------------------------- |
| `id`                     | PK                                             |
| `invoice_number`         | string (vendor's invoice number)               |
| `vendor_id`              | FK, required                                   |
| `po_id`                  | FK, required                                   |
| `invoice_date`           | date (date on the vendor's invoice)            |
| `received_date`          | date (date we received it)                     |
| `currency`               | string, default `NGN`                          |
| `subtotal`               | decimal                                        |
| `tax_amount`             | decimal                                        |
| `total_amount`           | decimal (in invoice's own currency)            |
| `po_currency_total`      | decimal (converted to PO currency for matching) |
| `exchange_rate`          | decimal (invoice currency → PO currency)        |
| `currency_variance_note` | text (procurement explains rate source)         |
| `attachment_id`          | FK to attachments (scanned invoice — required) |
| `match_notes`            | text (procurement's reconciliation notes)      |
| `dispute_reason`         | text (set when status = `disputed`)            |
| `status`                 | enum: `received` / `matched` / `disputed` / `paid` |
| `created_by`, timestamps | standard                                       |

Items are not strictly required on the invoice record itself for MVP — the
matching is done against the PO. Add `invoice_items[]` later if the org
wants line-level reconciliation.

### 4.7 Request for Payment — `procurement_rfp`
Current form has rich payee details and a supporting-docs checklist. Needs
real FKs and proper approval routing.

- ✅ `rfp_number`, `rfp_date`, `payment_due_date`, `payee_*` fields,
  `payment_amount`, `amount_in_words`, `currency`, `mode_of_payment`,
  `items[]`, `signoffs[]`
- 🔄 **`pr_nos` / `po_nos` / `grn_nos` (text) →** structured FKs:
  - `grn_id` (FK, required)
  - `invoice_id` (FK, required) — drives the payee details auto-fill
  - PR / PO are derivable via the chain; no need to store separately
- 🔄 `procurement_person` (text) → `created_by` (already present as user FK)
- 🔄 `payee_*` fields → auto-filled from `vendor` (via `invoice → po →
  vendor`); editable only if vendor record is incomplete
- 🔄 `supporting_docs[]` checklist → auto-checked from the chain (we *know*
  the PR/PO/GRN/Invoice exist because of the FKs); leave the checkboxes for
  external supporting docs only (Receipt, Contract/FA)
- ➕ `status` (state machine above)
- ➕ `paid_at`, `payment_reference` (set when ED marks paid; payment itself
  happens outside the app)
- ➕ Audit log

### 4.8 Generic Attachments — `attachments` (NEW)

| Field             | Type                                                       |
| ----------------- | ---------------------------------------------------------- |
| `id`              | PK                                                         |
| `entity_type`     | enum: `boq`, `pr`, `rfq`, `po`, `grn`, `invoice`, `rfp`    |
| `entity_id`       | int                                                        |
| `purpose`         | enum: `general`, `vendor_quote`, `delivery_note`, `signed_po`, `vendor_invoice`, `awarded_quote` |
| `filename`        | string                                                     |
| `mime_type`       | string                                                     |
| `size_bytes`      | int                                                        |
| `storage_key`     | string (S3 / disk path)                                    |
| `uploaded_by`     | FK user                                                    |
| `uploaded_at`     | timestamp                                                  |

Index on `(entity_type, entity_id)`.

---

## 5. Notifications (in-app + email)

| Trigger                                | Recipients                          |
| -------------------------------------- | ----------------------------------- |
| PR submitted                           | Budget holder                       |
| PR approved Stage 1 → Stage 2          | Stage 2 approvers                   |
| PR approved (final) / rejected         | Requester                           |
| RFQ marked `sent_to_vendors`           | (log only — vendor email is manual) |
| PO approved                            | Procurement officer who created it  |
| GRN created                            | Requester + budget holder           |
| GRN dual-confirmed                     | Procurement                         |
| GRN disputed                           | Procurement + budget holder         |
| Invoice received & matched             | (log only)                          |
| RFP submitted                          | Finance                             |
| RFP approved by Finance                | Operations / ED                     |
| RFP approved (final)                   | Procurement, vendor contact (email) |
| RFP marked paid                        | Requester + budget holder           |

For MVP: in-app notifications only is acceptable; email can be added in a
second pass without schema changes (notifications table already supports it).

---

## 6. Frontend vs Backend work split

### Backend (Django/whatever the API is)

1. Schema migrations for all the deltas above.
2. New `invoices` and `attachments` tables.
3. State-machine validation on every status transition (reject invalid moves).
4. Parent-reference validation on create (parent must exist + be in allowed status).
5. Approval routing changes for PR (Stage 1 → `budget_holder_id`).
6. Endpoints for the new entities/actions:
   - `POST /procurement/grn/{id}/confirm` (requester or budget holder)
   - `POST /procurement/grn/{id}/dispute`
   - `procurement/invoices/*` CRUD + `match` / `dispute` actions
   - `POST /procurement/rfq/{id}/mark-sent`
   - `POST /procurement/rfq/{id}/award` (with notes + attachment)
   - `POST /procurement/rfp/{id}/mark-paid` (with payment reference)
   - `POST /procurement/attachments` + `GET /attachments/{id}/download`
7. PDF generation server-side for every document type (consistent templates).
8. Audit-log writes on all status transitions for RFQ, PO, GRN, Invoice, RFP.
9. Notification dispatch on the triggers in §5.

### Frontend (this repo, [src/](src/))

1. Reusable `<EmployeePicker>` component — extract from
   [src/pages/procurement/CreateBillOfQuantities.jsx](src/pages/procurement/CreateBillOfQuantities.jsx)
   into [src/components/](src/components/).
2. **PR form** ([src/pages/procurement/CreatePurchaseRequest.jsx](src/pages/procurement/CreatePurchaseRequest.jsx)):
   add Budget Holder field using EmployeePicker, defaulting to project manager.
3. **RFQ form** ([src/pages/procurement/CreateRequestForQuotation.jsx](src/pages/procurement/CreateRequestForQuotation.jsx)):
   replace free-text supplier inputs with vendor dropdown; replace PR text
   field with FK select of approved PRs.
4. **GRN form** ([src/pages/procurement/CreateGoodsReceivedNote.jsx](src/pages/procurement/CreateGoodsReceivedNote.jsx)):
   replace `original_po_pr_no` text with PO dropdown; auto-fill items from
   the PO line items (so receivers only fill `qty_received` and quality).
5. **Invoice pages** (NEW): list view, create form, detail view with
   match/dispute actions. Mirrors the structure of existing pages.
6. **RFP form** ([src/pages/procurement/CreateRequestForPayment.jsx](src/pages/procurement/CreateRequestForPayment.jsx)):
   replace text references with GRN + Invoice dropdowns; auto-fill payee
   block from the chained vendor record.
7. **Detail pages** for every entity: chain breadcrumb showing "BOQ → PR →
   RFQ → PO → GRN → Invoice → RFP" with status badges and clickable links.
8. **"Create next document" buttons** on detail pages, gated by status —
   visible only when the next step is allowed.
9. **Attachment upload** component, reusable across all entity detail pages.
10. **GRN confirmation actions** for requester and budget holder roles.
11. Service additions in
    [src/services/procurement.js](src/services/procurement.js): `invoicesApi`,
    `attachmentsApi`, plus the new actions on existing apis.

---

## 7. Recommended build sequence

Roughly in dependency order. Each phase is shippable; users get value
incrementally.

1. **Foundations** — generic `attachments` table (backend) + upload component
   (frontend). Unblocks scanned-document use cases everywhere.
2. **PR Budget Holder** — `budget_holder_id` field + EmployeePicker reuse +
   Stage 1 routing change. Small, high impact, validates the role concept.
3. **RFQ rebuild** — FK to PR, vendor FK, status + bid analysis fields, send
   + award actions. The biggest single change but isolated.
4. **PO ↔ RFQ link** — `rfq_id` FK; "Create PO from awarded RFQ" button.
5. **GRN with FK + dual confirmation** — chain enforcement starts here.
6. **Vendor Invoice (NEW)** — full entity, pages, match/dispute.
7. **RFP rebuild** — replace text refs with GRN + Invoice FKs, payee
   auto-fill, ED approval routing, paid action.
8. **Notifications** — in-app first, email second.
9. **PDF templates** — consolidate server-side generation.
10. **Detail page chain breadcrumb + "Create next" buttons** — final UX polish
    that ties the whole flow together.

---

## 8. Confirmed decisions

- **PR Stage 2 approval:** always required. Procurement Lead is the Stage 2
  approver. No amount-threshold skipping in MVP.
- **GRN partial receipts:** confirmer chooses between `full` /
  `partial_close` / `partial_await` at confirmation time (see GRN state
  machine in §3 and `receipt_outcome` field in §4.5).
- **Multi-currency Invoice:** accepted. Store the invoice in its own
  currency, plus an exchange rate and PO-currency equivalent. Surface any
  variance against the PO during the match step (procurement reconciles
  manually, can mark `matched` or `disputed`).
- **Vendor bank details:** RFP creation is **blocked** if the linked
  vendor's bank name or account number fields are empty. Backend rejects
  with a clear error pointing the user to the vendor record.

---

*Spec validated. Build begins with phase 1 (attachments) and phase 2 (PR
budget holder) in parallel — both small, neither blocking the other.*
