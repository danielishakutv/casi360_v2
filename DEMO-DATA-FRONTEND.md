# Finance Module — Demo Data Frontend Handoff

Date: 2026-04-18
Purpose: Define the frontend structure, data model, workflow expectations, and backend requirements for the new Finance module.
Status: Frontend currently runs on structured demo data only.

---

## 1. Finance Module Scope

The Finance module currently has 3 frontend sections:

1. Overview
2. Budget
3. Approvals

These are already available in the app navigation.

The frontend is intentionally using demo data for now so:

1. product structure can be finalized quickly
2. finance workflows can be reviewed by stakeholders
3. backend developers can build against a stable target model

---

## 2. Frontend Goal

The Finance module is intended to let finance staff:

1. view all project budget lines in one place
2. monitor allocated, committed, spent, pending, and available balances
3. review budget exposure before approving procurement items
4. see which budget lines are healthy, low, critical, or overdrawn
5. process finance approvals as part of the procurement cycle

---

## 3. Current Frontend Data Model

### A. Budget Line Object

The frontend is built around a line-level finance record, not just project totals.

```json
{
  "id": "fin-line-001",
  "project_id": "proj-001",
  "project_name": "Community Health Outreach 2026",
  "project_code": "CHO-2026-001",
  "department": "Programs",
  "fiscal_year": "2026",
  "category": "Training & Capacity Building",
  "line_name": "Community Volunteer Training",
  "line_code": "CHO-TRN-001",
  "allocated_amount": 2500000,
  "committed_amount": 620000,
  "actual_spent_amount": 830000,
  "pending_request_amount": 200000,
  "available_amount": 850000,
  "utilization_percent": 66,
  "status": "healthy",
  "last_activity_at": "2026-04-15T10:00:00Z"
}
```

### Meaning of fields

1. `allocated_amount`: full approved budget for that budget line
2. `committed_amount`: approved procurement value not yet fully paid
3. `actual_spent_amount`: fully paid or posted expense amount
4. `pending_request_amount`: submitted requests still awaiting final finance decision
5. `available_amount`: remaining usable balance after pending, committed, and actual impact
6. `utilization_percent`: usage ratio for quick visual monitoring
7. `status`: one of `healthy`, `low`, `critical`, `overdrawn`

---

### B. Approval Queue Object

```json
{
  "id": "fin-appr-001",
  "reference": "PR-2026-041",
  "title": "Community volunteer training logistics",
  "request_type": "purchase_request",
  "project_name": "Community Health Outreach 2026",
  "project_code": "CHO-2026-001",
  "budget_line_id": "fin-line-001",
  "budget_line_name": "Community Volunteer Training",
  "requester": "Maryam Ibrahim",
  "department": "Programs",
  "amount_requested": 200000,
  "available_before": 1050000,
  "available_after": 850000,
  "line_manager_status": "approved",
  "finance_status": "pending",
  "procurement_status": "waiting",
  "current_stage": "Finance Approval",
  "status": "pending",
  "priority": "medium",
  "submitted_at": "2026-04-15T08:30:00Z",
  "due_date": "2026-04-19"
}
```

### Meaning of fields

1. `budget_line_id`: must point to the real finance/project budget line
2. `available_before`: budget available before this approval
3. `available_after`: budget available if approved
4. `line_manager_status`, `finance_status`, `procurement_status`: explicit stage tracking
5. `current_stage`: display string for queue status
6. `status`: high-level outcome, one of `pending`, `approved`, `rejected`

---

## 4. Current Frontend Screens

### A. Finance Overview

The frontend overview shows:

1. total allocated budget
2. total committed amount
3. total actual spent
4. flagged budget lines count
5. high-level finance control snapshot
6. approval pipeline summary
7. flagged budget lines table
8. recent finance actions table

### B. Finance Budget

The frontend budget screen is the key finance working page.

It shows each budget line with:

1. project name
2. department
3. category
4. budget line name and code
5. allocated amount
6. committed amount
7. actual spent amount
8. pending request amount
9. available amount
10. utilization percent
11. status

It supports filters for:

1. search
2. project
3. department
4. category
5. status

### C. Finance Approvals

The frontend approvals screen shows:

1. approval reference
2. request type
3. project name
4. budget line name
5. requester and department
6. requested amount
7. available before approval
8. available after approval
9. current workflow stage
10. status
11. submitted date

It supports filters for:

1. search
2. status
3. priority

---

## 5. Business Workflow Expected by Frontend

The frontend is designed around this procurement-finance cycle:

1. Purchase Request created
2. Line Manager approval
3. Finance approval
4. Procurement processing
5. Vendor engagement and fulfillment
6. Payment release / actual expense posting

### Important rule

The frontend structure assumes finance review happens before procurement proceeds.

The finance team should be able to inspect:

1. requested amount
2. exact budget line
3. available balance before approval
4. resulting balance after approval

---

## 6. Recommended Backend Behavior

### A. Use real budget line IDs

Procurement items must reference real budget lines, not plain text labels.

Required linkage:

1. `project_id`
2. `budget_line_id`

Avoid relying only on:

1. `project_code`
2. `budget_line` as a free-text or enum string

### B. Keep line-level balances in backend

The backend should calculate and return these values for each budget line:

1. `allocated_amount`
2. `committed_amount`
3. `actual_spent_amount`
4. `pending_request_amount`
5. `available_amount`
6. `utilization_percent`
7. `status`

These should not be left to frontend calculations in production.

### C. Approval impact rules

Recommended finance logic:

1. PR submitted: increases `pending_request_amount`
2. Line Manager approval: still pending finance decision
3. Finance approval: move amount from pending to committed
4. Procurement completion / PO issuance: commitment remains active
5. Payment/disbursement: reduce committed, increase actual spent
6. Rejection/cancellation: reverse pending or committed impact as appropriate

This gives finance meaningful visibility before cash is actually released.

---

## 7. Required Backend Endpoints

Suggested initial API surface:

### Finance overview and budget monitoring

1. `GET /finance/overview`
2. `GET /finance/budgets`
3. `GET /finance/budgets/{budgetLineId}`
4. `GET /finance/budgets/projects/{projectId}`

### Finance approvals

1. `GET /finance/approvals`
2. `GET /finance/approvals/{id}`
3. `POST /finance/approvals/{id}/approve`
4. `POST /finance/approvals/{id}/reject`

### Optional movement ledger for strong auditability

1. `GET /finance/budget-movements`
2. `GET /finance/budgets/{budgetLineId}/movements`

---

## 8. Suggested Response Shapes

### A. GET /finance/budgets

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "budget_lines": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "project_name": "Community Health Outreach 2026",
        "project_code": "CHO-2026-001",
        "department": "Programs",
        "fiscal_year": "2026",
        "category": "Training & Capacity Building",
        "line_name": "Community Volunteer Training",
        "line_code": "CHO-TRN-001",
        "allocated_amount": 2500000,
        "committed_amount": 620000,
        "actual_spent_amount": 830000,
        "pending_request_amount": 200000,
        "available_amount": 850000,
        "utilization_percent": 66,
        "status": "healthy",
        "last_activity_at": "2026-04-15T10:00:00Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 1,
      "per_page": 25,
      "total": 8,
      "from": 1,
      "to": 8
    }
  }
}
```

### B. GET /finance/approvals

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "approvals": [
      {
        "id": "uuid",
        "reference": "PR-2026-041",
        "title": "Community volunteer training logistics",
        "request_type": "purchase_request",
        "project_name": "Community Health Outreach 2026",
        "project_code": "CHO-2026-001",
        "budget_line_id": "uuid",
        "budget_line_name": "Community Volunteer Training",
        "requester": "Maryam Ibrahim",
        "department": "Programs",
        "amount_requested": 200000,
        "available_before": 1050000,
        "available_after": 850000,
        "line_manager_status": "approved",
        "finance_status": "pending",
        "procurement_status": "waiting",
        "current_stage": "Finance Approval",
        "status": "pending",
        "priority": "medium",
        "submitted_at": "2026-04-15T08:30:00Z",
        "due_date": "2026-04-19"
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 1,
      "per_page": 25,
      "total": 7,
      "from": 1,
      "to": 7
    }
  }
}
```

---

## 9. Frontend-Backend Integration Rules

1. The frontend should stop using demo data once these endpoints are available.
2. The backend should return already-computed balance fields.
3. Budget line status should be backend-driven.
4. Approval actions should be auditable and role-checked in backend.
5. Every approval item must include budget impact before and after finance action.

---

## 10. Current Demo Source in Frontend

Current frontend demo source:

1. `src/data/financeDemo.js`

Current finance pages:

1. `src/pages/finance/Overview.jsx`
2. `src/pages/finance/Budget.jsx`
3. `src/pages/finance/Approvals.jsx`

These files are now the reference implementation for expected data shape and UI behavior.

---

## 11. Next Backend Priority

The highest-value backend task is:

1. return real finance budget-line data with calculated balances
2. return real finance approval queue items linked to budget lines
3. enforce budget impact at finance approval stage

That is the minimum backend needed to replace the current demo structure safely.
