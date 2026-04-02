# CASI360 System Documentation & Training Guide

> **Care Aid Support Initiative Management System**
> Complete training manual for administrators, managers, and staff.
> Last updated: April 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started](#2-getting-started)
3. [User Accounts & Roles](#3-user-accounts--roles)
4. [Authentication & Security](#4-authentication--security)
5. [Dashboard & Navigation](#5-dashboard--navigation)
6. [HR Module](#6-hr-module)
7. [Procurement Module](#7-procurement-module)
8. [Projects Module](#8-projects-module)
9. [Communication Module](#9-communication-module)
10. [Settings & Administration](#10-settings--administration)
11. [Workflows & Business Logic](#11-workflows--business-logic)
12. [Troubleshooting & FAQ](#12-troubleshooting--faq)
13. [Reports Module](#13-reports-module)

---

## 1. System Overview

### 1.1 What is CASI360?

CASI360 is an internal management platform built for the **Care Aid Support Initiative** (CASI), a non-governmental organization. It digitizes and centralizes the organization's key operational processes including:

- **Human Resources** -- Employee records, departments, designations, and HR notes
- **Procurement** -- Purchase orders, requisitions, vendor management, inventory tracking, multi-level approvals, and financial disbursements
- **Settings & Permissions** -- Role-based access control, system-wide configuration

The system is designed around three principles:

1. **Accountability** -- Every action is recorded in an audit log with who, what, when, and from where
2. **Approval-based workflow** -- Financial transactions go through configurable multi-level approval chains
3. **Role-based access** -- Users only see and do what their role and permissions allow

### 1.2 System Architecture (Non-Technical)

CASI360 has two parts:

| Component | What It Does | URL |
|-----------|-------------|-----|
| **Frontend** (what you see) | The web interface you interact with -- buttons, forms, tables, dashboards | `https://casi360.com` |
| **Backend** (behind the scenes) | Stores data, enforces rules, handles security, processes requests | `https://api.casi360.com` |

You interact with the **frontend**. The frontend talks to the backend on your behalf. All business rules (who can approve what, spending limits, etc.) are enforced by the backend -- they cannot be bypassed through the interface.

### 1.3 Key Concepts

| Concept | Meaning |
|---------|---------|
| **UUID** | Every record (employee, department, purchase order, etc.) has a unique ID that looks like `9c3f7a2d-1234-4abc-8def-567890abcdef`. You'll see these in URLs. |
| **Audit Log** | A permanent record of every action taken in the system -- who did it, what changed, when, and from what IP address. Cannot be edited or deleted. |
| **Soft Delete** | When you "delete" most items (employees, vendors, users), they are not actually removed. They are marked as inactive/terminated/cancelled. Data is preserved for audit purposes. |
| **Permission** | A specific capability, such as "view employees" or "create purchase orders". Permissions are assigned to roles, not individual users. |

---

## 2. Getting Started

### 2.1 Accessing the System

1. Open your web browser (Chrome, Firefox, Edge, or Safari recommended)
2. Navigate to **`https://casi360.com`**
3. You will see the login screen

### 2.2 First-Time Login

When an administrator creates your account, you receive:
- Your **email address** (your username)
- A **temporary password**

On your first login:

1. Enter your email and temporary password
2. The system will immediately redirect you to the **Change Password** screen
3. You **must** change your password before you can access anything else
4. Your new password must meet these requirements:
   - At least **8 characters** long
   - Contains **uppercase** and **lowercase** letters
   - Contains at least one **number**
   - Contains at least one **special character** (e.g., `@`, `#`, `$`, `!`)
   - Must not appear in known data breach databases
   - Must be **different** from your current password

> **Important:** Until you change your password, the only things you can do are: check your session, change your password, or log out. All other pages will be blocked.

### 2.3 Regular Login

1. Go to `https://casi360.com`
2. Enter your **email** and **password**
3. Optionally check "Remember me" to stay logged in longer
4. Click **Login**

**What can go wrong:**

| Problem | Cause | What to Do |
|---------|-------|------------|
| "Invalid credentials" | Wrong email or password | Double-check both fields. Passwords are case-sensitive. |
| "Too many login attempts" | You tried more than 5 times in one minute | Wait 5 minutes, then try again |
| "Account deactivated" | An admin has disabled your account | Contact your administrator |

### 2.4 Logging Out

Always log out when you're done, especially on shared computers. Click your profile icon and select **Logout**, or navigate to the logout option in the menu.

### 2.5 Forgot Password

If you forget your password:

1. On the login screen, click **"Forgot Password?"**
2. Enter your email address
3. Click **Send Reset Link**
4. Check your email for the reset link
5. Click the link and set a new password

> **Security note:** For security, the system always says "If an account exists with that email, a reset link has been sent" -- even if the email doesn't exist. This prevents anyone from discovering which emails are registered.

---

## 3. User Accounts & Roles

### 3.1 Understanding Roles

Every user in CASI360 has exactly one **role**. Your role determines what you can see and do. There are four roles:

#### Super Admin

- **Who:** System owners, IT administrators
- **Access:** Complete, unrestricted access to everything
- **Special powers:**
  - Bypasses ALL permission checks -- can always see and do everything
  - Can assign the `super_admin` role to other users
  - Can manage system settings and permissions
  - Can view and modify the permission matrix for other roles
  - Cannot be deleted or deactivated

#### Admin

- **Who:** Senior management, department heads
- **Access:** Administrative access governed by configurable permissions
- **Can do:**
  - Create new user accounts
  - Manage (edit/deactivate) existing users
  - Change user roles (except assigning `super_admin`)
  - Access HR and Procurement modules based on permissions
  - Approve procurement requests (if given approval permissions)

#### Manager

- **Who:** Team leads, unit managers, project coordinators
- **Access:** Department-level management governed by permissions
- **Can do:**
  - View team members and departmental data
  - Participate in approval workflows (e.g., Manager Review step)
  - Create procurement requests
  - Access modules based on assigned permissions

#### Staff

- **Who:** Regular employees
- **Access:** Basic, read-oriented access governed by permissions
- **Can do:**
  - View permitted data (e.g., employee directory if allowed)
  - Create and submit procurement requisitions (if permitted)
  - View own profile

### 3.2 Permissions Explained

Permissions are granular controls layered on top of roles. While your **role** determines your general access level, **permissions** control exactly which features within each module you can use.

**Permission format:** `module.feature.action`

For example:
- `hr.employees.view` -- Can view the employee list and details
- `hr.employees.create` -- Can add new employees
- `procurement.purchase_orders.edit` -- Can edit and submit purchase orders
- `procurement.approval.finance_check` -- Can act on the Finance Check approval step

**How permissions work:**

1. **Super Admin** -- ALL permissions are automatically `true`. No need to configure.
2. **Admin, Manager, Staff** -- Each permission is individually set to `true` or `false` by a Super Admin.
3. If you try to access a feature you don't have permission for, you'll see a **"Forbidden"** or **"Access Denied"** error.

**Checking your permissions:**

After logging in, the system loads your complete permission map. The navigation menu only shows items you have access to. If a menu item is missing, it means you don't have the required permission.

### 3.3 User Management (Admin Feature)

Administrators can manage user accounts through the User Management section.

#### Creating a New User

1. Navigate to **Users** (admin section)
2. Click **Create User**
3. Fill in the required information:
   - **Name** -- Full name of the user
   - **Email** -- Must be unique across the system
   - **Password** -- Must meet password requirements (the user will be forced to change it on first login)
   - **Role** -- Select `admin`, `manager`, or `staff` (only Super Admins can create other Super Admins)
   - **Department** -- Optional, text field for organizational reference
   - **Phone** -- Optional
4. Click **Save**

> All new accounts are created with `force_password_change: true`. The user must set their own password on first login.

#### Editing a User

1. Find the user in the user list (use search or filters)
2. Click on the user to view their profile
3. Click **Edit**
4. Modify fields as needed (name, email, phone, department, status)
5. Click **Save**

**Important restrictions:**
- You cannot change your own role
- You cannot change your own status
- You cannot delete yourself
- You cannot delete a Super Admin

#### Changing a User's Role

1. View the user's profile
2. Click **Change Role**
3. Select the new role
4. Confirm the change

> Only Super Admins can assign the `super_admin` role.

#### Deactivating / Reactivating a User

- **Deactivate:** Sets the user's status to `inactive`. They can no longer log in. Their data is preserved.
- **Reactivate:** Sets the status back to `active`. They can log in again.

This is a "soft" action -- no data is lost. Use this when an employee leaves or when you need to temporarily disable access.

---

## 4. Authentication & Security

### 4.1 Session Management

CASI360 uses **cookie-based session authentication**. This means:

- When you log in, a secure session cookie is set in your browser
- The session keeps you logged in as you navigate between pages
- If you close the browser without logging out, you may need to log in again (unless "remember me" was checked)
- Sessions expire after a period of inactivity

### 4.2 Security Features

| Feature | Description |
|---------|-------------|
| **Forced Password Change** | New users must change their password before accessing the system |
| **Password Strength Requirements** | Passwords must be complex and not found in breach databases |
| **Rate Limiting** | Login is limited to 5 attempts per minute; password reset to 3 per minute |
| **CSRF Protection** | All requests are protected against cross-site request forgery |
| **Security Headers** | The backend sends strict security headers to protect against XSS, clickjacking, etc. |
| **Audit Logging** | Every login (success and failure), logout, and data change is permanently recorded |
| **Login History** | IP address and browser info are recorded for each login attempt |
| **SQL Injection Protection** | All user inputs are parameterized. Search queries escape special characters. |

### 4.3 Audit Trail

Every action in the system is logged in the audit trail. For each event, the system records:

- **Who** performed the action (user ID and name)
- **What** was done (action type, e.g., "employee_created", "purchase_order_approved")
- **What entity** was affected (type and ID)
- **Old values** (for edits, the previous state)
- **New values** (for edits, the updated state)
- **When** it happened (timestamp)
- **From where** (IP address and browser information)

The audit trail cannot be modified or deleted. It is the permanent record of all system activity.

---

## 5. Dashboard & Navigation

### 5.1 Navigation Structure

After login, you'll see a navigation menu organized by module. Items only appear if you have the relevant permissions:

```
Dashboard
|
+-- HR
|   +-- Departments
|   +-- Designations
|   +-- Employees
|   +-- Notes
|
+-- Procurement
|   +-- Vendors
|   +-- Inventory
|   +-- Purchase Orders
|   +-- Requisitions
|   +-- Pending Approvals
|
+-- Settings (Super Admin only)
|   +-- Permissions
|   +-- System Settings
|
+-- Profile
    +-- View Profile
    +-- Change Password
    +-- Logout
```

### 5.2 Common Interface Patterns

Throughout the system, you'll encounter these patterns:

#### List Views (Tables)

Most list pages share the same features:

- **Search bar** -- Type to search across relevant fields (name, email, etc.)
- **Filters** -- Dropdown filters for status, department, etc.
- **Sorting** -- Click column headers to sort ascending/descending
- **Pagination** -- Navigate pages with previous/next buttons; choose items per page (up to 100)
- **Actions** -- View, edit, or delete buttons for each row

#### Detail Views

Clicking on an item opens its detail view showing all fields and related data (e.g., clicking a Purchase Order shows it with all line items, approval steps, and disbursements).

#### Forms

Forms for creating/editing records validate your input in real-time:

- Required fields are marked
- Invalid inputs show red error messages below the field
- The Save button may be disabled until all required fields are valid

---

## 6. HR Module

The HR module manages the organization's workforce data. It consists of four sub-modules: Departments, Designations, Employees, and Notes.

### 6.1 Departments

Departments represent the organizational structure of CASI. Every employee belongs to a department.

#### What is a Department?

A department record contains:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | The department name (must be unique) | "Engineering" |
| **Head** | Name of the department head | "Jane Doe" |
| **Description** | Brief description of the department | "Software engineering and IT" |
| **Color** | Hex color code used in charts/badges | `#6366F1` |
| **Status** | Active or inactive | "Active" |
| **Employee Count** | Number of employees (auto-calculated) | 15 |

#### Workflows

**Creating a Department:**
1. Navigate to **HR > Departments**
2. Click **Create Department**
3. Enter the department name (required, must be unique)
4. Add the head, description, and color as needed
5. Click **Save**

**Editing a Department:**
1. Find the department in the list
2. Click to open, then click **Edit**
3. Modify fields and save

**Deleting a Department:**
1. Click **Delete** on the department
2. Confirm the deletion

> **Rule:** A department cannot be deleted if it has **active employees** (employees with status `active` or `on_leave`). You must transfer or terminate those employees first.

**Filtering & Searching:**
- Filter by status (active/inactive)
- Search searches across name, head, and description
- Sort by name, head, status, or creation date
- Pass `per_page=0` to export all departments (no pagination)

---

### 6.2 Designations

Designations are job titles/positions within departments. They define roles like "Senior Developer", "Finance Officer", or "Program Coordinator".

#### What is a Designation?

| Field | Description | Example |
|-------|-------------|---------|
| **Title** | The job title | "Senior Developer" |
| **Department** | Which department this position belongs to | "Engineering" |
| **Level** | Seniority level | "senior" |
| **Description** | Role description | "Leads technical projects" |
| **Status** | Active or inactive | "Active" |
| **Employee Count** | Number of employees with this designation | 5 |

**Level Values:**

| Level | Meaning |
|-------|---------|
| `junior` | Entry-level position |
| `mid` | Mid-level position |
| `senior` | Senior position with significant experience |
| `lead` | Team or unit lead |
| `executive` | Executive/director level |

#### Workflows

**Creating a Designation:**
1. Navigate to **HR > Designations**
2. Click **Create Designation**
3. Enter the title (required)
4. Select the department (required)
5. Choose the level (required)
6. Add description if needed
7. Click **Save**

**Filtering:**
- Filter by department, level, or status
- Search across title, description, and department name

> **Rule:** A designation cannot be deleted if it has active employees. Transfer employees to a different designation first.

---

### 6.3 Employees

The employee database is the core of the HR module. It stores complete records for every staff member.

#### What is an Employee Record?

| Field | Description | Example |
|-------|-------------|---------|
| **Staff ID** | Auto-generated unique identifier | `CASI-1001` |
| **Name** | Full name | "Ada Obi" |
| **Email** | Work email (must be unique) | "ada.obi@casi360.com" |
| **Phone** | Contact number | "+234 800 123 4567" |
| **Department** | Assigned department | "Engineering" |
| **Designation** | Job title/position | "Senior Developer" |
| **Manager** | Reporting manager name | "Jane Doe" |
| **Gender** | male, female, or other | "female" |
| **Date of Birth** | Birthday | "1990-03-20" |
| **Join Date** | Employment start date (required) | "2023-06-15" |
| **Termination Date** | Employment end date (if terminated) | null |
| **Salary** | Current salary amount | 850,000.00 |
| **Status** | Employment status | "active" |
| **Address** | Residential address | "123 Lagos Street" |
| **Emergency Contact** | Emergency contact name and phone | "John Obi - +234 800 000 0001" |
| **Avatar** | Profile photo URL | null |

**Employee Status Values:**

| Status | Meaning |
|--------|---------|
| `active` | Currently employed and working |
| `on_leave` | On approved leave (still employed) |
| `terminated` | Employment has ended |

#### Workflows

**Creating an Employee:**
1. Navigate to **HR > Employees**
2. Click **Create Employee**
3. Fill in the required fields:
   - Name, email, department, designation, join date
4. Fill in optional fields as available:
   - Phone, gender, date of birth, salary, address, emergency contacts, manager
5. Click **Save**

> The **Staff ID** (e.g., `CASI-1001`) is auto-generated. You do not enter it.

**Editing an Employee:**
1. Find the employee (use search by name, email, or staff ID)
2. Click to view, then click **Edit**
3. Modify fields and save

> You can change department and designation to reflect transfers/promotions.

**Terminating an Employee:**

There are two ways:

1. **Delete button:** Click **Delete** on an employee. This sets their status to `terminated` and records today as the termination date. The record is preserved -- it is NOT permanently deleted.

2. **Change status:** Go to the employee's record and change their status to `terminated`. If no termination date is set, it will automatically be set to today.

> **Rule:** You cannot delete an already-terminated employee.

**Changing Employee Status:**

Authorized users (with the `hr.employees.manage_status` permission) can change status between:
- `active` -- Mark employee as working
- `on_leave` -- Mark employee as on leave
- `terminated` -- End employment

**Employee Statistics:**

The employee stats view provides a summary dashboard:
- **Total** employees
- **Active** count
- **On Leave** count
- **Terminated** count
- **By Department** breakdown showing count per department (excludes terminated)

**Searching & Filtering:**
- **Search** by name, email, staff ID, or phone
- **Filter** by status, department, designation, or gender
- **Sort** by name, email, staff ID, status, join date, salary, or creation date

---

### 6.4 Notes

Notes are attached to employees and serve as an internal record-keeping system for HR matters.

#### What is a Note?

| Field | Description | Example |
|-------|-------------|---------|
| **Employee** | Which employee this note is about | "Ada Obi" |
| **Title** | Summary of the note | "Q2 Performance Review" |
| **Content** | Detailed content (up to 10,000 characters) | Full review text |
| **Type** | Category of the note | "performance" |
| **Priority** | Importance level | "high" |
| **Created By** | Who wrote the note (auto-set) | "John Admin" |

**Note Types:**

| Type | Use Case |
|------|----------|
| `general` | General observations, reminders, miscellaneous |
| `performance` | Performance reviews, evaluations, goal tracking |
| `disciplinary` | Warnings, disciplinary actions, incident reports |
| `commendation` | Praise, awards, recognition |
| `medical` | Medical leave, health accommodations |
| `training` | Training completed, certifications, skill development |

**Priority Levels:**
- `low` -- Informational, no urgency
- `medium` -- Standard priority
- `high` -- Important, requires attention

#### Workflows

**Creating a Note:**
1. Navigate to **HR > Notes**
2. Click **Create Note**
3. Select the **employee** this note is about (required)
4. Enter a **title** (required) and **content** (required)
5. Choose the **type** and **priority**
6. Click **Save**

> The **Created By** field is automatically set to your name. You cannot change it.

**Viewing Notes:**
- Filter by employee to see all notes for one person
- Filter by type (e.g., show only disciplinary notes)
- Filter by priority
- Sort by title, type, priority, or date

> **Note:** Default pagination for notes is **15 per page** (different from the standard 25).

**Deleting a Note:**

Notes are **permanently deleted** (hard delete). Unlike employees or vendors, deleted notes cannot be recovered. Make sure you want to remove it before confirming.

---

## 7. Procurement Module

The Procurement module manages the entire purchasing lifecycle -- from identifying a need, through approval, to payment. It consists of six interconnected sub-modules.

### 7.1 Module Overview

The procurement flow follows this lifecycle:

```
NEED IDENTIFIED
      |
      v
REQUISITION (Request)
      |
      v
APPROVAL WORKFLOW
      |
      v
PURCHASE ORDER (Buying)
      |
      v
APPROVAL WORKFLOW
      |
      v
VENDOR DELIVER & RECEIVE
      |
      v
DISBURSEMENT (Payment)
```

The sub-modules are:

| Sub-Module | Purpose |
|------------|---------|
| **Vendors** | Manage supplier/vendor database |
| **Inventory** | Track stock items, quantities, and reorder levels |
| **Requisitions** | Request items or services that need to be procured |
| **Purchase Orders** | Formal orders sent to vendors |
| **Approvals** | Multi-level approval chain for POs and requisitions |
| **Disbursements** | Record payments made against approved purchase orders |

---

### 7.2 Vendors

Vendors are the suppliers and service providers CASI does business with.

#### What is a Vendor Record?

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Company/vendor name | "Acme Supplies Ltd" |
| **Contact Person** | Primary contact | "Bola Ade" |
| **Email** | Contact email | "bola@acme.com" |
| **Phone** | Contact phone | "+234 800 222 3333" |
| **Address** | Street address | "45 Industrial Avenue" |
| **City** | City | "Lagos" |
| **State** | State/province | "Lagos" |
| **Country** | Country | "Nigeria" |
| **Tax ID** | Tax identification number | "TIN-12345" |
| **Bank Name** | Vendor's bank | "GTBank" |
| **Bank Account** | Account number for payments | "0123456789" |
| **Notes** | Internal notes about vendor | "Preferred for office supplies" |
| **PO Count** | Number of purchase orders (auto-calculated) | 12 |
| **Status** | Active or inactive | "active" |

#### Workflows

**Adding a Vendor:**
1. Navigate to **Procurement > Vendors**
2. Click **Create Vendor**
3. Enter the vendor name (required)
4. Fill in contact details, address, and banking information
5. Click **Save**

**Editing a Vendor:**
1. Find the vendor in the list
2. Click to open, then **Edit**
3. Update fields and save

**Deactivating a Vendor:**
1. Click **Delete** on the vendor

> **Rule:** The vendor is set to `inactive` (soft delete). It is not permanently removed.
> **Rule:** A vendor cannot be deactivated if it has active purchase orders.

---

### 7.3 Inventory Items

The inventory module tracks items your organization procures and uses.

#### What is an Inventory Item?

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Item name | "A4 Paper (Ream)" |
| **SKU** | Stock Keeping Unit code (unique) | "PAPER-A4-001" |
| **Category** | Item category | "Office Supplies" |
| **Description** | Detailed description | "Standard A4 paper, 80gsm" |
| **Unit** | Unit of measure | "ream" |
| **Quantity in Stock** | Current stock level | 150 |
| **Reorder Level** | Minimum stock before reorder | 50 |
| **Unit Cost** | Cost per unit | 3,500.00 |
| **Location** | Where it's stored | "Store Room A" |
| **Status** | Active, inactive, or out of stock | "active" |

**Status Values:**

| Status | Meaning |
|--------|---------|
| `active` | Available for use/ordering |
| `inactive` | No longer tracked |
| `out_of_stock` | Currently unavailable |

#### Workflows

**Adding an Inventory Item:**
1. Navigate to **Procurement > Inventory**
2. Click **Create Item**
3. Enter the name (required)
4. Add SKU, category, unit, cost, stock levels, and location
5. Click **Save**

**Low Stock Monitoring:**
- Use the **Low Stock** filter to see items where `quantity_in_stock <= reorder_level`
- This helps identify items that need to be reordered

**Deactivating an Item:**
- Deleting an inventory item sets it to `inactive` (soft delete)

---

### 7.4 Requisitions

A requisition is a formal request to procure items or services. It's the starting point of the procurement process.

#### What is a Requisition?

| Field | Description | Example |
|-------|-------------|---------|
| **Requisition Number** | Auto-generated reference number | "REQ-202607-0001" |
| **Title** | Brief description of the request | "Quarterly Office Supplies" |
| **Department** | Requesting department | "Engineering" |
| **Requested By** | The employee making the request | "Ada Obi" |
| **Justification** | Why this procurement is needed | "Regular Q3 replenishment" |
| **Priority** | Urgency level | "medium" |
| **Needed By** | When the items are needed | "2026-08-01" |
| **Estimated Cost** | Total estimated cost (auto-calculated from items) | 250,000.00 |
| **Status** | Current stage in the workflow | "draft" |
| **Items** | Line items being requested | See below |

**Priority Levels:**

| Priority | Use When |
|----------|----------|
| `low` | Nice to have, no deadline pressure |
| `medium` | Standard procurement, normal timeline |
| `high` | Needed soon, should be prioritized |
| `urgent` | Critical need, requires immediate attention |

**Requisition Status Flow:**

```
  draft  ───>  submitted  ───>  pending_approval  ───>  approved  ───>  fulfilled
    ^              |                    |
    |              v                    v
    +────────  revision  <──────  (rejected)
                                        
    Any status ───>  cancelled
```

| Status | Meaning | Who Sets It |
|--------|---------|-------------|
| `draft` | Being created/edited, not yet submitted | Creator |
| `submitted` | Submitted for approval, under review | System (on submit) |
| `pending_approval` | Partially through approval chain | System (during approval) |
| `revision` | Rejected by an approver, sent back for changes | System (on rejection) |
| `approved` | All approval steps passed | System (on final approval) |
| `fulfilled` | Items have been procured (linked to a PO) | Manual |
| `cancelled` | Cancelled, no longer needed | Creator/Admin |

#### Requisition Items

Each requisition contains one or more **line items**:

| Field | Description | Example |
|-------|-------------|---------|
| **Description** | What is being requested | "A4 Paper - 80gsm" |
| **Inventory Item** | Link to inventory item (optional) | "A4 Paper (Ream)" |
| **Quantity** | How many | 50 |
| **Unit** | Unit of measure | "ream" |
| **Estimated Unit Cost** | Estimated price per unit | 3,500.00 |
| **Estimated Total Cost** | Auto-calculated: quantity x unit cost | 175,000.00 |

#### Workflows

**Creating a Requisition:**
1. Navigate to **Procurement > Requisitions**
2. Click **Create Requisition**
3. Select the **department** (required)
4. Select **requested by** employee (required)
5. Enter a **title** (required)
6. Add **justification** explaining why this procurement is needed
7. Set **priority** and **needed by** date
8. Add **line items**:
   - For each item, enter description, quantity, unit, and estimated unit cost
   - Optionally link to an inventory item
   - The total cost is calculated automatically
9. Click **Save** (creates in `draft` status)

> The **requisition number** (e.g., `REQ-202607-0001`) is auto-generated. Format: `REQ-YYYYMM-XXXX`

**Editing a Requisition:**
1. Open the requisition
2. Click **Edit**
3. Modify fields and items

> **Rule:** You can only edit a requisition when its status is `draft` or `revision`. Once submitted, it is locked.

**Managing Items During Edit:**
- **Update** an existing item by modifying its fields
- **Add** a new item by adding a row
- **Remove** an item by removing it from the list
- The estimated cost automatically recalculates

**Submitting for Approval:**
1. Open a `draft` or `revision` requisition
2. Review all details and items
3. Click **Submit for Approval**

**What happens when you submit:**
- Status changes to `submitted`
- The system records who submitted it and when
- **Approval steps are auto-generated** based on the estimated cost:
  - **Always:** Manager Review + Finance Check (2 steps)
  - **If cost > ₦500,000:** adds Operations Approval (3 steps)
  - **If cost > ₦1,000,000:** adds Executive Director Approval (4 steps)
- The requisition is now locked for editing

> **Rule:** You must have at least 1 item to submit. Empty requisitions cannot be submitted.

**Cancelling a Requisition:**
- Click **Delete** (sets status to `cancelled`)
- You cannot cancel a requisition that is already `approved` or `fulfilled`

---

### 7.5 Purchase Orders

A Purchase Order (PO) is the formal document authorizing a purchase from a vendor. It follows the same approval workflow as requisitions.

#### What is a Purchase Order?

| Field | Description | Example |
|-------|-------------|---------|
| **PO Number** | Auto-generated reference | "PO-202607-0001" |
| **Vendor** | Supplier for this order | "Acme Supplies Ltd" |
| **Department** | Requesting department | "Engineering" |
| **Requested By** | Employee who initiated the request | "Ada Obi" |
| **Order Date** | Date of the order | "2026-07-01" |
| **Expected Delivery** | When items should arrive | "2026-07-15" |
| **Actual Delivery** | When items actually arrived | null |
| **Subtotal** | Sum of all item totals | 500,000.00 |
| **Tax Amount** | Tax on the order | 37,500.00 |
| **Discount Amount** | Any discount applied | 0.00 |
| **Total Amount** | Final total (subtotal + tax - discount) | 537,500.00 |
| **Currency** | Currency (default: NGN) | "NGN" |
| **Status** | Current stage | "approved" |
| **Payment Status** | Payment progress | "unpaid" |

**PO Status Flow:**

```
  draft  ───>  submitted  ───>  pending_approval  ───>  approved  ───>  ordered
    ^              |                    |                               |
    |              v                    v                               v
    +────────  revision  <──────  (rejected)               partially_received
                                                                       |
                                                                       v
    Any early status ───> cancelled                               received
                                                                       |
                                                                       v
                                                                   disbursed
```

| Status | Meaning |
|--------|---------|
| `draft` | Being created/edited |
| `submitted` | Submitted for approval |
| `pending_approval` | Partially through approval chain |
| `revision` | Rejected, sent back for changes |
| `approved` | All approvals passed, ready to order |
| `ordered` | Order placed with vendor |
| `partially_received` | Some items received |
| `received` | All items received |
| `disbursed` | Fully paid |
| `cancelled` | Cancelled |

**Payment Status Values:**

| Status | Meaning |
|--------|---------|
| `unpaid` | No payments made |
| `partially_paid` | Some payments recorded (disbursements) |
| `paid` | Fully paid |

#### PO Line Items

| Field | Description | Example |
|-------|-------------|---------|
| **Description** | What is being ordered | "A4 Paper - 80gsm" |
| **Inventory Item** | Link to inventory (optional) | "A4 Paper (Ream)" |
| **Quantity** | Quantity ordered | 100 |
| **Received Quantity** | Quantity received so far | 0 |
| **Unit** | Unit of measure | "ream" |
| **Unit Price** | Price per unit | 3,500.00 |
| **Total Price** | Auto-calculated: quantity x unit price | 350,000.00 |

#### Workflows

**Creating a Purchase Order:**
1. Navigate to **Procurement > Purchase Orders**
2. Click **Create Purchase Order**
3. Select a **vendor** (required)
4. Select the **department** (required)
5. Select **requested by** employee (required)
6. Enter the **order date** (required)
7. Set **expected delivery date** if known
8. Add **line items**:
   - For each item, enter description, quantity, unit, and unit price
   - Optionally link to inventory items
   - Totals calculate automatically
9. Enter **tax amount** and **discount amount** if applicable
10. Click **Save** (creates in `draft` status)

> The **PO number** (e.g., `PO-202607-0001`) is auto-generated.
> **Subtotal** and **total amount** are auto-calculated from items.

**Editing a Purchase Order:**

> **Rule:** You can only edit when status is `draft` or `revision`.

1. Open the PO
2. Click **Edit**
3. Modify header fields and/or items
4. Save

**Item management on update:**
- Existing items: include their `id` in the request to update them
- New items: add them without an `id`
- Removing items: simply don't include them -- they are deleted

**Submitting for Approval:**
1. Open a `draft` or `revision` PO
2. Review all details
3. Click **Submit for Approval**

Same approval logic as requisitions:
- Manager Review + Finance Check always
- Operations Approval if total > ₦500,000 (configurable)
- Executive Director Approval if total > ₦1,000,000 (configurable)

> **Rule:** Must have at least 1 item.

**Cancelling a Purchase Order:**
- Click **Delete** (sets status to `cancelled`)
- Not allowed if status is `received`, `partially_received`, or `disbursed`

**Filtering & Searching:**
- Filter by status, payment status, vendor, department, or date range
- Search by PO number, vendor name, or notes
- Sort by PO number, order date, total amount, status, payment status, or creation date

---

### 7.6 The Approval Workflow

This is the core business logic of the procurement module. Both Purchase Orders and Requisitions go through the same configurable multi-level approval chain.

#### How Approval Works

**Step 1 -- Document is submitted:**
When a PO or requisition is submitted, the system generates approval steps based on the amount:

| Condition | Steps Generated |
|-----------|----------------|
| Any amount | 1. Manager Review + 2. Finance Check |
| Amount > ₦500,000 | Above + 3. Operations Approval |
| Amount > ₦1,000,000 | Above + 4. Executive Director Approval |

> The thresholds (₦500K and ₦1M) are configurable in System Settings.

**Step 2 -- Sequential approval:**
Steps must be completed **in order**. The Finance Check cannot proceed until the Manager Review is done. The approval chain is linear, not parallel.

```
Manager Review  ───>  Finance Check  ───>  Operations Approval  ───>  ED Approval
  (Step 1)              (Step 2)              (Step 3)                (Step 4)
```

**Step 3 -- Each step is acted on by an authorized user:**
Each step requires a user with the specific permission for that step type:

| Step | Required Permission |
|------|-------------------|
| Manager Review | `procurement.approval.manager_review` |
| Finance Check | `procurement.approval.finance_check` |
| Operations Approval | `procurement.approval.operations_approval` |
| Executive Director Approval | `procurement.approval.executive_approval` |

> **Super Admins** can act on any approval step regardless of permissions.

**Step 4 -- Approve or Reject:**

**If Approved:**
- The current step is marked `approved` with the approver's name and timestamp
- If there are more steps, the document moves to `pending_approval`
- If it was the last step, the document is marked `approved`

**If Rejected:**
- The current step is marked `rejected` with required comments explaining why
- All remaining steps are marked `skipped` (they don't need to be acted on)
- The document status changes to `revision`
- The original submitter can now edit the document and re-submit it
- When re-submitted, **new approval steps are generated** and the process starts over

#### Approval Step States

| State | Meaning |
|-------|---------|
| `pending` | Waiting for an authorized user to act |
| `approved` | Approved by a reviewer |
| `rejected` | Rejected by a reviewer |
| `skipped` | Skipped because an earlier step was rejected |

#### Self-Approval Rules

The system has built-in protections against conflicts of interest:

- **By default**, users **cannot approve documents they submitted**
- This is controlled by the `procurement.approval.block_self_approval` system setting (default: `true`)
- There is a special permission `procurement.approval.self_approve` that, when granted, allows a user to approve their own submissions IF the system setting also allows it
- Both conditions must be met: the system setting must be `false` AND the user must have the `self_approve` permission

#### Viewing Approval Status

For any PO or requisition, you can view its approval status which shows:
- Each step in the chain
- The current status of each step (pending, approved, rejected, skipped)
- Who acted on each step and when
- Any comments left by approvers/rejectors

#### Pending Approvals View

The **Pending Approvals** page shows you all documents waiting for YOUR approval action. It only shows POs and requisitions where:
1. There is a pending step
2. The pending step's type matches one of your approval permissions

This is your "to-do list" for approvals.

#### Approval Workflow Example

Here's a complete example:

1. **Ada** (Staff) creates a Purchase Order for ₦750,000 worth of office equipment
2. Ada clicks **Submit for Approval**
3. System generates 3 steps:
   - Step 1: Manager Review (because it's always required)
   - Step 2: Finance Check (because it's always required)
   - Step 3: Operations Approval (because ₦750K > ₦500K threshold)
4. **John** (Manager with `manager_review` permission) sees the PO in his Pending Approvals
5. John reviews and clicks **Approve** -- Step 1 is now `approved`
6. **Fatima** (Finance officer with `finance_check` permission) now sees it in her Pending Approvals
7. Fatima reviews and clicks **Approve** -- Step 2 is now `approved`
8. **Daniel** (Operations head with `operations_approval` permission) now sees it
9. Daniel reviews but finds a problem. He clicks **Reject** and writes: "Budget allocation insufficient for this quarter. Please reduce to essential items only."
10. Step 3 is marked `rejected`. Status goes to `revision`.
11. **Ada** can now edit the PO, reduce quantities, and re-submit
12. The process starts over with new approval steps

---

### 7.7 Disbursements

Disbursements record payments made against approved Purchase Orders. They track how much has been paid, through what method, and ensure payments don't exceed the PO total.

#### What is a Disbursement?

| Field | Description | Example |
|-------|-------------|---------|
| **Purchase Order** | Which PO this payment is for | "PO-202607-0001" |
| **Amount** | Payment amount | 250,000.00 |
| **Payment Method** | How the payment was made | "bank_transfer" |
| **Payment Reference** | Transaction reference | "TRF-2026-001" |
| **Payment Date** | When payment was made | "2026-07-10" |
| **Notes** | Additional notes | "First installment" |
| **Disbursed By** | Who recorded this (auto-set) | "Finance Admin" |

**Payment Methods:**

| Method | Description |
|--------|-------------|
| `bank_transfer` | Wire/bank transfer |
| `cheque` | Physical cheque |
| `cash` | Cash payment |
| `mobile_money` | Mobile money transfer (e.g., OPay, PalmPay) |

#### Workflows

**Recording a Disbursement:**
1. Open an **approved** or **disbursed** Purchase Order
2. Navigate to the **Disbursements** tab/section
3. Click **Record Payment**
4. Enter:
   - **Amount** (required, min 0.01)
   - **Payment method** (required)
   - **Payment date** (required)
   - **Payment reference** (optional, e.g., transfer ref number)
   - **Notes** (optional)
5. Click **Save**

**Rules and automatic updates:**
- You can only record disbursements for POs with status `approved` or `disbursed`
- The amount **cannot exceed the remaining balance**
- The balance is calculated as: `total_amount - sum(all disbursements)`
- After recording:
  - If total disbursed **equals** total amount: payment status changes to `paid`, PO status changes to `disbursed`
  - If total disbursed **is less than** total amount: payment status changes to `partially_paid`

**Viewing Disbursements:**

The disbursement list for a PO shows:
- Each individual payment with method, reference, date, and amount
- **Total Amount** -- The PO total
- **Total Disbursed** -- Sum of all payments
- **Balance** -- Remaining amount to pay

#### Disbursement Example

PO-202607-0001 has a total of **₦537,500.00**:

| Payment # | Amount | Method | Reference | Running Balance |
|-----------|--------|--------|-----------|-----------------|
| 1 | ₦250,000.00 | bank_transfer | TRF-001 | ₦287,500.00 |
| 2 | ₦200,000.00 | cheque | CHQ-045 | ₦87,500.00 |
| 3 | ₦87,500.00 | bank_transfer | TRF-002 | ₦0.00 |

After payment #3, the PO is marked as `paid` and `disbursed`.

---

## 8. Projects Module

The Projects module tracks all organizational projects with their budgets, donors, partners, team members, activities, and notes. It is designed for NGO project management where detailed budget tracking and donor reporting are essential.

### 8.1 Module Overview

A project in CASI360 contains:

- **Basic Info** -- Name, code (auto-generated), description, objectives, department, project manager, dates, location
- **Donors** -- Organizations or individuals funding the project, with contribution amounts
- **Partners** -- Implementing, technical, funding, or logistics partners
- **Team Members** -- Employees assigned to the project with roles
- **Activities / Milestones** -- Trackable work items with status and completion percentage
- **Budget Lines** -- Detailed cost breakdown by category (e.g., Personnel, Travel, Equipment)
- **Notes** -- Free-form records, observations, or links to external documents

### 8.2 Budget Categories

Budget categories are system-wide groupings managed by Super Admin. They organize budget lines across all projects into standard categories like Personnel, Travel, Equipment, etc.

#### Managing Budget Categories

Navigate to **Projects > Budget Categories** in the sidebar.

**To create a category:**
1. Click **Add Category**
2. Enter the category name (must be unique) and optional description
3. Set a sort order to control display position
4. Click **Save**

**To edit or delete:**
- Click the category row to edit name, description, sort order, or status
- A category can only be deleted if no budget lines use it
- Set status to `inactive` to hide it from selection without deleting

#### Default Categories

The system comes with 10 pre-loaded categories:

| Category | Description |
|----------|-------------|
| Personnel | Staff salaries, allowances and benefits |
| Travel & Transport | Travel costs, vehicle hire, fuel |
| Equipment & Furniture | Computers, printers, office furniture |
| Supplies & Materials | Office supplies, field materials |
| Contractual Services | Consultants, outsourced services |
| Training & Capacity Building | Workshops, seminars, training materials |
| Monitoring & Evaluation | Surveys, data collection, evaluators |
| Communication & Visibility | Media, publications, branding |
| Other Direct Costs | Insurance, utilities, rent |
| Indirect / Administrative | Overhead, management fees |

### 8.3 Creating a Project

1. Navigate to **Projects** in the sidebar
2. Click **New Project**
3. Fill in the required fields:

| Field | Required | Notes |
|-------|----------|-------|
| Name | Yes | Descriptive project name |
| Department | Yes | Select from existing departments |
| Project Manager | No | Select from employees |
| Description | No | Detailed project description |
| Objectives | No | Project goals |
| Start Date | No | When the project begins |
| End Date | No | Must be after start date |
| Location | No | Where the project operates |
| Currency | No | Defaults to NGN |
| Status | No | Defaults to Draft |

4. Click **Save** -- the system auto-generates a project code (e.g., `PRJ-202604-0001`)

### 8.4 Project Statuses

| Status | Meaning | When to Use |
|--------|---------|-------------|
| Draft | Being set up | Initial creation, still adding details |
| Active | Currently running | Project has started |
| On Hold | Temporarily paused | Funding delay, external issue |
| Completed | All work finished | All activities done |
| Closed | Archived | Fully closed, used for "delete" action |

### 8.5 Managing Donors

Each project can have multiple donors tracking who funds the project and how much.

1. Open a project and go to the **Donors** tab
2. Click **Add Donor**
3. Enter donor details:

| Field | Notes |
|-------|-------|
| Name | Donor organization or individual name |
| Type | Individual, Organization, Government, or Multilateral |
| Email / Phone | Contact information |
| Contribution Amount | How much this donor contributes |
| Notes | Additional context |

The system automatically totals all donor contributions for the project.

### 8.6 Managing Partners

Partners are organizations working alongside yours on the project.

1. Open a project and go to the **Partners** tab
2. Click **Add Partner**
3. Select the partner role:

| Role | Meaning |
|------|---------|
| Implementing | Carries out project activities |
| Technical | Provides technical expertise |
| Funding | Co-finances the project |
| Logistics | Handles supply chain / logistics |

### 8.7 Managing Team Members

Assign employees from your organization to specific projects.

1. Open a project and go to the **Team** tab
2. Click **Add Member**
3. Select an employee (each employee can only be assigned once per project)
4. Assign a role (e.g., Coordinator, Field Officer, M&E Officer)
5. Optionally set start/end dates for their involvement

### 8.8 Activities & Milestones

Activities track the work items and milestones within a project.

1. Open a project and go to the **Activities** tab
2. Click **Add Activity**
3. Fill in:

| Field | Notes |
|-------|-------|
| Title | Activity name (e.g., "Community Mobilization") |
| Description | What this activity involves |
| Start / End Date | When the activity runs |
| Target Date | Deadline |
| Status | Not Started, In Progress, Completed, Delayed, Cancelled |
| Completion % | 0--100 progress indicator |
| Sort Order | Display position |

The activity summary shows counts by status and overall progress percentage.

### 8.9 Budget Lines

Budget lines break the project budget into individual costed items, grouped by budget category.

1. Open a project and go to the **Budget** tab
2. Click **Add Budget Line**
3. Fill in:

| Field | Notes |
|-------|-------|
| Budget Category | Select from system categories (e.g., Personnel) |
| Description | Specific item (e.g., "Project Coordinator Salary") |
| Unit | Unit of measurement (e.g., month, piece, trip) |
| Quantity | How many units |
| Unit Cost | Cost per unit |

The system automatically calculates:
- **Line Total** = Quantity x Unit Cost
- **Project Total Budget** = sum of all budget lines

The budget tab shows lines grouped by category with subtotals.

### 8.10 Project Notes

Project notes let any authorized user record observations, link to external documents, or add context to a project for record-keeping.

1. Open a project and go to the **Notes** tab
2. Click **Add Note**
3. Fill in:

| Field | Required | Notes |
|-------|----------|-------|
| Title | Yes | Brief summary (e.g., "Site Visit Report") |
| Content | No | Detailed text of the note |
| Link URL | No | External link (e.g., Google Docs, SharePoint) |
| Link Label | No | Display text for the link |

Notes are sorted newest first. Each note shows who created it and when.

**Permissions:**
- All roles can view project notes if they have project view access
- Staff and above can create notes (add observations)
- Only managers and admins can edit notes
- Only admins can delete notes

---

## 9. Communication Module

The Communication module provides three tools for internal communication: **Direct Messages**, **Forums**, and **Notices**.

### 9.1 Direct Messages

Send private messages to any user with full thread/reply support.

#### Sending a New Message

1. Navigate to **Communication > Messages**
2. Click **New Message**
3. Select a recipient from the user dropdown
4. Enter a subject line
5. Type your message body (plain text with formatting: bullets, numbering, and clickable links)
6. Click **Send**

#### Replying to a Message

1. Open a message thread from your inbox
2. Type your reply in the reply box at the bottom
3. Click **Send**

Replies are grouped into threads. When you open a thread, all unread messages are automatically marked as read.

#### Inbox & Sent Box

- **Inbox** shows messages received, sorted newest-first
- **Sent** shows messages you sent
- Use the search bar to find messages by subject or body text
- Filter by **Unread** to see only unread threads
- The unread badge count updates in real-time

#### Deleting Messages

When you delete a message, it is only removed from **your** view. The other party still sees it.

### 9.2 Forums

Forums provide group discussion spaces for the organisation.

#### Forum Types

| Type | Access | Description |
|------|--------|-------------|
| **General** | All users | Organisation-wide discussion board (auto-created) |
| **Department** | Department members only | One forum per department (auto-created when department is created) |

- Super Admins can see and post in **all** forums
- Regular users see the General forum plus their own department forum

#### Browsing Forums

1. Navigate to **Communication > Forums**
2. See a list of accessible forums with message counts and last activity
3. Click a forum to view messages

#### Posting in a Forum

1. Open a forum
2. Type your message in the text box
3. Click **Post**

#### Replying to a Forum Message

1. Click **Reply** on any message
2. Type your reply
3. Click **Post**

Replies are threaded under the parent message.

#### Forum Administration (Admin Only)

- **Create Forum** — Admins can create additional forums (general or department-linked)
- **Edit Forum** — Change name, description, or status
- **Archive Forum** — Sets the forum to read-only (the General forum cannot be archived)

### 9.3 Notices

Notices are official announcements from administrators to staff. They support audience targeting and read tracking.

#### Viewing Notices

1. Navigate to **Communication > Notices**
2. See a list of notices targeted to you, with pinned notices at the top
3. Click a notice to read it — this automatically marks it as read

#### Notice Priority Levels

| Priority | Meaning |
|----------|---------|
| Normal | Standard informational notice |
| Important | Highlighted — shown with emphasis |
| Critical | Urgent alert — shown prominently |

#### Creating a Notice (Admin/Manager)

1. Navigate to **Communication > Notices**
2. Click **Create Notice**
3. Fill in:
   - **Title** — Notice headline
   - **Body** — Full text (supports formatting: bullets, numbering, clickable links)
   - **Priority** — Normal, Important, or Critical
   - **Status** — Draft (save for later) or Published (visible immediately)
   - **Publish Date** — Optional scheduled date
   - **Expiry Date** — Optional auto-hide date
   - **Pinned** — Whether to pin at the top of the notices list
4. Set the **Audience**:
   - **All Users** — Everyone sees it
   - **Department** — Only members of selected department(s)
   - **Role** — Only users with selected role(s)
5. Click **Save**

#### Read Tracking (Admin)

Admins can view who has read each notice:

1. Open a notice
2. Click **View Reads** (or similar)
3. See a list of users who read it, with timestamps
4. See the overall read percentage (e.g., "35 of 50 users — 70%")

#### Notice Lifecycle

```
DRAFT → PUBLISHED → ARCHIVED
```

- **Draft** notices are only visible to the author and admins
- **Published** notices are visible to their targeted audience
- **Archived** notices are hidden from active views

### 9.4 Communication Permissions

| Permission | Staff | Manager | Admin |
|------------|-------|---------|-------|
| View messages | Yes | Yes | Yes |
| Send messages | Yes | Yes | Yes |
| Delete own messages | Yes | Yes | Yes |
| View forums | Yes | Yes | Yes |
| Post in forums | Yes | Yes | Yes |
| Manage forums (create/edit/archive) | No | No | Yes |
| View notices | Yes | Yes | Yes |
| Create notices | No | Yes | Yes |
| Edit notices | No | Yes | Yes |
| Delete notices | No | No | Yes |

---

## 10. Settings & Administration

Settings are available only to Super Admins.

### 10.1 Permission Management

The permission management interface lets Super Admins control exactly what each role can do.

#### Understanding the Permission Matrix

The permission matrix is a table where:
- **Rows** are permissions (e.g., "View Employees", "Create Purchase Orders")
- **Columns** are roles (`admin`, `manager`, `staff`)
- **Cells** are toggles (true/false)

> `super_admin` does not appear in the matrix because it always has all permissions.

#### Updating a Permission

**Single update:**
1. Navigate to **Settings > Permissions**
2. Find the permission in the matrix
3. Click the toggle for the desired role
4. The change takes effect immediately

**Bulk update:**
1. Modify multiple toggles
2. Click **Save All** to apply all changes at once

#### Permission Categories

| Category | Permissions | What They Control |
|----------|-----------|-------------------|
| **HR - Departments** | view, create, edit, delete | Department CRUD operations |
| **HR - Designations** | view, create, edit, delete | Designation CRUD operations |
| **HR - Employees** | view, create, edit, delete, manage_status | Employee management |
| **HR - Notes** | view, create, edit, delete | Employee notes |
| **Procurement - Vendors** | view, create, edit, delete | Vendor management |
| **Procurement - Inventory** | view, create, edit, delete | Inventory management |
| **Procurement - Purchase Orders** | view, create, edit, delete | PO management |
| **Procurement - Requisitions** | view, create, edit, delete | Requisition management |
| **Procurement - Approvals** | manager_review, finance_check, operations_approval, executive_approval, self_approve | Approval workflow |
| **Procurement - Disbursements** | view, create | Payment recording |
| **Communication - Messages** | view, create, delete | Direct messaging |
| **Communication - Forums** | view, create, manage | Forum discussions |
| **Communication - Notices** | view, create, edit, delete | Organisational notices |

### 10.2 System Settings

System settings control global configuration values used across the application.

#### Available Settings

**Organization Settings:**

| Setting | Type | Description |
|---------|------|-------------|
| Organization Name | string | Organization display name |
| Logo URL | string | URL to organization logo |
| Website | string | Organization website |

**Theme Settings:**

| Setting | Type | Description |
|---------|------|-------------|
| Primary Color | string | Primary theme color (hex) |
| Secondary Color | string | Secondary theme color (hex) |

**Procurement Settings:**

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `procurement.approval.operations_threshold` | integer | 500,000 | Amount above which Operations Approval is required |
| `procurement.approval.executive_threshold` | integer | 1,000,000 | Amount above which Executive Director Approval is required |
| `procurement.approval.block_self_approval` | boolean | true | Whether to block users from approving their own submissions |

#### Updating Settings

**Single setting:**
1. Navigate to **Settings > System Settings**
2. Find the setting by group
3. Click **Edit**
4. Enter the new value
5. Click **Save**

**Bulk update:**
1. Modify multiple settings
2. Click **Save All**

> **Important:** Changing procurement thresholds affects **future** submissions only. Already-submitted documents keep their existing approval steps.

#### Public vs Private Settings

Some settings are marked as **public** (e.g., organization name, theme colors). These are loaded by the frontend without requiring login -- they're used for the login page branding and theme. Private settings (like procurement thresholds) are only visible to Super Admins.

---

## 11. Workflows & Business Logic

### 11.1 Complete Procurement Workflow

Here is the end-to-end procurement process:

```
1. IDENTIFY NEED
   Staff member identifies a procurement need
   
       |
       v

2. CREATE REQUISITION
   Create a requisition with items, quantities, and cost estimates
   Status: DRAFT
   
       |
       v

3. SUBMIT REQUISITION
   Submit the requisition for approval
   Status: SUBMITTED --> PENDING APPROVAL
   Approval steps auto-generated based on estimated cost
   
       |
       v

4. APPROVAL CHAIN (Requisition)
   Each level reviews and approves/rejects
   
       |                          |
       v                          v
   APPROVED                    REJECTED
                               Status: REVISION
                               Go back to step 2 (edit and re-submit)
       |
       v

5. CREATE PURCHASE ORDER
   Create a PO linked to the approved requisition
   Select vendor, confirm items and prices
   Status: DRAFT
   
       |
       v

6. SUBMIT PO
   Submit for approval
   Status: SUBMITTED --> PENDING APPROVAL
   
       |
       v

7. APPROVAL CHAIN (PO)
   Same multi-level approval as requisitions
   
       |                          |
       v                          v
   APPROVED                    REJECTED
                               Status: REVISION
                               Go back to step 5
       |
       v

8. ORDER FROM VENDOR
   Place the order with the vendor
   Status: ORDERED
   
       |
       v

9. RECEIVE GOODS
   Record receipt of items
   Status: PARTIALLY RECEIVED --> RECEIVED
   
       |
       v

10. RECORD DISBURSEMENTS
    Record payments to vendor
    Payment Status: UNPAID --> PARTIALLY PAID --> PAID
    Status: DISBURSED (when fully paid)
    
       |
       v

11. COMPLETE
    Procurement cycle complete
```

### 11.2 User Lifecycle

```
1. Admin creates account
   Status: ACTIVE, force_password_change: TRUE
   
       |
       v

2. User logs in for first time
   Redirected to Change Password screen
   Must set new password before accessing anything
   
       |
       v

3. User changes password
   force_password_change: FALSE
   Full access granted based on role/permissions
   
       |
       v

4. Normal usage
   Access features based on role and permissions
   All actions logged in audit trail
   
       |
       v

5. (Optional) Admin deactivates account
   Status: INACTIVE
   User can no longer log in
   All data preserved
   
       |
       v

6. (Optional) Admin reactivates account
   Status: ACTIVE
   Access restored
```

### 11.3 Document Number Generation

All reference numbers are auto-generated and cannot be manually set:

| Document | Format | Example |
|----------|--------|---------|
| Staff ID | `CASI-{number}` | CASI-1001 |
| PO Number | `PO-{YYYYMM}-{sequence}` | PO-202607-0001 |
| Requisition Number | `REQ-{YYYYMM}-{sequence}` | REQ-202607-0001 |

Numbers are sequential within each month and automatically reset.

### 11.4 Automatic Calculations

The system performs several automatic calculations:

| What | How |
|------|-----|
| PO Item Total | `quantity x unit_price` |
| PO Subtotal | Sum of all item totals |
| PO Total Amount | `subtotal + tax_amount - discount_amount` |
| Requisition Item Total | `quantity x estimated_unit_cost` |
| Requisition Estimated Cost | Sum of all item totals |
| Department Employee Count | Count of employees in department |
| Designation Employee Count | Count of employees with designation |
| Vendor PO Count | Count of purchase orders for vendor |
| Disbursement Balance | `PO total_amount - sum(all disbursements)` |

### 11.5 Soft Delete Behavior

Most "delete" operations in CASI360 do not permanently remove data:

| Entity | Delete Behavior |
|--------|----------------|
| **Users** | Status set to `inactive` |
| **Employees** | Status set to `terminated`, termination_date set to today |
| **Departments** | Permanently deleted (if no active employees) |
| **Designations** | Permanently deleted (if no active employees) |
| **Vendors** | Status set to `inactive` |
| **Inventory Items** | Status set to `inactive` |
| **Purchase Orders** | Status set to `cancelled` |
| **Requisitions** | Status set to `cancelled` |
| **Notes** | **Permanently deleted** (hard delete) |

---

## 12. Troubleshooting & FAQ

### 10.1 Login Issues

**Q: I can't log in. What should I do?**

1. Make sure your email and password are correct (passwords are case-sensitive)
2. If you see "Too many login attempts", wait 5 minutes and try again
3. If you see "Account deactivated", contact your administrator
4. If you forgot your password, use the "Forgot Password" link
5. Try clearing your browser cookies and cache

**Q: I changed my password but still can't access anything.**

Make sure you're using your NEW password. If you were forced to change your password, the old one no longer works.

### 10.2 Permission Issues

**Q: I can't see a menu item that others can see.**

Your role or permissions don't include access to that feature. Ask your Super Admin to grant you the necessary permission.

**Q: I get "Forbidden" or "Access Denied" when trying to do something.**

You don't have the required permission for that action. Check with your Super Admin.

**Q: I'm an admin but I can't manage permissions.**

Only **Super Admins** can manage the permission matrix and system settings. Admin role users cannot modify permissions.

### 10.3 Procurement Issues

**Q: I can't edit my purchase order / requisition.**

You can only edit documents in `draft` or `revision` status. Once submitted, they are locked. If it was rejected, it will be in `revision` status and you can edit again.

**Q: I submitted a PO but no one can approve it.**

Check that:
1. Users with the correct approval permissions exist (e.g., someone has `procurement.approval.manager_review`)
2. The approver knows to check the **Pending Approvals** page
3. Steps must be completed in order (Finance can't approve until Manager has)

**Q: I can't approve a document even though I have the right permission.**

Possible reasons:
1. It's not your turn -- a previous step hasn't been completed yet
2. You submitted the document and self-approval is blocked
3. The document has already been approved or rejected

**Q: The approval added too many/too few steps.**

Approval steps are based on the amount at the time of submission and the configured thresholds. Check with your Super Admin if the thresholds need adjustment. Changes to thresholds only affect future submissions.

**Q: I can't record a disbursement.**

Requirements:
1. The PO must be in `approved` or `disbursed` status (must have passed all approval steps)
2. The disbursement amount cannot exceed the remaining balance
3. You need the `procurement.disbursements.create` permission

**Q: I accidentally rejected a PO. Can I undo it?**

No. Rejections cannot be undone. However, the submitter can edit the document (it's now in `revision` status) and re-submit it for a fresh round of approvals.

### 10.4 HR Issues

**Q: I can't delete a department.**

You cannot delete a department that has active or on-leave employees. Transfer or terminate those employees first.

**Q: I deleted an employee but their data is gone.**

Employee "deletion" sets their status to `terminated`. They still appear in the employee list when you filter for terminated employees. If you need to find them, remove the status filter or filter by "terminated".

**Q: Where did my note go?**

Unlike most other items, notes are **permanently deleted**. If someone deleted a note, it cannot be recovered.

### 10.5 Session Issues

**Q: I keep getting logged out.**

- Your session may have expired due to inactivity
- Your browser might be blocking cookies (check browser settings)
- Try clearing your browser's cookies for `casi360.com` and `api.casi360.com`, then log in again

**Q: I see a "419" error.**

This means your security token expired. The system should automatically refresh it. If it persists, refresh the page and try again.

### 10.6 General

**Q: Can I export data?**

For list views, you can pass `per_page=0` (on supported endpoints like Departments and Designations) to retrieve all records at once, which can then be exported through the frontend.

**Q: Who can see what I do in the system?**

Super Admins can review the audit log which records all actions with timestamps and user IDs. All login attempts (successful and failed) are also logged.

**Q: Is my data safe?**

Yes. The system uses:
- Encrypted connections (HTTPS)
- Secure password hashing (bcrypt)
- CSRF protection on all requests
- SQL injection prevention
- Security headers against XSS and clickjacking
- Complete audit trail
- Soft deletes preserving data integrity

---

## 13. Reports Module

The Reports module lets you view, filter, and download data from any part of the system. All reports can be exported as CSV, Excel, or PDF files.

### 13.1 How to Use Reports

1. Navigate to **Reports** from the main menu
2. Select a report category (HR, Procurement, Projects, Communication, Finance, or Audit)
3. Choose the specific report you want to generate
4. Apply filters (date range, department, status, etc.) to narrow down the data
5. Preview the data in the table view
6. Click **Download** and choose your format: CSV, Excel, or PDF

### 13.2 Available Reports

#### HR Reports
- **Employee Directory** -- Full employee list with department, designation, contact info, and status. Filter by department, designation, status, gender, or hire date range.
- **Department Summary** -- All departments with employee counts and status.
- **Designation Summary** -- All designations with employee counts, departments, and levels.

#### Procurement Reports
- **Purchase Orders** -- All POs with vendor, department, amounts, and payment status. Filter by status, vendor, department, or date range.
- **Requisitions** -- All requisitions with priority, status, and estimated costs.
- **Vendor Summary** -- Vendor directory with total POs and total value.
- **Inventory** -- Current stock levels, reorder points, and unit costs.
- **Disbursements** -- Payment records with PO references, amounts, and payment methods.

#### Project Reports
- **Projects Summary** -- All projects with key metrics (department, manager, dates, budget).
- **Project Detail** -- Complete single-project download including donors, partners, team members, activities, budget lines, and notes. This report is download-only (no preview).
- **Budget Utilization** -- Budget line breakdown by project showing budgeted amounts.
- **Activity Progress** -- Activity list with completion percentages and status.

#### Communication Reports
- **Notices** -- Published notices with read counts, priority, and dates.
- **Forum Activity** -- Forum participation with message counts and active users.

#### Finance Reports
- **Financial Overview** -- Cross-module financial summary showing spending by department, total purchase order values, disbursement totals, and outstanding balances.

#### Audit Reports (Admin Only)
- **System Audit Log** -- Complete record of all system actions (who did what, when). Filter by user, action type, or date range.
- **Login History** -- All user login/logout events with IP addresses and success/failure status.

### 13.3 Roles & Access

| Report | Admin | Manager | Staff |
|--------|:-----:|:-------:|:-----:|
| HR Reports | Yes | Yes | Yes |
| Procurement Reports | Yes | Yes | Yes |
| Project Reports | Yes | Yes | Yes |
| Communication Reports | Yes | Yes | Yes |
| Finance Reports | Yes | Yes | Yes |
| Audit Reports | Yes | No | No |

### 13.4 Tips

- **Date filters** apply to different fields depending on the report (hire date for employees, order date for POs, etc.)
- **All downloads are logged** in the audit trail for accountability
- **CSV files** open directly in Excel with proper formatting
- **PDF reports** include a header with the report title, generation date, and active filters
- **Large reports** may take a moment to generate -- be patient with the download

---

## Appendix A: Keyboard Shortcuts & Tips

- **Search** is available on every list page -- use it to quickly find records
- **Sorting** -- click column headers to toggle between ascending and descending
- **Filters** combine with search -- e.g., filter by "active" status + search by name
- **Bulk actions** are available in some views (like permission management)

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **CASI** | Care Aid Support Initiative |
| **PO** | Purchase Order |
| **REQ** | Requisition |
| **NGN** | Nigerian Naira (currency) |
| **UUID** | Universally Unique Identifier -- a long alphanumeric ID for each record |
| **CRUD** | Create, Read, Update, Delete -- the four basic database operations |
| **CSRF** | Cross-Site Request Forgery -- a security attack the system protects against |
| **Sanctum** | Laravel's authentication system used for secure login sessions |
| **Soft Delete** | Marking a record as inactive/terminated instead of permanently removing it |
| **Hard Delete** | Permanently removing a record from the database |
| **Audit Log** | Permanent record of all system actions |
| **Approval Chain** | The sequence of approvers a document must pass through |
| **Threshold** | A configurable amount that determines how many approval steps are required |
| **Disbursement** | A payment recorded against a purchase order |

## Appendix C: Role-Permission Quick Reference

| Action | Super Admin | Admin | Manager | Staff |
|--------|:-----------:|:-----:|:-------:|:-----:|
| Create users | Yes | Yes | No | No |
| Manage user roles | Yes | Yes | No | No |
| Manage permissions | Yes | No | No | No |
| Manage system settings | Yes | No | No | No |
| View HR data | Yes | * | * | * |
| Create HR records | Yes | * | * | * |
| Edit HR records | Yes | * | * | * |
| Delete HR records | Yes | * | * | * |
| View procurement data | Yes | * | * | * |
| Create POs/Requisitions | Yes | * | * | * |
| Approve procurement | Yes | * | * | * |
| Record disbursements | Yes | * | * | * |
| View projects | Yes | * | * | * |
| Create/edit projects | Yes | * | * | * |
| Manage budget categories | Yes | * | No | No |
| Add project notes | Yes | * | * | * |
| View reports | Yes | * | * | * |
| Download reports | Yes | * | * | * |
| View audit reports | Yes | * | No | No |

\* = Depends on assigned permissions. Configurable by Super Admin.
