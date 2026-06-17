# CASI 360 — Overnight Work & Smoke-Test Checklist (2026-06-17)

Everything below is **committed and pushed to `main`** in both repos. Nothing is deployed yet — production is untouched until you run the deploy scripts. Work through the **Deploy → Setup → Smoke Test** sections in order.

- **Backend** (`casi360`, branch=main): HEAD `f3bd9e7` (+ a small follow-up perf commit)
- **Frontend** (`casi360_v4`, branch=main): HEAD `bedf876`

If anything misbehaves, every change is a separate commit (hashes listed under each item) so you can revert one cleanly.

---

## 1. Deploy (run on the server, in this order)

```bash
~/deploy-api.sh      # backend — runs php artisan migrate (applies migrations 083–087)
~/deploy-web.sh      # frontend — npm install + build + atomic dist swap
```

Run **both** (backend first). All migrations are **additive + idempotent** — existing data is preserved.

### Migrations applied this batch
| # | What it does |
|---|---|
| 083 | Compliance checklist columns on `rfps` |
| 084 | PR/PO/GRN reference links (JSON) on `rfps` |
| 085 | `rfp_approvals` table + widened `rfps.status` (payment chain) |
| 086 | `rfps.raised_by` (segregation of duties) |
| 087 | `boq_approvals` table + `boqs.budget_holder_id`/`created_by` + widened `boqs.status` |

### Config note (originator-skip + payment final approver)
`backend/config/procurement.php` holds two toggles. If `deploy-api.sh` doesn't sync `config/`, the **defaults still apply** (originator-skip **ON**, payment final approver = **Country Director**) — the feature works regardless. The `.env` toggles only matter if you want to change them:
- `PROCUREMENT_ORIGINATOR_SKIP=false` — disable auto-skip of the Budget Holder stage when the requester is the budget holder.
- `PROCUREMENT_PAYMENT_FINAL_APPROVER=operations` — make Operations (instead of Country Director) the final approver on Payment Requests.

After changing `.env`: `cd /home/api.casi360.com && php artisan optimize:clear`.

---

## 2. Post-deploy setup (one-time, in Settings → Administration / HR)

The approval engine resolves approvers by **department code + manager role**. Make sure these exist:

| Stage / role | Requirement |
|---|---|
| Finance approver | A user with `role=manager` in the **Finance** dept (code `FINANCE`) |
| Procurement approver | `role=manager` in **Procurement** (code `PROCUREMENT`) |
| Operations final approver (AP1 Dr. Lokoroi / AP2 Murjanatu) | `role=manager` in **Operations** (code `OPERATIONS`) — either can approve |
| Programme Manager (payment chain) | `role=manager` in **Programs** (code `PROGRAMS`) |
| Country Director (payment final approver) | The CD account set to `role=country_director` |
| Budget Holder (PR/BOQ stage 1) | Picked per-document on the form (an Employee, matched by email to a user) |

> ⚠️ Confirm the department **codes** are exactly `FINANCE`, `PROCUREMENT`, `OPERATIONS`, `PROGRAMS`. The names can vary; the code is what the engine matches on.

**Segregation of duties** needs enough distinct people: a user who *raised* a document can't approve it, and one person can't approve two stages. If the only eligible approver raised it, an **admin** (who didn't raise it) or **super_admin** can step in.

---

## 3. Smoke-test checklist (test one after another on the live app)

### A. Purchase Request (PR) — 4-stage chain + originator-skip + SoD
*(commit `ad6e94f`, `d671ee1`)*
- [ ] Raise a PR, set **yourself** as Budget Holder → submit → chain shows **Budget Holder = Skipped**, active stage **Finance**.
- [ ] Raise a PR with **someone else** as Budget Holder → chain starts at **Budget Holder**.
- [ ] As the Budget Holder approve → moves to Finance → Procurement → Operations → **Approved**.
- [ ] SoD: try to approve a PR **you raised** at a later stage → blocked ("Segregation of duties…").

### B. BOQ — now follows the SAME 4-stage chain as PR (NEW)
*(backend `f3bd9e7`, frontend `177fc31`)*
- [ ] New BOQ form: **Prepared By** is pre-filled with you (editable), **Budget Holder** picker is required, **PR Reference** is a searchable dropdown.
- [ ] "Submit for Approval" without a Budget Holder → blocked with a clear message.
- [ ] Submit a BOQ → it appears in **Pending Approvals → Bills of Quantities** with the full chain (Budget Holder → Finance → Procurement → Operations).
- [ ] Approve through all four stages (different users per stage) → **Approved**.
- [ ] If you select **yourself** as Budget Holder → that stage auto-skips on submit.
- [ ] Note: BOQs **submitted before this deploy** won't appear in the new queue (old single-stage). Re-submit them, or this clears with the pilot-data wipe.

### C. Payment Request (RFP) — compliance gate + payment chain + auto-fill
*(backend `c6aa577`, `f5c528b`, `30a40a8`; frontend `1b8c50f`, `25c1825`, `861fa41`)*
- [ ] New RFP form: **Requester + Procurement Person** pre-filled with you (editable); **PR/PO/GRN** are searchable multi-selects (and actually save now).
- [ ] **Compliance gate**: pick nothing → blocked. Pick "procedures followed" → ok. Pick "waived" with blank justification/link → blocked; fill both → ok.
- [ ] Raise the RFP → it enters approval and appears in **Pending Approvals → Payment Requests** with chain **Programme Manager → Finance → Country Director**.
- [ ] Approve as Programme Manager → Finance → Country Director → **Approved**; Finance can then mark it **Paid**.
- [ ] SoD: the person who raised the RFP can't approve it.

### D. Reports module — preview + downloads
*(no code change — verifying existing module)*
- [ ] Open **Reports**. For each category (HR, Procurement, Projects, Communication, Finance, Audit): click **Preview** → a data table renders.
- [ ] Click **CSV / Excel / PDF** on a couple of reports → file downloads (opens in a new tab). 
- [ ] If a download shows a JSON/login error instead of a file, note which report — that means the auth cookie didn't carry to the API tab; tell me and I'll switch downloads to an authenticated blob download.

### E. Settings — Appearance removed
*(frontend `bedf876`)*
- [ ] Open **Settings** → the **Appearance** tab/section is gone; searching "color/logo/theme" returns nothing.
- [ ] All other settings groups (Localization, System, Procurement, etc.) still work.

### F. GRN — auto-fill
*(frontend `bedf876`)*
- [ ] New Goods Received Note → **Received By** is pre-filled with you (editable).

### G. Notifications / realtime (already live earlier in the batch)
- [ ] Messages/Forum update without a manual refresh; the bell + unread badge poll.

---

## 4. Known notes / honest gaps

- **Segregation of duties** is enforced on **PR, BOQ, and RFP** chains. It is **not** on legacy Purchase Orders (old approval system) — those are unchanged.
- **Email (Zeptomail)** is wired but **not live** — set `MAIL_USERNAME=emailapikey` + `MAIL_PASSWORD=<Zeptomail token>` in the API `.env` to turn it on.
- **Amount-based approval routing** (₦100k / ₦10M thresholds) is **not built** — still waiting on the ED's written limits matrix. The chains are fixed-sequence for now.
- **HR payslips + bank transfer** — not built (need PAYE/pension specs; real-money review).
- **Pilot data wipe** — your task (DI) before go-live; it also clears any orphaned old-status BOQs.

---

## 5. What's left for your decision (no rush)
- Final-approver mapping for payments (defaulted to Country Director — change via `.env` if the ED says Operations or amount-based).
- The written approval-limits matrix → then I'll build amount-based routing.
- Whether to add real file uploads (currently the waiver "document" is a link/reference).

*Generated overnight. Review, deploy, and smoke-test top to bottom. Ping me with anything that needs adjusting.*
