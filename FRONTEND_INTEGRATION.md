# CASI360 Frontend Integration Guide

> **Complete API reference for frontend developers integrating with the CASI360 Laravel backend.**

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Authentication](#2-authentication)
3. [API Conventions](#3-api-conventions)
4. [Auth Module](#4-auth-module)
5. [HR Module](#5-hr-module)
6. [Procurement Module](#6-procurement-module)
7. [Projects Module](#7-projects-module)
8. [Communication Module](#8-communication-module)
9. [Settings Module](#9-settings-module)
10. [Permissions Reference](#10-permissions-reference)
11. [Error Handling](#11-error-handling)
12. [Enum & Status Values](#12-enum--status-values)
13. [Reports Module](#13-reports-module)

---

## 1. Getting Started

### Base Configuration

| Property | Value |
|----------|-------|
| **API Base URL** | `https://api.casi360.com/api/v1` |
| **Frontend URL** | `https://casi360.com` |
| **Authentication** | Sanctum cookie-based SPA auth (NOT token-based) |
| **Content-Type** | `application/json` |
| **Primary Keys** | UUID v4 on all tables |

### Required Request Headers

```
Content-Type: application/json
Accept: application/json
X-Requested-With: XMLHttpRequest
X-XSRF-TOKEN: <from cookie>
```

### CORS Configuration

The backend is configured for cookie-based cross-origin requests:

- **Allowed Origins:** `https://casi360.com`, `https://www.casi360.com`
- **Credentials:** `supports_credentials: true` — you **must** include credentials in every request
- **Allowed Methods:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`

### Axios Setup Example

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.casi360.com/api/v1',
  withCredentials: true,        // REQUIRED for cookie auth
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Interceptor: auto-attach XSRF token from cookie
api.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];
  if (token) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
  }
  return config;
});

export default api;
```

### Fetch API Setup Example

```javascript
const API_BASE = 'https://api.casi360.com/api/v1';

async function apiRequest(endpoint, options = {}) {
  const xsrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',       // REQUIRED for cookie auth
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(xsrfToken && { 'X-XSRF-TOKEN': decodeURIComponent(xsrfToken) }),
      ...options.headers,
    },
    ...options,
  });

  return response.json();
}
```

---

## 2. Authentication

### Authentication Flow

CASI360 uses **Laravel Sanctum cookie-based SPA authentication**. The flow is:

```
1. GET  /sanctum/csrf-cookie          → Sets XSRF-TOKEN cookie
2. POST /api/v1/auth/login            → Authenticates & sets session cookie
3. All subsequent requests             → Include cookies automatically
4. POST /api/v1/auth/logout           → Destroys session
```

**Step 1 is MANDATORY before login.** The CSRF cookie endpoint is outside `/api/v1`:

```javascript
// MUST call before login
await fetch('https://api.casi360.com/sanctum/csrf-cookie', {
  credentials: 'include',
});
```

### Forced Password Change

When `force_password_change` is `true` in the user object, the user is **blocked from all routes** except:

- `GET /auth/session`
- `POST /auth/logout`
- `POST /auth/change-password`

Redirect users to a change-password screen when this flag is `true`.

### Roles

| Role | Access Level |
|------|-------------|
| `super_admin` | Full access to everything; bypasses all permission checks |
| `admin` | Administrative access; subject to permission checks |
| `manager` | Department/team management; subject to permission checks |
| `staff` | Basic access; subject to permission checks |

---

## 3. API Conventions

### Response Envelope

**Every response** follows this structure:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

Error responses add an `errors` field:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password field is required."]
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created (store endpoints) |
| `401` | Not authenticated (redirect to login) |
| `403` | Forbidden (insufficient role/permissions) |
| `404` | Resource not found |
| `422` | Validation error (check `errors` object) |
| `429` | Rate limited (retry after delay) |
| `500` | Server error |

### Pagination

Paginated endpoints return a `meta` object:

```json
{
  "data": {
    "items": [...],
    "meta": {
      "current_page": 1,
      "last_page": 5,
      "per_page": 25,
      "total": 125
    }
  }
}
```

**Common Query Parameters for list endpoints:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number |
| `per_page` | integer | `25` | Items per page (max: 100) |
| `search` | string | — | Full-text search across relevant fields |
| `sort_by` | string | varies | Sort column (endpoint-specific) |
| `sort_dir` | string | `asc` | Sort direction: `asc` or `desc` |

### Rate Limits

| Action | Limit |
|--------|-------|
| Login | 5 requests/minute |
| Registration | 3 requests/minute |
| Password Reset | 3 requests/minute |
| Write Operations (POST, PATCH, DELETE) | 60 requests/minute |

When rate-limited, the response is `429 Too Many Requests`.

---

## 4. Auth Module

### 4.1 Login

```
POST /auth/login
```

**Rate Limit:** 5/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `email` | string | Yes | Valid email, max 255 |
| `password` | string | Yes | Min 1 character |
| `remember` | boolean | No | Enable remember-me |

**Example Request:**

```json
{
  "email": "admin@casi360.com",
  "password": "SecureP@ss123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "9c3f7a2d-1234-4abc-8def-567890abcdef",
      "name": "John Admin",
      "email": "admin@casi360.com",
      "role": "admin",
      "department": "IT",
      "phone": "+234 800 000 0000",
      "avatar": null,
      "status": "active",
      "email_verified_at": "2024-01-15T10:00:00.000000Z",
      "last_login_at": "2024-06-20T14:30:00.000000Z",
      "force_password_change": false,
      "is_super_admin": false,
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  }
}
```

**Error Responses:**

- `422` — Invalid credentials
- `422` — Rate limited (too many attempts, 300s lockout)
- `403` — Account deactivated

---

### 4.2 Logout

```
POST /auth/logout
```

**Auth Required:** Yes

**Request Body:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

### 4.3 Session Check

```
GET /auth/session
```

**Auth Required:** Yes (accessible even during forced password change)

Use this on app load to restore the authenticated user from the session cookie.

**Success Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "authenticated": true,
    "user": {
      "id": "9c3f7a2d-1234-4abc-8def-567890abcdef",
      "name": "John Admin",
      "email": "admin@casi360.com",
      "role": "admin",
      "department": "IT",
      "phone": "+234 800 000 0000",
      "avatar": null,
      "status": "active",
      "is_super_admin": false,
      "force_password_change": false
    }
  }
}
```

If not authenticated, returns `401`.

---

### 4.4 Change Password

```
POST /auth/change-password
```

**Auth Required:** Yes (accessible during forced password change)

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `current_password` | string | Yes | Must match current password |
| `new_password` | string | Yes | Min 8 chars, mixed case, numbers, symbols, not compromised |
| `new_password_confirmation` | string | Yes | Must match `new_password` |

**Password Requirements:**
- Minimum length: 8 (configurable via `PASSWORD_MIN_LENGTH` env)
- Must contain uppercase and lowercase letters
- Must contain at least one number
- Must contain at least one symbol
- Must not appear in known breach databases
- Must be different from current password

**Example Request:**

```json
{
  "current_password": "OldP@ss123",
  "new_password": "NewSecure#456",
  "new_password_confirmation": "NewSecure#456"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

---

### 4.5 Forgot Password

```
POST /auth/forgot-password
```

**Rate Limit:** 3/minute  
**Auth Required:** No

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `email` | string | Yes | Valid email, max 255 |

**Example Request:**

```json
{
  "email": "user@casi360.com"
}
```

**Response (200):** Always returns success to prevent email enumeration:

```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent.",
  "data": null
}
```

---

### 4.6 Reset Password

```
POST /auth/reset-password
```

**Rate Limit:** 3/minute  
**Auth Required:** No

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `token` | string | Yes | From reset email link |
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Same rules as change password |
| `password_confirmation` | string | Yes | Must match `password` |

**Example Request:**

```json
{
  "token": "abc123def456...",
  "email": "user@casi360.com",
  "password": "NewSecure#789",
  "password_confirmation": "NewSecure#789"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in.",
  "data": null
}
```

---

### 4.7 Profile — View

```
GET /auth/profile
```

**Auth Required:** Yes

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "user": {
      "id": "9c3f7a2d-1234-4abc-8def-567890abcdef",
      "name": "John Admin",
      "email": "admin@casi360.com",
      "role": "admin",
      "department": "IT",
      "phone": "+234 800 000 0000",
      "avatar": null,
      "status": "active",
      "is_super_admin": false,
      "force_password_change": false
    }
  }
}
```

---

### 4.8 Profile — Update

```
PATCH /auth/profile
```

**Auth Required:** Yes

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | No | Max 255 |
| `phone` | string | No | Max 20 |
| `department` | string | No | Max 255 |

**Example Request:**

```json
{
  "name": "John Updated",
  "phone": "+234 800 111 2222"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": { ... }
  }
}
```

---

### 4.9 Account — Deactivate

```
DELETE /auth/account
```

**Auth Required:** Yes

Deactivates (soft-deletes) the current user's account. Super admins cannot self-deactivate.

**Success Response (200):**

```json
{
  "success": true,
  "message": "Account deactivated successfully",
  "data": null
}
```

**Error:** `403` if user is super_admin.

---

### 4.10 Register User (Admin Only)

```
POST /auth/register
```

**Rate Limit:** 3/minute  
**Auth Required:** Yes (super_admin or admin only)

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255 |
| `email` | string | Yes | Valid email, unique |
| `password` | string | Yes | Same password rules as change-password |
| `role` | string | No | `super_admin`, `admin`, `manager`, `staff` (default: `staff`) |
| `department` | string | No | Max 255 |
| `phone` | string | No | Max 20 |

**Example Request:**

```json
{
  "name": "New Staff",
  "email": "newstaff@casi360.com",
  "password": "Secure@Pass1",
  "role": "staff",
  "department": "Operations"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "name": "New Staff",
      "email": "newstaff@casi360.com",
      "role": "staff",
      "status": "active",
      "phone": null,
      "department": "Operations",
      "force_password_change": true,
      "is_super_admin": false
    }
  }
}
```

> New users always have `force_password_change: true`.

---

### 4.11 User Management (Admin Only)

All user management endpoints require `super_admin` or `admin` role.

#### List Users

```
GET /auth/users
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `role` | string | Filter by role |
| `status` | string | Filter by status (`active`, `inactive`) |
| `department` | string | Filter by department |
| `search` | string | Search name and email |
| `per_page` | integer | Items per page (default: 25, max: 100) |
| `page` | integer | Page number |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "John Admin",
        "email": "admin@casi360.com",
        "role": "admin",
        "status": "active",
        "phone": "+234 800 000 0000",
        "department": "IT",
        "is_super_admin": false,
        "force_password_change": false
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 5,
      "per_page": 25,
      "total": 125
    }
  }
}
```

#### Show User

```
GET /auth/users/{id}
```

**Response:** Same user object as above.

#### Update User

```
PATCH /auth/users/{id}
```

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | No | Max 255 |
| `email` | string | No | Valid email, unique (except self) |
| `phone` | string | No | Max 20 |
| `department` | string | No | Max 255 |
| `status` | string | No | `active` or `inactive` |

#### Delete (Deactivate) User

```
DELETE /auth/users/{id}
```

Soft-deactivates the user (sets status to `inactive`).

**Restrictions:**
- Cannot delete a super_admin
- Cannot delete yourself

#### Update User Role

```
PATCH /auth/users/{id}/role
```

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `role` | string | Yes | `super_admin`, `admin`, `manager`, `staff` |

**Restrictions:**
- Only super_admin can assign the `super_admin` role
- Cannot change your own role

#### Update User Status

```
PATCH /auth/users/{id}/status
```

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `status` | string | Yes | `active` or `inactive` |

**Restrictions:**
- Cannot change your own status

---

### 4.12 My Permissions

```
GET /auth/permissions
```

**Auth Required:** Yes (any authenticated user)

Returns the permission map for the current user's role. Super admins get all `true`.

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "permissions": {
      "hr.departments.view": true,
      "hr.departments.create": false,
      "hr.departments.edit": false,
      "hr.departments.delete": false,
      "hr.designations.view": true,
      "hr.designations.create": false,
      "hr.employees.view": true,
      "hr.employees.create": true,
      "hr.employees.edit": true,
      "hr.employees.delete": false,
      "hr.employees.manage_status": false,
      "hr.notes.view": true,
      "hr.notes.create": false,
      "procurement.vendors.view": true,
      "procurement.vendors.create": false,
      "procurement.purchase_orders.view": true,
      "procurement.inventory.view": true,
      "procurement.requisitions.view": true,
      "procurement.approval.manager_review": true,
      "procurement.approval.finance_check": false,
      "procurement.approval.operations_approval": false,
      "procurement.approval.executive_approval": false,
      "procurement.approval.self_approve": false,
      "procurement.disbursements.view": true,
      "procurement.disbursements.create": false
    }
  }
}
```

Use this on login to build the frontend's permission gate / navigation visibility.

---

## 5. HR Module

All HR endpoints require authentication and specific permissions. The middleware stack is:

```
auth:sanctum → ForcePasswordChange → PermissionMiddleware
```

---

### 5.1 Departments

**Permission prefix:** `hr.departments.*`

#### List Departments

```
GET /hr/departments
```

**Permission:** `hr.departments.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | `active`, `inactive` |
| `search` | string | — | Searches name, head, description |
| `sort_by` | string | `name` | `name`, `head`, `status`, `created_at` |
| `sort_dir` | string | `asc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 (pass `0` for all records) |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "departments": [
      {
        "id": "d1a2b3c4-...",
        "name": "Engineering",
        "head": "Jane Doe",
        "employee_count": 15,
        "description": "Software engineering department",
        "color": "#6366F1",
        "status": "active",
        "created_at": "2024-01-15T10:00:00.000000Z",
        "updated_at": "2024-06-20T14:30:00.000000Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 3,
      "per_page": 25,
      "total": 75
    }
  }
}
```

#### Create Department

```
POST /hr/departments
```

**Permission:** `hr.departments.create`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255, unique |
| `head` | string | No | Max 255 |
| `description` | string | No | Max 1000 |
| `color` | string | No | Hex color, e.g. `#6366F1` |
| `status` | string | No | `active` (default) or `inactive` |

**Example Request:**

```json
{
  "name": "Marketing",
  "head": "Sarah Johnson",
  "description": "Marketing and communications department",
  "color": "#EC4899"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "department": {
      "id": "uuid",
      "name": "Marketing",
      "head": "Sarah Johnson",
      "employee_count": 0,
      "description": "Marketing and communications department",
      "color": "#EC4899",
      "status": "active",
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

#### Show Department

```
GET /hr/departments/{id}
```

**Permission:** `hr.departments.view`

**Response:** Same structure as single department object.

#### Update Department

```
PATCH /hr/departments/{id}
```

**Permission:** `hr.departments.edit`  
**Rate Limit:** 60/minute

All fields are optional. Only send fields you want to change.

#### Delete Department

```
DELETE /hr/departments/{id}
```

**Permission:** `hr.departments.delete`  
**Rate Limit:** 60/minute

**Error:** `422` if department has active (non-terminated) employees.

---

### 5.2 Designations

**Permission prefix:** `hr.designations.*`

#### List Designations

```
GET /hr/designations
```

**Permission:** `hr.designations.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | `active`, `inactive` |
| `department_id` | UUID | — | Filter by department |
| `level` | string | — | `junior`, `mid`, `senior`, `lead`, `executive` |
| `search` | string | — | Searches title, description, department name |
| `sort_by` | string | `title` | `title`, `level`, `status`, `created_at` |
| `sort_dir` | string | `asc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 (pass `0` for all records) |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "designations": [
      {
        "id": "uuid",
        "title": "Senior Developer",
        "department_id": "uuid",
        "department": "Engineering",
        "level": "senior",
        "employee_count": 5,
        "description": "Senior software developer position",
        "status": "active",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "meta": { ... }
  }
}
```

#### Create Designation

```
POST /hr/designations
```

**Permission:** `hr.designations.create`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `title` | string | Yes | Max 255 |
| `department_id` | UUID | Yes | Must exist in departments |
| `level` | string | Yes | `junior`, `mid`, `senior`, `lead`, `executive` |
| `description` | string | No | Max 1000 |
| `status` | string | No | `active` (default) or `inactive` |

**Example Request:**

```json
{
  "title": "Lead Engineer",
  "department_id": "d1a2b3c4-...",
  "level": "lead",
  "description": "Leads a team of engineers"
}
```

#### Show Designation

```
GET /hr/designations/{id}
```

**Permission:** `hr.designations.view`

#### Update Designation

```
PATCH /hr/designations/{id}
```

**Permission:** `hr.designations.edit`  
All fields optional.

#### Delete Designation

```
DELETE /hr/designations/{id}
```

**Permission:** `hr.designations.delete`

**Error:** `422` if designation has active employees.

---

### 5.3 Employees

**Permission prefix:** `hr.employees.*`

#### Employee Stats

```
GET /hr/employees/stats
```

**Permission:** `hr.employees.view`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "total": 250,
    "active": 240,
    "on_leave": 5,
    "terminated": 5,
    "by_department": [
      {
        "department_id": "uuid",
        "department": "Engineering",
        "count": 25
      }
    ]
  }
}
```

#### List Employees

```
GET /hr/employees
```

**Permission:** `hr.employees.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | `active`, `on_leave`, `terminated` |
| `department_id` | UUID | — | Filter by department |
| `designation_id` | UUID | — | Filter by designation |
| `gender` | string | — | `male`, `female`, `other` |
| `search` | string | — | Searches name, email, staff_id, phone |
| `sort_by` | string | `name` | `name`, `email`, `staff_id`, `status`, `join_date`, `salary`, `created_at` |
| `sort_dir` | string | `asc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "employees": [
      {
        "id": "uuid",
        "staff_id": "CASI-1001",
        "name": "Ada Obi",
        "email": "ada.obi@casi360.com",
        "phone": "+234 800 123 4567",
        "department_id": "uuid",
        "department": "Engineering",
        "designation_id": "uuid",
        "position": "Senior Developer",
        "manager": "Jane Doe",
        "status": "active",
        "join_date": "2023-06-15",
        "termination_date": null,
        "salary": 850000.00,
        "avatar": null,
        "address": "123 Lagos Street",
        "gender": "female",
        "date_of_birth": "1990-03-20",
        "emergency_contact_name": "John Obi",
        "emergency_contact_phone": "+234 800 000 0001",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "meta": { ... }
  }
}
```

#### Create Employee

```
POST /hr/employees
```

**Permission:** `hr.employees.create`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255 |
| `email` | string | Yes | Valid email, unique |
| `phone` | string | No | Max 30 |
| `department_id` | UUID | Yes | Must exist in departments |
| `designation_id` | UUID | Yes | Must exist in designations |
| `manager` | string | No | Max 255 |
| `status` | string | No | `active` (default), `on_leave`, `terminated` |
| `join_date` | date | Yes | `YYYY-MM-DD` |
| `salary` | number | No | Min 0 |
| `avatar` | string | No | Max 500 (URL) |
| `address` | string | No | Max 1000 |
| `gender` | string | No | `male`, `female`, `other` |
| `date_of_birth` | date | No | Must be before today |
| `emergency_contact_name` | string | No | Max 255 |
| `emergency_contact_phone` | string | No | Max 30 |

**Example Request:**

```json
{
  "name": "Chinedu Eze",
  "email": "chinedu@casi360.com",
  "phone": "+234 800 555 6666",
  "department_id": "d1a2b3c4-...",
  "designation_id": "e5f6a7b8-...",
  "join_date": "2024-07-01",
  "salary": 600000,
  "gender": "male"
}
```

> `staff_id` is auto-generated (format: `CASI-XXXX`). Do not send it.

#### Show Employee

```
GET /hr/employees/{id}
```

**Permission:** `hr.employees.view`

#### Update Employee

```
PATCH /hr/employees/{id}
```

**Permission:** `hr.employees.edit`  
**Rate Limit:** 60/minute

All fields optional. Additional field available on update:

| Field | Type | Rules |
|-------|------|-------|
| `termination_date` | date | Must be on or after `join_date` |

#### Delete (Terminate) Employee

```
DELETE /hr/employees/{id}
```

**Permission:** `hr.employees.delete`  
**Rate Limit:** 60/minute

Sets status to `terminated` and `termination_date` to today. Not a hard delete.

**Error:** `422` if employee is already terminated.

#### Update Employee Status

```
PATCH /hr/employees/{id}/status
```

**Permission:** `hr.employees.manage_status`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `status` | string | Yes | `active`, `on_leave`, `terminated` |

If status is set to `terminated` and no `termination_date` exists, it's set to today.

---

### 5.4 Notes

**Permission prefix:** `hr.notes.*`

#### List Notes

```
GET /hr/notes
```

**Permission:** `hr.notes.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `employee_id` | UUID | — | Filter by employee |
| `type` | string | — | `general`, `performance`, `disciplinary`, `commendation`, `medical`, `training` |
| `priority` | string | — | `low`, `medium`, `high` |
| `search` | string | — | Searches title, content |
| `sort_by` | string | `created_at` | `title`, `type`, `priority`, `created_at`, `updated_at` |
| `sort_dir` | string | `desc` | `asc`, `desc` |
| `per_page` | integer | **15** | 1–100 |

> **Note:** Default `per_page` is 15 (not 25 like other endpoints).

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "notes": [
      {
        "id": "uuid",
        "employee_id": "uuid",
        "employee": {
          "id": "uuid",
          "name": "Ada Obi"
        },
        "title": "Q2 Performance Review",
        "content": "Employee exceeded targets by 20%...",
        "type": "performance",
        "priority": "high",
        "created_by": "uuid",
        "created_by_name": "John Admin",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 5,
      "per_page": 15,
      "total": 75,
      "from": 1,
      "to": 15
    }
  }
}
```

#### Create Note

```
POST /hr/notes
```

**Permission:** `hr.notes.create`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `employee_id` | UUID | Yes | Must exist in employees |
| `title` | string | Yes | Max 255 |
| `content` | string | Yes | Max 10000 |
| `type` | string | No | `general` (default), `performance`, `disciplinary`, `commendation`, `medical`, `training` |
| `priority` | string | No | `medium` (default), `low`, `high` |

**Example Request:**

```json
{
  "employee_id": "uuid-of-employee",
  "title": "Training Completion",
  "content": "Completed advanced Excel training with distinction.",
  "type": "training",
  "priority": "medium"
}
```

> `created_by` is auto-set from the authenticated user. Do not send it.

#### Show Note

```
GET /hr/notes/{id}
```

**Permission:** `hr.notes.view`

#### Update Note

```
PATCH /hr/notes/{id}
```

**Permission:** `hr.notes.edit`  
All fields optional (same fields as create).

#### Delete Note

```
DELETE /hr/notes/{id}
```

**Permission:** `hr.notes.delete`

This is a **hard delete** (the note is permanently removed).

---

## 6. Procurement Module

All procurement endpoints require authentication. The middleware stack is:

```
auth:sanctum → ForcePasswordChange → PermissionMiddleware
```

---

### 6.1 Vendors

**Permission prefix:** `procurement.vendors.*`

#### List Vendors

```
GET /procurement/vendors
```

**Permission:** `procurement.vendors.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | `active`, `inactive` |
| `search` | string | — | Searches name, contact_person, email, city |
| `sort_by` | string | `name` | `name`, `contact_person`, `email`, `city`, `status`, `created_at` |
| `sort_dir` | string | `asc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "vendors": [
      {
        "id": "uuid",
        "name": "Acme Supplies Ltd",
        "contact_person": "Bola Ade",
        "email": "bola@acme.com",
        "phone": "+234 800 222 3333",
        "address": "45 Industrial Avenue",
        "city": "Lagos",
        "state": "Lagos",
        "country": "Nigeria",
        "tax_id": "TIN-12345",
        "bank_name": "GTBank",
        "bank_account_number": "0123456789",
        "notes": "Preferred office supplies vendor",
        "purchase_order_count": 12,
        "status": "active",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "meta": { ... }
  }
}
```

#### Create Vendor

```
POST /procurement/vendors
```

**Permission:** `procurement.vendors.create`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255 |
| `contact_person` | string | No | Max 255 |
| `email` | string | No | Valid email, max 255 |
| `phone` | string | No | Max 30 |
| `address` | string | No | Max 2000 |
| `city` | string | No | Max 255 |
| `state` | string | No | Max 255 |
| `country` | string | No | Max 255 |
| `tax_id` | string | No | Max 50 |
| `bank_name` | string | No | Max 255 |
| `bank_account_number` | string | No | Max 50 |
| `notes` | string | No | Max 5000 |
| `status` | string | No | `active` (default), `inactive` |

#### Show Vendor

```
GET /procurement/vendors/{id}
```

**Permission:** `procurement.vendors.view`

#### Update Vendor

```
PATCH /procurement/vendors/{id}
```

**Permission:** `procurement.vendors.edit`  
All fields optional.

#### Delete Vendor

```
DELETE /procurement/vendors/{id}
```

**Permission:** `procurement.vendors.delete`

Soft-deletes (sets status to `inactive`).

**Error:** `422` if vendor has active purchase orders.

---

### 6.2 Inventory Items

**Permission prefix:** `procurement.inventory.*`

#### List Inventory Items

```
GET /procurement/inventory
```

**Permission:** `procurement.inventory.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | `active`, `inactive`, `out_of_stock` |
| `category` | string | — | Filter by category |
| `low_stock` | boolean | — | `true` to show items at or below reorder level |
| `search` | string | — | Searches name, sku, category, description |
| `sort_by` | string | `name` | `name`, `sku`, `category`, `quantity_in_stock`, `unit_cost`, `status`, `created_at` |
| `sort_dir` | string | `asc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "inventory_items": [
      {
        "id": "uuid",
        "name": "A4 Paper (Ream)",
        "sku": "PAPER-A4-001",
        "category": "Office Supplies",
        "description": "Standard A4 paper, 80gsm",
        "unit": "ream",
        "quantity_in_stock": 150,
        "reorder_level": 50,
        "unit_cost": 3500.00,
        "location": "Store Room A",
        "status": "active",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "meta": { ... }
  }
}
```

#### Create Inventory Item

```
POST /procurement/inventory
```

**Permission:** `procurement.inventory.create`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255 |
| `sku` | string | No | Max 100, unique |
| `category` | string | No | Max 255 |
| `description` | string | No | Max 2000 |
| `unit` | string | No | Max 50 |
| `quantity_in_stock` | integer | No | Min 0 |
| `reorder_level` | integer | No | Min 0 |
| `unit_cost` | number | No | Min 0 |
| `location` | string | No | Max 255 |
| `status` | string | No | `active` (default), `inactive`, `out_of_stock` |

#### Show Inventory Item

```
GET /procurement/inventory/{id}
```

**Permission:** `procurement.inventory.view`

#### Update Inventory Item

```
PATCH /procurement/inventory/{id}
```

**Permission:** `procurement.inventory.edit`  
All fields optional. `sku` unique check excludes current item.

#### Delete Inventory Item

```
DELETE /procurement/inventory/{id}
```

**Permission:** `procurement.inventory.delete`

Soft-deletes (sets status to `inactive`).

---

### 6.3 Purchase Orders

**Permission prefix:** `procurement.purchase_orders.*`

#### List Purchase Orders

```
GET /procurement/purchase-orders
```

**Permission:** `procurement.purchase_orders.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | See [PO Status Values](#purchase-order-status) |
| `payment_status` | string | — | `unpaid`, `partially_paid`, `paid` |
| `vendor_id` | UUID | — | Filter by vendor |
| `department_id` | UUID | — | Filter by department |
| `date_from` | date | — | Filter orders from this date |
| `date_to` | date | — | Filter orders until this date |
| `search` | string | — | Searches PO number, vendor name, notes |
| `sort_by` | string | `created_at` | `po_number`, `order_date`, `total_amount`, `status`, `payment_status`, `created_at` |
| `sort_dir` | string | `desc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "purchase_orders": [
      {
        "id": "uuid",
        "po_number": "PO-20240001",
        "vendor_id": "uuid",
        "vendor": "Acme Supplies Ltd",
        "department_id": "uuid",
        "department": "Engineering",
        "requested_by": "uuid",
        "requested_by_name": "Ada Obi",
        "submitted_by": "uuid",
        "submitted_by_name": "John Admin",
        "order_date": "2024-07-01",
        "expected_delivery_date": "2024-07-15",
        "actual_delivery_date": null,
        "subtotal": 500000.00,
        "tax_amount": 37500.00,
        "discount_amount": 0.00,
        "total_amount": 537500.00,
        "currency": "NGN",
        "notes": null,
        "item_count": 3,
        "status": "approved",
        "payment_status": "unpaid",
        "approval_progress": {
          "total": 4,
          "completed": 4,
          "current_step": null
        },
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "meta": { ... }
  }
}
```

#### Create Purchase Order

```
POST /procurement/purchase-orders
```

**Permission:** `procurement.purchase_orders.create`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `vendor_id` | UUID | Yes | Must exist in vendors |
| `department_id` | UUID | Yes | Must exist in departments |
| `requested_by` | UUID | Yes | Must exist in employees |
| `order_date` | date | Yes | `YYYY-MM-DD` |
| `expected_delivery_date` | date | No | Must be on or after `order_date` |
| `tax_amount` | number | No | Min 0 |
| `discount_amount` | number | No | Min 0 |
| `currency` | string | No | Max 10 (default: `NGN`) |
| `notes` | string | No | Max 5000 |
| `status` | string | No | Only `draft` allowed |
| `payment_status` | string | No | `unpaid`, `partially_paid`, `paid` |
| `items` | array | No | At least 1 item if provided |
| `items[].inventory_item_id` | UUID | No | Must exist in inventory_items |
| `items[].description` | string | Yes | Max 500 |
| `items[].quantity` | integer | Yes | Min 1 |
| `items[].unit` | string | No | Max 50 |
| `items[].unit_price` | number | Yes | Min 0 |

> `po_number` is auto-generated. `total_price` for each item is auto-calculated as `quantity * unit_price`. `subtotal` and `total_amount` are auto-calculated.

**Example Request:**

```json
{
  "vendor_id": "uuid-of-vendor",
  "department_id": "uuid-of-dept",
  "requested_by": "uuid-of-employee",
  "order_date": "2024-07-01",
  "expected_delivery_date": "2024-07-15",
  "currency": "NGN",
  "items": [
    {
      "inventory_item_id": "uuid-of-item",
      "description": "A4 Paper - 80gsm",
      "quantity": 100,
      "unit": "ream",
      "unit_price": 3500
    },
    {
      "description": "Custom printing services",
      "quantity": 1,
      "unit": "lot",
      "unit_price": 150000
    }
  ]
}
```

**Success Response (201):**

Returns the full PO detail including items (see Show endpoint).

#### Show Purchase Order

```
GET /procurement/purchase-orders/{id}
```

**Permission:** `procurement.purchase_orders.view`

Returns the detail view including items, approval steps, and disbursements:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "purchase_order": {
      "id": "uuid",
      "po_number": "PO-20240001",
      "vendor_id": "uuid",
      "vendor": "Acme Supplies Ltd",
      "department_id": "uuid",
      "department": "Engineering",
      "requested_by": "uuid",
      "requested_by_name": "Ada Obi",
      "submitted_by": "uuid",
      "submitted_by_name": "John Admin",
      "order_date": "2024-07-01",
      "expected_delivery_date": "2024-07-15",
      "actual_delivery_date": null,
      "subtotal": 500000.00,
      "tax_amount": 37500.00,
      "discount_amount": 0.00,
      "total_amount": 537500.00,
      "currency": "NGN",
      "notes": null,
      "item_count": 2,
      "status": "approved",
      "payment_status": "unpaid",
      "approval_progress": {
        "total": 4,
        "completed": 4,
        "current_step": null
      },
      "items": [
        {
          "id": "uuid",
          "purchase_order_id": "uuid",
          "inventory_item_id": "uuid",
          "inventory_item": "A4 Paper (Ream)",
          "description": "A4 Paper - 80gsm",
          "quantity": 100,
          "received_quantity": 0,
          "unit": "ream",
          "unit_price": 3500.00,
          "total_price": 350000.00,
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "approval_steps": [
        {
          "id": "uuid",
          "approvable_type": "App\\Models\\PurchaseOrder",
          "approvable_id": "uuid",
          "step_order": 1,
          "step_type": "manager_review",
          "step_label": "Manager Review",
          "status": "approved",
          "acted_by": "uuid",
          "acted_by_name": "John Manager",
          "acted_at": "2024-07-02T09:00:00.000000Z",
          "comments": null,
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "disbursements": [
        {
          "id": "uuid",
          "purchase_order_id": "uuid",
          "disbursed_by": "uuid",
          "disbursed_by_name": "Finance Admin",
          "amount": 537500.00,
          "payment_method": "bank_transfer",
          "payment_reference": "TRF-2024-001",
          "payment_date": "2024-07-10",
          "notes": "Full payment to vendor",
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

#### Update Purchase Order

```
PATCH /procurement/purchase-orders/{id}
```

**Permission:** `procurement.purchase_orders.edit`  
**Rate Limit:** 60/minute

**Restriction:** Only editable when status is `draft` or `revision`.

All fields optional. Same fields as create. Additional item management:

- Items with an `id` field update existing items
- Items without an `id` create new items
- Existing items not included in the array are **deleted**

**Example — Update items:**

```json
{
  "notes": "Updated notes",
  "items": [
    {
      "id": "existing-item-uuid",
      "description": "A4 Paper - Updated",
      "quantity": 200,
      "unit": "ream",
      "unit_price": 3200
    },
    {
      "description": "New item added",
      "quantity": 50,
      "unit": "box",
      "unit_price": 5000
    }
  ]
}
```

#### Delete (Cancel) Purchase Order

```
DELETE /procurement/purchase-orders/{id}
```

**Permission:** `procurement.purchase_orders.delete`

Sets status to `cancelled`. Cannot delete if status is `received`, `partially_received`, or `disbursed`.

---

### 6.4 Purchase Order — Submit for Approval

```
POST /procurement/purchase-orders/{id}/submit
```

**Permission:** `procurement.purchase_orders.edit`  
**Rate Limit:** 60/minute

Submits a draft or revised PO into the approval workflow.

**Requirements:**
- Status must be `draft` or `revision`
- Must have at least 1 item

**Request Body:** None

**What happens:**
1. Status changes to `submitted`
2. `submitted_by` is set to the authenticated user
3. Approval steps are auto-generated based on `total_amount` thresholds:
   - **Always:** Manager Review + Finance Check
   - **If total > ₦500,000:** + Operations Approval
   - **If total > ₦1,000,000:** + Executive Director Approval

**Success Response (200):**

```json
{
  "success": true,
  "message": "Purchase order submitted for approval",
  "data": {
    "purchase_order": { ... full detail view with approval_steps ... }
  }
}
```

---

### 6.5 Purchase Order — Approval Status

```
GET /procurement/purchase-orders/{id}/approval-status
```

**Permission:** `procurement.purchase_orders.view`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "purchase_order_id": "uuid",
    "po_number": "PO-20240001",
    "status": "pending_approval",
    "approval_steps": [
      {
        "id": "uuid",
        "step_order": 1,
        "step_type": "manager_review",
        "step_label": "Manager Review",
        "status": "approved",
        "acted_by": "uuid",
        "acted_by_name": "John Manager",
        "acted_at": "2024-07-02T09:00:00.000000Z",
        "comments": null
      },
      {
        "id": "uuid",
        "step_order": 2,
        "step_type": "finance_check",
        "step_label": "Finance Check",
        "status": "pending",
        "acted_by": null,
        "acted_by_name": null,
        "acted_at": null,
        "comments": null
      }
    ]
  }
}
```

---

### 6.6 Purchase Order — Process Approval

```
PATCH /procurement/purchase-orders/{id}/approval
```

**Permission:** Depends on step type (see [Approval Permissions](#approval-permissions))  
**Rate Limit:** 60/minute

**Requirements:**
- PO status must be `submitted` or `pending_approval`
- User must have the permission for the current step type
- User cannot approve their own submission (unless `procurement.approval.self_approve` permission is granted AND `procurement.approval.block_self_approval` system setting is `false`)

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `action` | string | Yes | `approve` or `reject` |
| `comments` | string | Conditional | **Required** when action is `reject`. Max 5000 |

**Example — Approve:**

```json
{
  "action": "approve",
  "comments": "Looks good, approved."
}
```

**Example — Reject:**

```json
{
  "action": "reject",
  "comments": "Budget allocation insufficient. Please revise the quantities."
}
```

**What happens on approve:**
1. Current step marked as `approved` with acting user and timestamp
2. If more steps remain → status changes to `pending_approval`
3. If all steps complete → status changes to `approved`

**What happens on reject:**
1. Current step marked as `rejected` with comments
2. Remaining steps marked as `skipped`
3. Status changes to `revision` (submitter can edit and re-submit)

**Success Response (200):**

```json
{
  "success": true,
  "message": "Purchase order approved successfully",
  "data": {
    "purchase_order": { ... full detail view ... }
  }
}
```

---

### 6.7 Disbursements

**Permission prefix:** `procurement.disbursements.*`

#### List Disbursements for a PO

```
GET /procurement/purchase-orders/{id}/disbursements
```

**Permission:** `procurement.disbursements.view`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "disbursements": [
      {
        "id": "uuid",
        "purchase_order_id": "uuid",
        "disbursed_by": "uuid",
        "disbursed_by_name": "Finance Admin",
        "amount": 250000.00,
        "payment_method": "bank_transfer",
        "payment_reference": "TRF-2024-001",
        "payment_date": "2024-07-10",
        "notes": "First installment",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "purchase_order_id": "uuid",
    "po_number": "PO-20240001",
    "total_amount": 537500.00,
    "total_disbursed": 250000.00,
    "balance": 287500.00
  }
}
```

#### Create Disbursement

```
POST /procurement/purchase-orders/{id}/disbursements
```

**Permission:** `procurement.disbursements.create`  
**Rate Limit:** 60/minute

**Requirements:**
- PO status must be `approved` or `disbursed`
- Amount must not exceed remaining balance

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `amount` | number | Yes | Min 0.01, cannot exceed remaining balance |
| `payment_method` | string | Yes | `bank_transfer`, `cheque`, `cash`, `mobile_money` |
| `payment_reference` | string | No | Max 255 |
| `payment_date` | date | Yes | `YYYY-MM-DD` |
| `notes` | string | No | Max 5000 |

**Example Request:**

```json
{
  "amount": 250000,
  "payment_method": "bank_transfer",
  "payment_reference": "TRF-2024-001",
  "payment_date": "2024-07-10",
  "notes": "First installment payment"
}
```

> `disbursed_by` is auto-set from the authenticated user.

**What happens:**
- If total disbursed equals total amount → PO `payment_status` set to `paid`, `status` set to `disbursed`
- If total disbursed is less than total amount → PO `payment_status` set to `partially_paid`

**Success Response (201):**

```json
{
  "success": true,
  "message": "Disbursement recorded successfully",
  "data": {
    "disbursement": {
      "id": "uuid",
      "purchase_order_id": "uuid",
      "disbursed_by": "uuid",
      "disbursed_by_name": "Finance Admin",
      "amount": 250000.00,
      "payment_method": "bank_transfer",
      "payment_reference": "TRF-2024-001",
      "payment_date": "2024-07-10",
      "notes": "First installment payment",
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

---

### 6.8 Requisitions

**Permission prefix:** `procurement.requisitions.*`

#### List Requisitions

```
GET /procurement/requisitions
```

**Permission:** `procurement.requisitions.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | See [Requisition Status Values](#requisition-status) |
| `priority` | string | — | `low`, `medium`, `high`, `urgent` |
| `department_id` | UUID | — | Filter by department |
| `requested_by` | UUID | — | Filter by requester (employee) |
| `date_from` | date | — | Filter from date |
| `date_to` | date | — | Filter to date |
| `search` | string | — | Searches requisition number, title, justification |
| `sort_by` | string | `created_at` | `requisition_number`, `title`, `priority`, `estimated_cost`, `status`, `needed_by`, `created_at` |
| `sort_dir` | string | `desc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "requisitions": [
      {
        "id": "uuid",
        "requisition_number": "REQ-20240001",
        "department_id": "uuid",
        "department": "Engineering",
        "requested_by": "uuid",
        "requested_by_name": "Ada Obi",
        "submitted_by": "uuid",
        "submitted_by_name": "John Admin",
        "purchase_order_id": null,
        "purchase_order_number": null,
        "title": "Quarterly Office Supplies",
        "justification": "Regular replenishment of office supplies for Q3",
        "priority": "medium",
        "needed_by": "2024-08-01",
        "estimated_cost": 250000.00,
        "notes": null,
        "item_count": 5,
        "status": "approved",
        "approval_progress": {
          "total": 2,
          "completed": 2,
          "current_step": null
        },
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "meta": { ... }
  }
}
```

#### Create Requisition

```
POST /procurement/requisitions
```

**Permission:** `procurement.requisitions.create`  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `department_id` | UUID | Yes | Must exist in departments |
| `requested_by` | UUID | Yes | Must exist in employees |
| `title` | string | Yes | Max 255 |
| `justification` | string | No | Max 5000 |
| `priority` | string | No | `low`, `medium` (default), `high`, `urgent` |
| `needed_by` | date | No | Must be today or later |
| `notes` | string | No | Max 5000 |
| `status` | string | No | Only `draft` allowed |
| `items` | array | No | At least 1 item if provided |
| `items[].inventory_item_id` | UUID | No | Must exist in inventory_items |
| `items[].description` | string | Yes | Max 500 |
| `items[].quantity` | integer | Yes | Min 1 |
| `items[].unit` | string | No | Max 50 |
| `items[].estimated_unit_cost` | number | Yes | Min 0 |

> `requisition_number` is auto-generated. `estimated_total_cost` for each item is auto-calculated. `estimated_cost` on the requisition is auto-calculated.

**Example Request:**

```json
{
  "department_id": "uuid-of-dept",
  "requested_by": "uuid-of-employee",
  "title": "Quarterly Office Supplies",
  "justification": "Regular replenishment for Q3",
  "priority": "medium",
  "needed_by": "2024-08-01",
  "items": [
    {
      "inventory_item_id": "uuid-of-item",
      "description": "A4 Paper - 80gsm",
      "quantity": 50,
      "unit": "ream",
      "estimated_unit_cost": 3500
    },
    {
      "description": "Whiteboard markers (assorted)",
      "quantity": 20,
      "unit": "pack",
      "estimated_unit_cost": 2500
    }
  ]
}
```

#### Show Requisition

```
GET /procurement/requisitions/{id}
```

**Permission:** `procurement.requisitions.view`

Returns detail view with items and approval steps:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "requisition": {
      "id": "uuid",
      "requisition_number": "REQ-20240001",
      "department_id": "uuid",
      "department": "Engineering",
      "requested_by": "uuid",
      "requested_by_name": "Ada Obi",
      "submitted_by": null,
      "submitted_by_name": null,
      "purchase_order_id": null,
      "purchase_order_number": null,
      "title": "Quarterly Office Supplies",
      "justification": "Regular replenishment for Q3",
      "priority": "medium",
      "needed_by": "2024-08-01",
      "estimated_cost": 225000.00,
      "notes": null,
      "item_count": 2,
      "status": "draft",
      "approval_progress": {
        "total": 0,
        "completed": 0,
        "current_step": null
      },
      "items": [
        {
          "id": "uuid",
          "requisition_id": "uuid",
          "inventory_item_id": "uuid",
          "inventory_item": "A4 Paper (Ream)",
          "description": "A4 Paper - 80gsm",
          "quantity": 50,
          "unit": "ream",
          "estimated_unit_cost": 3500.00,
          "estimated_total_cost": 175000.00,
          "created_at": "...",
          "updated_at": "..."
        }
      ],
      "approval_steps": [],
      "created_at": "...",
      "updated_at": "..."
    }
  }
}
```

#### Update Requisition

```
PATCH /procurement/requisitions/{id}
```

**Permission:** `procurement.requisitions.edit`  
**Rate Limit:** 60/minute

**Restriction:** Only editable when status is `draft` or `revision`.

All fields optional. Item management same as Purchase Orders (send `id` to update, omit to create, remove to delete).

#### Delete (Cancel) Requisition

```
DELETE /procurement/requisitions/{id}
```

**Permission:** `procurement.requisitions.delete`

Sets status to `cancelled`. Cannot delete if status is `approved` or `fulfilled`.

---

### 6.9 Requisition — Submit for Approval

```
POST /procurement/requisitions/{id}/submit
```

**Permission:** `procurement.requisitions.edit`  
**Rate Limit:** 60/minute

Same behavior as PO submission. Status must be `draft` or `revision`, must have at least 1 item.

Approval steps generated based on `estimated_cost` thresholds.

**Request Body:** None

**Success Response (200):**

```json
{
  "success": true,
  "message": "Requisition submitted for approval",
  "data": {
    "requisition": { ... full detail view with approval_steps ... }
  }
}
```

---

### 6.10 Requisition — Approval Status

```
GET /procurement/requisitions/{id}/approval-status
```

**Permission:** `procurement.requisitions.view`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "requisition_id": "uuid",
    "requisition_number": "REQ-20240001",
    "status": "approved",
    "approval_steps": [ ... ]
  }
}
```

---

### 6.11 Requisition — Process Approval

```
PATCH /procurement/requisitions/{id}/approval
```

Same rules and behavior as [Purchase Order Approval](#66-purchase-order--process-approval).

---

### 6.12 Pending Approvals

```
GET /procurement/pending-approvals
```

**Auth Required:** Yes (any authenticated user with approval permissions)

Returns all POs and requisitions that have pending approval steps the current user can act on, based on their approval permissions.

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "purchase_orders": [
      {
        "id": "uuid",
        "po_number": "PO-20240005",
        "vendor": "Acme Supplies",
        "total_amount": 750000.00,
        "status": "submitted",
        "approval_progress": { ... }
      }
    ],
    "requisitions": [
      {
        "id": "uuid",
        "requisition_number": "REQ-20240003",
        "title": "Emergency IT Equipment",
        "estimated_cost": 1200000.00,
        "status": "pending_approval",
        "approval_progress": { ... }
      }
    ]
  }
}
```

---

## 7. Projects Module

All project endpoints require authentication. The middleware stack is:

```
auth:sanctum → ForcePasswordChange → PermissionMiddleware
```

---

### 7.1 Budget Categories

**Permission prefix:** `projects.budget_categories.*`

Budget categories are admin-managed groupings for project budget lines (e.g., Personnel, Travel, Equipment).

#### List Budget Categories

```
GET /projects/budget-categories
```

**Permission:** `projects.budget_categories.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | `active`, `inactive` |
| `search` | string | — | Searches name, description |
| `sort_by` | string | `sort_order` | `name`, `sort_order`, `status`, `created_at` |
| `sort_dir` | string | `asc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 (use `0` for all) |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "budget_categories": [
      {
        "id": "uuid",
        "name": "Personnel",
        "description": "Staff salaries, allowances and benefits",
        "sort_order": 1,
        "status": "active",
        "created_at": "2026-04-01T...",
        "updated_at": "2026-04-01T..."
      }
    ],
    "pagination": { ... }
  }
}
```

#### Show Budget Category

```
GET /projects/budget-categories/{id}
```

**Permission:** `projects.budget_categories.view`

#### Create Budget Category

```
POST /projects/budget-categories
```

**Permission:** `projects.budget_categories.create`

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255, unique |
| `description` | string | No | Max 2000 |
| `sort_order` | integer | No | Min 0 (default: 0) |
| `status` | string | No | `active` or `inactive` (default: `active`) |

#### Update Budget Category

```
PATCH /projects/budget-categories/{id}
```

**Permission:** `projects.budget_categories.edit`

All fields optional.

#### Delete Budget Category

```
DELETE /projects/budget-categories/{id}
```

**Permission:** `projects.budget_categories.delete`

**Error:** `422` if category has existing budget lines.

---

### 7.2 Projects

**Permission prefix:** `projects.projects.*`

#### Project Stats

```
GET /projects/stats
```

**Permission:** `projects.projects.view`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "total": 12,
    "draft": 3,
    "active": 6,
    "on_hold": 1,
    "completed": 2,
    "closed": 0,
    "total_budget": 150000000.00,
    "by_department": [
      {
        "department_id": "uuid",
        "department": "Programs",
        "count": 5,
        "total_budget": 75000000.00
      }
    ]
  }
}
```

#### List Projects

```
GET /projects
```

**Permission:** `projects.projects.view`

**Query Parameters:**

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `status` | string | — | `draft`, `active`, `on_hold`, `completed`, `closed` |
| `department_id` | uuid | — | Filter by department |
| `search` | string | — | Searches name, project_code, description, location |
| `sort_by` | string | `created_at` | `name`, `project_code`, `status`, `start_date`, `end_date`, `total_budget`, `created_at` |
| `sort_dir` | string | `desc` | `asc`, `desc` |
| `per_page` | integer | `25` | 1–100 |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "projects": [
      {
        "id": "uuid",
        "project_code": "PRJ-202604-0001",
        "name": "Community Health Outreach Program",
        "description": "...",
        "objectives": "...",
        "department_id": "uuid",
        "department": "Programs",
        "project_manager_id": "uuid",
        "project_manager": "John Doe",
        "start_date": "2026-04-01",
        "end_date": "2027-03-31",
        "location": "Lagos",
        "total_budget": 20000000.00,
        "currency": "NGN",
        "status": "active",
        "notes": "...",
        "donor_count": 2,
        "partner_count": 3,
        "team_member_count": 5,
        "activity_count": 10,
        "budget_line_count": 14,
        "note_count": 3,
        "activity_progress": {
          "total": 10,
          "completed": 4,
          "percentage": 40
        },
        "created_at": "2026-04-01T...",
        "updated_at": "2026-04-01T..."
      }
    ],
    "pagination": { ... }
  }
}
```

#### Show Project (Detail)

```
GET /projects/{id}
```

**Permission:** `projects.projects.view`

Returns full project with all sub-resources (donors, partners, team members, activities, budget lines, notes).

#### Create Project

```
POST /projects
```

**Permission:** `projects.projects.create`

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255 |
| `description` | string | No | Max 10000 |
| `objectives` | string | No | Max 10000 |
| `department_id` | uuid | Yes | Must exist in departments |
| `project_manager_id` | uuid | No | Must exist in employees |
| `start_date` | date | No | YYYY-MM-DD |
| `end_date` | date | No | Must be after or equal to start_date |
| `location` | string | No | Max 255 |
| `currency` | string | No | Max 10 (default: NGN) |
| `status` | string | No | `draft`, `active`, `on_hold`, `completed`, `closed` |
| `notes` | string | No | Max 5000 |

**Note:** `project_code` is auto-generated (format: `PRJ-YYYYMM-XXXX`).

#### Update Project

```
PATCH /projects/{id}
```

**Permission:** `projects.projects.edit`

All fields optional.

#### Delete (Close) Project

```
DELETE /projects/{id}
```

**Permission:** `projects.projects.delete`

Sets project status to `closed` (soft delete).

---

### 7.3 Project Donors

Nested under a project. Uses `projects.projects.edit` permission for CUD operations.

#### List Donors

```
GET /projects/{projectId}/donors
```

**Permission:** `projects.projects.view`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "donors": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "name": "Global Health Fund",
        "type": "multilateral",
        "email": "grants@ghf.org",
        "phone": "+1-555-0100",
        "contribution_amount": 15000000.00,
        "notes": "Main donor",
        "created_at": "2026-04-01T...",
        "updated_at": "2026-04-01T..."
      }
    ],
    "total_contributions": 20000000.00
  }
}
```

#### Create Donor

```
POST /projects/{projectId}/donors
```

**Permission:** `projects.projects.edit`

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255 |
| `type` | string | No | `individual`, `organization`, `government`, `multilateral` |
| `email` | string | No | Valid email |
| `phone` | string | No | Max 50 |
| `contribution_amount` | decimal | No | Min 0 |
| `notes` | string | No | Max 2000 |

#### Update Donor

```
PATCH /projects/{projectId}/donors/{donorId}
```

**Permission:** `projects.projects.edit`

#### Delete Donor

```
DELETE /projects/{projectId}/donors/{donorId}
```

**Permission:** `projects.projects.edit`

---

### 7.4 Project Partners

Nested under a project. Uses `projects.projects.edit` permission for CUD operations.

#### List Partners

```
GET /projects/{projectId}/partners
```

**Permission:** `projects.projects.view`

#### Create Partner

```
POST /projects/{projectId}/partners
```

**Permission:** `projects.projects.edit`

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | Max 255 |
| `role` | string | No | `implementing`, `technical`, `funding`, `logistics` |
| `contact_person` | string | No | Max 255 |
| `email` | string | No | Valid email |
| `phone` | string | No | Max 50 |
| `notes` | string | No | Max 2000 |

#### Update Partner

```
PATCH /projects/{projectId}/partners/{partnerId}
```

**Permission:** `projects.projects.edit`

#### Delete Partner

```
DELETE /projects/{projectId}/partners/{partnerId}
```

**Permission:** `projects.projects.edit`

---

### 7.5 Project Team Members

Nested under a project. Uses `projects.projects.edit` permission for CUD operations.

#### List Team Members

```
GET /projects/{projectId}/team
```

**Permission:** `projects.projects.view`

#### Add Team Member

```
POST /projects/{projectId}/team
```

**Permission:** `projects.projects.edit`

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `employee_id` | uuid | Yes | Must exist in employees; unique per project |
| `role` | string | No | Max 255 (default: `member`) |
| `start_date` | date | No | |
| `end_date` | date | No | |
| `notes` | string | No | Max 2000 |

**Error:** `422` if employee is already assigned to this project.

#### Update Team Member

```
PATCH /projects/{projectId}/team/{memberId}
```

**Permission:** `projects.projects.edit`

#### Remove Team Member

```
DELETE /projects/{projectId}/team/{memberId}
```

**Permission:** `projects.projects.edit`

---

### 7.6 Project Activities / Milestones

**Permission prefix:** `projects.activities.*`

#### List Activities

```
GET /projects/{projectId}/activities
```

**Permission:** `projects.activities.view`

**Query Parameters:**

| Parameter | Type | Options |
|-----------|------|---------|
| `status` | string | `not_started`, `in_progress`, `completed`, `delayed`, `cancelled` |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "activities": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "title": "Community Mobilization",
        "description": "...",
        "start_date": "2026-04-01",
        "end_date": "2026-05-31",
        "target_date": "2026-05-15",
        "status": "in_progress",
        "completion_percentage": 45,
        "sort_order": 1,
        "notes": "...",
        "created_at": "2026-04-01T...",
        "updated_at": "2026-04-01T..."
      }
    ],
    "summary": {
      "total": 10,
      "not_started": 3,
      "in_progress": 4,
      "completed": 2,
      "delayed": 1,
      "cancelled": 0
    }
  }
}
```

#### Create Activity

```
POST /projects/{projectId}/activities
```

**Permission:** `projects.activities.create`

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `title` | string | Yes | Max 255 |
| `description` | string | No | Max 5000 |
| `start_date` | date | No | |
| `end_date` | date | No | After or equal to start_date |
| `target_date` | date | No | |
| `status` | string | No | `not_started`, `in_progress`, `completed`, `delayed`, `cancelled` |
| `completion_percentage` | integer | No | 0–100 |
| `sort_order` | integer | No | Min 0 |
| `notes` | string | No | Max 2000 |

#### Update Activity

```
PATCH /projects/{projectId}/activities/{activityId}
```

**Permission:** `projects.activities.edit`

#### Delete Activity

```
DELETE /projects/{projectId}/activities/{activityId}
```

**Permission:** `projects.activities.delete`

---

### 7.7 Project Budget Lines

**Permission prefix:** `projects.budget.*`

Budget lines break down the project budget into individual costed items, grouped by budget category.

#### List Budget Lines

```
GET /projects/{projectId}/budget-lines
```

**Permission:** `projects.budget.view`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "budget_lines": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "budget_category_id": "uuid",
        "budget_category": "Personnel",
        "description": "Project Coordinator Salary",
        "unit": "month",
        "quantity": 12.00,
        "unit_cost": 350000.00,
        "total_cost": 4200000.00,
        "notes": "...",
        "created_at": "2026-04-01T...",
        "updated_at": "2026-04-01T..."
      }
    ],
    "total": 20000000.00,
    "by_category": [
      {
        "category_id": "uuid",
        "category": "Personnel",
        "subtotal": 8400000.00,
        "line_count": 3
      }
    ]
  }
}
```

#### Create Budget Line

```
POST /projects/{projectId}/budget-lines
```

**Permission:** `projects.budget.create`

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `budget_category_id` | uuid | Yes | Must exist in budget_categories |
| `description` | string | Yes | Max 500 |
| `unit` | string | No | Max 100 |
| `quantity` | decimal | Yes | Min 0.01 |
| `unit_cost` | decimal | Yes | Min 0 |
| `notes` | string | No | Max 2000 |

**Note:** `total_cost` is auto-calculated as `quantity × unit_cost`. The project's `total_budget` is automatically recalculated.

#### Update Budget Line

```
PATCH /projects/{projectId}/budget-lines/{lineId}
```

**Permission:** `projects.budget.edit`

#### Delete Budget Line

```
DELETE /projects/{projectId}/budget-lines/{lineId}
```

**Permission:** `projects.budget.delete`

**Note:** The project's `total_budget` is recalculated after deletion.

---

### 7.8 Project Notes

**Permission prefix:** `projects.notes.*`

Project notes allow users to record observations, attach external document links, or add context for record-keeping purposes.

#### List Notes

```
GET /projects/{projectId}/notes
```

**Permission:** `projects.notes.view`

**Query Parameters:**

| Parameter | Type | Options |
|-----------|------|---------|
| `search` | string | Searches title, content |

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "notes": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "created_by": "uuid",
        "creator_name": "John Doe",
        "title": "Site Visit Report",
        "content": "Visited the project site on March 15...",
        "link_url": "https://docs.google.com/document/d/...",
        "link_label": "Full Report on Google Docs",
        "created_at": "2026-04-01T...",
        "updated_at": "2026-04-01T..."
      }
    ],
    "total": 3
  }
}
```

#### Create Note

```
POST /projects/{projectId}/notes
```

**Permission:** `projects.notes.create`

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `title` | string | Yes | Max 255 |
| `content` | string | No | Max 10000 |
| `link_url` | string | No | Valid URL, max 2048 |
| `link_label` | string | No | Max 255 |

**Note:** `created_by` is automatically set to the authenticated user.

#### Update Note

```
PATCH /projects/{projectId}/notes/{noteId}
```

**Permission:** `projects.notes.edit`

#### Delete Note

```
DELETE /projects/{projectId}/notes/{noteId}
```

**Permission:** `projects.notes.delete`

---

## 8. Communication Module

The Communication module provides three features: **1-on-1 threaded messaging**, **forums** (General + per-department, auto-created), and **notices** with read tracking. All routes are prefixed with `/communication/`.

### 8.1 Messages — List Threads (Inbox/Sent)

```
GET /communication/messages
```

**Permission:** `communication.messages.view`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `box` | string | `inbox` | `inbox` or `sent` |
| `search` | string | – | Search subject/body text |
| `unread` | boolean | – | `true` to show only unread threads |
| `sort_by` | string | `created_at` | Sort field |
| `sort_dir` | string | `desc` | `asc` or `desc` |
| `per_page` | int | 25 | Items per page (max 100) |

**Response (200):**

```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": "uuid",
        "sender_id": "uuid",
        "sender_name": "John Doe",
        "recipient_id": "uuid",
        "recipient_name": "Jane Smith",
        "thread_id": null,
        "subject": "Meeting Notes",
        "body": "Here are the notes from today...",
        "is_read": false,
        "reply_count": 3,
        "latest_reply_at": "2026-03-13T10:00:00Z",
        "created_at": "2026-03-13T09:00:00Z",
        "updated_at": "2026-03-13T09:00:00Z"
      }
    ],
    "unread_count": 5,
    "meta": { "current_page": 1, "last_page": 2, "per_page": 25, "total": 40 }
  }
}
```

### 8.2 Messages — Unread Count

```
GET /communication/messages/unread-count
```

**Permission:** `communication.messages.view`

**Response (200):**

```json
{
  "success": true,
  "data": { "unread_count": 12 }
}
```

### 8.3 Messages — View Thread

```
GET /communication/messages/{threadId}
```

**Permission:** `communication.messages.view`

Returns the root message and all replies, sorted oldest-first. Automatically marks unread messages as read.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "thread": {
      "id": "uuid",
      "sender_name": "John Doe",
      "recipient_name": "Jane Smith",
      "subject": "Meeting Notes",
      "body": "Here are the notes...",
      "is_read": true,
      "created_at": "2026-03-13T09:00:00Z"
    },
    "replies": [
      {
        "id": "uuid",
        "sender_name": "Jane Smith",
        "body": "Thanks for sharing!",
        "is_read": true,
        "created_at": "2026-03-13T09:15:00Z"
      }
    ]
  }
}
```

### 8.4 Messages — Send Message / Reply

```
POST /communication/messages
```

**Permission:** `communication.messages.create`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipient_id` | uuid | Yes | Recipient user ID |
| `subject` | string | Yes (if new thread) | Subject line (max 255). Required without `thread_id`. |
| `thread_id` | uuid | No | Reply to existing thread (null = new message) |
| `body` | string | Yes | Message body (max 10000) |

**Response (201):**

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": { "message": { "id": "uuid", "..." } }
}
```

### 8.5 Messages — Delete Message

```
DELETE /communication/messages/{id}
```

**Permission:** `communication.messages.delete`

Soft-deletes the message for the current user only (sender or recipient). The other party still sees it.

**Response (200):**

```json
{
  "success": true,
  "message": "Message deleted"
}
```

### 8.6 Forums — List Accessible Forums

```
GET /communication/forums
```

**Permission:** `communication.forums.view`

Returns only forums the user can access: General forum + their department forum. Super admin sees all.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | – | Search forum name/description |
| `type` | string | – | `general` or `department` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "forums": [
      {
        "id": "uuid",
        "name": "General",
        "description": "Organisation-wide discussion forum",
        "type": "general",
        "department_id": null,
        "status": "active",
        "message_count": 42,
        "last_activity_at": "2026-03-13T14:00:00Z"
      }
    ]
  }
}
```

### 8.7 Forums — View Forum

```
GET /communication/forums/{id}
```

**Permission:** `communication.forums.view`

Returns forum details. Returns 403 if user lacks access to a department forum.

### 8.8 Forums — Create Forum (Admin)

```
POST /communication/forums
```

**Permission:** `communication.forums.manage`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Forum name (max 255) |
| `description` | string | No | Forum description |
| `type` | string | Yes | `general` or `department` |
| `department_id` | uuid | If type=department | Must exist, unique per department |

### 8.9 Forums — Update Forum (Admin)

```
PATCH /communication/forums/{id}
```

**Permission:** `communication.forums.manage`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Updated name |
| `description` | string | No | Updated description |
| `status` | string | No | `active` or `archived` |

### 8.10 Forums — Archive Forum (Admin)

```
DELETE /communication/forums/{id}
```

**Permission:** `communication.forums.manage`

Archives the forum (sets status=archived). Cannot archive the General forum.

### 8.11 Forum Messages — List Messages

```
GET /communication/forums/{forumId}/messages
```

**Permission:** `communication.forums.view`

Returns paginated top-level messages (no reply_to_id). Supports `per_page` and `sort_dir` parameters.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "user_name": "John Doe",
        "body": "Welcome everyone!",
        "reply_to_id": null,
        "reply_count": 2,
        "created_at": "2026-03-13T10:00:00Z"
      }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 25, "total": 10 }
  }
}
```

### 8.12 Forum Messages — List Replies

```
GET /communication/forums/{forumId}/messages/{messageId}/replies
```

**Permission:** `communication.forums.view`

Returns paginated replies to a specific forum message.

### 8.13 Forum Messages — Post Message

```
POST /communication/forums/{forumId}/messages
```

**Permission:** `communication.forums.create`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `body` | string | Yes | Message body (max 10000) |
| `reply_to_id` | uuid | No | Reply to specific message in this forum |

**Response (201):**

```json
{
  "success": true,
  "message": "Message posted successfully",
  "data": { "message": { "id": "uuid", "..." } }
}
```

### 8.14 Forum Messages — Delete Message

```
DELETE /communication/forums/{forumId}/messages/{messageId}
```

**Permission:** `communication.forums.create`

Users can delete their own messages. Super admin/admin can delete any message.

### 8.15 Notices — Statistics

```
GET /communication/notices/stats
```

**Permission:** `communication.notices.view`

Super admin / admin only. Returns notice count by status.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "draft": 2,
      "published": 15,
      "archived": 8,
      "total": 25
    }
  }
}
```

### 8.16 Notices — List

```
GET /communication/notices
```

**Permission:** `communication.notices.view`

Super admin sees all notices. Other users see published notices targeted to them (via audience type: all, their department, or their role).

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | – | Search title/body |
| `status` | string | – | `draft`, `published`, `archived` (admin only) |
| `priority` | string | – | `normal`, `important`, `critical` |
| `sort_by` | string | `created_at` | Sort field |
| `sort_dir` | string | `desc` | `asc` or `desc` |
| `per_page` | int | 25 | Items per page (max 100) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "notices": [
      {
        "id": "uuid",
        "author_id": "uuid",
        "author_name": "Admin User",
        "title": "Office Closure Notice",
        "body": "The office will be closed...",
        "priority": "important",
        "status": "published",
        "publish_date": "2026-03-13",
        "expiry_date": null,
        "is_pinned": true,
        "is_read": false,
        "read_count": 12,
        "created_at": "2026-03-13T08:00:00Z"
      }
    ],
    "meta": { "current_page": 1, "last_page": 1, "per_page": 25, "total": 5 }
  }
}
```

### 8.17 Notices — View (Auto-marks Read)

```
GET /communication/notices/{id}
```

**Permission:** `communication.notices.view`

Returns full notice detail with audiences. Automatically creates a `notice_reads` record for the current user.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "notice": {
      "id": "uuid",
      "title": "Office Closure Notice",
      "body": "The office will be closed on Friday...",
      "priority": "important",
      "status": "published",
      "is_pinned": true,
      "is_read": true,
      "read_count": 13,
      "audiences": [
        { "id": "uuid", "audience_type": "all", "audience_id": null, "audience_role": null, "label": "All Users" }
      ],
      "created_at": "2026-03-13T08:00:00Z"
    }
  }
}
```

### 8.18 Notices — Create

```
POST /communication/notices
```

**Permission:** `communication.notices.create`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Notice title (max 255) |
| `body` | string | Yes | Notice body (max 50000) |
| `priority` | string | Yes | `normal`, `important`, `critical` |
| `status` | string | Yes | `draft`, `published`, `archived` |
| `publish_date` | date | No | Schedule publish date (YYYY-MM-DD) |
| `expiry_date` | date | No | Auto-expire date (must be after publish_date) |
| `is_pinned` | boolean | No | Pin notice to top (default false) |
| `audiences` | array | Yes | Array of audience rules |
| `audiences.*.audience_type` | string | Yes | `all`, `department`, or `role` |
| `audiences.*.audience_id` | uuid | If department | Department ID |
| `audiences.*.audience_role` | string | If role | Role name |

### 8.19 Notices — Update

```
PATCH /communication/notices/{id}
```

**Permission:** `communication.notices.edit`

Same fields as create, all optional. If `audiences` array is provided, existing audiences are replaced.

### 8.20 Notices — Delete

```
DELETE /communication/notices/{id}
```

**Permission:** `communication.notices.delete`

### 8.21 Notices — Read Tracking

```
GET /communication/notices/{id}/reads
```

**Permission:** `communication.notices.view`

Super admin / admin only. Returns who has read the notice with timestamps.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "reads": [
      { "user_id": "uuid", "user_name": "John Doe", "read_at": "2026-03-13T10:30:00Z" }
    ],
    "total_users": 50,
    "read_count": 35,
    "read_percentage": 70.0
  }
}
```

---

## 9. Settings Module

### 9.1 Public Settings (No Auth)

```
GET /settings/general/public
```

**Auth Required:** No

Returns only settings marked as `is_public: true`, grouped by setting group with casted values.

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "settings": {
      "organization": {
        "name": "CASI360",
        "logo_url": "https://...",
        "website": "https://..."
      },
      "theme": {
        "primary_color": "#1976d2",
        "secondary_color": "#dc004e"
      }
    }
  }
}
```

---

### 9.2 All Settings (Super Admin Only)

```
GET /settings/general
```

**Auth Required:** Yes (super_admin only)

Returns all settings grouped by group, with full metadata.

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "settings": {
      "organization": [
        {
          "id": "uuid",
          "group": "organization",
          "key": "organization_name",
          "value": "CASI360",
          "type": "string",
          "label": "Organization Name",
          "description": "Name of the organization",
          "is_public": true
        }
      ],
      "procurement": [
        {
          "id": "uuid",
          "group": "procurement",
          "key": "procurement.approval.operations_threshold",
          "value": 500000,
          "type": "integer",
          "label": "Operations Approval Threshold",
          "description": "Amount above which operations approval is required",
          "is_public": false
        }
      ]
    }
  }
}
```

### 9.3 Show Setting

```
GET /settings/general/{key}
```

**Auth Required:** Yes (super_admin only)

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "setting": {
      "id": "uuid",
      "group": "procurement",
      "key": "procurement.approval.operations_threshold",
      "value": 500000,
      "type": "integer",
      "label": "Operations Approval Threshold",
      "description": "Amount above which operations approval is required",
      "is_public": false
    }
  }
}
```

### 9.4 Update Setting

```
PATCH /settings/general/{key}
```

**Auth Required:** Yes (super_admin only)  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `value` | mixed | Yes | Type-specific validation based on setting type |

Type-specific rules:
- `string` → value is stored as string
- `integer` → must be numeric
- `boolean` → stored as `1` or `0`
- `json` → must be an array/object, stored as JSON string

**Example:**

```json
{
  "value": 750000
}
```

### 9.5 Bulk Update Settings

```
PATCH /settings/general/bulk
```

**Auth Required:** Yes (super_admin only)  
**Rate Limit:** 60/minute

**Request Body:**

```json
{
  "settings": {
    "organization_name": "CASI360 Nigeria",
    "primary_color": "#2196F3",
    "procurement.approval.operations_threshold": 750000,
    "procurement.approval.block_self_approval": true
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "4 setting(s) updated successfully.",
  "data": {
    "updated": [
      "organization_name",
      "primary_color",
      "procurement.approval.operations_threshold",
      "procurement.approval.block_self_approval"
    ],
    "count": 4
  }
}
```

---

### 9.6 Permissions Management (Super Admin Only)

#### List All Permissions with Role Matrix

```
GET /settings/permissions
```

**Auth Required:** Yes (super_admin only)

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "permissions": [
      {
        "id": "uuid",
        "module": "hr",
        "feature": "departments",
        "action": "view",
        "key": "hr.departments.view",
        "description": "View departments",
        "roles": {
          "admin": true,
          "manager": true,
          "staff": false
        }
      }
    ],
    "roles": ["admin", "manager", "staff"]
  }
}
```

#### Update Single Permission

```
PATCH /settings/permissions/{id}
```

**Auth Required:** Yes (super_admin only)  
**Rate Limit:** 60/minute

**Request Body:**

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `role` | string | Yes | `admin`, `manager`, `staff` |
| `allowed` | boolean | Yes | `true` or `false` |

**Example:**

```json
{
  "role": "manager",
  "allowed": true
}
```

#### Bulk Update Permissions

```
PATCH /settings/permissions/bulk
```

**Auth Required:** Yes (super_admin only)  
**Rate Limit:** 60/minute

**Request Body:**

```json
{
  "permissions": [
    {
      "permission_id": "uuid-of-permission-1",
      "role": "admin",
      "allowed": true
    },
    {
      "permission_id": "uuid-of-permission-2",
      "role": "manager",
      "allowed": false
    }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Permissions updated successfully",
  "data": {
    "updated": 2
  }
}
```

---

## 10. Permissions Reference

### Permission Key Format

```
{module}.{feature}.{action}
```

### Complete Permission List

#### HR Module

| Key | Description |
|-----|-------------|
| `hr.departments.view` | View departments |
| `hr.departments.create` | Create departments |
| `hr.departments.edit` | Edit departments |
| `hr.departments.delete` | Delete departments |
| `hr.designations.view` | View designations |
| `hr.designations.create` | Create designations |
| `hr.designations.edit` | Edit designations |
| `hr.designations.delete` | Delete designations |
| `hr.employees.view` | View employees |
| `hr.employees.create` | Create employees |
| `hr.employees.edit` | Edit employees |
| `hr.employees.delete` | Delete (terminate) employees |
| `hr.employees.manage_status` | Change employee status |
| `hr.notes.view` | View employee notes |
| `hr.notes.create` | Create employee notes |
| `hr.notes.edit` | Edit employee notes |
| `hr.notes.delete` | Delete employee notes |

#### Procurement Module

| Key | Description |
|-----|-------------|
| `procurement.vendors.view` | View vendors |
| `procurement.vendors.create` | Create vendors |
| `procurement.vendors.edit` | Edit vendors |
| `procurement.vendors.delete` | Delete vendors |
| `procurement.purchase_orders.view` | View purchase orders |
| `procurement.purchase_orders.create` | Create purchase orders |
| `procurement.purchase_orders.edit` | Edit/submit purchase orders |
| `procurement.purchase_orders.delete` | Delete (cancel) purchase orders |
| `procurement.inventory.view` | View inventory items |
| `procurement.inventory.create` | Create inventory items |
| `procurement.inventory.edit` | Edit inventory items |
| `procurement.inventory.delete` | Delete inventory items |
| `procurement.requisitions.view` | View requisitions |
| `procurement.requisitions.create` | Create requisitions |
| `procurement.requisitions.edit` | Edit/submit requisitions |
| `procurement.requisitions.delete` | Delete (cancel) requisitions |

#### Approval Permissions

| Key | Description |
|-----|-------------|
| `procurement.approval.manager_review` | Can act on Manager Review approval step |
| `procurement.approval.finance_check` | Can act on Finance Check approval step |
| `procurement.approval.operations_approval` | Can act on Operations Approval step |
| `procurement.approval.executive_approval` | Can act on Executive Director Approval step |
| `procurement.approval.self_approve` | Can approve own submissions |

#### Disbursement Permissions

| Key | Description |
|-----|-------------|
| `procurement.disbursements.view` | View disbursements |
| `procurement.disbursements.create` | Record disbursement payments |

#### Projects Module

| Key | Description |
|-----|-------------|
| `projects.budget_categories.view` | View budget categories |
| `projects.budget_categories.create` | Create budget categories |
| `projects.budget_categories.edit` | Edit budget categories |
| `projects.budget_categories.delete` | Delete budget categories |
| `projects.projects.view` | View projects |
| `projects.projects.create` | Create projects |
| `projects.projects.edit` | Edit projects, donors, partners, team |
| `projects.projects.delete` | Close projects |
| `projects.activities.view` | View project activities |
| `projects.activities.create` | Create project activities |
| `projects.activities.edit` | Edit project activities |
| `projects.activities.delete` | Delete project activities |
| `projects.budget.view` | View project budget lines |
| `projects.budget.create` | Add project budget lines |
| `projects.budget.edit` | Edit project budget lines |
| `projects.budget.delete` | Remove project budget lines |
| `projects.notes.view` | View project notes |
| `projects.notes.create` | Add project notes |
| `projects.notes.edit` | Edit project notes |
| `projects.notes.delete` | Delete project notes |

#### Communication Module

| Key | Description |
|-----|-------------|
| `communication.messages.view` | View own messages and threads |
| `communication.messages.create` | Send new messages and replies |
| `communication.messages.delete` | Delete own messages |
| `communication.forums.view` | View accessible forums and messages |
| `communication.forums.create` | Post messages in forums |
| `communication.forums.manage` | Create, edit, and archive forums (admin) |
| `communication.notices.view` | View published notices |
| `communication.notices.create` | Create new notices |
| `communication.notices.edit` | Edit existing notices |
| `communication.notices.delete` | Delete notices |

---

## 11. Error Handling

### Standard Error Response

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": {
    "field_name": ["Specific validation error message"]
  }
}
```

### Common Error Scenarios

| HTTP Code | Scenario | Frontend Action |
|-----------|----------|-----------------|
| `401` | Session expired / not logged in | Redirect to login page |
| `403` | Forbidden (role or permission denied) | Show "Access Denied" message |
| `404` | Resource not found | Show "Not Found" page |
| `419` | CSRF token mismatch | Re-fetch `/sanctum/csrf-cookie` then retry |
| `422` | Validation errors | Display field-level errors |
| `429` | Rate limited | Show cooldown timer, retry after delay |
| `500` | Server error | Show generic error message |

### Handling CSRF Token Expiration

If you get a `419` response, the CSRF token has expired. Handle it like this:

```javascript
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 419) {
      // Re-fetch CSRF cookie
      await fetch('https://api.casi360.com/sanctum/csrf-cookie', {
        credentials: 'include',
      });
      // Retry the original request
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Handling Forced Password Change

```javascript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 403 &&
        error.response?.data?.message?.includes('password')) {
      // Redirect to change-password page
      router.push('/change-password');
    }
    return Promise.reject(error);
  }
);
```

---

## 12. Enum & Status Values

### User Roles

| Value | Description |
|-------|-------------|
| `super_admin` | Full system access, bypasses all permissions |
| `admin` | Administrative access with configurable permissions |
| `manager` | Team/department management with configurable permissions |
| `staff` | Basic access with configurable permissions |

### User Status

| Value | Description |
|-------|-------------|
| `active` | Normal account |
| `inactive` | Deactivated (cannot login) |

### Employee Status

| Value | Description |
|-------|-------------|
| `active` | Currently employed |
| `on_leave` | On approved leave |
| `terminated` | Employment ended |

### Employee Gender

| Value |
|-------|
| `male` |
| `female` |
| `other` |

### Department / Designation / Vendor Status

| Value | Description |
|-------|-------------|
| `active` | Currently active |
| `inactive` | Deactivated |

### Designation Level

| Value |
|-------|
| `junior` |
| `mid` |
| `senior` |
| `lead` |
| `executive` |

### Note Type

| Value |
|-------|
| `general` |
| `performance` |
| `disciplinary` |
| `commendation` |
| `medical` |
| `training` |

### Note Priority / Requisition Priority

| Value | Context |
|-------|---------|
| `low` | Both notes and requisitions |
| `medium` | Both notes and requisitions |
| `high` | Both notes and requisitions |
| `urgent` | Requisitions only |

### Purchase Order Status

| Value | Description |
|-------|-------------|
| `draft` | Being created, fully editable |
| `submitted` | Submitted for approval, locked for editing |
| `revision` | Rejected, returned for revisions (editable again) |
| `pending_approval` | In multi-step approval process |
| `approved` | All approval steps passed |
| `ordered` | Order placed with vendor |
| `partially_received` | Some items received |
| `received` | All items received |
| `disbursed` | Fully paid |
| `cancelled` | Cancelled |

### Purchase Order Payment Status

| Value | Description |
|-------|-------------|
| `unpaid` | No payments made |
| `partially_paid` | Some payments made |
| `paid` | Fully paid |

### Requisition Status

| Value | Description |
|-------|-------------|
| `draft` | Being created, fully editable |
| `submitted` | Submitted for approval |
| `revision` | Rejected, returned for revisions |
| `pending_approval` | In approval process |
| `approved` | Approved |
| `fulfilled` | Requisition fulfilled (PO created and completed) |
| `cancelled` | Cancelled |

### Approval Step Status

| Value | Description |
|-------|-------------|
| `pending` | Awaiting action |
| `approved` | Approved by reviewer |
| `rejected` | Rejected by reviewer |
| `skipped` | Skipped (due to earlier rejection) |

### Approval Step Types

| Value | Label | Permission Key |
|-------|-------|---------------|
| `manager_review` | Manager Review | `procurement.approval.manager_review` |
| `finance_check` | Finance Check | `procurement.approval.finance_check` |
| `operations_approval` | Operations Approval | `procurement.approval.operations_approval` |
| `executive_approval` | Executive Director Approval | `procurement.approval.executive_approval` |

### Approval Thresholds (Configurable via System Settings)

| Setting Key | Default | Effect |
|-------------|---------|--------|
| `procurement.approval.operations_threshold` | ₦500,000 | Adds Operations Approval step |
| `procurement.approval.executive_threshold` | ₦1,000,000 | Adds Executive Director Approval step |
| `procurement.approval.block_self_approval` | `true` | Prevents users from approving their own submissions |

### Disbursement Payment Methods

| Value | Description |
|-------|-------------|
| `bank_transfer` | Bank transfer |
| `cheque` | Cheque payment |
| `cash` | Cash payment |
| `mobile_money` | Mobile money transfer |

### Inventory Item Status

| Value | Description |
|-------|-------------|
| `active` | Available for use |
| `inactive` | Deactivated |
| `out_of_stock` | Currently out of stock |

### System Setting Types

| Value | Stored As | Returned As |
|-------|-----------|-------------|
| `string` | String | String |
| `integer` | String | Integer |
| `boolean` | `"1"` / `"0"` | `true` / `false` |
| `json` | JSON string | Object/Array |

### Project Status

| Value | Description |
|-------|-------------|
| `draft` | Being set up, not yet active |
| `active` | Currently running |
| `on_hold` | Temporarily paused |
| `completed` | All activities finished |
| `closed` | Archived / soft-deleted |

### Budget Category Status

| Value | Description |
|-------|-------------|
| `active` | Available for use |
| `inactive` | Hidden from selection |

### Project Donor Type

| Value | Description |
|-------|-------------|
| `individual` | Individual donor |
| `organization` | NGO or corporate organization |
| `government` | Government agency |
| `multilateral` | Multilateral body (UN, World Bank, etc.) |

### Project Partner Role

| Value | Description |
|-------|-------------|
| `implementing` | Implementing partner |
| `technical` | Technical assistance partner |
| `funding` | Funding/co-financing partner |
| `logistics` | Logistics/supply partner |

### Project Activity Status

| Value | Description |
|-------|-------------|
| `not_started` | Not yet begun |
| `in_progress` | Currently underway |
| `completed` | Finished |
| `delayed` | Behind schedule |
| `cancelled` | Will not be done |

### Forum Type

| Value | Description |
|-------|-------------|
| `general` | Organisation-wide forum (all users) |
| `department` | Department-specific forum (members only) |

### Forum Status

| Value | Description |
|-------|-------------|
| `active` | Open for posting |
| `archived` | Read-only, no new posts |

### Notice Priority

| Value | Description |
|-------|-------------|
| `normal` | Standard notice |
| `important` | Highlighted notice |
| `critical` | Urgent/critical alert |

### Notice Status

| Value | Description |
|-------|-------------|
| `draft` | Not yet visible to staff |
| `published` | Visible to targeted audience |
| `archived` | Hidden from active views |

### Notice Audience Type

| Value | Description |
|-------|-------------|
| `all` | All users |
| `department` | Specific department (requires `audience_id`) |
| `role` | Specific role (requires `audience_role`) |

---

## Quick Reference — All Endpoints

### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sanctum/csrf-cookie` | Get CSRF token (call before login) |
| `POST` | `/api/v1/auth/login` | Login |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset |
| `POST` | `/api/v1/auth/reset-password` | Reset password with token |
| `GET` | `/api/v1/settings/general/public` | Get public system settings |

### Auth (Any Authenticated User)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/auth/session` | Check session / get current user |
| `POST` | `/api/v1/auth/logout` | Logout |
| `POST` | `/api/v1/auth/change-password` | Change password |
| `GET` | `/api/v1/auth/profile` | View own profile |
| `PATCH` | `/api/v1/auth/profile` | Update own profile |
| `DELETE` | `/api/v1/auth/account` | Deactivate own account |
| `GET` | `/api/v1/auth/permissions` | Get own permission map |

### Admin Only (super_admin, admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Create new user |
| `GET` | `/api/v1/auth/users` | List users |
| `GET` | `/api/v1/auth/users/{id}` | Show user |
| `PATCH` | `/api/v1/auth/users/{id}` | Update user |
| `DELETE` | `/api/v1/auth/users/{id}` | Deactivate user |
| `PATCH` | `/api/v1/auth/users/{id}/role` | Change user role |
| `PATCH` | `/api/v1/auth/users/{id}/status` | Change user status |

### Super Admin Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/settings/permissions` | List permissions matrix |
| `PATCH` | `/api/v1/settings/permissions/{id}` | Update single permission |
| `PATCH` | `/api/v1/settings/permissions/bulk` | Bulk update permissions |
| `GET` | `/api/v1/settings/general` | List all system settings |
| `GET` | `/api/v1/settings/general/{key}` | Show system setting |
| `PATCH` | `/api/v1/settings/general/{key}` | Update system setting |
| `PATCH` | `/api/v1/settings/general/bulk` | Bulk update settings |

### HR Module (Permission-Based)

| Method | Endpoint | Permission |
|--------|----------|------------|
| `GET` | `/api/v1/hr/departments` | `hr.departments.view` |
| `POST` | `/api/v1/hr/departments` | `hr.departments.create` |
| `GET` | `/api/v1/hr/departments/{id}` | `hr.departments.view` |
| `PATCH` | `/api/v1/hr/departments/{id}` | `hr.departments.edit` |
| `DELETE` | `/api/v1/hr/departments/{id}` | `hr.departments.delete` |
| `GET` | `/api/v1/hr/designations` | `hr.designations.view` |
| `POST` | `/api/v1/hr/designations` | `hr.designations.create` |
| `GET` | `/api/v1/hr/designations/{id}` | `hr.designations.view` |
| `PATCH` | `/api/v1/hr/designations/{id}` | `hr.designations.edit` |
| `DELETE` | `/api/v1/hr/designations/{id}` | `hr.designations.delete` |
| `GET` | `/api/v1/hr/employees/stats` | `hr.employees.view` |
| `GET` | `/api/v1/hr/employees` | `hr.employees.view` |
| `POST` | `/api/v1/hr/employees` | `hr.employees.create` |
| `GET` | `/api/v1/hr/employees/{id}` | `hr.employees.view` |
| `PATCH` | `/api/v1/hr/employees/{id}` | `hr.employees.edit` |
| `DELETE` | `/api/v1/hr/employees/{id}` | `hr.employees.delete` |
| `PATCH` | `/api/v1/hr/employees/{id}/status` | `hr.employees.manage_status` |
| `GET` | `/api/v1/hr/notes` | `hr.notes.view` |
| `POST` | `/api/v1/hr/notes` | `hr.notes.create` |
| `GET` | `/api/v1/hr/notes/{id}` | `hr.notes.view` |
| `PATCH` | `/api/v1/hr/notes/{id}` | `hr.notes.edit` |
| `DELETE` | `/api/v1/hr/notes/{id}` | `hr.notes.delete` |

### Procurement Module (Permission-Based)

| Method | Endpoint | Permission |
|--------|----------|------------|
| `GET` | `/api/v1/procurement/vendors` | `procurement.vendors.view` |
| `POST` | `/api/v1/procurement/vendors` | `procurement.vendors.create` |
| `GET` | `/api/v1/procurement/vendors/{id}` | `procurement.vendors.view` |
| `PATCH` | `/api/v1/procurement/vendors/{id}` | `procurement.vendors.edit` |
| `DELETE` | `/api/v1/procurement/vendors/{id}` | `procurement.vendors.delete` |
| `GET` | `/api/v1/procurement/inventory` | `procurement.inventory.view` |
| `POST` | `/api/v1/procurement/inventory` | `procurement.inventory.create` |
| `GET` | `/api/v1/procurement/inventory/{id}` | `procurement.inventory.view` |
| `PATCH` | `/api/v1/procurement/inventory/{id}` | `procurement.inventory.edit` |
| `DELETE` | `/api/v1/procurement/inventory/{id}` | `procurement.inventory.delete` |
| `GET` | `/api/v1/procurement/purchase-orders` | `procurement.purchase_orders.view` |
| `POST` | `/api/v1/procurement/purchase-orders` | `procurement.purchase_orders.create` |
| `GET` | `/api/v1/procurement/purchase-orders/{id}` | `procurement.purchase_orders.view` |
| `PATCH` | `/api/v1/procurement/purchase-orders/{id}` | `procurement.purchase_orders.edit` |
| `DELETE` | `/api/v1/procurement/purchase-orders/{id}` | `procurement.purchase_orders.delete` |
| `POST` | `/api/v1/procurement/purchase-orders/{id}/submit` | `procurement.purchase_orders.edit` |
| `GET` | `/api/v1/procurement/purchase-orders/{id}/approval-status` | `procurement.purchase_orders.view` |
| `PATCH` | `/api/v1/procurement/purchase-orders/{id}/approval` | Approval step permission |
| `GET` | `/api/v1/procurement/purchase-orders/{id}/disbursements` | `procurement.disbursements.view` |
| `POST` | `/api/v1/procurement/purchase-orders/{id}/disbursements` | `procurement.disbursements.create` |
| `GET` | `/api/v1/procurement/requisitions` | `procurement.requisitions.view` |
| `POST` | `/api/v1/procurement/requisitions` | `procurement.requisitions.create` |
| `GET` | `/api/v1/procurement/requisitions/{id}` | `procurement.requisitions.view` |
| `PATCH` | `/api/v1/procurement/requisitions/{id}` | `procurement.requisitions.edit` |
| `DELETE` | `/api/v1/procurement/requisitions/{id}` | `procurement.requisitions.delete` |
| `POST` | `/api/v1/procurement/requisitions/{id}/submit` | `procurement.requisitions.edit` |
| `GET` | `/api/v1/procurement/requisitions/{id}/approval-status` | `procurement.requisitions.view` |
| `PATCH` | `/api/v1/procurement/requisitions/{id}/approval` | Approval step permission |
| `GET` | `/api/v1/procurement/pending-approvals` | Any approval permission |

### Projects Module (Permission-Based)

| Method | Endpoint | Permission |
|--------|----------|------------|
| `GET` | `/api/v1/projects/budget-categories` | `projects.budget_categories.view` |
| `POST` | `/api/v1/projects/budget-categories` | `projects.budget_categories.create` |
| `GET` | `/api/v1/projects/budget-categories/{id}` | `projects.budget_categories.view` |
| `PATCH` | `/api/v1/projects/budget-categories/{id}` | `projects.budget_categories.edit` |
| `DELETE` | `/api/v1/projects/budget-categories/{id}` | `projects.budget_categories.delete` |
| `GET` | `/api/v1/projects/stats` | `projects.projects.view` |
| `GET` | `/api/v1/projects` | `projects.projects.view` |
| `POST` | `/api/v1/projects` | `projects.projects.create` |
| `GET` | `/api/v1/projects/{id}` | `projects.projects.view` |
| `PATCH` | `/api/v1/projects/{id}` | `projects.projects.edit` |
| `DELETE` | `/api/v1/projects/{id}` | `projects.projects.delete` |
| `GET` | `/api/v1/projects/{id}/donors` | `projects.projects.view` |
| `POST` | `/api/v1/projects/{id}/donors` | `projects.projects.edit` |
| `PATCH` | `/api/v1/projects/{id}/donors/{donorId}` | `projects.projects.edit` |
| `DELETE` | `/api/v1/projects/{id}/donors/{donorId}` | `projects.projects.edit` |
| `GET` | `/api/v1/projects/{id}/partners` | `projects.projects.view` |
| `POST` | `/api/v1/projects/{id}/partners` | `projects.projects.edit` |
| `PATCH` | `/api/v1/projects/{id}/partners/{partnerId}` | `projects.projects.edit` |
| `DELETE` | `/api/v1/projects/{id}/partners/{partnerId}` | `projects.projects.edit` |
| `GET` | `/api/v1/projects/{id}/team` | `projects.projects.view` |
| `POST` | `/api/v1/projects/{id}/team` | `projects.projects.edit` |
| `PATCH` | `/api/v1/projects/{id}/team/{memberId}` | `projects.projects.edit` |
| `DELETE` | `/api/v1/projects/{id}/team/{memberId}` | `projects.projects.edit` |
| `GET` | `/api/v1/projects/{id}/activities` | `projects.activities.view` |
| `POST` | `/api/v1/projects/{id}/activities` | `projects.activities.create` |
| `PATCH` | `/api/v1/projects/{id}/activities/{activityId}` | `projects.activities.edit` |
| `DELETE` | `/api/v1/projects/{id}/activities/{activityId}` | `projects.activities.delete` |
| `GET` | `/api/v1/projects/{id}/budget-lines` | `projects.budget.view` |
| `POST` | `/api/v1/projects/{id}/budget-lines` | `projects.budget.create` |
| `PATCH` | `/api/v1/projects/{id}/budget-lines/{lineId}` | `projects.budget.edit` |
| `DELETE` | `/api/v1/projects/{id}/budget-lines/{lineId}` | `projects.budget.delete` |
| `GET` | `/api/v1/projects/{id}/notes` | `projects.notes.view` |
| `POST` | `/api/v1/projects/{id}/notes` | `projects.notes.create` |
| `PATCH` | `/api/v1/projects/{id}/notes/{noteId}` | `projects.notes.edit` |
| `DELETE` | `/api/v1/projects/{id}/notes/{noteId}` | `projects.notes.delete` |

### Communication Module (Permission-Based)

| Method | Endpoint | Permission |
|--------|----------|------------|
| `GET` | `/api/v1/communication/messages` | `communication.messages.view` |
| `GET` | `/api/v1/communication/messages/unread-count` | `communication.messages.view` |
| `GET` | `/api/v1/communication/messages/{threadId}` | `communication.messages.view` |
| `POST` | `/api/v1/communication/messages` | `communication.messages.create` |
| `DELETE` | `/api/v1/communication/messages/{id}` | `communication.messages.delete` |
| `GET` | `/api/v1/communication/forums` | `communication.forums.view` |
| `GET` | `/api/v1/communication/forums/{id}` | `communication.forums.view` |
| `POST` | `/api/v1/communication/forums` | `communication.forums.manage` |
| `PATCH` | `/api/v1/communication/forums/{id}` | `communication.forums.manage` |
| `DELETE` | `/api/v1/communication/forums/{id}` | `communication.forums.manage` |
| `GET` | `/api/v1/communication/forums/{forumId}/messages` | `communication.forums.view` |
| `GET` | `/api/v1/communication/forums/{forumId}/messages/{id}/replies` | `communication.forums.view` |
| `POST` | `/api/v1/communication/forums/{forumId}/messages` | `communication.forums.create` |
| `DELETE` | `/api/v1/communication/forums/{forumId}/messages/{id}` | `communication.forums.create` |
| `GET` | `/api/v1/communication/notices/stats` | `communication.notices.view` |
| `GET` | `/api/v1/communication/notices` | `communication.notices.view` |
| `GET` | `/api/v1/communication/notices/{id}` | `communication.notices.view` |
| `POST` | `/api/v1/communication/notices` | `communication.notices.create` |
| `PATCH` | `/api/v1/communication/notices/{id}` | `communication.notices.edit` |
| `DELETE` | `/api/v1/communication/notices/{id}` | `communication.notices.delete` |
| `GET` | `/api/v1/communication/notices/{id}/reads` | `communication.notices.view` |

### Reports Module (Permission-Based)

| Method | Endpoint | Permission |
|--------|----------|------------|
| `GET` | `/api/v1/reports/hr/employees` | `reports.reports.view` |
| `GET` | `/api/v1/reports/hr/departments` | `reports.reports.view` |
| `GET` | `/api/v1/reports/hr/designations` | `reports.reports.view` |
| `GET` | `/api/v1/reports/procurement/purchase-orders` | `reports.reports.view` |
| `GET` | `/api/v1/reports/procurement/requisitions` | `reports.reports.view` |
| `GET` | `/api/v1/reports/procurement/vendors` | `reports.reports.view` |
| `GET` | `/api/v1/reports/procurement/inventory` | `reports.reports.view` |
| `GET` | `/api/v1/reports/procurement/disbursements` | `reports.reports.view` |
| `GET` | `/api/v1/reports/projects/summary` | `reports.reports.view` |
| `GET` | `/api/v1/reports/projects/{id}/detail` | `reports.reports.download` |
| `GET` | `/api/v1/reports/projects/budget-utilization` | `reports.reports.view` |
| `GET` | `/api/v1/reports/projects/activity-progress` | `reports.reports.view` |
| `GET` | `/api/v1/reports/communication/notices` | `reports.reports.view` |
| `GET` | `/api/v1/reports/communication/forum-activity` | `reports.reports.view` |
| `GET` | `/api/v1/reports/finance/overview` | `reports.reports.view` |
| `GET` | `/api/v1/reports/audit/logs` | `reports.reports.audit` |
| `GET` | `/api/v1/reports/audit/login-history` | `reports.reports.audit` |

---

## 13. Reports Module

The Reports module provides downloadable reports across all system modules. No data is stored — reports are generated on-the-fly from existing data.

### 13.1 How Reports Work

**Preview mode** (no `format` param): Returns paginated JSON data for table display.

```
GET /api/v1/reports/hr/employees?department_id={uuid}&status=active
```

**Download mode** (with `format` param): Returns file download.

```
GET /api/v1/reports/hr/employees?format=csv&department_id={uuid}&status=active
GET /api/v1/reports/hr/employees?format=excel&department_id={uuid}
GET /api/v1/reports/hr/employees?format=pdf
```

### 13.2 Response Formats

**JSON Preview Response:**
```json
{
  "success": true,
  "data": {
    "rows": [
      { "staff_id": "EMP-001", "name": "John Doe", ... }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 3,
      "per_page": 25,
      "total": 75
    }
  }
}
```

**Download Response:** Binary file with appropriate Content-Type and Content-Disposition headers.

| Format | Content-Type | Extension |
|--------|-------------|----------|
| `csv` | `text/csv; charset=UTF-8` | `.csv` |
| `excel` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` |
| `pdf` | `application/pdf` | `.pdf` |

### 13.3 Available Reports & Filters

#### HR Reports

**Employees** — `GET /api/v1/reports/hr/employees`
| Filter | Type | Description |
|--------|------|-------------|
| `department_id` | uuid | Filter by department |
| `designation_id` | uuid | Filter by designation |
| `status` | string | `active`, `on_leave`, `suspended`, `terminated` |
| `gender` | string | `male`, `female` |
| `date_from` | date | Hire date range start |
| `date_to` | date | Hire date range end |

**Departments** — `GET /api/v1/reports/hr/departments`
| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | `active`, `inactive` |

**Designations** — `GET /api/v1/reports/hr/designations`
| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | `active`, `inactive` |
| `department_id` | uuid | Filter by department |

#### Procurement Reports

**Purchase Orders** — `GET /api/v1/reports/procurement/purchase-orders`
| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | `draft`, `pending`, `approved`, `rejected`, `cancelled` |
| `payment_status` | string | `unpaid`, `partial`, `paid` |
| `vendor_id` | uuid | Filter by vendor |
| `department_id` | uuid | Filter by department |
| `date_from` | date | Order date range start |
| `date_to` | date | Order date range end |

**Requisitions** — `GET /api/v1/reports/procurement/requisitions`
| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | `draft`, `pending`, `approved`, `rejected`, `cancelled` |
| `priority` | string | `low`, `medium`, `high`, `urgent` |
| `department_id` | uuid | Filter by department |
| `date_from` / `date_to` | date | Date range |

**Vendors** — `GET /api/v1/reports/procurement/vendors`
| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | `active`, `inactive` |

**Inventory** — `GET /api/v1/reports/procurement/inventory`
| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | `active`, `inactive` |
| `category` | string | Filter by category |

**Disbursements** — `GET /api/v1/reports/procurement/disbursements`
| Filter | Type | Description |
|--------|------|-------------|
| `payment_method` | string | `bank_transfer`, `cheque`, `cash`, `mobile_money` |
| `vendor_id` | uuid | Filter by vendor |
| `date_from` / `date_to` | date | Payment date range |

#### Project Reports

**Summary** — `GET /api/v1/reports/projects/summary`
| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | `planning`, `active`, `on_hold`, `completed`, `cancelled` |
| `department_id` | uuid | Filter by department |
| `date_from` / `date_to` | date | Project start date range |

**Project Detail** — `GET /api/v1/reports/projects/{id}/detail`
Full project download (donors, partners, team, activities, budget lines, notes). **Requires `format` parameter** — no JSON preview for this endpoint.

**Budget Utilization** — `GET /api/v1/reports/projects/budget-utilization`
| Filter | Type | Description |
|--------|------|-------------|
| `project_id` | uuid | Filter by project |

**Activity Progress** — `GET /api/v1/reports/projects/activity-progress`
| Filter | Type | Description |
|--------|------|-------------|
| `project_id` | uuid | Filter by project |
| `status` | string | `not_started`, `in_progress`, `completed`, `cancelled` |
| `date_from` / `date_to` | date | Activity date range |

#### Communication Reports

**Notices** — `GET /api/v1/reports/communication/notices`
| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | `draft`, `published`, `archived` |
| `priority` | string | `normal`, `important`, `critical` |
| `date_from` / `date_to` | date | Created date range |

**Forum Activity** — `GET /api/v1/reports/communication/forum-activity`
| Filter | Type | Description |
|--------|------|-------------|
| `forum_id` | uuid | Filter by forum |
| `date_from` / `date_to` | date | Message date range |

#### Finance Reports

**Overview** — `GET /api/v1/reports/finance/overview`
| Filter | Type | Description |
|--------|------|-------------|
| `department_id` | uuid | Filter by department |
| `date_from` / `date_to` | date | Transaction date range |

JSON response includes: `summary` (totals), `by_department` (breakdown), `by_payment_status`.

#### Audit Reports

**Audit Logs** — `GET /api/v1/reports/audit/logs`
| Filter | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Filter by user |
| `action` | string | e.g. `employee_created`, `report_downloaded` |
| `entity_type` | string | e.g. `employee`, `purchase_order`, `report` |
| `date_from` / `date_to` | date | Date range |

**Login History** — `GET /api/v1/reports/audit/login-history`
| Filter | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Filter by user |
| `success` | boolean | Filter by login success/failure |
| `date_from` / `date_to` | date | Login date range |

### 13.4 Permissions

| Permission Key | Description | Admin | Manager | Staff |
|---------------|-------------|:-----:|:-------:|:-----:|
| `reports.reports.view` | Preview report data (JSON) | Yes | Yes | Yes |
| `reports.reports.download` | Download CSV/Excel/PDF | Yes | Yes | Yes |
| `reports.reports.audit` | Access audit & login reports | Yes | No | No |

### 13.5 Frontend Implementation Notes

1. **Preview first, download second** — Load the endpoint without `format` to show data in a table. Add a download button that appends `?format=csv`, `?format=excel`, or `?format=pdf`.
2. **File downloads** — Use `window.open()` or fetch with `responseType: 'blob'` for downloads. The response is a binary file, not JSON.
3. **Audit reports are restricted** — Only users with `reports.reports.audit` permission can access audit log and login history. Check permissions before rendering these menu items.
4. **All downloads are audited** — Every report download creates an audit log entry.
