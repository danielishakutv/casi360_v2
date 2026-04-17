# CASI360 — What's in the App Right Now

**Version:** 1.0  
**Date:** April 2026  
**Prepared for:** Care Aid Support Initiative

---

## What Is CASI360?

CASI360 is an internal management system built for Care Aid Support Initiative. It brings together all the day-to-day tools the organization needs — staff records, procurement, projects, communications, and more — into one secure web-based platform that any authorised staff member can access from their browser.

---

## Table of Contents

1. [What Is Working Right Now](#1-what-is-working-right-now)
2. [What Needs to Be Done Before Full Launch](#2-what-needs-to-be-done-before-full-launch)
3. [What Is Coming Next](#3-what-is-coming-next)
4. [Purchase Requests Across All Departments](#4-purchase-requests-across-all-departments)
5. [The Finance & Approvals Module](#5-the-finance--approvals-module)
6. [Testing Before Launch](#6-testing-before-launch)
7. [User Roles — Who Can Do What](#7-user-roles--who-can-do-what)

---

## 1. What Is Working Right Now

The following sections of the app are fully built and ready to use.

---

### 1.1 Login & User Accounts

Staff can log in securely with their email and password. The system knows who they are, what department they belong to, and what they are allowed to see or do.

**What you can do:**
- Log in and log out securely
- Reset your password if you forget it
- Change your password the first time you log in
- View and update your own profile
- See your login history
- Admin staff can create, edit, and deactivate user accounts
- Admin staff can control what each person is allowed to access

---

### 1.2 Human Resources (HR)

A complete staff management section where all employee information is kept in one place.

**What you can do:**

**Staff Records**
- Add new staff members with their full details (name, contact, department, job title, etc.)
- Update staff records at any time
- Track whether someone is active, on leave, or no longer with the organisation
- Search and filter through the staff directory

**Departments**
- Create and manage all departments in the organisation
- Assign staff to their correct departments

**Job Titles (Designations)**
- Define all job roles in the organisation
- Assign job titles to staff members

**Internal Notes**
- Record internal notes on staff members (e.g. performance observations, incidents)
- Search through notes

**Leave & Holiday Setup**
- Define the types of leave available (e.g. Annual Leave, Sick Leave)
- Set how many days each leave type allows
- Add public holidays and company holidays to the system
- *Note: Staff will be able to apply for leave through the system in the next phase*

---

### 1.3 Procurement

Handles everything related to buying goods and services — from the first request all the way to payment.

**What you can do:**

**Suppliers (Vendors)**
- Add and manage supplier/vendor records
- Store supplier contact details, payment terms, and categories
- Mark suppliers as active, inactive, or blacklisted

**Supplier Categories**
- Group suppliers by type (e.g. Goods, Services, Works, Consultancy)

**Purchase Requests**
- Any department can raise a purchase request
- List what items are needed, how many, and estimated cost
- Attach it to a project or budget line
- Track the request from draft all the way to delivery

**Purchase Orders**
- Once a purchase request is approved, it becomes a purchase order
- Select the supplier, confirm pricing, and issue the order
- Track whether goods have been partially or fully received
- Record payments made against the order

**Inventory**
- Track stock of items held by the organisation
- See stock movement history
- Get alerts when stock is low

**Pending Approvals**
- A single screen showing all items currently waiting for someone's approval

**The following procurement documents are built and ready in the system — they are currently showing sample data and will be connected to live data soon:**
- **Bill of Quantities (BOQ)** — A breakdown of work or goods needed for a project, with quantities, unit costs, and totals, reviewed and signed off by relevant officers
- **Request for Quotation (RFQ)** — A formal request sent to multiple suppliers asking for their price on listed items
- **Goods Received Note (GRN)** — Records what was actually received from a supplier versus what was ordered, with quality checks and sign-off
- **Request for Payment (RFP)** — A formal request to release payment once goods have been received and verified

---

### 1.4 Projects

Manage all of the organisation's projects in one place.

**What you can do:**
- Create and manage projects with names, descriptions, timelines, and budgets
- Assign projects to specific departments
- Track project status: Draft, Active, On Hold, Completed, or Closed
- View a summary dashboard showing total projects, total budget, and activity by department
- Set up budget categories for consistent financial tracking across projects
- Generate project reports

---

### 1.5 Communications

Send notices and announcements to staff across the organisation.

**What you can do:**
- Write and publish notices to the whole organisation, specific departments, or specific roles
- Save notices as drafts before publishing
- Archive old notices
- View a dashboard showing recent notices and how many people were reached

**Coming soon in the next phase:**
- Sending emails directly from within the system
- Sending SMS messages to staff
- An internal messaging inbox

---

### 1.6 Reports

Generate and download reports from across the system.

**What you can do:**
- View a main dashboard with key numbers from across all departments (staff count, active projects, procurement activity, notices sent)
- Generate reports for staff, departments, projects, and procurement
- Filter reports by date range, department, or status
- Download reports in Excel or PDF format

---

### 1.7 Settings & Administration

Tools for the people who manage the system.

**What you can do:**

**User Management**
- Create new user accounts
- Edit existing accounts
- Reset passwords
- Activate or deactivate accounts
- Assign roles to users

**Permissions**
- Control exactly what each user or role can see and do in the system
- Update permissions in bulk

**Audit Log**
- A complete record of every significant action taken in the system — who did what, and when
- Useful for accountability and compliance

---

## 2. What Needs to Be Done Before Full Launch

The following improvements are recommended before the system is opened up to all staff. None of these are new features — they are quality and reliability improvements to what already exists.

---

### 2.1 Error Messages & Feedback

Currently, if something goes wrong (e.g. a form is submitted incorrectly), the system may not always tell the user clearly what the problem is. We need to:

- Show clear, friendly error messages when a form has missing or incorrect information
- Show a confirmation message when an action is completed successfully (e.g. "Record saved")
- Ask for confirmation before deleting anything ("Are you sure you want to delete this?")
- Show a spinner or loading indicator when the system is fetching or saving data

---

### 2.2 Speed & Reliability

- Ensure pages load quickly even when there is a lot of data
- Ensure list pages handle large numbers of records without slowing down

---

### 2.3 Security Checks

- Set a minimum password length and complexity requirement
- Automatically log users out after a period of inactivity
- Protect all pages so that users can only access what they are permitted to see

---

### 2.4 Testing

Before the system is opened to all staff, the following must be tested and confirmed:

- All login and password reset scenarios
- Creating, editing, and deleting records in each section
- The full procurement flow: Purchase Request → Purchase Order → Goods Received → Payment Request
- Approvals at each stage
- Generating and downloading reports
- Permission restrictions (confirming users cannot access what they should not)
- Testing on common web browsers (Chrome, Firefox, Safari, Edge)
- Testing on mobile phones and tablets

---

### 2.5 Organisation Settings

Currently the system does not have a screen to update basic organisation details (name, logo, address, etc.). This needs to be added so the system can be branded correctly for Care Aid.

---

## 3. What Is Coming Next

These features are planned for the next phase of development (expected Q3 2026):

**Human Resources**
- Staff leave request workflow — staff apply, manager approves
- Leave balances and leave history per staff member
- Attendance and timesheet tracking
- Payroll (salary calculation, payslips, deductions)

**Procurement**
- Activating the live data connection for BOQ, RFQ, GRN, and RFP screens
- Supplier performance ratings
- Contract management

**Finance & Approvals**
- *(Full details in Section 5)*

**Beneficiary Management**
- Register and manage programme beneficiaries
- Track service delivery to beneficiaries
- Beneficiary reporting

**Communications**
- Email sending (with templates)
- SMS messaging
- Delivery tracking

**General**
- Organisation profile settings (logo, address, contact info)
- Help Centre with guides and FAQs
- Support ticket submission within the app
- Backup and data export tools

---

## 4. Purchase Requests Across All Departments

Every department in the organisation will be able to raise purchase requests directly in the system. This replaces manual or paper-based processes and gives full visibility to procurement and finance staff.

---

### How It Works

Any staff member with the right permission can open the Procurement section and create a purchase request. They fill in:

- **What they need** — list of items, quantities, and estimated costs
- **Why they need it** — which project or budget it relates to
- **When they need it** — requested delivery date
- **Where to deliver** — delivery location

The request is then routed for approval before any purchasing can happen.

---

### Approval Flow

Once a request is submitted, it goes through the following stages:

1. **Submitted** — Request entered by a staff member
2. **Reviewed by Department Head** — The head of the requesting department checks and approves it
3. **Finance Check** — Finance confirms the budget is available
4. **Procurement Action** — Procurement team converts it into a Purchase Order and contacts the supplier
5. **Goods Received** — When items arrive, a Goods Received Note is completed
6. **Payment Request** — Finance processes payment to the supplier

---

### Approval Levels by Amount

| Request Value | Who Must Approve |
|---------------|-----------------|
| Small amounts | Department Head only |
| Medium amounts | Department Head + Finance Manager |
| Large amounts | Department Head + Finance Manager + Director |

---

### Each Department Gets

- Its own view of active and past purchase requests
- Notifications when a request has been approved or needs attention
- Budget utilisation summary — how much has been spent vs. what was allocated
- Reports showing spending history by category

---

### Departments That Will Use This

- Programs Department
- Operations Department
- Health & Medical Services
- Finance Department
- Administration
- Any other department that needs to procure goods or services

---

## 5. The Finance & Approvals Module

This is a new module planned for the next phase. It will bring full financial control and oversight into the system, linking procurement activity to actual budgets and payments.

---

### What It Will Do

**Budget Management**
- Set budgets for each department and each project
- See in real-time how much of the budget has been spent or committed
- Get alerts when spending is approaching the budget limit
- Reassign budget between departments or projects with proper authorisation

**Invoice Management**
- Record invoices received from suppliers
- Match each invoice to the original Purchase Order and Goods Received Note
- Flag inconsistencies (e.g. if an invoice amount does not match what was ordered or received)
- Track invoice status: Received → Being Reviewed → Approved → Paid

**Payment Authorisation**
- All payments go through a multi-level approval process before being released
- Larger payments require approval from more senior staff
- Clear record of who approved each payment and when

**Payment Tracking**
- Record how payments are made (bank transfer, cheque, etc.)
- Track whether a payment has been released and cleared
- Reconcile payments against invoices
- Full history of all payments made

**Financial Reports**
- Budget vs. actual spending by department or project
- Spending broken down by category
- Outstanding invoices and payments
- Cash position summary

---

### Who Uses the Finance Module

| Person | What They Do |
|--------|-------------|
| Finance Clerk | Receives invoices, records them, prepares payment requests |
| Finance Manager | Approves payments up to a set limit, runs reconciliations |
| Finance Director | Approves large payments, oversees budgets |
| Executive Director | Approves the largest payments, reviews financial reports |
| Department Head | Approves purchase requests from their department, views their budget usage |
| Procurement Officer | Raises purchase orders, receives goods, submits payment requests |

---

### Approval Rules

The system automatically routes approvals to the right people based on the amount and type of transaction. If an approver is unavailable, the system escalates to the next level. Every step is logged with a timestamp.

---

## 6. Testing Before Launch

Before the system is handed over to all staff, the following testing steps will take place:

---

### What Will Be Tested

**Basic Functionality**
- Every screen and button works as expected
- Forms accept correct data and reject incorrect data with clear messages
- Records can be created, viewed, edited, and deleted

**Full Workflow Testing**
- A complete procurement cycle will be run from start to finish: Purchase Request → Approval → Purchase Order → Goods Received → Payment
- Leave the request and approval workflows will be traced through the system

**Access Control**
- Confirm that each user only sees what they are supposed to see
- Confirm that actions outside a user's permission are blocked

**Performance**
- Confirm pages load quickly with real staff and project data loaded
- Test the system with multiple users logged in at the same time

**Devices & Browsers**
- Test on Chrome, Firefox, Safari, and Edge
- Test on a mobile phone and a tablet

---

### Launch Steps

1. Final testing sign-off by the development team
2. First users trained: System Administrator and Department Heads
3. Organisation settings configured (name, departments, staff accounts)
4. All staff accounts created and roles assigned
5. Department-by-department rollout with training
6. Full organisation live

---

### After Launch Support

For the first 30 days after launch, the development team will:
- Monitor the system daily for errors
- Fix any issues quickly
- Be available for support calls and questions
- Collect feedback to improve the system

---

## 7. User Roles — Who Can Do What

CASI360 uses a role-based access system. Each person is assigned a role that determines what they can see and do. Individual permissions can also be customised.

| Role | What They Can Access |
|------|---------------------|
| **System Administrator** | Everything — full control of the system, users, and settings |
| **Finance Manager** | Finance section, approvals, reports, budget management |
| **Procurement Officer** | Vendors, purchase requests, purchase orders, inventory, goods received |
| **Department Head** | Their department's staff, purchase requests, and budgets |
| **HR Manager** | All staff records, departments, leave settings, HR reports |
| **Project Manager** | Projects, budgets, project reports |
| **General Staff** | View their own dashboard, submit purchase requests, view notices |
| **Viewer** | Read-only access to dashboards and reports — cannot make changes |

Permissions can be fine-tuned per person by the System Administrator.

---

## Summary

| Section | Ready Now? |
|---------|-----------|
| Login & User Accounts | Yes |
| Human Resources | Yes |
| Procurement (core) | Yes |
| Procurement (BOQ, RFQ, GRN, RFP screens) | Built — connecting to live data soon |
| Projects | Yes |
| Communications (Notices) | Yes |
| Communications (Email & SMS) | Coming next phase |
| Reports & Downloads | Yes |
| Administration & Audit Log | Yes |
| Finance & Approvals Module | Coming next phase |
| Leave Request Workflow | Coming next phase |
| Beneficiary Management | Coming next phase |
| Help Centre | Coming next phase |

---

**Document Version:** 1.0  
**Date:** April 2026  
**Prepared by:** CASI360 Development Team
