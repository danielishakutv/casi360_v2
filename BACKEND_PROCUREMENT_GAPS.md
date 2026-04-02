# Backend Procurement Gaps

> **Purpose:** Documents all frontend features/entities that are missing from the Laravel backend.
> Pages marked ⏳ currently use demo data and will switch to API once the backend is updated.
> Fields marked ❌ are present on the frontend but not accepted by the current API.
> Pages marked ✅ are fully wired to the live backend API.

---

## 0. Integration Status

| Page | Status | Notes |
|------|--------|-------|
| Vendors | ✅ Live | Full CRUD |
| Vendor Categories | ⏳ Demo | Awaiting backend |
| Purchase Requests (list) | ✅ Live | Maps to `/procurement/requisitions` |
| Create Purchase Request | ✅ Live | Extra frontend fields sent but ignored by backend |
| Purchase Orders (list) | ✅ Live | Includes disbursement view + create in detail modal |
| Create Purchase Order | ✅ Live | Vendor/dept/employee dropdowns; extra fields not sent |
| Procurement Overview | ✅ Hybrid | PR + PO live; BOQ/RFQ/GRN/RFP demo |
| Inventory Items | ✅ Live | New page |
| Pending Approvals | ✅ Live | New page |
| BOQ | ⏳ Demo | Awaiting backend |
| RFQ | ⏳ Demo | Awaiting backend |
| GRN | ⏳ Demo | Awaiting backend |
| RFP | ⏳ Demo | Awaiting backend |

---

## 1. Missing Backend Entities

### 1.1 Vendor Categories ⏳

The frontend has a full CRUD page for vendor categories (name, description, status).
No backend endpoint exists yet.

**Needed endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/procurement/vendor-categories` | List (search, status filter, pagination) |
| POST | `/procurement/vendor-categories` | Create |
| PATCH | `/procurement/vendor-categories/{id}` | Update |
| DELETE | `/procurement/vendor-categories/{id}` | Soft-delete |

**Fields:** `name` (string, required), `description` (text), `status` (active/inactive)

---

### 1.2 Bill of Quantities (BOQ) ⏳

Full create/list pages exist on the frontend. A BOQ is linked to a Purchase Request and contains structured line items grouped by work sections.

**Needed endpoints:** Standard CRUD at `/procurement/boq`

**Entity — BOQ Header:**
| Field | Type | Notes |
|-------|------|-------|
| `boq_number` | string | Auto-generated (e.g. `BOQ-2026-001`) |
| `title` | string | Required |
| `pr_reference` | string/FK | Links to a Purchase Request |
| `project_code` | string/FK | Project association |
| `prepared_by` | string | User who prepared |
| `status` | enum | draft, submitted, approved, revised |
| `date` | date | |
| `notes` | text | |

**Entity — BOQ Line Item:**
| Field | Type | Notes |
|-------|------|-------|
| `section` | string | Section grouping (e.g. "Civil Works") |
| `description` | string | Item description |
| `unit` | string | Unit of measure |
| `quantity` | decimal | |
| `unit_rate` | decimal | |
| `total` | decimal | Computed: qty × rate |

---

### 1.3 Request for Quotation (RFQ) ⏳

RFQ is sent to vendors requesting price quotes for items from a Purchase Request / BOQ.

**Needed endpoints:** Standard CRUD at `/procurement/rfq`

**Entity — RFQ Header:**
| Field | Type | Notes |
|-------|------|-------|
| `rfq_number` | string | Auto-generated |
| `title` | string | Required |
| `pr_reference` | string/FK | Source PR |
| `vendor` | string/FK | Target vendor |
| `status` | enum | draft, sent, received, evaluated, cancelled |
| `issue_date` | date | |
| `deadline` | date | Response deadline |
| `notes` | text | |

**Entity — RFQ Line Item:**
| Field | Type | Notes |
|-------|------|-------|
| `description` | string | |
| `unit` | string | |
| `quantity` | decimal | |
| `vendor_unit_price` | decimal | Filled by vendor |
| `vendor_total` | decimal | Computed |

---

### 1.4 Goods Received Note (GRN) ⏳

GRN records the receipt of goods against a Purchase Order with quality checks and dual signoff.

**Needed endpoints:** Standard CRUD at `/procurement/grn`

**Entity — GRN Header:**
| Field | Type | Notes |
|-------|------|-------|
| `grn_number` | string | Auto-generated |
| `po_reference` | string/FK | Links to PO |
| `vendor` | string/FK | Supplier |
| `received_by` | string | Person receiving |
| `status` | enum | draft, inspected, accepted, rejected, partial |
| `received_date` | date | |
| `delivery_note_no` | string | Vendor's delivery note |
| `notes` | text | |

**Entity — GRN Line Item:**
| Field | Type | Notes |
|-------|------|-------|
| `description` | string | Matches PO line item |
| `ordered_qty` | integer | From PO |
| `received_qty` | integer | Actually received |
| `accepted_qty` | integer | Passed quality check |
| `rejected_qty` | integer | Failed quality check |
| `rejection_reason` | text | |

**Signoff sections:** Received By (name, position, date, signature), Inspected By (name, position, date, signature)

---

### 1.5 Request for Payment (RFP) ⏳

RFP requests disbursement against an approved PO/GRN with tax calculation and triple signoff.

**Needed endpoints:** Standard CRUD at `/procurement/rfp`

**Entity — RFP Header:**
| Field | Type | Notes |
|-------|------|-------|
| `rfp_number` | string | Auto-generated |
| `po_reference` | string/FK | Links to PO |
| `grn_reference` | string/FK | Links to GRN |
| `vendor` | string/FK | Payee |
| `status` | enum | draft, submitted, approved, paid, rejected |
| `payment_date` | date | Requested payment date |
| `subtotal` | decimal | |
| `tax_amount` | decimal | Computed from tax_rate |
| `tax_rate` | decimal | e.g. 7.5% VAT |
| `total_amount` | decimal | subtotal + tax |
| `payment_method` | enum | bank_transfer, cash, cheque |
| `bank_details` | text | Vendor bank info |
| `notes` | text | |

**Signoff sections:** Prepared By, Verified By, Approved By (each: name, position, date, signature)

---

## 2. Missing Fields on Existing Entities

### 2.1 Vendors

The backend `/procurement/vendors` accepts: name, contact_person, email, phone, address, city, state, country, tax_id, bank_name, bank_account_number, notes, status (active/inactive).

**Frontend fields not accepted by backend:**
| Field | Type | Notes |
|-------|------|-------|
| `vendor_code` | string | Auto-generated display code (e.g. "VND-001") |
| `category` | string/FK | Links to vendor category (needs entity 1.1 first) |
| `rating` | integer | 1–5 star rating |
| `blacklisted` | enum | Status value "blacklisted" not supported (only active/inactive) |

---

### 2.2 Requisitions (Purchase Requests)

The backend `/procurement/requisitions` accepts: department_id, requested_by, title, justification, priority, needed_by, notes, status, items[].

**Frontend fields not accepted by backend (from CreatePurchaseRequest form):**
| Field | Type | Notes |
|-------|------|-------|
| `delivery_location` | string | Where goods should be delivered |
| `purchase_scenario` | enum | Direct Purchase, Competitive Bidding, Framework Agreement, etc. |
| `logistics_involved` | boolean | Yes/No |
| `boq` | boolean | Whether a BOQ is attached |
| `project_code` | string/FK | Project association |
| `donor` | string | Funding source / donor name |
| `currency` | string | NGN/USD/EUR |
| `exchange_rate` | decimal | For non-NGN currencies |
| `items[].project_code` | string | Per-line project allocation |
| `items[].budget_line` | string | Budget category |
| **Signoff sections (5):** | | Validation, Requester, Budget Holder, Finance, Logistics — each with name, position, date, signature |

---

### 2.3 Purchase Orders

The backend `/procurement/purchase-orders` accepts: vendor_id, department_id, requested_by, order_date, expected_delivery_date, tax_amount, discount_amount, currency, notes, status, payment_status, items[].

**Frontend fields not accepted by backend (from CreatePurchaseOrder form):**
| Field | Type | Notes |
|-------|------|-------|
| `pr_reference` | string/FK | Reference to originating PR (text field on frontend) |
| `rfq_reference` | string/FK | Reference to originating RFQ |
| `deliver_name` | string | Deliver-to name |
| `deliver_address` | string | Deliver-to address |
| `deliver_position` | string | Deliver-to position |
| `deliver_contact` | string | Deliver-to contact |
| `payment_terms` | array | Bank Transfer / Cash / Cheque (checkbox array) |
| `delivery_terms` | text | Special delivery instructions |
| `remarks` | text | Separate from notes |
| `delivery_charges` | decimal | Separate from tax |
| `items[].pr_no` | string | PR number per line item |
| `items[].project_code` | string | Per-line project allocation |
| `items[].budget_line` | string | Budget category |
| **Signoff sections (4):** | | Prepared By, Approved By, Reviewed By, Supplier Acceptance — each with name, position, date, signature |

---

## 3. Summary

| Entity / Feature | Status | Action Needed |
|------------------|--------|---------------|
| Vendor Categories | ⏳ No backend | Create full CRUD endpoints |
| BOQ | ⏳ No backend | Create entity + CRUD + line items |
| RFQ | ⏳ No backend | Create entity + CRUD + line items |
| GRN | ⏳ No backend | Create entity + CRUD + line items + signoff |
| RFP | ⏳ No backend | Create entity + CRUD + tax calc + signoff |
| Vendor extra fields | ❌ Missing | Add vendor_code, category FK, rating, blacklisted |
| Requisition extra fields | ❌ Missing | Add delivery_location, purchase_scenario, logistics, currency, project/donor, signoffs |
| PO extra fields | ❌ Missing | Add pr_reference, rfq_reference, deliver-to section, payment_terms, signoffs |
