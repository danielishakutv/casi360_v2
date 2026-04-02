# CASI360 — Backend Update: Frontend Integration Guide

> **Date:** 2 April 2026
> **From:** Backend Team
> **To:** Frontend Team
> **Re:** All 17 items from `DEVELOPMENT_GAPS.md` are now implemented

---

## Summary

All 17 features listed in `DEVELOPMENT_GAPS.md` have been fully implemented on the backend. The frontend can now replace all demo constants, hardcoded data, and placeholder stubs with live API calls.

**What changed:**
- 8 new database tables (leave_types, holidays, emails, sms_messages, rfp_items, beneficiaries, help_articles, support_tickets)
- 40+ new columns across existing tables (boqs, rfqs, grns, rfps, vendors, requisitions)
- 15 new API controllers, 22 new endpoints
- New permissions seeded for all new features

**No breaking changes.** All existing endpoints continue to work exactly as before. New fields on existing entities are nullable — old requests still pass validation.

---

## Base URL & Conventions

- **Base:** `{API_URL}/api/v1`
- **Auth:** Sanctum cookie-based SPA authentication (send `withCredentials: true`)
- **IDs:** All IDs are UUIDs (strings)
- **Dates:** `YYYY-MM-DD` for date fields, ISO 8601 for timestamps
- **Methods:** `GET` (list/show), `POST` (create), `PATCH` (update), `DELETE` (soft-delete)

### Standard Response Envelope

Every response follows this shape:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": { "field": ["Validation message"] }
}
```

### Standard Pagination

All list endpoints return:

```json
{
  "data": {
    "<collection_key>": [ ... ],
    "meta": {
      "current_page": 1,
      "last_page": 4,
      "per_page": 25,
      "total": 97
    }
  }
}
```

Send `per_page=0` to get all records without pagination.

---

## 1. HR — Leave Types

**Replace:** `DEMO_LEAVE_TYPES` in `src/pages/hr/Settings.jsx`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/hr/leave-types` | List with search & pagination |
| `GET` | `/hr/leave-types/{id}` | Single record |
| `POST` | `/hr/leave-types` | Create |
| `PATCH` | `/hr/leave-types/{id}` | Update |
| `DELETE` | `/hr/leave-types/{id}` | Soft-delete |

### Query Parameters (GET list)

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `status` | string | — | `active` or `inactive` |
| `search` | string | — | Searches `name`, `description` |
| `sort_by` | string | `name` | Options: `name`, `days_allowed`, `status`, `created_at` |
| `sort_dir` | string | `asc` | `asc` or `desc` |
| `per_page` | int | `25` | Max 100. Use `0` for all |

**Collection key:** `leave_types`

### Request Body (POST / PATCH)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 255 |
| `days_allowed` | integer | Yes | Min 0, max 365 |
| `carry_over_max` | integer | No | Min 0 |
| `paid` | boolean | Yes | |
| `requires_approval` | boolean | Yes | |
| `status` | string | Yes | `active` or `inactive` |
| `description` | string | No | Max 1000 |

### Response Shape

```json
{
  "id": "uuid",
  "name": "Annual Leave",
  "days_allowed": 21,
  "carry_over_max": 5,
  "paid": true,
  "requires_approval": true,
  "status": "active",
  "description": "Standard annual leave entitlement",
  "created_at": "2026-04-02T10:00:00.000000Z",
  "updated_at": "2026-04-02T10:00:00.000000Z"
}
```

---

## 2. HR — Holidays

**Replace:** `DEMO_HOLIDAYS` in `src/pages/hr/Settings.jsx`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/hr/holidays` | List with year filter, search & pagination |
| `GET` | `/hr/holidays/{id}` | Single record |
| `POST` | `/hr/holidays` | Create |
| `PATCH` | `/hr/holidays/{id}` | Update |
| `DELETE` | `/hr/holidays/{id}` | Soft-delete |

### Query Parameters (GET list)

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `status` | string | — | `active` or `inactive` |
| `type` | string | — | `public` or `company` |
| `year` | integer | — | Filters by year from `date` column |
| `search` | string | — | Searches `name` |
| `sort_by` | string | `date` | Options: `name`, `date`, `type`, `status`, `created_at` |
| `sort_dir` | string | `asc` | `asc` or `desc` |
| `per_page` | int | `25` | Max 100. Use `0` for all |

**Collection key:** `holidays`

### Request Body (POST / PATCH)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 255 |
| `date` | string | Yes | Format: `YYYY-MM-DD` |
| `type` | string | Yes | `public` or `company` |
| `status` | string | Yes | `active` or `inactive` |

### Response Shape

```json
{
  "id": "uuid",
  "name": "Independence Day",
  "date": "2026-10-01",
  "type": "public",
  "status": "active",
  "created_at": "2026-04-02T10:00:00.000000Z",
  "updated_at": "2026-04-02T10:00:00.000000Z"
}
```

---

## 3. Procurement — BOQ (New Fields)

**Existing endpoints unchanged.** Three new fields added to BOQ header.

### New Fields on BOQ Header

| Field | Type | Notes |
|-------|------|-------|
| `department` | string, nullable | Requesting department |
| `category` | string, nullable | Work category grouping (e.g. "Civil Works") |
| `signoffs` | JSON array, nullable | Array of signoff objects |

### Signoff Object Shape (used across BOQ, RFQ, GRN, RFP)

```json
{
  "type": "Quantity Surveyor",
  "name": "John Doe",
  "position": "Senior QS",
  "date": "2026-04-02",
  "signature": "base64_or_url"
}
```

### Updated BOQ Response

```json
{
  "id": "uuid",
  "boq_number": "BOQ-2026-001",
  "title": "Office Renovation",
  "pr_reference": "PR-2026-001",
  "project_code": "PRJ-001",
  "department": "Operations",
  "category": "Civil Works",
  "prepared_by": "Jane Smith",
  "status": "draft",
  "date": "2026-04-02",
  "notes": "...",
  "signoffs": [
    { "type": "Quantity Surveyor", "name": "...", "position": "...", "date": "...", "signature": "..." },
    { "type": "Reviewing Surveyor", "name": "...", "position": "...", "date": "...", "signature": "..." },
    { "type": "Budget Holder", "name": "...", "position": "...", "date": "...", "signature": "..." }
  ],
  "grand_total": 1500000.00,
  "item_count": 12,
  "created_at": "...",
  "updated_at": "..."
}
```

---

## 4. Procurement — RFQ (New Fields)

**Existing endpoints unchanged.** 15 new header fields + 3 new line item fields added.

### New RFQ Header Fields

| Field | Type | Validation |
|-------|------|------------|
| `project_code` | string | Nullable, max 255 |
| `structure` | string | Nullable, max 255 (office/location) |
| `currency` | string | Nullable, `NGN` or `USD` |
| `request_types` | array | Array of: `Goods`, `Services`, `Works`, `Consultancy` |
| `supplier_name` | string | Nullable, max 255 |
| `supplier_address` | string | Nullable |
| `supplier_phone` | string | Nullable, max 50 |
| `supplier_email` | string | Nullable, valid email |
| `contact_person` | string | Nullable, max 255 |
| `delivery_address` | string | Nullable |
| `delivery_date` | date | Nullable, `YYYY-MM-DD` |
| `delivery_terms` | string | Nullable |
| `payment_terms` | string | Nullable |
| `signoffs` | array | JSON array of signoff objects (see Section 3) |

### New RFQ Line Item Fields

| Field | Type | Notes |
|-------|------|-------|
| `item_number` | string | Item reference code |
| `unit_cost` | decimal | Requester's estimated cost |
| `total` | decimal | **Auto-computed:** `quantity * unit_cost` |

**Note:** Items now have two cost tracks:
- `unit_cost` / `total` — requester's estimate (computed server-side)
- `vendor_unit_price` / `vendor_total` — vendor's quoted price (existing)

### Updated RFQ Response

```json
{
  "id": "uuid",
  "rfq_number": "RFQ-2026-001",
  "title": "Office Supplies Q2",
  "pr_reference": "PR-2026-005",
  "project_code": "PRJ-002",
  "structure": "Abuja Office",
  "currency": "NGN",
  "request_types": ["Goods", "Services"],
  "vendor_id": "uuid",
  "vendor_name": "ABC Supplies Ltd",
  "supplier_name": "ABC Supplies Ltd",
  "supplier_address": "123 Main St, Abuja",
  "supplier_phone": "+234-800-000-0000",
  "supplier_email": "sales@abc.com",
  "contact_person": "Mr. Johnson",
  "status": "draft",
  "issue_date": "2026-04-02",
  "deadline": "2026-04-15",
  "delivery_address": "HQ Warehouse",
  "delivery_date": "2026-05-01",
  "delivery_terms": "DDP Abuja",
  "payment_terms": "Net 30",
  "notes": "...",
  "signoffs": [ ... ],
  "grand_total": 750000.00,
  "item_count": 5,
  "created_at": "...",
  "updated_at": "...",
  "items": [
    {
      "id": "uuid",
      "rfq_id": "uuid",
      "item_number": "ITM-001",
      "description": "A4 Paper (Ream)",
      "unit": "ream",
      "quantity": 100,
      "unit_cost": 1500.00,
      "total": 150000.00,
      "vendor_unit_price": 1400.00,
      "vendor_total": 140000.00
    }
  ]
}
```

---

## 5. Procurement — GRN (New Fields)

**Existing endpoints unchanged.** 1 new header field + 1 new line item field.

### New Fields

| Level | Field | Type | Validation |
|-------|-------|------|------------|
| Header | `office` | string | Nullable, max 255 (receiving office/location) |
| Line item | `quality_status` | enum | `good`, `damaged`, `defective`, `wrong_item` (default: `good`) |

### Updated GRN Item Response

```json
{
  "id": "uuid",
  "grn_id": "uuid",
  "description": "A4 Paper (Ream)",
  "ordered_qty": 100,
  "received_qty": 98,
  "quality_status": "good",
  "accepted_qty": 98,
  "rejected_qty": 2,
  "rejection_reason": null
}
```

---

## 6. Procurement — RFP (Major Update: Line Items Added)

**Existing endpoints unchanged, but RFP now supports line items.** This is the biggest change — RFP was previously header-only; it now has a child `rfp_items` table.

### New RFP Header Fields

| Field | Type | Validation |
|-------|------|------------|
| `project_code` | string | Nullable, max 255 |
| `payee` | string | Nullable, max 255 (vendor/payee name) |
| `currency` | string | Nullable, default `NGN` |
| `exchange_rate` | decimal | Nullable, min 0 |
| `department` | string | Nullable, max 255 |
| `budget_line` | string | Nullable, max 255 |
| `date` | date | Nullable, `YYYY-MM-DD` |
| `supporting_docs` | array | Array of strings: `PR`, `PO`, `GRN`, `Invoice`, `Receipt`, `Contract` |

### RFP Status Values (expanded)

`draft`, `pending`, `submitted`, `approved`, `paid`, `rejected`, `on_hold`

### RFP Line Items (NEW — nested array `items[]`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `description` | string | Yes | Item description |
| `project_code` | string | No | Per-line project allocation |
| `budget_line` | string | No | Budget category |
| `quantity` | integer | Yes | Min 1 |
| `unit_cost` | decimal | Yes | Min 0 |
| `dept` | string | No | Department |
| `total` | decimal | **Auto** | Server computes: `quantity * unit_cost` |

### Tax Calculation (auto-computed server-side)

| Field | Computation |
|-------|-------------|
| `subtotal` | Sum of all line item `total` values |
| `sales_tax` | `subtotal * tax_rate` (default tax_rate = 5%) |
| `total_amount` | `subtotal + sales_tax` |

### RFP Detail Response (GET show, POST create, PATCH update)

```json
{
  "id": "uuid",
  "rfp_number": "RFP-202604-0001",
  "po_reference": "PO-2026-003",
  "grn_reference": "GRN-2026-005",
  "project_code": "PRJ-001",
  "vendor_id": "uuid",
  "vendor_name": "ABC Supplies Ltd",
  "payee": "ABC Supplies Ltd",
  "currency": "NGN",
  "exchange_rate": 1.0000,
  "department": "Operations",
  "budget_line": "BL-001",
  "date": "2026-04-02",
  "status": "pending",
  "payment_date": null,
  "subtotal": 500000.00,
  "tax_amount": 25000.00,
  "tax_rate": 5.00,
  "total_amount": 525000.00,
  "payment_method": "Bank Transfer",
  "bank_details": "...",
  "notes": "...",
  "signoffs": [ ... ],
  "supporting_docs": ["PR", "PO", "Invoice"],
  "item_count": 3,
  "items": [
    {
      "id": "uuid",
      "rfp_id": "uuid",
      "description": "Consulting fees",
      "project_code": "PRJ-001",
      "budget_line": "BL-001",
      "quantity": 1,
      "unit_cost": 300000.00,
      "dept": "Operations",
      "total": 300000.00
    },
    {
      "id": "uuid",
      "rfp_id": "uuid",
      "description": "Travel expenses",
      "project_code": "PRJ-001",
      "budget_line": "BL-002",
      "quantity": 2,
      "unit_cost": 100000.00,
      "dept": "Operations",
      "total": 200000.00
    }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

### RFP Create Example

```json
POST /api/v1/procurement/rfp
{
  "po_reference": "PO-2026-003",
  "project_code": "PRJ-001",
  "payee": "ABC Supplies Ltd",
  "payment_method": "Bank Transfer",
  "currency": "NGN",
  "department": "Operations",
  "budget_line": "BL-001",
  "date": "2026-04-02",
  "status": "draft",
  "supporting_docs": ["PR", "PO", "Invoice"],
  "items": [
    {
      "description": "Consulting fees",
      "project_code": "PRJ-001",
      "budget_line": "BL-001",
      "quantity": 1,
      "unit_cost": 300000
    }
  ]
}
```

**Do not send** `subtotal`, `tax_amount`, `total_amount`, or item `total` — these are all computed server-side.

---

## 7. Procurement Overview — Stats Endpoint

**Replace:** Hardcoded demo stats computed from `demoBOQ`, `demoRFQ`, `demoGRN`, `demoRFP` arrays in `src/pages/procurement/Overview.jsx`

### Endpoint

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/procurement/stats` | Aggregate counts for all procurement entities |

### Response

```json
{
  "data": {
    "boq": {
      "total": 15,
      "by_status": { "draft": 5, "submitted": 6, "approved": 3, "revised": 1 }
    },
    "rfq": {
      "total": 12,
      "by_status": { "draft": 3, "sent": 4, "received": 3, "evaluated": 2 }
    },
    "grn": {
      "total": 20,
      "by_status": { "draft": 2, "inspected": 5, "accepted": 10, "rejected": 3 }
    },
    "rfp": {
      "total": 18,
      "by_status": { "draft": 3, "pending": 4, "approved": 6, "paid": 5 },
      "total_value": 15000000.00,
      "total_paid": 8500000.00
    }
  }
}
```

---

## 8. Communication — Send Email

**Replace:** `demoEmails` in `src/pages/communication/SendEmail.jsx`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/communication/emails` | List sent emails |
| `POST` | `/communication/emails` | Compose & send |
| `DELETE` | `/communication/emails/{id}` | Delete record |

**Rate limit:** 30 requests/minute for POST and DELETE.

### Query Parameters (GET list)

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `status` | string | — | Filter by status |
| `audience` | string | — | `general`, `department`, `individual` |
| `search` | string | — | Searches `subject` |
| `per_page` | int | `25` | Max 100. Use `0` for all |

**Collection key:** `emails`
**Sort:** `created_at DESC` (fixed)

### Request Body (POST)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `subject` | string | Yes | Max 255 |
| `body` | string | Yes | HTML or plain text |
| `audience` | string | Yes | `general`, `department`, or `individual` |
| `recipient_ids` | array of UUIDs | If `audience = individual` | Each must exist in users table |
| `department_ids` | array of UUIDs | If `audience = department` | Each must exist in departments table |

### Response Shape

```json
{
  "id": "uuid",
  "sent_by": "uuid",
  "sender_name": "Admin User",
  "subject": "Monthly Update",
  "body": "<p>Hello team...</p>",
  "audience": "general",
  "recipient_ids": null,
  "department_ids": null,
  "recipient_count": 45,
  "status": "sent",
  "sent_at": "2026-04-02T10:30:00.000000Z",
  "created_at": "2026-04-02T10:30:00.000000Z"
}
```

**Auto fields:** `sent_by` (current user), `recipient_count`, `status` (set to `sent`), `sent_at` (set to now).

---

## 9. Communication — Send SMS

**Replace:** `demoSmsMessages` in `src/pages/communication/SendSMS.jsx`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/communication/sms` | List sent messages |
| `POST` | `/communication/sms` | Compose & send |
| `DELETE` | `/communication/sms/{id}` | Delete record |

**Rate limit:** 30 requests/minute for POST and DELETE.

### Query Parameters (GET list)

| Param | Type | Default |
|-------|------|---------|
| `status` | string | — |
| `audience` | string | — |
| `search` | string | — (searches `message` body) |
| `per_page` | int | `25` |

**Collection key:** `sms_messages`
**Sort:** `created_at DESC` (fixed)

### Request Body (POST)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `message` | string | Yes | **Max 480 characters** |
| `audience` | string | Yes | `general`, `department`, or `individual` |
| `recipient_ids` | array of UUIDs | If `audience = individual` | |
| `department_ids` | array of UUIDs | If `audience = department` | |

### Response Shape

```json
{
  "id": "uuid",
  "sent_by": "uuid",
  "sender_name": "Admin User",
  "message": "Reminder: team meeting at 2pm today.",
  "audience": "general",
  "recipient_ids": null,
  "department_ids": null,
  "recipient_count": 45,
  "status": "sent",
  "sent_at": "2026-04-02T10:30:00.000000Z",
  "created_at": "2026-04-02T10:30:00.000000Z"
}
```

---

## 10. Vendor Extra Fields (Already on existing endpoint)

**No new endpoints.** The existing `/procurement/vendors` POST and PATCH now accept these additional fields:

| Field | Type | Notes |
|-------|------|-------|
| `vendor_code` | string | **Auto-generated** on create (e.g. `VND-001`). Do not send it. |
| `category_id` | UUID | FK to vendor_categories table |
| `rating` | integer | 1–5. Nullable |
| `status` | enum | Now accepts: `active`, `inactive`, **`blacklisted`** |

The vendor response now includes:
- `vendor_code` — auto-generated string
- `category_id` — UUID
- `category_name` — computed from relationship
- `rating` — integer or null

---

## 11. Requisition Extra Fields (Already on existing endpoint)

**No new endpoints.** The existing `/procurement/requisitions` POST and PATCH now accept these additional fields:

### New Header Fields

| Field | Type | Validation |
|-------|------|------------|
| `delivery_location` | string | Nullable, max 255 |
| `purchase_scenario` | enum | `Direct Purchase`, `Competitive Bidding`, `Framework Agreement`, `Emergency`, `Sole Source` |
| `logistics_involved` | boolean | |
| `boq` | boolean | Whether a BOQ is attached |
| `project_code` | string | Nullable |
| `donor` | string | Nullable |
| `currency` | enum | `NGN`, `USD`, `EUR` |
| `exchange_rate` | decimal | Nullable, min 0 |

### New Per-Line Item Fields

| Field | Type | Notes |
|-------|------|-------|
| `project_code` | string | Per-line project allocation |
| `budget_line` | string | Budget category |

### New Signoff Sections

Send as JSON array in a `signoffs` field:

```json
"signoffs": [
  { "type": "Validation", "name": "...", "position": "...", "date": "...", "signature": "..." },
  { "type": "Requester", "name": "...", "position": "...", "date": "...", "signature": "..." },
  { "type": "Budget Holder", "name": "...", "position": "...", "date": "...", "signature": "..." },
  { "type": "Finance", "name": "...", "position": "...", "date": "...", "signature": "..." },
  { "type": "Logistics", "name": "...", "position": "...", "date": "...", "signature": "..." }
]
```

---

## 12. Settings — Roles & Access

**Replace:** `DEMO_ROLES` in `src/pages/Settings.jsx`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/settings/roles` | List all roles with user counts |
| `GET` | `/settings/roles/{slug}` | Role detail with assigned users |

**Access:** Super admin only.

**Note:** Roles are read-only (hardcoded in the system: `super_admin`, `admin`, `manager`, `staff`). The existing `/settings/permissions` endpoint handles per-role permission toggling.

### List Response

```json
{
  "data": {
    "roles": [
      {
        "id": "super_admin",
        "name": "Super Admin",
        "slug": "super_admin",
        "description": "Full system access with all permissions",
        "user_count": 1
      },
      {
        "id": "admin",
        "name": "Admin",
        "slug": "admin",
        "description": "Administrative access with most permissions",
        "user_count": 3
      },
      {
        "id": "manager",
        "name": "Manager",
        "slug": "manager",
        "description": "Department-level management access",
        "user_count": 8
      },
      {
        "id": "staff",
        "name": "Staff",
        "slug": "staff",
        "description": "Standard staff access with limited permissions",
        "user_count": 25
      }
    ]
  }
}
```

### Detail Response (GET `/settings/roles/admin`)

```json
{
  "data": {
    "role": {
      "id": "admin",
      "name": "Admin",
      "slug": "admin",
      "description": "Administrative access with most permissions",
      "user_count": 3,
      "users": [
        {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@casi360.com",
          "role": "admin",
          "status": "active",
          "created_at": "2026-01-15T08:00:00.000000Z"
        }
      ]
    }
  }
}
```

Users array is limited to 50, ordered by name.

---

## 13. Settings — Audit Log

**Replace:** `DEMO_AUDIT` in `src/pages/Settings.jsx`

### Endpoint

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/settings/audit-log` | Paginated audit log with filters |

**Access:** Super admin only.

### Query Parameters

| Param | Type | Notes |
|-------|------|-------|
| `user_id` | UUID | Filter by specific user |
| `action` | string | Filter by action type |
| `entity_type` | string | Filter by entity type (e.g. `Employee`, `Vendor`) |
| `date_from` | date | `YYYY-MM-DD` — filter from this date |
| `date_to` | date | `YYYY-MM-DD` — filter up to this date |
| `search` | string | Searches `action`, `entity_type`, and user `name` |
| `per_page` | int | Default 25, max 100 |

**Collection key:** `audit_logs`
**Sort:** `created_at DESC` (fixed)

### Response Shape

```json
{
  "id": "uuid",
  "user": "Jane Smith",
  "user_id": "uuid",
  "action": "created",
  "target": "Employee (uuid-here)",
  "entity_type": "Employee",
  "entity_id": "uuid",
  "ip_address": "192.168.1.100",
  "timestamp": "2026-04-02T14:30:00.000000Z",
  "old_values": null,
  "new_values": { "name": "John Doe", "status": "active" }
}
```

**Important:** The timestamp field is called `timestamp`, not `created_at`.

---

## 14. Settings — Data & Backup

**Replace:** Toast stubs in `src/pages/Settings.jsx` (Data tab)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/settings/export` | Download data as JSON |
| `POST` | `/settings/import` | Upload data file |
| `POST` | `/settings/backup` | Trigger server backup |

**Access:** Super admin only.

### Export (GET `/settings/export`)

**Query Parameters:**

| Param | Type | Default |
|-------|------|---------|
| `format` | string | `json` (currently only JSON supported) |
| `entities` | comma-separated string | `users,employees,departments` |

**Response:** JSON object with entity arrays + metadata.

```json
{
  "data": {
    "data": {
      "users": [ ... ],
      "employees": [ ... ],
      "departments": [ ... ]
    },
    "exported_at": "2026-04-02T14:00:00.000000Z",
    "entities": ["users", "employees", "departments"],
    "format": "json"
  }
}
```

### Import (POST `/settings/import`)

**Request:** `multipart/form-data`

| Field | Type | Validation |
|-------|------|------------|
| `file` | file | Required. `.json` or `.csv`. Max 10 MB |

**Response:**

```json
{
  "data": {
    "message": "Data import initiated",
    "filename": "export_2026-04-02.json"
  }
}
```

### Backup (POST `/settings/backup`)

No request body needed.

**Response:**

```json
{
  "data": {
    "backup_id": "uuid",
    "triggered_at": "2026-04-02T14:00:00.000000Z",
    "status": "initiated"
  }
}
```

---

## 15. Programs — Beneficiaries

**Replace:** Placeholder stub in `src/pages/programs/Beneficiaries.jsx`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/programs/beneficiaries` | List with filters & pagination |
| `GET` | `/programs/beneficiaries/{id}` | Single record |
| `POST` | `/programs/beneficiaries` | Create |
| `PATCH` | `/programs/beneficiaries/{id}` | Update |
| `DELETE` | `/programs/beneficiaries/{id}` | Soft-delete |

### Query Parameters (GET list)

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `status` | string | — | `active`, `inactive`, `graduated`, `withdrawn` |
| `project_id` | UUID | — | Filter by project/program |
| `gender` | string | — | `male`, `female`, `other` |
| `search` | string | — | Searches `name`, `location`, `phone` |
| `sort_by` | string | `name` | Options: `name`, `enrollment_date`, `status`, `location`, `created_at` |
| `sort_dir` | string | `asc` | `asc` or `desc` |
| `per_page` | int | `25` | Max 100. Use `0` for all |

**Collection key:** `beneficiaries`

### Request Body (POST / PATCH)

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 255 |
| `project_id` | UUID | Yes | Must exist in projects table |
| `gender` | string | No | `male`, `female`, or `other` |
| `age` | integer | No | Min 0, max 150 |
| `location` | string | No | Max 255 |
| `phone` | string | No | Max 50 |
| `enrollment_date` | date | Yes | `YYYY-MM-DD` |
| `status` | string | Yes | `active`, `inactive`, `graduated`, `withdrawn` |
| `notes` | string | No | |

### Response Shape

```json
{
  "id": "uuid",
  "name": "Amina Mohammed",
  "project_id": "uuid",
  "project_name": "Rural Education Initiative",
  "gender": "female",
  "age": 28,
  "location": "Maiduguri, Borno",
  "phone": "+234-800-000-0000",
  "enrollment_date": "2026-01-15",
  "status": "active",
  "notes": "...",
  "created_at": "2026-04-02T10:00:00.000000Z",
  "updated_at": "2026-04-02T10:00:00.000000Z"
}
```

**Computed field:** `project_name` is resolved from the project relationship.

---

## 16. Programs — Reports

**Replace:** Placeholder stub in `src/pages/programs/Reports.jsx`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/programs/reports/summary` | Aggregate beneficiary statistics |
| `GET` | `/programs/reports/export` | Export beneficiary data |

### Summary Response (GET `/programs/reports/summary`)

```json
{
  "data": {
    "total_beneficiaries": 250,
    "active_beneficiaries": 180,
    "total_projects": 12,
    "beneficiaries_by_project": [
      {
        "project_id": "uuid",
        "project_name": "Rural Education Initiative",
        "beneficiary_count": 45
      }
    ],
    "beneficiaries_by_status": {
      "active": 180,
      "inactive": 20,
      "graduated": 40,
      "withdrawn": 10
    },
    "enrollment_trends": {
      "2025-05": 15,
      "2025-06": 22,
      "2025-07": 18,
      "...": "...",
      "2026-04": 30
    },
    "gender_distribution": {
      "male": 120,
      "female": 125,
      "other": 5
    }
  }
}
```

**Notes:**
- `enrollment_trends` shows the last 12 months
- `beneficiaries_by_project` includes all projects

### Export (GET `/programs/reports/export`)

| Param | Type | Notes |
|-------|------|-------|
| `project_id` | UUID | Optional. Filter by project |
| `format` | string | `json` or `csv` |

```json
{
  "data": {
    "beneficiaries": [ ... ],
    "total": 250,
    "exported_at": "2026-04-02T14:00:00.000000Z"
  }
}
```

---

## 17. Help Center

**Replace:** Placeholder stub in `src/pages/HelpCenter.jsx`

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/help/articles` | List published articles (FAQ/knowledge base) |
| `GET` | `/help/articles/{id}` | Single article |
| `POST` | `/help/tickets` | Submit support ticket |

**Access:** Any authenticated user. No special permissions required.
**Rate limit:** Tickets are limited to 10 per minute.

### Articles List — Query Parameters

| Param | Type | Default |
|-------|------|---------|
| `category` | string | — (filter by category) |
| `search` | string | — (searches `title`, `content`) |
| `per_page` | int | `25` |

**Collection key:** `articles`
**Sort:** `sort_order ASC`, then `title ASC` (fixed)
**Note:** Only articles with `status = 'published'` are returned.

### HelpArticle Response Shape

```json
{
  "id": "uuid",
  "title": "How to submit a purchase request",
  "category": "Procurement",
  "content": "To submit a purchase request, navigate to...",
  "status": "published",
  "sort_order": 1,
  "created_at": "2026-03-15T10:00:00.000000Z",
  "updated_at": "2026-03-20T14:30:00.000000Z"
}
```

### Submit Ticket — Request Body

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `subject` | string | Yes | Max 255 |
| `message` | string | Yes | |
| `priority` | string | No | `low`, `medium`, `high`, `urgent`. Default: `medium` |

### SupportTicket Response Shape

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "user_name": "Jane Smith",
  "subject": "Cannot access procurement module",
  "message": "I keep getting a 403 error when...",
  "priority": "high",
  "status": "open",
  "response": null,
  "resolved_at": null,
  "created_at": "2026-04-02T15:00:00.000000Z",
  "updated_at": "2026-04-02T15:00:00.000000Z"
}
```

**Auto fields:** `user_id` (current user), `status` (set to `open`).

---

## Quick Reference: All New Endpoints

| # | Method | Full Path | Module | Permission |
|---|--------|-----------|--------|------------|
| 1 | `GET` | `/api/v1/hr/leave-types` | HR | `hr.leave_types.view` |
| 2 | `GET` | `/api/v1/hr/leave-types/{id}` | HR | `hr.leave_types.view` |
| 3 | `POST` | `/api/v1/hr/leave-types` | HR | `hr.leave_types.create` |
| 4 | `PATCH` | `/api/v1/hr/leave-types/{id}` | HR | `hr.leave_types.edit` |
| 5 | `DELETE` | `/api/v1/hr/leave-types/{id}` | HR | `hr.leave_types.delete` |
| 6 | `GET` | `/api/v1/hr/holidays` | HR | `hr.holidays.view` |
| 7 | `GET` | `/api/v1/hr/holidays/{id}` | HR | `hr.holidays.view` |
| 8 | `POST` | `/api/v1/hr/holidays` | HR | `hr.holidays.create` |
| 9 | `PATCH` | `/api/v1/hr/holidays/{id}` | HR | `hr.holidays.edit` |
| 10 | `DELETE` | `/api/v1/hr/holidays/{id}` | HR | `hr.holidays.delete` |
| 11 | `GET` | `/api/v1/procurement/stats` | Procurement | `procurement.vendors.view` |
| 12 | `GET` | `/api/v1/communication/emails` | Communication | `communication.emails.view` |
| 13 | `POST` | `/api/v1/communication/emails` | Communication | `communication.emails.create` |
| 14 | `DELETE` | `/api/v1/communication/emails/{id}` | Communication | `communication.emails.delete` |
| 15 | `GET` | `/api/v1/communication/sms` | Communication | `communication.sms.view` |
| 16 | `POST` | `/api/v1/communication/sms` | Communication | `communication.sms.create` |
| 17 | `DELETE` | `/api/v1/communication/sms/{id}` | Communication | `communication.sms.delete` |
| 18 | `GET` | `/api/v1/settings/audit-log` | Settings | Super admin only |
| 19 | `GET` | `/api/v1/settings/roles` | Settings | Super admin only |
| 20 | `GET` | `/api/v1/settings/roles/{slug}` | Settings | Super admin only |
| 21 | `GET` | `/api/v1/settings/export` | Settings | Super admin only |
| 22 | `POST` | `/api/v1/settings/import` | Settings | Super admin only |
| 23 | `POST` | `/api/v1/settings/backup` | Settings | Super admin only |
| 24 | `GET` | `/api/v1/programs/beneficiaries` | Programs | `programs.beneficiaries.view` |
| 25 | `GET` | `/api/v1/programs/beneficiaries/{id}` | Programs | `programs.beneficiaries.view` |
| 26 | `POST` | `/api/v1/programs/beneficiaries` | Programs | `programs.beneficiaries.create` |
| 27 | `PATCH` | `/api/v1/programs/beneficiaries/{id}` | Programs | `programs.beneficiaries.edit` |
| 28 | `DELETE` | `/api/v1/programs/beneficiaries/{id}` | Programs | `programs.beneficiaries.delete` |
| 29 | `GET` | `/api/v1/programs/reports/summary` | Programs | `programs.beneficiaries.view` |
| 30 | `GET` | `/api/v1/programs/reports/export` | Programs | `programs.beneficiaries.view` |
| 31 | `GET` | `/api/v1/help/articles` | Help | Any authenticated user |
| 32 | `GET` | `/api/v1/help/articles/{id}` | Help | Any authenticated user |
| 33 | `POST` | `/api/v1/help/tickets` | Help | Any authenticated user (10/min) |

---

## Checklist: Frontend Files to Update

| File | What to Replace | API Section |
|------|----------------|-------------|
| `src/pages/hr/Settings.jsx` | `DEMO_LEAVE_TYPES` | Section 1 |
| `src/pages/hr/Settings.jsx` | `DEMO_HOLIDAYS` | Section 2 |
| `src/pages/procurement/BillOfQuantities.jsx` | Send new BOQ fields | Section 3 |
| `src/pages/procurement/CreateBillOfQuantities.jsx` | Send new BOQ fields | Section 3 |
| `src/pages/procurement/RequestForQuotation.jsx` | Send new RFQ fields | Section 4 |
| `src/pages/procurement/CreateRequestForQuotation.jsx` | Send new RFQ fields | Section 4 |
| `src/pages/procurement/GoodsReceivedNote.jsx` | Send `office` + `quality_status` | Section 5 |
| `src/pages/procurement/CreateGoodsReceivedNote.jsx` | Send `office` + `quality_status` | Section 5 |
| `src/pages/procurement/RequestForPayment.jsx` | Full rewrite with line items | Section 6 |
| `src/pages/procurement/CreateRequestForPayment.jsx` | Full rewrite with line items | Section 6 |
| `src/pages/procurement/Overview.jsx` | Replace demo stats | Section 7 |
| `src/pages/communication/SendEmail.jsx` | `demoEmails` | Section 8 |
| `src/pages/communication/SendSMS.jsx` | `demoSmsMessages` | Section 9 |
| `src/pages/procurement/Vendors.jsx` | Send new vendor fields | Section 10 |
| `src/pages/procurement/CreatePurchaseRequest.jsx` | Send new requisition fields | Section 11 |
| `src/pages/Settings.jsx` (Roles tab) | `DEMO_ROLES` | Section 12 |
| `src/pages/Settings.jsx` (Audit tab) | `DEMO_AUDIT` | Section 13 |
| `src/pages/Settings.jsx` (Data tab) | Wire export/import/backup buttons | Section 14 |
| `src/pages/programs/Beneficiaries.jsx` | Build full CRUD | Section 15 |
| `src/pages/programs/Reports.jsx` | Build reports dashboard | Section 16 |
| `src/pages/HelpCenter.jsx` | Build articles + ticket form | Section 17 |

---

## Notes for Frontend

1. **All new fields are nullable** — existing forms continue to work. Add the new fields to forms progressively if needed.

2. **Signoffs pattern is consistent** across BOQ, RFQ, GRN, RFP, and Requisitions. Build one reusable signoff component: `[{ type, name, position, date, signature }]`.

3. **RFP is the biggest change** — it now has line items. The `subtotal`, `tax_amount`, and `total_amount` are computed server-side. Do not send these fields; they will be ignored. Show them as read-only in the form.

4. **Permissions are already seeded.** The `/auth/permissions` endpoint returns the logged-in user's permission map. New permission keys: `hr.leave_types.*`, `hr.holidays.*`, `communication.emails.*`, `communication.sms.*`, `programs.beneficiaries.*`.

5. **`per_page=0`** on any list endpoint returns all records without pagination. Use this for dropdown population (e.g. loading all leave types for a select).

6. **SMS gateway** is configured on the backend. The frontend only needs to POST the message and audience; delivery is handled server-side.

7. **Email** uses the backend mail configuration. HTML content in the `body` field is supported.
