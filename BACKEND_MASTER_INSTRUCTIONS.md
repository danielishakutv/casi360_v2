# CASI360 Backend — Master AI Instructions

> **This document is the single source of truth for any AI model working on the CASI360 backend.**
> Before creating, editing, or deleting any file — read this document first.
> Last updated: March 13, 2026

---

## TABLE OF CONTENTS

1. [Project Identity](#1-project-identity)
2. [Critical Safety Rules](#2-critical-safety-rules)
3. [Technology Stack](#3-technology-stack)
4. [Architecture & File Structure](#4-architecture--file-structure)
5. [Database Schema (Complete)](#5-database-schema-complete)
6. [Coding Patterns & Conventions](#6-coding-patterns--conventions)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Route Registration Pattern](#8-route-registration-pattern)
9. [Existing Modules (DO NOT MODIFY)](#9-existing-modules-do-not-modify)
10. [How to Build a New Module](#10-how-to-build-a-new-module)
11. [Complete Model Reference](#11-complete-model-reference)
12. [Complete Migration Reference](#12-complete-migration-reference)
13. [Middleware Reference](#13-middleware-reference)
14. [Configuration Reference](#14-configuration-reference)
15. [Seeder Pattern](#15-seeder-pattern)
16. [Testing After Changes](#16-testing-after-changes)
17. [Deployment Checklist](#17-deployment-checklist)
18. [Modules Roadmap](#18-modules-roadmap)

---

## 1. Project Identity

| Item | Value |
|------|-------|
| **Name** | CASI360 — Care Aid Support Initiative Management System |
| **Type** | Internal NGO management platform |
| **Backend** | Laravel 11 API (headless, no Blade views) |
| **Frontend** | Next.js 16 static export (separate deployment) |
| **API Domain** | `https://api.casi360.com` (production) |
| **Frontend Domain** | `https://casi360.com` (production) |
| **Server Host** | `vmi2446060` — SSH as `api.casi360.com@vmi2446060` |
| **Server App Path** | `~/` (home directory of the `api.casi360.com` user) |
| **API Prefix** | All routes under `/api/v1` |
| **Primary Keys** | UUID v4 on all tables |
| **Auth** | Laravel Sanctum 4.0 cookie-based SPA authentication |
| **Database** | MySQL 8, `utf8mb4_unicode_ci`, InnoDB |
| **PHP Version** | 8.2+ |

---

## 2. Critical Safety Rules

### FILES YOU MUST NEVER MODIFY (unless explicitly asked)

```
bootstrap/app.php                          ← App bootstrap, exception handling, middleware stack
config/sanctum.php                         ← Sanctum stateful domains
config/cors.php                            ← CORS headers for frontend
config/session.php                         ← Session driver, domain, cookies
config/database.php                        ← DB connection
config/auth.php                            ← Auth guards
config/hashing.php                         ← Bcrypt config
app/Http/Controllers/Controller.php        ← Base controller with success()/error() helpers
app/Http/Middleware/SecurityHeaders.php     ← Security headers
app/Http/Middleware/ForcePasswordChange.php ← Force password change middleware
app/Http/Middleware/RoleMiddleware.php      ← Role-checking middleware
app/Http/Middleware/CacheResponse.php       ← Response caching middleware
app/Http/Middleware/ETagResponse.php        ← ETag conditional GET middleware
app/Http/Middleware/InvalidateCache.php     ← Cache invalidation middleware
app/Services/CacheService.php              ← Centralized cache management
app/Providers/AppServiceProvider.php       ← HTTPS forcing in production
```

### FILES YOU MUST NEVER DELETE

All existing controllers, models, migrations, form requests, middleware, and config files.

### MODULE FILES YOU MUST NEVER MODIFY

```
app/Http/Controllers/Auth/*                ← Login, Logout, Password, Profile, Register, UserManagement
app/Http/Controllers/HR/*                  ← Department, Designation, Employee
app/Http/Requests/Auth/*                   ← All auth form requests (8 files)
app/Http/Requests/HR/*                     ← All HR form requests (6 files)
app/Http/Controllers/Procurement/*         ← All procurement controllers
app/Http/Controllers/Projects/*            ← All project controllers
app/Http/Controllers/Communication/*       ← All communication controllers
app/Http/Controllers/Reports/*             ← All report controllers
app/Services/ReportExportService.php       ← Report export service (CSV/Excel/PDF)
app/Exports/GenericExport.php              ← Excel export helper
app/Models/User.php                        ← User model
app/Models/AuditLog.php                    ← Audit log model
app/Models/LoginHistory.php                ← Login history model
app/Models/Department.php                  ← Department model
app/Models/Designation.php                 ← Designation model
app/Models/Employee.php                    ← Employee model
database/migrations/0001_01_01_000000_*    ← Users, password_reset_tokens, sessions
database/migrations/0001_01_01_000001_*    ← Personal access tokens
database/migrations/0001_01_01_000002_*    ← Audit logs
database/migrations/0001_01_01_000003_*    ← Login history
database/migrations/0001_01_01_000004_*    ← Departments
database/migrations/0001_01_01_000005_*    ← Designations
database/migrations/0001_01_01_000006_*    ← Employees
database/seeders/UserSeeder.php            ← 5 demo users
database/seeders/HRSeeder.php              ← 10 departments, 20 designations, 25 employees
```

### WHAT YOU MAY DO

- **CREATE** new files in new module folders (Controllers, Models, Requests, Migrations, Seeders)
- **APPEND** new route groups to the BOTTOM of `routes/api.php` (inside the existing `v1` prefix group)
- **APPEND** new seeder class calls to `DatabaseSeeder.php`
- **CREATE** new models that have relationships to existing models (e.g., a PurchaseOrder that `belongsTo` a department)
- You may read any file for reference

---

## 3. Technology Stack

### composer.json Dependencies

```json
{
  "require": {
    "php": "^8.2",
    "laravel/framework": "^11.0",
    "laravel/sanctum": "^4.0",
    "laravel/tinker": "^2.9",
    "guzzlehttp/guzzle": "^7.8"
  }
}
```

### Key Laravel Features Used

- **Sanctum stateful SPA auth** (cookie/session based, NOT token based)
- **UUID primary keys** via `HasUuids` trait on all models
- **Form Request validation** (dedicated Request classes, NOT inline validation)
- **Eloquent ORM** with relationships, scopes, and accessors
- **Database sessions** (not file/cookie)
- **AuditLog** for all CRUD operations
- **Rate limiting** on auth endpoints via throttle middleware

---

## 4. Architecture & File Structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php              ← Base: success() and error() helpers
│   │   │   ├── Auth/                       ← ✅ DONE — DO NOT MODIFY
│   │   │   │   ├── LoginController.php
│   │   │   │   ├── PasswordController.php
│   │   │   │   ├── ProfileController.php
│   │   │   │   ├── RegisterController.php
│   │   │   │   └── UserManagementController.php
│   │   │   ├── HR/                         ← ✅ DONE — DO NOT MODIFY
│   │   │   │   ├── DepartmentController.php
│   │   │   │   ├── DesignationController.php
│   │   │   │   └── EmployeeController.php
│   │   │   ├── Procurement/               ← ✅ DONE
│   │   │   ├── Projects/                  ← ✅ DONE
│   │   │   ├── Communication/             ← ✅ DONE
│   │   │   └── Reports/                   ← ✅ DONE (read-only, no form requests)
│   │   ├── Middleware/
│   │   │   ├── ForcePasswordChange.php     ← DO NOT MODIFY
│   │   │   ├── RoleMiddleware.php          ← DO NOT MODIFY
│   │   │   └── SecurityHeaders.php         ← DO NOT MODIFY
│   │   └── Requests/
│   │       ├── Auth/                       ← ✅ DONE (8 files)
│   │       ├── HR/                         ← ✅ DONE (6 files)
│   │       ├── Procurement/               ← ✅ DONE
│   │       ├── Projects/                  ← ✅ DONE
│   │       └── Communication/             ← ✅ DONE
│   ├── Models/
│   │   ├── User.php                        ← ✅ DONE
│   │   ├── AuditLog.php                    ← ✅ DONE (shared by all modules)
│   │   ├── LoginHistory.php                ← ✅ DONE
│   │   ├── Department.php                  ← ✅ DONE
│   │   ├── Designation.php                 ← ✅ DONE
│   │   └── Employee.php                    ← ✅ DONE
│   └── Providers/
│       └── AppServiceProvider.php          ← DO NOT MODIFY
├── bootstrap/
│   └── app.php                             ← DO NOT MODIFY
├── config/                                 ← DO NOT MODIFY any existing files
├── database/
│   ├── migrations/                         ← Append new migrations only
│   └── seeders/
│       ├── DatabaseSeeder.php              ← Append new seeder calls only
│       ├── UserSeeder.php                  ← DO NOT MODIFY
│       └── HRSeeder.php                    ← DO NOT MODIFY
├── routes/
│   └── api.php                             ← Append new route groups only
└── public/
    └── index.php                           ← DO NOT MODIFY
```

---

## 5. Database Schema (Complete)

### Current Tables (as of March 2026)

#### `users` — System user accounts
```sql
uuid    id              PRIMARY KEY
string  name
string  email           UNIQUE
ts      email_verified_at  NULLABLE
string  password        (hashed)
enum    role            ['super_admin','admin','manager','staff'] DEFAULT 'staff'
string  department      NULLABLE
string  phone(20)       NULLABLE
string  avatar          NULLABLE
enum    status          ['active','inactive'] DEFAULT 'active'
ts      last_login_at   NULLABLE
string  last_login_ip(45) NULLABLE
ts      password_changed_at NULLABLE
bool    force_password_change DEFAULT false
string  remember_token
ts      created_at
ts      updated_at
INDEX   role, status, department, [email+status]
```

#### `password_reset_tokens`
```sql
string  email           PRIMARY KEY
string  token
ts      created_at      NULLABLE
```

#### `sessions` — Database session storage
```sql
string  id              PRIMARY KEY
uuid    user_id         NULLABLE, FK → users, INDEX
string  ip_address(45)  NULLABLE
text    user_agent      NULLABLE
longtext payload
int     last_activity   INDEX
```

#### `personal_access_tokens` — Sanctum tokens (for future mobile/API use)
```sql
id      bigint          PRIMARY KEY AUTO_INCREMENT
string  tokenable_type
uuid    tokenable_id
string  name
string  token(64)       UNIQUE
text    abilities       NULLABLE
ts      last_used_at    NULLABLE
ts      expires_at      NULLABLE
ts      created_at
ts      updated_at
INDEX   [tokenable_type + tokenable_id]
```

#### `audit_logs` — Audit trail for all operations
```sql
uuid    id              PRIMARY KEY
uuid    user_id         NULLABLE, FK → users (nullOnDelete)
string  action(100)     e.g. 'login_success', 'employee_created', 'role_changed'
string  entity_type(100) NULLABLE   e.g. 'user', 'employee', 'department'
string  entity_id(36)   NULLABLE
json    old_values      NULLABLE
json    new_values      NULLABLE
string  ip_address(45)  NULLABLE
text    user_agent      NULLABLE
json    metadata        NULLABLE
ts      created_at
ts      updated_at
INDEX   action, [entity_type+entity_id], created_at, [user_id+created_at]
```

#### `login_history` — Login attempt tracking
```sql
uuid    id              PRIMARY KEY
uuid    user_id         NULLABLE, FK → users (nullOnDelete)
string  ip_address(45)
text    user_agent      NULLABLE
ts      login_at
ts      logout_at       NULLABLE
bool    login_successful DEFAULT true
string  failure_reason  NULLABLE
INDEX   user_id, ip_address, login_at, login_successful
```

#### `departments` — Organizational departments
```sql
uuid    id              PRIMARY KEY
string  name            UNIQUE
string  head            NULLABLE
text    description     NULLABLE
string  color(10)       DEFAULT '#6366F1'
enum    status          ['active','inactive'] DEFAULT 'active'
ts      created_at
ts      updated_at
INDEX   name, status
```

#### `designations` — Job titles/positions
```sql
uuid    id              PRIMARY KEY
string  title
uuid    department_id   FK → departments (cascade delete)
enum    level           ['junior','mid','senior','lead','executive'] DEFAULT 'mid'
text    description     NULLABLE
enum    status          ['active','inactive'] DEFAULT 'active'
ts      created_at
ts      updated_at
INDEX   title, level, status
UNIQUE  [title + department_id]
```

#### `employees` — Staff members
```sql
uuid    id              PRIMARY KEY
string  staff_id        UNIQUE (auto-generated: CASI-1001, CASI-1002, ...)
string  name
string  email           UNIQUE
string  phone(30)       NULLABLE
uuid    department_id   FK → departments (restrict delete)
uuid    designation_id  FK → designations (restrict delete)
string  manager         NULLABLE
enum    status          ['active','on_leave','terminated'] DEFAULT 'active'
date    join_date
date    termination_date NULLABLE
decimal salary(15,2)    DEFAULT 0
string  avatar          NULLABLE
text    address         NULLABLE
enum    gender          ['male','female','other'] NULLABLE
date    date_of_birth   NULLABLE
string  emergency_contact_name  NULLABLE
string  emergency_contact_phone(30) NULLABLE
ts      created_at
ts      updated_at
INDEX   staff_id, status, name, [department_id+status]
```

### Migration Naming Convention

```
0001_01_01_000000_create_users_table.php          ← 000000-000003: Core/Auth
0001_01_01_000001_create_personal_access_tokens_table.php
0001_01_01_000002_create_audit_logs_table.php
0001_01_01_000003_create_login_history_table.php
0001_01_01_000004_create_departments_table.php     ← 000004-000006: HR Module
0001_01_01_000005_create_designations_table.php
0001_01_01_000006_create_employees_table.php
                                                    ← 000007-000010: Procurement
                                                    ← 000011-000014: Programs  
                                                    ← 000015-000017: Communication
                                                    ← 000018-000019: Reports
```

Use the next available number. **The naming prefix MUST be `0001_01_01_XXXXXX_`** to maintain ordering.

---

## 6. Coding Patterns & Conventions

### 6.1 Controller Pattern

Every controller extends `App\Http\Controllers\Controller` which provides:

```php
$this->success($data, $message, $statusCode);   // Standardized success JSON
$this->error($message, $statusCode, $errors);    // Standardized error JSON
```

**Example controller method (index with filters, sorting, pagination):**

```php
public function index(Request $request): JsonResponse
{
    $query = MyModel::with(['relationship1', 'relationship2']);

    // Filters
    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }
    if ($request->filled('search')) {
        // ALWAYS escape LIKE wildcards to prevent wildcard injection
        $search = str_replace(['%', '_'], ['\%', '\_'], $request->search);
        $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%");
        });
    }

    // Sorting
    $sortBy = $request->input('sort_by', 'created_at');
    $sortDir = $request->input('sort_dir', 'desc');
    $allowedSorts = ['name', 'status', 'created_at'];
    if (in_array($sortBy, $allowedSorts)) {
        $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
    }

    // Pagination — ALWAYS cap per_page at 100
    $perPage = min((int) $request->input('per_page', 25), 100);
    $paginated = $query->paginate($perPage);

    return $this->success([
        'items' => collect($paginated->items())->map->toApiArray(),
        'meta' => [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ],
    ]);
}
```

**Example store method:**

```php
use Illuminate\Support\Facades\DB;

public function store(StoreMyModelRequest $request): JsonResponse
{
    return DB::transaction(function () use ($request) {
        $model = MyModel::create($request->validated());

        AuditLog::record(
            $request->user()->id,
            'my_model_created',
            'my_model',
            $model->id,
            null,
            $model->toApiArray()
        );

        return $this->success(['my_model' => $model->toApiArray()], 'Created successfully', 201);
    });
}
```

**Example update method:**

```php
public function update(UpdateMyModelRequest $request, string $id): JsonResponse
{
    $model = MyModel::findOrFail($id);
    $oldValues = $model->toApiArray();

    return DB::transaction(function () use ($request, $model, $oldValues) {
        $model->update($request->validated());
        $model->refresh();

        AuditLog::record(
            $request->user()->id,
            'my_model_updated',
            'my_model',
            $model->id,
            $oldValues,
            $model->toApiArray()
        );

        return $this->success(['my_model' => $model->toApiArray()], 'Updated successfully');
    });
}
```

**Example destroy method (soft status change, NOT hard delete):**

```php
public function destroy(Request $request, string $id): JsonResponse
{
    $model = MyModel::findOrFail($id);
    
    // Business rule check example:
    if ($model->someRelation()->where('status', 'active')->exists()) {
        return $this->error('Cannot delete: has active related records.', 422);
    }

    return DB::transaction(function () use ($request, $model) {
        $model->update(['status' => 'inactive']);

        AuditLog::record(
            $request->user()->id,
            'my_model_deleted',
            'my_model',
            $model->id,
            ['status' => 'active'],
            ['status' => 'inactive']
        );

        return $this->success(null, 'Deleted successfully');
    });
}
```

### 6.2 Model Pattern

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MyModel extends Model
{
    use HasUuids, HasFactory;

    protected $fillable = [
        // List ALL columns except id, created_at, updated_at
    ];

    protected function casts(): array
    {
        return [
            'date_field' => 'date',
            'decimal_field' => 'decimal:2',
            'boolean_field' => 'boolean',
            'json_field' => 'array',
        ];
    }

    // --- Scopes ---
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    // --- Relationships ---
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    // --- Serialization (REQUIRED on every model) ---
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            // ... all public fields
            // Resolve relationship names: 'department' => $this->department?->name,
            // Format dates: 'date' => $this->date?->toDateString(),
            // Format timestamps: 'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
```

**CRITICAL:** Every model MUST have:
1. `use HasUuids` trait (all tables use UUID primary keys)
2. `$fillable` array
3. `toApiArray()` method for consistent API output

### 6.3 Form Request Pattern

```php
<?php

namespace App\Http\Requests\ModuleName;

use Illuminate\Foundation\Http\FormRequest;

class StoreMyModelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;  // Auth is handled by route middleware
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'department_id' => ['required', 'uuid', 'exists:departments,id'],
            'status' => ['sometimes', 'in:active,inactive'],
            // ... 
        ];
    }

    public function messages(): array
    {
        return [
            // Custom messages only when the default isn't clear enough
        ];
    }
}
```

**For Update requests**, make all fields optional (`sometimes`) and handle unique constraints:

```php
public function rules(): array
{
    return [
        'name' => ['sometimes', 'string', 'max:255', 'unique:my_table,name,' . $this->route('id')],
    ];
}
```

### 6.4 Migration Pattern

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_name', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // ... columns
            $table->timestamps();
            
            // Always add indexes for common query patterns
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_name');
    }
};
```

**Rules:**
- Primary key: `$table->uuid('id')->primary();` — ALWAYS
- Foreign keys: `$table->foreignUuid('xxx_id')->constrained('table')->onDelete('restrict');`
- Use `restrict` for delete when referenced by other tables, `cascade` when child should be deleted
- Always add `$table->timestamps();`
- Always add indexes on: status columns, foreign keys used in filters, columns used in sorting/search

### 6.5 API Response Format

EVERY endpoint returns this structure. The global exception handler in `bootstrap/app.php` ensures that even unhandled 500 errors return JSON (never HTML stack traces in production):

```json
// Success
{
  "success": true,
  "message": "Descriptive message",
  "data": { ... }
}

// Error  
{
  "success": false,
  "message": "What went wrong",
  "errors": { "field": ["Validation message"] }  // Only on 422
}

// Paginated list
{
  "success": true,
  "message": "Success",
  "data": {
    "items_key": [ ... ],
    "meta": {
      "current_page": 1,
      "last_page": 5,
      "per_page": 25,
      "total": 112
    }
  }
}
```

### 6.6 Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| **Table** | snake_case plural | `purchase_orders` |
| **Model** | PascalCase singular | `PurchaseOrder` |
| **Controller** | PascalCase + Controller | `PurchaseOrderController` |
| **Form Request** | Store/Update + Model + Request | `StorePurchaseOrderRequest` |
| **Migration** | `create_{table}_table` | `create_purchase_orders_table` |
| **Seeder** | PascalCase + Seeder | `ProcurementSeeder` |
| **Route prefix** | kebab-case module | `/procurement/purchase-orders` |
| **Route name** | dot notation | `procurement.purchase-orders.index` |
| **Foreign key** | snake_case + `_id` | `department_id` |
| **Audit action** | snake_case | `purchase_order_created` |
| **JSON keys** | snake_case | `purchase_date`, `total_amount` |

### 6.7 Mandatory Security Patterns

Every new controller MUST follow these patterns:

| Pattern | Rule | Example |
|---------|------|---------|
| **Pagination cap** | Always cap `per_page` at 100 | `min((int) $request->input('per_page', 25), 100)` |
| **LIKE escaping** | Always escape `%` and `_` in search input | `str_replace(['%', '_'], ['\%', '\_'], $search)` |
| **DB::transaction** | Wrap create+audit, update+audit, delete+audit in transaction | `return DB::transaction(function () { ... });` |
| **Write throttling** | All POST/PATCH/DELETE route groups get `'throttle:60,1'` | `Route::middleware([..., 'throttle:60,1'])` |
| **Sort whitelist** | Only allow sorting on explicitly listed columns | `if (in_array($sortBy, $allowedSorts))` |
| **`$request->validated()`** | Never use `$request->all()` — always `validated()` | `MyModel::create($request->validated())` |

---

## 7. Authentication & Authorization

### How Auth Works

1. Frontend calls `GET /sanctum/csrf-cookie` → gets XSRF-TOKEN + session cookies
2. Frontend calls `POST /api/v1/auth/login` with `X-XSRF-TOKEN` header → returns user data
3. All subsequent requests include session cookie automatically (browser handles this)
4. `auth:sanctum` middleware validates the session on each request

### User Roles (from highest to lowest)

| Role | Can Do |
|------|--------|
| `super_admin` | Everything. Cannot be deleted. Can assign super_admin role. |
| `admin` | Everything except assign super_admin role. User management. |
| `manager` | Read + Write on HR, Procurement, Programs, etc. No user management. |
| `staff` | Read-only on most modules. Own profile management. |

### Using RoleMiddleware in Routes

```php
use App\Http\Middleware\RoleMiddleware;

// Allow only super_admin and admin (used for settings/admin-only routes):
Route::middleware([RoleMiddleware::class . ':super_admin,admin'])->group(function () { ... });
```

> **NOTE:** `RoleMiddleware` is now only used for system-level routes (settings, user management).
> For all module routes (HR, Procurement, Programs, etc.), use `PermissionMiddleware` instead.

### Using PermissionMiddleware in Routes (PREFERRED)

```php
use App\Http\Middleware\PermissionMiddleware;

// Check a specific permission:
Route::get('/resources', [ResourceController::class, 'index'])
    ->middleware(PermissionMiddleware::class . ':module.feature.view');

Route::post('/resources', [ResourceController::class, 'store'])
    ->middleware(PermissionMiddleware::class . ':module.feature.create');
```

**How it works:**
1. Super admin always bypasses (hardcoded in middleware)
2. For all other roles, checks the `role_permissions` table for the given permission key
3. Returns 403 if the role doesn't have the permission
4. Permissions are managed via super admin settings page (`PATCH /settings/permissions/{id}`)

**Permission key format:** `module.feature.action` (e.g., `hr.notes.create`, `hr.employees.view`)

### Standard Route Access Pattern (follow this for ALL new modules)

```php
use App\Http\Middleware\PermissionMiddleware;

Route::middleware(['auth:sanctum', ForcePasswordChange::class])->prefix('module-name')->group(function () {
    
    // Read access (permission-controlled)
    Route::get('/resources', [ResourceController::class, 'index'])
        ->middleware(PermissionMiddleware::class . ':module.resources.view');
    Route::get('/resources/{id}', [ResourceController::class, 'show'])
        ->middleware(PermissionMiddleware::class . ':module.resources.view');
    
    // Write access (permission-controlled + rate limited)
    Route::middleware(['throttle:60,1'])->group(function () {
        Route::post('/resources', [ResourceController::class, 'store'])
            ->middleware(PermissionMiddleware::class . ':module.resources.create');
        Route::patch('/resources/{id}', [ResourceController::class, 'update'])
            ->middleware(PermissionMiddleware::class . ':module.resources.edit');
        Route::delete('/resources/{id}', [ResourceController::class, 'destroy'])
            ->middleware(PermissionMiddleware::class . ':module.resources.delete');
    });
});
```

**When adding a new module, you MUST also:**
1. Add permission entries to `PermissionSeeder.php` for all new features/actions
2. Add default role mappings in the `$roleDefaults` array in the seeder
3. Run `php artisan db:seed --class=PermissionSeeder` on the server

---

## 8. Route Registration Pattern

### WHERE to add routes

In `routes/api.php`, ALL routes live inside the existing outer group:

```php
Route::middleware([SecurityHeaders::class])->prefix('v1')->group(function () {
    // ... existing auth routes (DO NOT TOUCH) ...
    // ... existing HR routes (DO NOT TOUCH) ...
    // ... existing health check (DO NOT TOUCH) ...

    // ← ADD NEW MODULE ROUTE GROUPS HERE (before the closing });)
});
```

### HOW to add a new module's routes

1. Add `use` imports at the top of `api.php` (with the other imports)
2. Add a new route group block just ABOVE the health check
3. Follow the exact indentation and comment style of the HR block

**Example:**

```php
// At the top, add imports:
use App\Http\Controllers\Procurement\VendorController;
use App\Http\Controllers\Procurement\PurchaseOrderController;

// Inside the v1 group, add:
    /*
    |--------------------------------------------------------------------------
    | Procurement Module Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware(['auth:sanctum', ForcePasswordChange::class])->prefix('procurement')->group(function () {
        // Read access
        Route::get('/vendors', [VendorController::class, 'index'])->name('procurement.vendors.index');
        Route::get('/vendors/{id}', [VendorController::class, 'show'])->name('procurement.vendors.show');

        // Write access
        Route::middleware([RoleMiddleware::class . ':super_admin,admin,manager', 'throttle:60,1'])->group(function () {
            Route::post('/vendors', [VendorController::class, 'store'])->name('procurement.vendors.store');
            Route::patch('/vendors/{id}', [VendorController::class, 'update'])->name('procurement.vendors.update');
            Route::delete('/vendors/{id}', [VendorController::class, 'destroy'])->name('procurement.vendors.destroy');
        });
    });
```

---

## 9. Existing Modules (DO NOT MODIFY)

### Auth Module — 17 endpoints

| Method | Endpoint | Access | Controller |
|--------|----------|--------|------------|
| POST | `/auth/login` | Public (5/min) | LoginController@login |
| POST | `/auth/forgot-password` | Public (3/min) | PasswordController@forgotPassword |
| POST | `/auth/reset-password` | Public (3/min) | PasswordController@resetPassword |
| GET | `/auth/session` | Authenticated | ProfileController@session |
| POST | `/auth/logout` | Authenticated | LoginController@logout |
| POST | `/auth/change-password` | Authenticated | PasswordController@changePassword |
| GET | `/auth/profile` | Auth + password changed | ProfileController@show |
| PATCH | `/auth/profile` | Auth + password changed | ProfileController@update |
| DELETE | `/auth/account` | Auth + password changed | ProfileController@destroy |
| POST | `/auth/register` | Admin only (3/min) | RegisterController@register |
| GET | `/auth/users` | Admin only | UserManagementController@index |
| GET | `/auth/users/{id}` | Admin only | UserManagementController@show |
| PATCH | `/auth/users/{id}` | Admin only | UserManagementController@update |
| DELETE | `/auth/users/{id}` | Admin only | UserManagementController@destroy |
| PATCH | `/auth/users/{id}/role` | Admin only | UserManagementController@updateRole |
| PATCH | `/auth/users/{id}/status` | Admin only | UserManagementController@updateStatus |

### HR Module — 17 endpoints

| Method | Endpoint | Access | Controller |
|--------|----------|--------|------------|
| GET | `/hr/departments` | Any authenticated | DepartmentController@index |
| GET | `/hr/departments/{id}` | Any authenticated | DepartmentController@show |
| POST | `/hr/departments` | Admin/Manager | DepartmentController@store |
| PATCH | `/hr/departments/{id}` | Admin/Manager | DepartmentController@update |
| DELETE | `/hr/departments/{id}` | Admin/Manager | DepartmentController@destroy |
| GET | `/hr/designations` | Any authenticated | DesignationController@index |
| GET | `/hr/designations/{id}` | Any authenticated | DesignationController@show |
| POST | `/hr/designations` | Admin/Manager | DesignationController@store |
| PATCH | `/hr/designations/{id}` | Admin/Manager | DesignationController@update |
| DELETE | `/hr/designations/{id}` | Admin/Manager | DesignationController@destroy |
| GET | `/hr/employees/stats` | Any authenticated | EmployeeController@stats |
| GET | `/hr/employees` | Any authenticated | EmployeeController@index |
| GET | `/hr/employees/{id}` | Any authenticated | EmployeeController@show |
| POST | `/hr/employees` | Admin/Manager | EmployeeController@store |
| PATCH | `/hr/employees/{id}` | Admin/Manager | EmployeeController@update |
| DELETE | `/hr/employees/{id}` | Admin/Manager | EmployeeController@destroy |
| PATCH | `/hr/employees/{id}/status` | Admin/Manager | EmployeeController@updateStatus |

### Communication Module — 19 endpoints

| Method | Endpoint | Access | Controller |
|--------|----------|--------|------------|
| GET | `/communication/messages` | Permission: communication.messages.view | MessageController@index |
| GET | `/communication/messages/unread-count` | Permission: communication.messages.view | MessageController@unreadCount |
| GET | `/communication/messages/{threadId}` | Permission: communication.messages.view | MessageController@show |
| POST | `/communication/messages` | Permission: communication.messages.create | MessageController@store |
| DELETE | `/communication/messages/{id}` | Permission: communication.messages.delete | MessageController@destroy |
| GET | `/communication/forums` | Permission: communication.forums.view | ForumController@index |
| GET | `/communication/forums/{id}` | Permission: communication.forums.view | ForumController@show |
| POST | `/communication/forums` | Permission: communication.forums.manage | ForumController@store |
| PATCH | `/communication/forums/{id}` | Permission: communication.forums.manage | ForumController@update |
| DELETE | `/communication/forums/{id}` | Permission: communication.forums.manage | ForumController@destroy |
| GET | `/communication/forums/{forumId}/messages` | Permission: communication.forums.view | ForumMessageController@index |
| GET | `/communication/forums/{forumId}/messages/{id}/replies` | Permission: communication.forums.view | ForumMessageController@replies |
| POST | `/communication/forums/{forumId}/messages` | Permission: communication.forums.create | ForumMessageController@store |
| DELETE | `/communication/forums/{forumId}/messages/{id}` | Permission: communication.forums.create | ForumMessageController@destroy |
| GET | `/communication/notices/stats` | Permission: communication.notices.view | NoticeController@stats |
| GET | `/communication/notices` | Permission: communication.notices.view | NoticeController@index |
| GET | `/communication/notices/{id}` | Permission: communication.notices.view | NoticeController@show |
| POST | `/communication/notices` | Permission: communication.notices.create | NoticeController@store |
| PATCH | `/communication/notices/{id}` | Permission: communication.notices.edit | NoticeController@update |
| DELETE | `/communication/notices/{id}` | Permission: communication.notices.delete | NoticeController@destroy |
| GET | `/communication/notices/{id}/reads` | Permission: communication.notices.view | NoticeController@reads |

### Reports Module — 17 endpoints

| Method | Endpoint | Access | Handler |
|--------|----------|--------|---------|
| GET | `/reports/hr/employees` | Permission: reports.reports.view | HRReportController@employees |
| GET | `/reports/hr/departments` | Permission: reports.reports.view | HRReportController@departments |
| GET | `/reports/hr/designations` | Permission: reports.reports.view | HRReportController@designations |
| GET | `/reports/procurement/purchase-orders` | Permission: reports.reports.view | ProcurementReportController@purchaseOrders |
| GET | `/reports/procurement/requisitions` | Permission: reports.reports.view | ProcurementReportController@requisitions |
| GET | `/reports/procurement/vendors` | Permission: reports.reports.view | ProcurementReportController@vendors |
| GET | `/reports/procurement/inventory` | Permission: reports.reports.view | ProcurementReportController@inventory |
| GET | `/reports/procurement/disbursements` | Permission: reports.reports.view | ProcurementReportController@disbursements |
| GET | `/reports/projects/summary` | Permission: reports.reports.view | ProjectReportController@summary |
| GET | `/reports/projects/{id}/detail` | Permission: reports.reports.download | ProjectReportController@detail |
| GET | `/reports/projects/budget-utilization` | Permission: reports.reports.view | ProjectReportController@budgetUtilization |
| GET | `/reports/projects/activity-progress` | Permission: reports.reports.view | ProjectReportController@activityProgress |
| GET | `/reports/communication/notices` | Permission: reports.reports.view | CommunicationReportController@notices |
| GET | `/reports/communication/forum-activity` | Permission: reports.reports.view | CommunicationReportController@forumActivity |
| GET | `/reports/finance/overview` | Permission: reports.reports.view | FinanceReportController@overview |
| GET | `/reports/audit/logs` | Permission: reports.reports.audit | AuditReportController@logs |
| GET | `/reports/audit/login-history` | Permission: reports.reports.audit | AuditReportController@loginHistory |

**Query parameters (all report endpoints):** `?format=csv|excel|pdf` to download, omit for paginated JSON preview.
**Common filters:** `date_from`, `date_to`, `status`, `department_id` + endpoint-specific filters.

### Health Check — 1 endpoint

| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/health` | Public |

---

## 10. How to Build a New Module

### Step-by-step checklist (follow this order exactly)

**Phase 1: Database**
- [ ] Create migration(s) in `database/migrations/` with next available number
- [ ] Create model(s) in `app/Models/` with HasUuids, fillable, casts, relationships, scopes, toApiArray()

**Phase 2: Validation**
- [ ] Create `app/Http/Requests/{Module}/Store{Resource}Request.php` for each resource
- [ ] Create `app/Http/Requests/{Module}/Update{Resource}Request.php` for each resource

**Phase 3: Controllers**
- [ ] Create `app/Http/Controllers/{Module}/{Resource}Controller.php` for each resource
- [ ] Use `$this->success()` / `$this->error()` for all responses
- [ ] Use `AuditLog::record()` on all create/update/delete operations
- [ ] Include filters, sorting, pagination on index methods

**Phase 4: Routes**
- [ ] Add `use` imports at top of `routes/api.php`
- [ ] Add route group INSIDE the `v1` prefix group, ABOVE the health check
- [ ] Use `PermissionMiddleware::class . ':module.feature.action'` on EVERY route
- [ ] Wrap write routes in `'throttle:60,1'` group

**Phase 5: Permissions**
- [ ] Add permission entries to `database/seeders/PermissionSeeder.php` for ALL new features/actions
- [ ] Add default role mappings in the `$roleDefaults` array (admin: all true, manager: module true, staff: view only)
- [ ] Run `php artisan db:seed --class=PermissionSeeder` on server after deployment

**Phase 6: Seeder**
- [ ] Create `database/seeders/{Module}Seeder.php` with realistic test data
- [ ] Use `updateOrCreate()` (NOT `create()`) so seeder is re-runnable
- [ ] Add seeder class to `DatabaseSeeder.php`

**Phase 7: Verify**
- [ ] Run syntax check (no IDE errors)
- [ ] Verify no existing files were modified (except api.php append, DatabaseSeeder append, PermissionSeeder append)

---

## 11. Complete Model Reference

### User (app/Models/User.php) — DO NOT MODIFY

**Key fields:** id, name, email, password, role, department, phone, avatar, status, force_password_change

**Roles:** `super_admin`, `admin`, `manager`, `staff`

**Key methods:**
- `toAuthArray()` → public user data for API responses
- `hasRole(string $role)` → check single role
- `hasAnyRole(array $roles)` → check multiple roles
- `recordLogin(string $ip, string $userAgent)` → log login event
- `scopeActive($query)`, `scopeByRole($query, $role)`
- `isAdmin`, `isSuperAdmin` (accessor attributes)

**Relationships:**
- `auditLogs()` → hasMany AuditLog
- `loginHistory()` → hasMany LoginHistory

### AuditLog (app/Models/AuditLog.php) — SHARED BY ALL MODULES

**Usage from any controller:**

```php
use App\Models\AuditLog;

AuditLog::record(
    $request->user()->id,     // user_id (nullable for system actions)
    'purchase_order_created', // action string
    'purchase_order',         // entity_type
    $model->id,               // entity_id
    null,                     // old_values (null for create)
    $model->toApiArray(),     // new_values
    ['extra' => 'info']       // metadata (optional)
);
```

### Department, Designation, Employee — See Schema Section Above

**Relationships to reference when building new modules:**
- If a new table needs a department, use: `foreignUuid('department_id')->constrained('departments')->onDelete('restrict')`
- If a new table needs an employee, use: `foreignUuid('employee_id')->constrained('employees')->onDelete('restrict')`
- Departments have: `->designations()`, `->employees()`, `->employee_count` accessor
- Employees have: `->department()`, `->designation()`

---

## 12. Complete Migration Reference

Current migration sequence:

| Number | Table | Module |
|--------|-------|--------|
| 000000 | users, password_reset_tokens, sessions | Core |
| 000001 | personal_access_tokens | Core |
| 000002 | audit_logs | Core |
| 000003 | login_history | Core |
| 000004 | departments | HR |
| 000005 | designations | HR |
| 000006 | employees | HR |
| 000007 | notes | HR |
| 000008 | permissions, role_permissions | Core (Permissions System) |
| 000009 | system_settings | Settings |
| 000010 | vendors | Procurement |
| 000011 | purchase_orders, purchase_order_items | Procurement |
| 000012 | inventory_items | Procurement |
| 000013 | requisitions, requisition_items | Procurement |
| 000014 | approval_steps | Procurement |
| 000015 | purchase_orders (add payment columns) | Procurement |
| 000016 | purchase_orders (add submitted_by) | Procurement |
| 000017 | disbursements | Procurement |
| 000018 | budget_categories | Projects |
| 000019 | projects | Projects |
| 000020 | project_donors | Projects |
| 000021 | project_partners | Projects |
| 000022 | project_team_members | Projects |
| 000023 | project_activities | Projects |
| 000024 | project_budget_lines | Projects |
| 000025 | project_notes | Projects |
| 000026 | messages | Communication |
| 000027 | forums | Communication |
| 000028 | forum_messages | Communication |
| 000029 | notices | Communication |
| 000030 | notice_audiences | Communication |
| 000031 | notice_reads | Communication |

*(Reports module uses no new tables — read-only aggregation of existing data)*

---

## 13. Middleware Reference

### SecurityHeaders (applied to all /v1 routes automatically)
Adds: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
You do NOT need to apply this to new routes — it's on the outer group.

### auth:sanctum
Validates session cookie. Returns 401 if not authenticated.
Applied per route group (not globally).

### ForcePasswordChange
Blocks access to everything except login/logout/session/change-password if `force_password_change` is true.
Always pair with `auth:sanctum`.

### RoleMiddleware
Checks user role. Usage: `RoleMiddleware::class . ':super_admin,admin,manager'`
Class path: `App\Http\Middleware\RoleMiddleware`
**Now only used for system-level routes** (settings, admin-only). For module routes, use PermissionMiddleware.

### PermissionMiddleware
Checks dynamic permissions from the `role_permissions` table. Super admin always bypasses.
Usage: `PermissionMiddleware::class . ':hr.notes.create'`
Class path: `App\Http\Middleware\PermissionMiddleware`
**Used for ALL module routes** (HR, Procurement, Programs, etc.). Permission key format: `module.feature.action`.

### throttle
Laravel built-in rate limiter. Usage: `'throttle:5,1'` (5 requests per 1 minute).

### CacheResponse
Caches successful GET JSON responses per-user with configurable module and TTL.
Usage: `CacheResponse::class . ':module,ttl'` (e.g., `:hr,120`)
Class path: `App\Http\Middleware\CacheResponse`
Adds `X-Cache: HIT|MISS` and `X-Cache-TTL` headers. Skips downloads (when `format` param present) and unauthenticated requests.
Cache key: `resp:{pathHash}:{queryHash}:{userId}`

### ETagResponse
Generates ETag from response MD5 for conditional GET requests.
Class path: `App\Http\Middleware\ETagResponse`
Applied on the outer route group (all `/v1` routes). Returns 304 when `If-None-Match` matches.
Sets `Cache-Control: private, must-revalidate`.

### InvalidateCache
Auto-invalidates response cache after successful POST/PATCH/PUT/DELETE.
Usage: `InvalidateCache::class . ':module'` (e.g., `:hr`)
Class path: `App\Http\Middleware\InvalidateCache`
Always also invalidates `reports` cache (since reports aggregate all modules).

---

## 14. Configuration Reference

### sanctum.php
- Stateful domains: `casi360.com`, `www.casi360.com`, + APP_URL host, + FRONTEND_URL host
- Guard: `web`
- Token expiry: 60 minutes

### cors.php
- Paths: `api/*`, `sanctum/csrf-cookie`
- Allowed origins: `FRONTEND_URL` env (default `https://casi360.com`), `https://www.casi360.com`
- Credentials: `true`
- Max age: `7200` seconds

### session.php
- Driver: `database`
- Lifetime: 120 minutes
- Encrypted: `true`
- Domain: `.casi360.com` (cross-subdomain)
- Secure: `true`
- Same-site: `lax`

### database.php
- Driver: mysql
- Database: `casi360_db` (from env)
- Charset: `utf8mb4_unicode_ci`
- Strict mode: `true`
- Engine: InnoDB

---

## 15. Seeder Pattern

```php
<?php

namespace Database\Seeders;

use App\Models\NewModel;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'Item 1', 'status' => 'active', ...],
            ['name' => 'Item 2', 'status' => 'active', ...],
        ];

        foreach ($items as $item) {
            NewModel::updateOrCreate(
                ['name' => $item['name']],    // ← unique lookup key
                $item                          // ← all data to insert/update
            );
        }

        $this->command->info('✓ Seeded ' . count($items) . ' items');
    }
}
```

**IMPORTANT:** Always use `updateOrCreate()`, never `create()`. The seeder must be safe to run multiple times without duplicate errors.

**Register in DatabaseSeeder.php** (append only):

```php
$this->call([
    UserSeeder::class,
    HRSeeder::class,
    ProcurementSeeder::class,    // ← add new seeders here
]);
```

---

## 16. Testing After Changes

### Automated Test Suite

The backend includes a PHPUnit test suite covering critical paths across all modules.

**Running tests on the server:**
```bash
php artisan test
# or
vendor/bin/phpunit
```

**Test configuration:** `phpunit.xml` uses SQLite `:memory:` database, array cache/session, and low bcrypt rounds for speed.

**Test structure:**
```
tests/
  TestCase.php                          ← Base class (RefreshDatabase, helpers)
  Feature/
    Auth/
      LoginTest.php                     ← 7 tests (login, logout, session, inactive user)
      UserManagementTest.php            ← 9 tests (register, roles, status, profile)
    HR/
      HRTest.php                        ← 6 tests (dept CRUD, employee CRUD, stats)
    Procurement/
      ProcurementTest.php               ← 6 tests (vendor CRUD, PO create/list)
    Projects/
      ProjectTest.php                   ← 6 tests (project CRUD, stats, team)
    Communication/
      CommunicationTest.php             ← 8 tests (notices, forums, messages)
    Reports/
      ReportTest.php                    ← 8 tests (HR/procurement/project/audit/finance reports)
    Settings/
      SettingsTest.php                  ← 6 tests (permissions matrix, system settings, public)
```

**Model factories** (`database/factories/`): User, Department, Designation, Employee, Vendor, PurchaseOrder, Project, Notice, Forum

**Test helpers** in `TestCase.php`:
- `actingAsRole('admin')` — creates + authenticates user with given role
- `actingAsSuperAdmin()` — shortcut for super_admin
- `assertSuccessResponse($response)` — asserts `{success: true}` structure
- `assertErrorResponse($response)` — asserts `{success: false}` structure
- `assertPaginatedResponse($response)` — asserts pagination meta

### On the server after deployment:

```bash
# 1. Run migrations
php artisan migrate

# 2. Clear caches
php artisan optimize:clear
php artisan optimize

# 3. Run seeder
php artisan db:seed

# 4. Verify routes
php artisan route:list --path=MODULE_PREFIX

# 5. Test with curl (requires Referer header for Sanctum stateful auth)
# See curl test script pattern in project documentation
```

### Curl test with auth (reusable pattern):

```bash
BASE="https://api.casi360.com"
COOKIE="/tmp/test_cookies.txt"
REF="https://casi360.com"

# Auth
curl -s -c $COOKIE -b $COOKIE "$BASE/sanctum/csrf-cookie" -H "Referer: $REF"
TOKEN=$(grep XSRF-TOKEN $COOKIE | awk '{print $NF}')
DECODED=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('$TOKEN'))")
curl -s -c $COOKIE -b $COOKIE -X POST "$BASE/api/v1/auth/login" \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  -H "Referer: $REF" -H "X-XSRF-TOKEN: $DECODED" \
  -d '{"email":"daniel@casi.org","password":"Demo@2026!"}'

# Test GET endpoint
curl -s -b $COOKIE -H "Accept: application/json" -H "Referer: $REF" \
  "$BASE/api/v1/MODULE/RESOURCE"
```

---

## 17. Deployment Checklist

### Server Access

```
Host:      vmi2446060
SSH User:  api.casi360.com
App Path:  ~/ (home directory)
SSH:       ssh api.casi360.com@vmi2446060
```

After building a new module locally:

1. Upload ALL new files to server (Controllers, Models, Requests, Migrations, Seeder)
2. Upload modified `routes/api.php` and `DatabaseSeeder.php`
3. SSH into server and run:
   ```bash
   ssh api.casi360.com@vmi2446060
   composer dump-autoload
   php artisan migrate
   php artisan optimize:clear
   php artisan optimize
   php artisan db:seed
   ```
4. Verify with `php artisan route:list --path=NEW_PREFIX`
5. Run curl test script

---

## 18. Modules Roadmap

### Module 1: Procurement ← COMPLETE
**Tables:** `vendors`, `purchase_orders`, `purchase_order_items`, `inventory_items`, `requisitions`, `requisition_items`, `approval_steps`, `disbursements`
**Key relationships:** Vendors, POs linked to departments/employees, inventory tracking, multi-level approval workflow
**Migration numbers:** 000010–000017

### Module 2: Projects ← COMPLETE
**Tables:** `budget_categories`, `projects`, `project_donors`, `project_partners`, `project_team_members`, `project_activities`, `project_budget_lines`, `project_notes`
**Key relationships:** Projects → Department, Projects → Employees (manager + team), Projects → Budget Categories (via budget lines), Projects → Donors/Partners, Projects → Notes (user-created)
**Migration numbers:** 000018–000025

### Module 3: Communication ← COMPLETE
**Tables:** `messages`, `forums`, `forum_messages`, `notices`, `notice_audiences`, `notice_reads`
**Key relationships:** 1-on-1 threaded messages between users, General + department forums (auto-created per department), Notices with audience targeting and read tracking
**Migration numbers:** 000026–000031

### Module 4: Reports ← COMPLETE
**Tables:** None — read-only aggregation queries across existing tables
**New files:** 6 controllers in `app/Http/Controllers/Reports/`, `app/Services/ReportExportService.php`, `app/Exports/GenericExport.php`, 2 Blade templates in `resources/views/reports/`
**Packages:** `maatwebsite/excel` ^3.1, `barryvdh/laravel-dompdf` ^3.0
**Export formats:** CSV (native PHP fputcsv), Excel (maatwebsite), PDF (dompdf)
**17 endpoints:** 3 HR, 5 Procurement, 4 Projects, 2 Communication, 1 Finance, 2 Audit
**3 permissions:** `reports.reports.view`, `reports.reports.download`, `reports.reports.audit`

### Module 5: SuperAdmin Settings ← COMPLETE
**Tables:** `system_settings` (key-value config store)
**Migration numbers:** 000009

### Cross-Cutting: Caching Layer ← COMPLETE
**No new tables/migrations.**
**New files:**
- `app/Services/CacheService.php` — centralized cache management (TTL config, registry-based invalidation, works with any driver)
- `app/Http/Middleware/CacheResponse.php` — per-user GET response caching with X-Cache headers
- `app/Http/Middleware/ETagResponse.php` — conditional GET with 304 Not Modified
- `app/Http/Middleware/InvalidateCache.php` — auto-invalidates module + reports cache on writes
- `app/Traits/InvalidatesCache.php` — optional controller-level cache busting

**Modified files:**
- `app/Http/Middleware/PermissionMiddleware.php` — permission lookups cached 5 min
- `app/Http/Controllers/Settings/PermissionsController.php` — invalidates permission cache after updates
- `routes/api.php` — ETag on outer group, CacheResponse + InvalidateCache wired per module

**Cache TTLs by module:** HR=120s, Procurement=60s, Projects=60s, Communication=30s, Reports=180s
**Permission cache TTL:** 300s (5 min)

### Cross-Cutting: Test Suite ← COMPLETE
**New files:** `phpunit.xml`, `tests/TestCase.php`, 9 factory files in `database/factories/`, 7 test files in `tests/Feature/`
**Total tests:** ~56 covering auth, HR, procurement, projects, communication, reports, settings

---

*End of Master Instructions. When in doubt, follow the patterns in the HR module — it is the reference implementation.*
