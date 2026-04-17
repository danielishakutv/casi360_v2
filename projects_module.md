=========================================================
  FRONTEND PROMPT: Replace "Programs" Module with "Projects" Module
  CASI360 — Care Aid Support Initiative
  Date: April 2, 2026
=========================================================

OBJECTIVE:
Replace the current "Programs" sidebar menu and all its pages with a fully
functional "Projects" module that consumes the backend Projects API.
The backend is complete — this prompt describes every endpoint, every field,
and every page the frontend must implement.

FRONTEND STACK:
  - Vite + React (JSX, not TypeScript)
  - React Router for routing
  - Axios for HTTP requests
  - No Next.js, no TypeScript

=========================================================
CURRENT STATE (to be removed/replaced)
=========================================================

Sidebar currently shows:
  Programs
    ├── Overview        → /programs
    ├── Projects        → /programs/projects
    ├── Beneficiaries   → /programs/beneficiaries
    └── Reports         → /programs/reports

These pages are mostly empty shells. Replace the entire "Programs" section
with the new "Projects" module described below.

=========================================================
NEW SIDEBAR STRUCTURE
=========================================================

Rename the sidebar group from "Programs" to "Projects".
Use an SVG icon (no emojis). Suggested: a folder/briefcase or building icon.

  Projects
    ├── Overview          → /projects                    (dashboard/stats)
    ├── All Projects      → /projects/list               (project list + CRUD)
    ├── Budget Categories → /projects/budget-categories   (admin config)
    └── Reports           → /projects/reports             (project reports)

Permissions that control visibility:
  - Overview:          projects.projects.view
  - All Projects:      projects.projects.view
  - Budget Categories: projects.budget_categories.view
  - Reports:           reports.reports.view

Only show menu items the user has permission for.

=========================================================
API BASE
=========================================================

All endpoints are prefixed with: /api/v1
Authentication: Bearer token via Sanctum (cookie-based SPA auth)
Base URL: https://api.casi360.com/api/v1  (use VITE_API_BASE_URL env var)

All responses follow this shape:
{
  "success": true|false,
  "message": "...",
  "data": { ... }
}

Errors return:
{
  "success": false,
  "message": "Error description",
  "errors": { "field": ["Validation message"] }   // only on 422
}

=========================================================
PAGE 1: PROJECTS OVERVIEW  →  /projects
=========================================================

Purpose: Dashboard with key stats, charts, and quick links.

API CALL:
  GET /projects/stats
  Permission: projects.projects.view

Response shape:
{
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

UI REQUIREMENTS:
  1. Stat cards at the top:
     - Total Projects (total)
     - Active Projects (active)
     - Completed Projects (completed)
     - Total Budget (total_budget, formatted as currency)
  2. Status breakdown — horizontal bar or donut chart showing
     draft / active / on_hold / completed / closed counts
  3. Projects by department — bar chart or table from by_department[]
  4. Quick action buttons:
     - "Create New Project" → opens create project modal/page
     - "View All Projects" → navigates to /projects/list
  5. Recent projects list — call GET /projects?per_page=5&sort_by=created_at&sort_dir=desc
     and show a compact table (name, status, budget, progress)

=========================================================
PAGE 2: ALL PROJECTS  →  /projects/list
=========================================================

Purpose: Full project list with search, filter, sort, pagination, CRUD.

--- LIST ---
API CALL:
  GET /projects
  Permission: projects.projects.view

Query Parameters:
  | Param         | Type    | Default      | Options                                         |
  |---------------|---------|------------- |-------------------------------------------------|
  | status        | string  | —            | draft, active, on_hold, completed, closed        |
  | department_id | uuid    | —            | Filter by department                             |
  | search        | string  | —            | Searches name, project_code, description, location|
  | sort_by       | string  | created_at   | name, project_code, status, start_date, end_date, total_budget, created_at |
  | sort_dir      | string  | desc         | asc, desc                                        |
  | per_page      | integer | 25           | 1–100                                            |

Response fields per project:
  id, project_code, name, description, objectives, department_id, department,
  project_manager_id, project_manager, start_date, end_date, location,
  total_budget, currency, status, notes, donor_count, partner_count,
  team_member_count, activity_count, budget_line_count, note_count,
  activity_progress { total, completed, percentage }, created_at, updated_at

UI REQUIREMENTS:
  1. Search bar (debounced, 300ms)
  2. Filter dropdowns: Status, Department (fetch departments from GET /hr/departments)
  3. Sortable table columns: Name, Code, Status, Start Date, Budget, Progress
  4. Each row shows:
     - Project code + name
     - Status badge (color-coded: draft=gray, active=green, on_hold=yellow, completed=blue, closed=red)
     - Department
     - Date range (start_date — end_date)
     - Budget (formatted currency)
     - Progress bar (activity_progress.percentage)
     - Actions: View, Edit, Delete
  5. Pagination controls
  6. "+ Create Project" button (top right, requires projects.projects.create)

--- CREATE PROJECT ---
API CALL:
  POST /projects
  Permission: projects.projects.create

Request body:
  | Field              | Type   | Required | Rules                              |
  |--------------------|--------|----------|------------------------------------|
  | name               | string | Yes      | Max 255                            |
  | description        | string | No       | Max 10000                          |
  | objectives         | string | No       | Max 10000                          |
  | department_id      | uuid   | Yes      | Must exist in departments          |
  | project_manager_id | uuid   | No       | Must exist in employees            |
  | start_date         | date   | No       | YYYY-MM-DD                         |
  | end_date           | date   | No       | Must be >= start_date              |
  | location           | string | No       | Max 255                            |
  | currency           | string | No       | Max 10 (default: NGN)              |
  | status             | string | No       | draft, active, on_hold, completed, closed (default: draft) |
  | notes              | string | No       | Max 5000                           |

project_code is auto-generated by the backend (format: PRJ-YYYYMM-XXXX).

Form UI:
  - Modal or slide-over panel
  - Department dropdown: fetch from GET /hr/departments
  - Project Manager dropdown: fetch from GET /hr/employees?per_page=0 (all)
  - Date pickers for start_date and end_date
  - Textarea for description, objectives, notes
  - Status dropdown (default: "Draft")

--- UPDATE PROJECT ---
API CALL:
  PATCH /projects/{id}
  Permission: projects.projects.edit
  All fields optional. Same fields as create.

--- DELETE (CLOSE) PROJECT ---
API CALL:
  DELETE /projects/{id}
  Permission: projects.projects.delete
  
  This sets status to "closed" (soft delete). Show a confirmation dialog:
  "Are you sure you want to close this project? This will set its status to Closed."

=========================================================
PAGE 2B: PROJECT DETAIL  →  /projects/list/{id}
=========================================================

Purpose: Full detail view of a single project with tabbed sub-sections.

API CALL:
  GET /projects/{id}
  Permission: projects.projects.view

Returns the full project object with all sub-resources loaded.

UI LAYOUT:
  Header section:
    - Project code + name (large heading)
    - Status badge
    - Department, Project Manager, Location
    - Date range
    - Total budget
    - Edit button (projects.projects.edit)

  Tab navigation with these tabs:
    1. Overview (default)
    2. Team
    3. Activities
    4. Budget
    5. Donors
    6. Partners
    7. Notes

--- TAB 1: OVERVIEW ---
  - Description (rendered as text)
  - Objectives (rendered as text)
  - Activity progress summary (progress bar: completed/total activities)
  - Budget summary (total budget, breakdown by category chart)
  - Counts: donors, partners, team members
  - Notes (brief excerpt)

--- TAB 2: TEAM MEMBERS ---

  LIST:
    GET /projects/{projectId}/team
    Permission: projects.projects.view

  Response:
    {
      "data": {
        "team_members": [
          {
            "id": "uuid",
            "project_id": "uuid",
            "employee_id": "uuid",
            "employee_name": "...",
            "employee_department": "...",
            "role": "Project Lead",
            "start_date": "2026-04-01",
            "end_date": null,
            "notes": "...",
            "created_at": "..."
          }
        ]
      }
    }

  ADD:
    POST /projects/{projectId}/team
    Permission: projects.projects.edit
    Body: { employee_id (required, uuid), role (string), start_date, end_date, notes }
    Error: 422 if employee already assigned.

  UPDATE:
    PATCH /projects/{projectId}/team/{memberId}
    
  REMOVE:
    DELETE /projects/{projectId}/team/{memberId}
    Show confirmation dialog.

  UI: Table with Name, Department, Role, Dates, Actions (Edit, Remove).
      "Add Team Member" button → modal with employee dropdown (GET /hr/employees?per_page=0).

--- TAB 3: ACTIVITIES / MILESTONES ---

  LIST:
    GET /projects/{projectId}/activities
    Permission: projects.activities.view
    Query: ?status=not_started|in_progress|completed|delayed|cancelled

  Response:
    {
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
            "created_at": "..."
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

  CREATE:
    POST /projects/{projectId}/activities
    Permission: projects.activities.create
    Body:
      | Field                 | Type    | Required | Rules                                      |
      |-----------------------|---------|----------|--------------------------------------------|
      | title                 | string  | Yes      | Max 255                                    |
      | description           | string  | No       | Max 5000                                   |
      | start_date            | date    | No       |                                            |
      | end_date              | date    | No       | >= start_date                              |
      | target_date           | date    | No       |                                            |
      | status                | string  | No       | not_started, in_progress, completed, delayed, cancelled |
      | completion_percentage | integer | No       | 0–100                                      |
      | sort_order            | integer | No       | Min 0                                      |
      | notes                 | string  | No       | Max 2000                                   |

  UPDATE:
    PATCH /projects/{projectId}/activities/{activityId}
    Permission: projects.activities.edit

  DELETE:
    DELETE /projects/{projectId}/activities/{activityId}
    Permission: projects.activities.delete

  UI:
    - Summary bar at top: total / not_started / in_progress / completed / delayed
    - Status filter dropdown
    - Card or table list:
      Each activity shows: title, date range, status badge, progress bar (completion_percentage)
    - "Add Activity" button → modal
    - Inline progress slider to quickly update completion_percentage

--- TAB 4: BUDGET ---

  LIST:
    GET /projects/{projectId}/budget-lines
    Permission: projects.budget.view

  Response:
    {
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
            "created_at": "..."
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

  CREATE:
    POST /projects/{projectId}/budget-lines
    Permission: projects.budget.create
    Body:
      | Field              | Type    | Required | Rules                        |
      |--------------------|---------|----------|------------------------------|
      | budget_category_id | uuid    | Yes      | Must exist in budget_categories |
      | description        | string  | Yes      | Max 500                      |
      | unit               | string  | No       | Max 100                      |
      | quantity           | decimal | Yes      | Min 0.01                     |
      | unit_cost          | decimal | Yes      | Min 0                        |
      | notes              | string  | No       | Max 2000                     |

    total_cost is auto-calculated (quantity x unit_cost).
    Project total_budget is auto-recalculated.

  UPDATE:
    PATCH /projects/{projectId}/budget-lines/{lineId}
    Permission: projects.budget.edit

  DELETE:
    DELETE /projects/{projectId}/budget-lines/{lineId}
    Permission: projects.budget.delete
    Project total_budget is auto-recalculated.

  UI:
    - Budget summary at top:
      Total Budget (formatted), with category breakdown (bar chart or summary cards)
    - Table grouped by budget_category:
      Category | Description | Unit | Qty | Unit Cost | Total Cost | Actions
    - Category subtotals
    - "Add Budget Line" button → modal with category dropdown
      (fetch categories from GET /projects/budget-categories?per_page=0)

--- TAB 5: DONORS ---

  LIST:
    GET /projects/{projectId}/donors
    Permission: projects.projects.view

  Response:
    {
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
            "created_at": "..."
          }
        ],
        "total_contributions": 20000000.00
      }
    }

  CREATE:
    POST /projects/{projectId}/donors
    Permission: projects.projects.edit
    Body:
      | Field               | Type    | Required | Rules                                    |
      |---------------------|---------|----------|------------------------------------------|
      | name                | string  | Yes      | Max 255                                  |
      | type                | string  | No       | individual, organization, government, multilateral |
      | email               | string  | No       | Valid email                              |
      | phone               | string  | No       | Max 50                                   |
      | contribution_amount | decimal | No       | Min 0                                    |
      | notes               | string  | No       | Max 2000                                 |

  UPDATE: PATCH /projects/{projectId}/donors/{donorId}
  DELETE: DELETE /projects/{projectId}/donors/{donorId}

  UI:
    - Total contributions card at top
    - Table: Name, Type badge, Email, Phone, Contribution (currency), Actions
    - "Add Donor" button → modal

--- TAB 6: PARTNERS ---

  LIST:
    GET /projects/{projectId}/partners
    Permission: projects.projects.view

  CREATE:
    POST /projects/{projectId}/partners
    Permission: projects.projects.edit
    Body:
      | Field          | Type   | Required | Rules                                      |
      |----------------|--------|----------|--------------------------------------------|
      | name           | string | Yes      | Max 255                                    |
      | role           | string | No       | implementing, technical, funding, logistics |
      | contact_person | string | No       | Max 255                                    |
      | email          | string | No       | Valid email                                |
      | phone          | string | No       | Max 50                                     |
      | notes          | string | No       | Max 2000                                   |

  UPDATE: PATCH /projects/{projectId}/partners/{partnerId}
  DELETE: DELETE /projects/{projectId}/partners/{partnerId}

  UI:
    - Table: Name, Role badge, Contact Person, Email, Phone, Actions
    - "Add Partner" button → modal

--- TAB 7: PROJECT NOTES ---

  LIST:
    GET /projects/{projectId}/notes
    Permission: projects.notes.view
    Query: ?search=...

  Response:
    {
      "data": {
        "notes": [
          {
            "id": "uuid",
            "project_id": "uuid",
            "created_by": "uuid",
            "creator_name": "John Doe",
            "title": "Site Visit Report",
            "content": "Visited the project site...",
            "link_url": "https://docs.google.com/...",
            "link_label": "Full Report on Google Docs",
            "created_at": "..."
          }
        ],
        "total": 3
      }
    }

  CREATE:
    POST /projects/{projectId}/notes
    Permission: projects.notes.create
    Body:
      | Field      | Type   | Required | Rules                  |
      |------------|--------|----------|------------------------|
      | title      | string | Yes      | Max 255                |
      | content    | string | No       | Max 10000              |
      | link_url   | string | No       | Valid URL, max 2048    |
      | link_label | string | No       | Max 255                |

    created_by is auto-set by the backend.

  UPDATE: PATCH /projects/{projectId}/notes/{noteId}  (projects.notes.edit)
  DELETE: DELETE /projects/{projectId}/notes/{noteId}  (projects.notes.delete)

  UI:
    - Card layout (not table):
      Each note card shows: title, creator_name, date, content preview (truncated),
      link button if link_url exists
    - Search bar
    - "Add Note" button → modal with title, rich text content, optional link URL + label

=========================================================
PAGE 3: BENEFICIARIES  →  HIDDEN (do not implement)
=========================================================

This feature is intentionally hidden for now. Do NOT add a Beneficiaries
page or sidebar link. The backend endpoints exist but should not be
consumed by the frontend at this time.

=========================================================
PAGE 4: BUDGET CATEGORIES  →  /projects/budget-categories
=========================================================

Purpose: Admin page to manage budget category definitions used by project budget lines.

--- LIST ---
API CALL:
  GET /projects/budget-categories
  Permission: projects.budget_categories.view

Query Parameters:
  | Param    | Type   | Default    | Options                                  |
  |----------|--------|------------|------------------------------------------|
  | status   | string | —          | active, inactive                         |
  | search   | string | —          | Searches name, description               |
  | sort_by  | string | sort_order | name, sort_order, status, created_at     |
  | sort_dir | string | asc        | asc, desc                                |
  | per_page | int    | 25         | 1–100 (0 = all)                          |

Response fields:
  id, name, description, sort_order, status, created_at, updated_at

UI:
  - Simple table: Name, Description, Sort Order, Status badge, Actions
  - Search bar
  - Status filter
  - "+ Add Category" button (projects.budget_categories.create)

--- CREATE ---
  POST /projects/budget-categories
  Permission: projects.budget_categories.create
  Body:
    | Field       | Type    | Required | Rules                       |
    |-------------|---------|----------|-----------------------------|
    | name        | string  | Yes      | Max 255, unique             |
    | description | string  | No       | Max 2000                    |
    | sort_order  | integer | No       | Min 0 (default: 0)          |
    | status      | string  | No       | active, inactive (default: active) |

--- UPDATE ---
  PATCH /projects/budget-categories/{id}
  Permission: projects.budget_categories.edit

--- DELETE ---
  DELETE /projects/budget-categories/{id}
  Permission: projects.budget_categories.delete
  Error: 422 if category has existing budget lines (show error to user).

=========================================================
PAGE 5: REPORTS  →  /projects/reports
=========================================================

Purpose: Program and project analytics dashboard.

This page combines data from two API groups:

--- PROGRAM REPORTS (Beneficiary analytics) ---

  GET /programs/reports/summary
  Permission: programs.beneficiaries.view

  Response:
    {
      "data": {
        "total_beneficiaries": 150,
        "active_beneficiaries": 120,
        "total_projects": 12,
        "beneficiaries_by_project": [
          { "project_id": "uuid", "project_name": "...", "beneficiary_count": 25 }
        ],
        "beneficiaries_by_status": {
          "active": 120, "inactive": 10, "graduated": 15, "withdrawn": 5
        },
        "enrollment_trends": {
          "2025-05": 12, "2025-06": 18, ...   // last 12 months
        },
        "gender_distribution": {
          "male": 70, "female": 75, "other": 5
        }
      }
    }

  GET /programs/reports/export?project_id=...&format=json
  Permission: programs.beneficiaries.view
  (Returns all beneficiary data for export)

--- PROJECT REPORTS ---

  GET /reports/projects/summary
  Permission: reports.reports.view
  (Project portfolio summary)

  GET /reports/projects/{id}/detail
  Permission: reports.reports.download
  (Detailed single-project report)

  GET /reports/projects/budget-utilization
  Permission: reports.reports.view
  (Budget utilization across all projects)

  GET /reports/projects/activity-progress
  Permission: reports.reports.view
  (Activity progress across all projects)

UI LAYOUT:
  Show project analytics only (beneficiary analytics hidden for now):

  PROJECT ANALYTICS:
    - Portfolio summary stats
    - Budget utilization chart (budget vs actual by project)
    - Activity progress chart (completion % by project)
    - Click on a project → detail report

=========================================================
TECHNICAL REQUIREMENTS
=========================================================

1. FRAMEWORK: Vite + React (JSX). No TypeScript — all files use .jsx extension.

2. ROUTING: React Router (v6+). Use <Route>, <Outlet>, useParams, useNavigate, etc.

3. HTTP CLIENT: Axios. Create a shared Axios instance with:
   - baseURL: https://api.casi360.com/api/v1 (or from env var VITE_API_BASE_URL)
   - withCredentials: true (for Sanctum cookie auth)
   - Interceptors: attach auth token, handle 401 → redirect to login

4. STATE MANAGEMENT: React Context + useReducer, or whatever pattern the
   existing app already uses. Keep it simple — no external state libraries
   unless already in the project.

5. ERROR HANDLING:
   - 401 → redirect to login
   - 403 → show "You don't have permission" message
   - 422 → show field-level validation errors under each form field
   - 500 → show generic error toast

6. LOADING STATES: Show skeleton loaders or spinners while data loads.

7. EMPTY STATES: Show meaningful empty states with call-to-action.
   Example: "No projects yet. Create your first project to get started."

8. PERMISSIONS: Check user permissions before rendering action buttons.
   Only show "Create", "Edit", "Delete" buttons if the user has the
   corresponding permission. Read permissions from the auth context.

9. RESPONSIVE: All pages must work on desktop (1024px+) and tablet (768px+).

10. TOAST NOTIFICATIONS: Show success/error toasts after CRUD operations.
    Use whatever toast library the app already has (e.g., react-hot-toast,
    react-toastify, or a custom toast component).

11. NO EMOJIS: Use SVG icons only. Use a consistent icon library
    (Lucide React, React Icons, Heroicons, etc.)

12. CURRENCY FORMATTING: Format all monetary values with Intl.NumberFormat.
    Default currency: NGN. Use the project's currency field when available.

13. DATE FORMATTING: Display dates in readable format (e.g., "Apr 1, 2026").
    Use Intl.DateTimeFormat or date-fns.

14. PERFORMANCE: Debounce search inputs (300ms). Use pagination (never load
    all records in table views). Lazy-load tabs on project detail page
    with React.lazy() + Suspense.

15. CONFIRMATION DIALOGS: Use a reusable confirmation modal for all delete actions.

16. ENVIRONMENT VARIABLES: Use VITE_* prefix for all env vars.
    - VITE_API_BASE_URL=https://api.casi360.com/api/v1

=========================================================
FILE STRUCTURE (suggested)
=========================================================

All files use .jsx (not .tsx). Integrate into wherever the existing
app keeps its pages, components, and API services.

src/
  pages/
    projects/
      ProjectsOverview.jsx           → /projects (dashboard)
      ProjectsList.jsx               → /projects/list
      ProjectDetail.jsx              → /projects/list/:id (tabbed detail)
      BudgetCategories.jsx           → /projects/budget-categories
      ProjectReports.jsx             → /projects/reports
  components/
    projects/
      ProjectStatsCards.jsx
      ProjectTable.jsx
      ProjectFormModal.jsx
      ProjectDetailHeader.jsx
      TeamMembersTab.jsx
      ActivitiesTab.jsx
      BudgetTab.jsx
      DonorsTab.jsx
      PartnersTab.jsx
      ProjectNotesTab.jsx
      BudgetCategoryTable.jsx
      BudgetCategoryFormModal.jsx
  services/
    api/
      axiosInstance.js               → Shared Axios instance (baseURL, interceptors)
      projectsApi.js                 → All project API functions
      budgetCategoriesApi.js         → Budget category API functions
      projectReportsApi.js           → Report API functions

--- REACT ROUTER SETUP (add to your router config) ---

import { lazy, Suspense } from 'react';

const ProjectsOverview = lazy(() => import('./pages/projects/ProjectsOverview'));
const ProjectsList = lazy(() => import('./pages/projects/ProjectsList'));
const ProjectDetail = lazy(() => import('./pages/projects/ProjectDetail'));
const BudgetCategories = lazy(() => import('./pages/projects/BudgetCategories'));
const ProjectReports = lazy(() => import('./pages/projects/ProjectReports'));

// Add these inside your dashboard/authenticated layout route:
<Route path="projects" element={<Suspense fallback={<Spinner />}><ProjectsOverview /></Suspense>} />
<Route path="projects/list" element={<Suspense fallback={<Spinner />}><ProjectsList /></Suspense>} />
<Route path="projects/list/:id" element={<Suspense fallback={<Spinner />}><ProjectDetail /></Suspense>} />
<Route path="projects/budget-categories" element={<Suspense fallback={<Spinner />}><BudgetCategories /></Suspense>} />
<Route path="projects/reports" element={<Suspense fallback={<Spinner />}><ProjectReports /></Suspense>} />

--- AXIOS INSTANCE (src/services/api/axiosInstance.js) ---

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.casi360.com/api/v1',
  withCredentials: true,
  headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token'); // or however tokens are stored
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

=========================================================
API FUNCTION REFERENCE (for api service files)
=========================================================

// projectsApi.js
getProjectStats()                                    → GET /projects/stats
getProjects(params)                                  → GET /projects
getProject(id)                                       → GET /projects/{id}
createProject(data)                                  → POST /projects
updateProject(id, data)                              → PATCH /projects/{id}
deleteProject(id)                                    → DELETE /projects/{id}
getProjectDonors(projectId)                          → GET /projects/{projectId}/donors
createProjectDonor(projectId, data)                  → POST /projects/{projectId}/donors
updateProjectDonor(projectId, donorId, data)         → PATCH /projects/{projectId}/donors/{donorId}
deleteProjectDonor(projectId, donorId)               → DELETE /projects/{projectId}/donors/{donorId}
getProjectPartners(projectId)                        → GET /projects/{projectId}/partners
createProjectPartner(projectId, data)                → POST /projects/{projectId}/partners
updateProjectPartner(projectId, partnerId, data)     → PATCH /projects/{projectId}/partners/{partnerId}
deleteProjectPartner(projectId, partnerId)           → DELETE /projects/{projectId}/partners/{partnerId}
getProjectTeam(projectId)                            → GET /projects/{projectId}/team
addProjectTeamMember(projectId, data)                → POST /projects/{projectId}/team
updateProjectTeamMember(projectId, memberId, data)   → PATCH /projects/{projectId}/team/{memberId}
removeProjectTeamMember(projectId, memberId)         → DELETE /projects/{projectId}/team/{memberId}
getProjectActivities(projectId, params?)             → GET /projects/{projectId}/activities
createProjectActivity(projectId, data)               → POST /projects/{projectId}/activities
updateProjectActivity(projectId, activityId, data)   → PATCH /projects/{projectId}/activities/{activityId}
deleteProjectActivity(projectId, activityId)         → DELETE /projects/{projectId}/activities/{activityId}
getProjectBudgetLines(projectId)                     → GET /projects/{projectId}/budget-lines
createProjectBudgetLine(projectId, data)             → POST /projects/{projectId}/budget-lines
updateProjectBudgetLine(projectId, lineId, data)     → PATCH /projects/{projectId}/budget-lines/{lineId}
deleteProjectBudgetLine(projectId, lineId)           → DELETE /projects/{projectId}/budget-lines/{lineId}
getProjectNotes(projectId, params?)                  → GET /projects/{projectId}/notes
createProjectNote(projectId, data)                   → POST /projects/{projectId}/notes
updateProjectNote(projectId, noteId, data)           → PATCH /projects/{projectId}/notes/{noteId}
deleteProjectNote(projectId, noteId)                 → DELETE /projects/{projectId}/notes/{noteId}

// beneficiaries — HIDDEN, do not implement for now

// budgetCategoriesApi.js
getBudgetCategories(params)                          → GET /projects/budget-categories
getBudgetCategory(id)                                → GET /projects/budget-categories/{id}
createBudgetCategory(data)                           → POST /projects/budget-categories
updateBudgetCategory(id, data)                       → PATCH /projects/budget-categories/{id}
deleteBudgetCategory(id)                             → DELETE /projects/budget-categories/{id}

// projectReportsApi.js
getProjectReportSummary()                            → GET /reports/projects/summary
getProjectReportDetail(id)                           → GET /reports/projects/{id}/detail
getProjectBudgetUtilization()                        → GET /reports/projects/budget-utilization
getProjectActivityProgress()                         → GET /reports/projects/activity-progress

=========================================================
SIDEBAR NAVIGATION UPDATE
=========================================================

In the sidebar configuration file, replace the "Programs" group:

REMOVE:
  {
    label: "Programs",
    icon: <ProgramsIcon />,
    children: [
      { label: "Overview",      href: "/programs" },
      { label: "Projects",      href: "/programs/projects" },
      { label: "Beneficiaries", href: "/programs/beneficiaries" },
      { label: "Reports",       href: "/programs/reports" },
    ]
  }

REPLACE WITH:
  {
    label: "Projects",
    icon: <FolderKanbanIcon />,     // or similar SVG icon
    permission: "projects.projects.view",
    children: [
      { label: "Overview",           href: "/projects",                  permission: "projects.projects.view" },
      { label: "All Projects",       href: "/projects/list",             permission: "projects.projects.view" },
      { label: "Budget Categories",  href: "/projects/budget-categories", permission: "projects.budget_categories.view" },
      { label: "Reports",            href: "/projects/reports",          permission: "reports.reports.view" },
    ]
  }

=========================================================
SUMMARY OF ALL API ENDPOINTS USED
=========================================================

PROJECTS MODULE:
  GET    /projects/stats                                    → Overview stats
  GET    /projects                                          → List projects
  GET    /projects/{id}                                     → Project detail
  POST   /projects                                          → Create project
  PATCH  /projects/{id}                                     → Update project
  DELETE /projects/{id}                                     → Close project
  GET    /projects/{id}/donors                              → List donors
  POST   /projects/{id}/donors                              → Add donor
  PATCH  /projects/{id}/donors/{donorId}                    → Update donor
  DELETE /projects/{id}/donors/{donorId}                    → Remove donor
  GET    /projects/{id}/partners                            → List partners
  POST   /projects/{id}/partners                            → Add partner
  PATCH  /projects/{id}/partners/{partnerId}                → Update partner
  DELETE /projects/{id}/partners/{partnerId}                → Remove partner
  GET    /projects/{id}/team                                → List team
  POST   /projects/{id}/team                                → Add member
  PATCH  /projects/{id}/team/{memberId}                     → Update member
  DELETE /projects/{id}/team/{memberId}                     → Remove member
  GET    /projects/{id}/activities                          → List activities
  POST   /projects/{id}/activities                          → Create activity
  PATCH  /projects/{id}/activities/{activityId}              → Update activity
  DELETE /projects/{id}/activities/{activityId}              → Delete activity
  GET    /projects/{id}/budget-lines                        → List budget lines
  POST   /projects/{id}/budget-lines                        → Create budget line
  PATCH  /projects/{id}/budget-lines/{lineId}                → Update budget line
  DELETE /projects/{id}/budget-lines/{lineId}                → Delete budget line
  GET    /projects/{id}/notes                               → List notes
  POST   /projects/{id}/notes                               → Create note
  PATCH  /projects/{id}/notes/{noteId}                       → Update note
  DELETE /projects/{id}/notes/{noteId}                       → Delete note

BUDGET CATEGORIES:
  GET    /projects/budget-categories                        → List categories
  GET    /projects/budget-categories/{id}                   → Show category
  POST   /projects/budget-categories                        → Create category
  PATCH  /projects/budget-categories/{id}                   → Update category
  DELETE /projects/budget-categories/{id}                   → Delete category

BENEFICIARIES — HIDDEN (do not implement for now)

PROJECT REPORTS:
  GET    /reports/projects/summary                          → Portfolio summary
  GET    /reports/projects/{id}/detail                      → Single project report
  GET    /reports/projects/budget-utilization               → Budget utilization
  GET    /reports/projects/activity-progress                → Activity progress

SUPPORTING (already exist):
  GET    /hr/departments                                    → Dropdown for department
  GET    /hr/employees?per_page=0                           → Dropdown for manager/team

TOTAL: 33 endpoints consumed by this module (beneficiary endpoints hidden).
review