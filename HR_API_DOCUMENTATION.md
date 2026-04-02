# CASI360 HR Module — API Endpoints Documentation

> **Base URL:** `http://localhost:8000/api/v1`  
> **Auth:** All HR endpoints require a valid Sanctum session/token (`auth:sanctum`).  
> **Write operations** (POST, PATCH, DELETE) require role: `super_admin`, `admin`, or `manager`.  
> **Read operations** (GET) are available to any authenticated user.

---

## Table of Contents

1. [Departments](#1-departments)
2. [Designations](#2-designations)
3. [Employees (Staff)](#3-employees-staff)
4. [Notes](#4-notes)

---

## 1. Departments

### 1.1 List Departments

```
GET /api/v1/hr/departments
```

**Query Parameters:**

| Param      | Type   | Default | Description                                        |
|------------|--------|---------|----------------------------------------------------|
| `search`   | string | —       | Search by name, head, or description               |
| `status`   | string | —       | Filter: `active` or `inactive`                     |
| `sort_by`  | string | `name`  | Sort field: `name`, `head`, `status`, `created_at` |
| `sort_dir` | string | `asc`   | Sort direction: `asc` or `desc`                    |
| `per_page` | int    | `25`    | Items per page. Pass `0` to get all                |
| `page`     | int    | `1`     | Page number                                        |

**Sample Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/hr/departments?status=active&per_page=5" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "departments": [
      {
        "id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
        "name": "Administration",
        "head": "Daniel Okonkwo",
        "employee_count": 3,
        "description": "Oversees organizational administration and governance",
        "color": "#6366F1",
        "status": "active",
        "created_at": "2026-03-04T10:00:00.000000Z",
        "updated_at": "2026-03-04T10:00:00.000000Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 2,
      "per_page": 5,
      "total": 10
    }
  }
}
```

---

### 1.2 Get Department

```
GET /api/v1/hr/departments/{id}
```

**Sample Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/hr/departments/9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "department": {
      "id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "name": "Administration",
      "head": "Daniel Okonkwo",
      "employee_count": 3,
      "description": "Oversees organizational administration and governance",
      "color": "#6366F1",
      "status": "active",
      "created_at": "2026-03-04T10:00:00.000000Z",
      "updated_at": "2026-03-04T10:00:00.000000Z"
    }
  }
}
```

---

### 1.3 Create Department

```
POST /api/v1/hr/departments
```

**Requires role:** `super_admin`, `admin`, or `manager`

**Request Body:**

| Field         | Type   | Required | Validation                       |
|---------------|--------|----------|----------------------------------|
| `name`        | string | Yes      | Max 255, unique                  |
| `head`        | string | No       | Max 255                          |
| `description` | string | No       | Max 1000                         |
| `color`       | string | No       | Hex color, e.g. `#6366F1`       |
| `status`      | string | No       | `active` (default) or `inactive` |

**Sample Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/hr/departments" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing",
    "head": "Jane Smith",
    "description": "Handles marketing campaigns and brand management",
    "color": "#F43F5E"
  }'
```

**Sample Response (201):**
```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "department": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Marketing",
      "head": "Jane Smith",
      "employee_count": 0,
      "description": "Handles marketing campaigns and brand management",
      "color": "#F43F5E",
      "status": "active",
      "created_at": "2026-03-04T12:00:00.000000Z",
      "updated_at": "2026-03-04T12:00:00.000000Z"
    }
  }
}
```

**Validation Error (422):**
```json
{
  "message": "The name has already been taken.",
  "errors": {
    "name": ["A department with this name already exists."]
  }
}
```

---

### 1.4 Update Department

```
PATCH /api/v1/hr/departments/{id}
```

**Requires role:** `super_admin`, `admin`, or `manager`

**Request Body:** Same as create, all fields optional.

**Sample Request:**
```bash
curl -X PATCH "http://localhost:8000/api/v1/hr/departments/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "head": "John Doe",
    "color": "#10B981"
  }'
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Department updated successfully",
  "data": {
    "department": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Marketing",
      "head": "John Doe",
      "employee_count": 0,
      "description": "Handles marketing campaigns and brand management",
      "color": "#10B981",
      "status": "active",
      "created_at": "2026-03-04T12:00:00.000000Z",
      "updated_at": "2026-03-04T12:05:00.000000Z"
    }
  }
}
```

---

### 1.5 Delete Department

```
DELETE /api/v1/hr/departments/{id}
```

**Requires role:** `super_admin`, `admin`, or `manager`

> Cannot delete a department that has active (non-terminated) employees.

**Sample Request:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/hr/departments/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Department deleted successfully",
  "data": null
}
```

**Error — has active employees (422):**
```json
{
  "success": false,
  "message": "Cannot delete department with active employees. Reassign or terminate them first."
}
```

---

## 2. Designations

### 2.1 List Designations

```
GET /api/v1/hr/designations
```

**Query Parameters:**

| Param           | Type   | Default | Description                                           |
|-----------------|--------|---------|-------------------------------------------------------|
| `search`        | string | —       | Search by title, description, or department name      |
| `status`        | string | —       | Filter: `active` or `inactive`                        |
| `department_id` | uuid   | —       | Filter by department UUID                             |
| `level`         | string | —       | Filter: `junior`, `mid`, `senior`, `lead`, `executive`|
| `sort_by`       | string | `title` | Sort field: `title`, `level`, `status`, `created_at`  |
| `sort_dir`      | string | `asc`   | Sort direction: `asc` or `desc`                       |
| `per_page`      | int    | `25`    | Items per page. Pass `0` to get all                   |
| `page`          | int    | `1`     | Page number                                           |

**Sample Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/hr/designations?level=senior&per_page=10" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "designations": [
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "title": "Program Manager",
        "department_id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
        "department": "Programs",
        "level": "senior",
        "employee_count": 2,
        "description": "Oversees program design, implementation, and evaluation",
        "status": "active",
        "created_at": "2026-03-04T10:00:00.000000Z",
        "updated_at": "2026-03-04T10:00:00.000000Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 1,
      "per_page": 10,
      "total": 4
    }
  }
}
```

---

### 2.2 Get Designation

```
GET /api/v1/hr/designations/{id}
```

**Sample Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/hr/designations/b2c3d4e5-f6a7-8901-bcde-f12345678901" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "designation": {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "title": "Program Manager",
      "department_id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "department": "Programs",
      "level": "senior",
      "employee_count": 2,
      "description": "Oversees program design, implementation, and evaluation",
      "status": "active",
      "created_at": "2026-03-04T10:00:00.000000Z",
      "updated_at": "2026-03-04T10:00:00.000000Z"
    }
  }
}
```

---

### 2.3 Create Designation

```
POST /api/v1/hr/designations
```

**Requires role:** `super_admin`, `admin`, or `manager`

**Request Body:**

| Field           | Type   | Required | Validation                                            |
|-----------------|--------|----------|-------------------------------------------------------|
| `title`         | string | Yes      | Max 255                                               |
| `department_id` | uuid   | Yes      | Must exist in departments table                       |
| `level`         | string | Yes      | `junior`, `mid`, `senior`, `lead`, or `executive`     |
| `description`   | string | No       | Max 1000                                              |
| `status`        | string | No       | `active` (default) or `inactive`                      |

**Sample Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/hr/designations" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Marketing Specialist",
    "department_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "level": "mid",
    "description": "Plans and executes marketing campaigns"
  }'
```

**Sample Response (201):**
```json
{
  "success": true,
  "message": "Designation created successfully",
  "data": {
    "designation": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "title": "Marketing Specialist",
      "department_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "department": "Marketing",
      "level": "mid",
      "employee_count": 0,
      "description": "Plans and executes marketing campaigns",
      "status": "active",
      "created_at": "2026-03-04T12:10:00.000000Z",
      "updated_at": "2026-03-04T12:10:00.000000Z"
    }
  }
}
```

---

### 2.4 Update Designation

```
PATCH /api/v1/hr/designations/{id}
```

**Requires role:** `super_admin`, `admin`, or `manager`

**Request Body:** Same as create, all fields optional.

**Sample Request:**
```bash
curl -X PATCH "http://localhost:8000/api/v1/hr/designations/c3d4e5f6-a7b8-9012-cdef-123456789012" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "senior",
    "description": "Leads and plans marketing campaigns"
  }'
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Designation updated successfully",
  "data": {
    "designation": {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "title": "Marketing Specialist",
      "department_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "department": "Marketing",
      "level": "senior",
      "employee_count": 0,
      "description": "Leads and plans marketing campaigns",
      "status": "active",
      "created_at": "2026-03-04T12:10:00.000000Z",
      "updated_at": "2026-03-04T12:15:00.000000Z"
    }
  }
}
```

---

### 2.5 Delete Designation

```
DELETE /api/v1/hr/designations/{id}
```

**Requires role:** `super_admin`, `admin`, or `manager`

> Cannot delete a designation that has active (non-terminated) employees.

**Sample Request:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/hr/designations/c3d4e5f6-a7b8-9012-cdef-123456789012" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Designation deleted successfully",
  "data": null
}
```

**Error — has active employees (422):**
```json
{
  "success": false,
  "message": "Cannot delete designation with active employees. Reassign them first."
}
```

---

## 3. Employees (Staff)

### 3.1 List Employees

```
GET /api/v1/hr/employees
```

**Query Parameters:**

| Param            | Type   | Default | Description                                                    |
|------------------|--------|---------|----------------------------------------------------------------|
| `search`         | string | —       | Search by name, email, staff_id, or phone                      |
| `status`         | string | —       | Filter: `active`, `on_leave`, `terminated`                     |
| `department_id`  | uuid   | —       | Filter by department UUID                                      |
| `designation_id` | uuid   | —       | Filter by designation UUID                                     |
| `gender`         | string | —       | Filter: `male`, `female`, `other`                              |
| `sort_by`        | string | `name`  | Sort: `name`, `email`, `staff_id`, `status`, `join_date`, `salary`, `created_at` |
| `sort_dir`       | string | `asc`   | Sort direction: `asc` or `desc`                                |
| `per_page`       | int    | `25`    | Items per page                                                 |
| `page`           | int    | `1`     | Page number                                                    |

**Sample Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/hr/employees?status=active&department_id=9c1a...&per_page=10" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "employees": [
      {
        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
        "staff_id": "CASI-1001",
        "name": "Adaeze Obi",
        "email": "adaeze@casi.org",
        "phone": "+234 801 111 0001",
        "department_id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
        "department": "Administration",
        "designation_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "position": "Administrative Assistant",
        "manager": "Daniel Okonkwo",
        "status": "active",
        "join_date": "2023-01-15",
        "termination_date": null,
        "salary": 450000,
        "avatar": null,
        "address": null,
        "gender": null,
        "date_of_birth": null,
        "emergency_contact_name": null,
        "emergency_contact_phone": null,
        "created_at": "2026-03-04T10:00:00.000000Z",
        "updated_at": "2026-03-04T10:00:00.000000Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 3,
      "per_page": 10,
      "total": 25
    }
  }
}
```

---

### 3.2 Get Employee

```
GET /api/v1/hr/employees/{id}
```

**Sample Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/hr/employees/d4e5f6a7-b8c9-0123-defa-234567890123" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "employee": {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "staff_id": "CASI-1001",
      "name": "Adaeze Obi",
      "email": "adaeze@casi.org",
      "phone": "+234 801 111 0001",
      "department_id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "department": "Administration",
      "designation_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "position": "Administrative Assistant",
      "manager": "Daniel Okonkwo",
      "status": "active",
      "join_date": "2023-01-15",
      "termination_date": null,
      "salary": 450000,
      "avatar": null,
      "address": null,
      "gender": null,
      "date_of_birth": null,
      "emergency_contact_name": null,
      "emergency_contact_phone": null,
      "created_at": "2026-03-04T10:00:00.000000Z",
      "updated_at": "2026-03-04T10:00:00.000000Z"
    }
  }
}
```

---

### 3.3 Create Employee

```
POST /api/v1/hr/employees
```

**Requires role:** `super_admin`, `admin`, or `manager`

> `staff_id` is **auto-generated** (format: `CASI-XXXX`). Do not include it in the request.

**Request Body:**

| Field                    | Type    | Required | Validation                          |
|--------------------------|---------|----------|-------------------------------------|
| `name`                   | string  | Yes      | Max 255                             |
| `email`                  | string  | Yes      | Valid email, unique                  |
| `phone`                  | string  | No       | Max 30                              |
| `department_id`          | uuid    | Yes      | Must exist in departments            |
| `designation_id`         | uuid    | Yes      | Must exist in designations           |
| `manager`                | string  | No       | Max 255                             |
| `status`                 | string  | No       | `active` (default), `on_leave`, `terminated` |
| `join_date`              | date    | Yes      | `YYYY-MM-DD`                        |
| `salary`                 | numeric | No       | Min 0                               |
| `avatar`                 | string  | No       | Max 500 (URL)                       |
| `address`                | string  | No       | Max 1000                            |
| `gender`                 | string  | No       | `male`, `female`, `other`           |
| `date_of_birth`          | date    | No       | Must be before today                |
| `emergency_contact_name` | string  | No       | Max 255                             |
| `emergency_contact_phone`| string  | No       | Max 30                              |

**Sample Request:**
```bash
curl -X POST "http://localhost:8000/api/v1/hr/employees" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aisha Mohammed",
    "email": "aisha@casi.org",
    "phone": "+234 801 222 3333",
    "department_id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "designation_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "manager": "Daniel Okonkwo",
    "join_date": "2026-03-01",
    "salary": 400000,
    "gender": "female",
    "date_of_birth": "1995-06-15",
    "address": "15 Victoria Island, Lagos",
    "emergency_contact_name": "Musa Mohammed",
    "emergency_contact_phone": "+234 809 111 2222"
  }'
```

**Sample Response (201):**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "employee": {
      "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
      "staff_id": "CASI-1026",
      "name": "Aisha Mohammed",
      "email": "aisha@casi.org",
      "phone": "+234 801 222 3333",
      "department_id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "department": "Administration",
      "designation_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "position": "Administrative Assistant",
      "manager": "Daniel Okonkwo",
      "status": "active",
      "join_date": "2026-03-01",
      "termination_date": null,
      "salary": 400000,
      "avatar": null,
      "address": "15 Victoria Island, Lagos",
      "gender": "female",
      "date_of_birth": "1995-06-15",
      "emergency_contact_name": "Musa Mohammed",
      "emergency_contact_phone": "+234 809 111 2222",
      "created_at": "2026-03-04T12:30:00.000000Z",
      "updated_at": "2026-03-04T12:30:00.000000Z"
    }
  }
}
```

---

### 3.4 Update Employee

```
PATCH /api/v1/hr/employees/{id}
```

**Requires role:** `super_admin`, `admin`, or `manager`

**Request Body:** Same as create, all fields optional. Additionally accepts `termination_date` (date, must be >= join_date).

**Sample Request:**
```bash
curl -X PATCH "http://localhost:8000/api/v1/hr/employees/e5f6a7b8-c9d0-1234-efab-345678901234" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "salary": 450000,
    "phone": "+234 801 222 4444"
  }'
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "employee": {
      "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
      "staff_id": "CASI-1026",
      "name": "Aisha Mohammed",
      "email": "aisha@casi.org",
      "phone": "+234 801 222 4444",
      "department_id": "9c1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
      "department": "Administration",
      "designation_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "position": "Administrative Assistant",
      "manager": "Daniel Okonkwo",
      "status": "active",
      "join_date": "2026-03-01",
      "termination_date": null,
      "salary": 450000,
      "avatar": null,
      "address": "15 Victoria Island, Lagos",
      "gender": "female",
      "date_of_birth": "1995-06-15",
      "emergency_contact_name": "Musa Mohammed",
      "emergency_contact_phone": "+234 809 111 2222",
      "created_at": "2026-03-04T12:30:00.000000Z",
      "updated_at": "2026-03-04T12:35:00.000000Z"
    }
  }
}
```

---

### 3.5 Terminate Employee (Delete)

```
DELETE /api/v1/hr/employees/{id}
```

**Requires role:** `super_admin`, `admin`, or `manager`

> This is a **soft termination** — sets `status` to `terminated` and records `termination_date`. Does NOT delete the record.

**Sample Request:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/hr/employees/e5f6a7b8-c9d0-1234-efab-345678901234" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Employee terminated successfully",
  "data": {
    "employee": {
      "id": "e5f6a7b8-c9d0-1234-efab-345678901234",
      "staff_id": "CASI-1026",
      "name": "Aisha Mohammed",
      "status": "terminated",
      "termination_date": "2026-03-04",
      "...": "..."
    }
  }
}
```

**Error — already terminated (422):**
```json
{
  "success": false,
  "message": "Employee is already terminated."
}
```

---

### 3.6 Update Employee Status

```
PATCH /api/v1/hr/employees/{id}/status
```

**Requires role:** `super_admin`, `admin`, or `manager`

**Request Body:**

| Field    | Type   | Required | Validation                             |
|----------|--------|----------|----------------------------------------|
| `status` | string | Yes      | `active`, `on_leave`, or `terminated`  |

**Sample Request:**
```bash
curl -X PATCH "http://localhost:8000/api/v1/hr/employees/d4e5f6a7-b8c9-0123-defa-234567890123/status" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"status": "on_leave"}'
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Employee status updated successfully",
  "data": {
    "employee": {
      "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "staff_id": "CASI-1001",
      "name": "Adaeze Obi",
      "status": "on_leave",
      "...": "..."
    }
  }
}
```

---

### 3.7 Employee Statistics

```
GET /api/v1/hr/employees/stats
```

**Sample Request:**
```bash
curl -X GET "http://localhost:8000/api/v1/hr/employees/stats" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "total": 25,
    "active": 22,
    "on_leave": 2,
    "terminated": 1,
    "by_department": [
      { "department_id": "9c1a2b3c-...", "department": "Administration", "count": 3 },
      { "department_id": "abc12345-...", "department": "Programs", "count": 5 },
      { "department_id": "def67890-...", "department": "Finance", "count": 4 },
      { "department_id": "ghi11111-...", "department": "IT", "count": 4 },
      { "department_id": "jkl22222-...", "department": "HR", "count": 3 },
      { "department_id": "mno33333-...", "department": "Operations", "count": 3 },
      { "department_id": "pqr44444-...", "department": "Communications", "count": 2 }
    ]
  }
}
```

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthenticated."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to access this resource."
}
```

### 404 Not Found
```json
{
  "message": "No query results for model [App\\Models\\Department] 9c1a2b3c-..."
}
```

### 422 Validation Error
```json
{
  "message": "The name field is required.",
  "errors": {
    "name": ["The name field is required."]
  }
}
```

---

## 4. Notes

Employee notes/memos attached to specific employees. Supports full CRUD operations.

### 4.1 List Notes

```
GET /api/v1/hr/notes
```

**Query Parameters:**

| Param         | Type   | Default      | Description                         |
|---------------|--------|-------------|--------------------------------------|
| `search`      | string | —           | Search by title or content           |
| `employee_id` | string | —           | Filter by employee UUID              |
| `type`        | string | —           | Filter: `general`, `performance`, `disciplinary`, `commendation`, `medical`, `training` |
| `priority`    | string | —           | Filter: `low`, `medium`, `high`      |
| `sort_by`     | string | `created_at`| Sort field: `title`, `type`, `priority`, `created_at`, `updated_at` |
| `sort_dir`    | string | `desc`      | Sort direction: `asc` or `desc`      |
| `per_page`    | int    | `15`        | Items per page (max 100)             |
| `page`        | int    | `1`         | Page number                          |

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "notes": [
      {
        "id": "uuid-here",
        "employee_id": "employee-uuid",
        "employee": { "id": "employee-uuid", "name": "Adaeze Obi" },
        "title": "Performance Review Q1",
        "content": "Strong performance across all KPIs...",
        "type": "performance",
        "priority": "high",
        "created_by": "user-uuid",
        "created_by_name": "Daniel Okonkwo",
        "created_at": "2026-01-15T10:00:00.000000Z",
        "updated_at": "2026-01-15T10:00:00.000000Z"
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 1,
      "per_page": 15,
      "total": 12,
      "from": 1,
      "to": 12
    }
  }
}
```

### 4.2 Get Single Note

```
GET /api/v1/hr/notes/{id}
```

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "note": {
      "id": "uuid-here",
      "employee_id": "employee-uuid",
      "employee": { "id": "employee-uuid", "name": "Adaeze Obi" },
      "title": "Performance Review Q1",
      "content": "Strong performance across all KPIs...",
      "type": "performance",
      "priority": "high",
      "created_by": "user-uuid",
      "created_by_name": "Daniel Okonkwo",
      "created_at": "2026-01-15T10:00:00.000000Z",
      "updated_at": "2026-01-15T10:00:00.000000Z"
    }
  }
}
```

### 4.3 Create Note

```
POST /api/v1/hr/notes
```

**Required role:** `super_admin`, `admin`, or `manager`

**Request Body:**

| Field         | Type   | Required | Description                                                              |
|---------------|--------|----------|--------------------------------------------------------------------------|
| `employee_id` | string | yes      | UUID of the employee                                                     |
| `title`       | string | yes      | Brief subject line (max 255 chars)                                       |
| `content`     | string | yes      | Full note body (max 10000 chars)                                         |
| `type`        | string | no       | One of: `general`, `performance`, `disciplinary`, `commendation`, `medical`, `training` (default: `general`) |
| `priority`    | string | no       | One of: `low`, `medium`, `high` (default: `medium`)                      |

**Sample Request:**
```json
{
  "employee_id": "employee-uuid",
  "title": "Performance Review Q1",
  "content": "Strong performance across all KPIs.",
  "type": "performance",
  "priority": "high"
}
```

**Sample Response (201):**
```json
{
  "success": true,
  "message": "Note created successfully",
  "data": {
    "note": {
      "id": "new-uuid",
      "employee_id": "employee-uuid",
      "employee": { "id": "employee-uuid", "name": "Adaeze Obi" },
      "title": "Performance Review Q1",
      "content": "Strong performance across all KPIs.",
      "type": "performance",
      "priority": "high",
      "created_by": "user-uuid",
      "created_by_name": "Daniel Okonkwo",
      "created_at": "2026-03-26T10:00:00.000000Z",
      "updated_at": "2026-03-26T10:00:00.000000Z"
    }
  }
}
```

### 4.4 Update Note

```
PATCH /api/v1/hr/notes/{id}
```

**Required role:** `super_admin`, `admin`, or `manager`

All fields are optional. Only send the fields to update.

**Request Body:**

| Field         | Type   | Required | Description                            |
|---------------|--------|----------|----------------------------------------|
| `employee_id` | string | no       | UUID of the employee                   |
| `title`       | string | no       | Brief subject line                     |
| `content`     | string | no       | Full note body                         |
| `type`        | string | no       | Note type enum                         |
| `priority`    | string | no       | Priority enum                          |

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Note updated successfully",
  "data": {
    "note": { ... }
  }
}
```

### 4.5 Delete Note

```
DELETE /api/v1/hr/notes/{id}
```

**Required role:** `super_admin`, `admin`, or `manager`

**Sample Response (200):**
```json
{
  "success": true,
  "message": "Note deleted successfully",
  "data": null
}
```

---

## Files Created / Modified

### New Files

| File | Purpose |
|------|---------|
| `database/migrations/0001_01_01_000004_create_departments_table.php` | Departments table migration |
| `database/migrations/0001_01_01_000005_create_designations_table.php` | Designations table migration |
| `database/migrations/0001_01_01_000006_create_employees_table.php` | Employees table migration |
| `app/Models/Department.php` | Department model |
| `app/Models/Designation.php` | Designation model |
| `app/Models/Employee.php` | Employee model |
| `app/Http/Controllers/HR/DepartmentController.php` | Department CRUD controller |
| `app/Http/Controllers/HR/DesignationController.php` | Designation CRUD controller |
| `app/Http/Controllers/HR/EmployeeController.php` | Employee CRUD controller |
| `app/Http/Requests/HR/StoreDepartmentRequest.php` | Create department validation |
| `app/Http/Requests/HR/UpdateDepartmentRequest.php` | Update department validation |
| `app/Http/Requests/HR/StoreDesignationRequest.php` | Create designation validation |
| `app/Http/Requests/HR/UpdateDesignationRequest.php` | Update designation validation |
| `app/Http/Requests/HR/StoreEmployeeRequest.php` | Create employee validation |
| `app/Http/Requests/HR/UpdateEmployeeRequest.php` | Update employee validation |
| `app/Http/Controllers/HR/NoteController.php` | Notes CRUD controller |
| `app/Http/Requests/HR/StoreNoteRequest.php` | Create note validation |
| `app/Http/Requests/HR/UpdateNoteRequest.php` | Update note validation |
| `app/Models/Note.php` | Note model |
| `database/migrations/0001_01_01_000007_create_notes_table.php` | Notes table migration |
| `database/seeders/NoteSeeder.php` | Seed sample notes data |
| `database/seeders/HRSeeder.php` | Seed sample HR data |

### Modified Files

| File | Change |
|------|--------|
| `routes/api.php` | Added HR route imports and route group (auth routes untouched) |
| `database/seeders/DatabaseSeeder.php` | Added `HRSeeder` and `NoteSeeder` to seeder chain |

---

## 5. System Settings

Key-value configuration store for organization details, localization, appearance, and system behaviour.

### 5.1 Get Public Settings (No Auth)

```
GET /api/v1/settings/general/public
```

Returns settings marked as `is_public = true` (org name, logo, colors, maintenance mode). No authentication required — used on login page, public pages, etc.

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "settings": {
      "organization": {
        "org_name": "CASI",
        "org_acronym": "CASI",
        "org_email": "info@casi.org",
        "org_phone": null,
        "org_website": "https://casi360.com",
        "org_logo_url": null
      },
      "appearance": {
        "primary_color": "#1E40AF",
        "accent_color": "#F59E0B",
        "login_bg_url": null,
        "favicon_url": null
      },
      "system": {
        "maintenance_mode": false,
        "maintenance_message": "The system is currently undergoing maintenance...",
        "allow_self_registration": false
      }
    }
  }
}
```

### 5.2 Get All Settings (Super Admin)

```
GET /api/v1/settings/general
Authorization: Sanctum cookie (super_admin)
```

Returns all settings grouped by group, with full metadata (id, type, label, description).

**Response:**
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
          "key": "org_name",
          "value": "CASI",
          "type": "string",
          "label": "Organization Name",
          "description": "Full name of the organization.",
          "is_public": true
        }
      ],
      "localization": [...],
      "appearance": [...],
      "system": [...]
    }
  }
}
```

### 5.3 Get Single Setting (Super Admin)

```
GET /api/v1/settings/general/{key}
Authorization: Sanctum cookie (super_admin)
```

### 5.4 Update Single Setting (Super Admin)

```
PATCH /api/v1/settings/general/{key}
Authorization: Sanctum cookie (super_admin)
Content-Type: application/json
```

**Body:**
```json
{
  "value": "New Organization Name"
}
```

Type casting is automatic — boolean settings accept `true`/`false`, integer settings validate numeric input, JSON settings accept arrays/objects.

### 5.5 Bulk Update Settings (Super Admin)

```
PATCH /api/v1/settings/general/bulk
Authorization: Sanctum cookie (super_admin)
Content-Type: application/json
```

**Body:**
```json
{
  "settings": {
    "org_name": "New Org Name",
    "primary_color": "#3B82F6",
    "timezone": "America/Chicago"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "3 setting(s) updated successfully.",
  "data": {
    "updated": ["org_name", "primary_color", "timezone"],
    "count": 3
  }
}
```

### Setting Groups

| Group | Keys | Description |
|-------|------|-------------|
| `organization` | `org_name`, `org_acronym`, `org_email`, `org_phone`, `org_address`, `org_city`, `org_state`, `org_country`, `org_website`, `org_logo_url` | Organization identity |
| `localization` | `timezone`, `date_format`, `time_format`, `currency`, `currency_symbol`, `language` | Regional preferences |
| `appearance` | `primary_color`, `accent_color`, `login_bg_url`, `favicon_url` | Visual customization |
| `system` | `maintenance_mode`, `maintenance_message`, `session_lifetime_minutes`, `pagination_default`, `allow_self_registration`, `password_min_length`, `max_login_attempts` | System behaviour |

---

## Setup Commands

Once PHP is available, run these to activate the new tables and seed data:

```bash
cd backend
php artisan migrate
php artisan db:seed --class=HRSeeder
php artisan db:seed --class=NoteSeeder
php artisan db:seed --class=SystemSettingsSeeder
```
