# CASI360 Module-by-Module Review Checklist

Date started: 2026-04-15
Owner: Frontend + Backend QA pass
Rule: Do not move to next module until all Critical/High issues are resolved or explicitly accepted.

## 0) Global Prerequisites (Run Once)

- [x] Frontend installs and starts (`npm install`, `npm run dev`)
- [x] Backend API reachable from frontend (`VITE_API_URL` set correctly)
- [x] Sanctum cookie flow works on target domain/subdomain
- [ ] Test accounts available for roles: super_admin, admin, manager, staff, viewer
- [ ] Seed/test data exists for HR, Procurement, Projects, Communication
- [ ] Mail delivery test target configured (or Mailtrap for password reset)
- [ ] Browser/device coverage agreed (Desktop + Mobile)
- [ ] Error logging enabled (browser console + backend logs)

## 1) Per-Module Exit Gates (Must Pass)

### A. Frontend Functional
- [ ] Navigation/routes load without crash
- [ ] List pages load and render expected data states (loading, empty, error, success)
- [ ] Create/edit/delete flows work end-to-end
- [ ] Search/filter/sort/pagination behave correctly
- [ ] Form validation messages are clear and accurate
- [ ] Permission-based UI visibility/actions are correct
- [ ] Mobile layout is usable (key paths)

### B. Backend/API Functional
- [ ] Endpoint coverage mapped for module
- [ ] Happy-path requests return expected payload shape
- [ ] Validation errors return proper status and messages
- [ ] Unauthorized/forbidden access enforced (401/403)
- [ ] Pagination/meta and filtering responses are consistent
- [ ] Soft-delete or status transitions behave correctly
- [ ] Audit trail entries generated for sensitive actions

### C. Data Integrity & Security
- [ ] No privilege escalation via direct API calls
- [ ] Cross-module references remain consistent
- [ ] Concurrency/idempotency checks on critical actions
- [ ] Sensitive fields not leaked in API responses

### D. Quality Gate
- [ ] Module-specific lint/build issues resolved
- [ ] No new console errors on tested journeys
- [ ] Known issues documented with owner and ETA

## 2) Execution Order

1. Authentication & User Management
2. HR Module
3. Procurement Module
4. Projects Module
5. Communication Module
6. Reports
7. Settings & Admin

## 3) Module Logs

## Module 1: Authentication & User Management
Status: IN PROGRESS

Frontend checks:
- [x] Routes and auth guards reviewed statically
- [ ] Login (valid/invalid credentials)
- [ ] Guest routes redirect behavior
- [ ] Protected route guard behavior
- [ ] Force-change-password flow
- [ ] Forgot/reset password flow
- [ ] Session restore on refresh
- [ ] Logout flow and post-logout access denial
- [ ] Role/permission-driven route behavior

Backend/API checks:
- [x] `GET /auth/session` unauthorized behavior verified (401 without session)
- [ ] `POST /auth/login` happy path
- [x] `POST /auth/login` invalid credentials behavior verified (422)
- [ ] `POST /auth/logout`
- [ ] `GET /auth/profile`
- [ ] `PATCH /auth/profile`
- [ ] `POST /auth/change-password`
- [ ] `POST /auth/forgot-password`
- [ ] `POST /auth/reset-password`
- [ ] `GET /auth/permissions`

Findings:
- [x] Baseline lint issues exist globally (23 errors) and reduce signoff confidence.
- [x] Production build succeeds, so there is no compile-time blocker.

Signoff:
- [ ] Frontend passed
- [ ] Backend passed
- [ ] Security checks passed
- [ ] Ready to proceed to Module 2

## Module 2: HR Module
Status: NOT STARTED

## Module 3: Procurement Module
Status: NOT STARTED

## Module 4: Projects Module
Status: NOT STARTED

## Module 5: Communication Module
Status: NOT STARTED

## Module 6: Reports
Status: NOT STARTED

## Module 7: Settings & Admin
Status: NOT STARTED
