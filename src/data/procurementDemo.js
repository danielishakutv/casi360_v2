/**
 * Procurement demo data — used until the backend endpoints are ready.
 * Each page imports its slice and manages it in local state for CRUD.
 */

/** Generate a collision-free ID for new demo records. */
export function nextId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random()
}

/* ─── Purchase Requests ─────────────────────────────────────── */
export const demoPurchaseRequests = [
  { id: 1,  pr_number: 'PR-2026-001', title: 'Office Stationery & Supplies',       requester: 'Amina Yusuf',     department: 'Admin',        total_amount: 185000,   priority: 'medium', status: 'approved',  needed_by: '2026-03-20', description: 'A4 paper, ink cartridges, pens, folders, and notepads for Q2.', notes: '', created_at: '2026-02-10' },
  { id: 2,  pr_number: 'PR-2026-002', title: 'IT Equipment — Laptops',             requester: 'Chidi Okafor',    department: 'IT',           total_amount: 4500000,  priority: 'high',   status: 'pending',   needed_by: '2026-04-01', description: '5× Dell Latitude 5540 laptops for new hires.', notes: '', created_at: '2026-02-14' },
  { id: 3,  pr_number: 'PR-2026-003', title: 'Cleaning Supplies Replenishment',    requester: 'Fatima Bello',    department: 'Facilities',   total_amount: 120000,   priority: 'low',    status: 'approved',  needed_by: '2026-03-15', description: 'Detergent, mops, hand sanitizers, and tissue rolls.', notes: '', created_at: '2026-02-18' },
  { id: 4,  pr_number: 'PR-2026-004', title: 'Conference Room Furniture',           requester: 'Tunde Adebayo',   department: 'Procurement',  total_amount: 2750000,  priority: 'medium', status: 'draft',     needed_by: '2026-05-10', description: '12-seater boardroom table, executive chairs, and smart TV bracket.', notes: 'Get quotes from at least 3 vendors', created_at: '2026-02-22' },
  { id: 5,  pr_number: 'PR-2026-005', title: 'Vehicle Maintenance — Fleet',        requester: 'Kola Adekunle',   department: 'Logistics',    total_amount: 980000,   priority: 'urgent', status: 'approved',  needed_by: '2026-03-05', description: 'Engine service, tyre replacement and brake pads for 3 field vehicles.', notes: '', created_at: '2026-02-25' },
  { id: 6,  pr_number: 'PR-2026-006', title: 'Safety PPE for Site Workers',        requester: 'Ngozi Eze',       department: 'HSE',          total_amount: 640000,   priority: 'high',   status: 'pending',   needed_by: '2026-03-18', description: 'Helmets, safety boots, reflective vests, and goggles — 50 sets.', notes: '', created_at: '2026-02-28' },
  { id: 7,  pr_number: 'PR-2026-007', title: 'Generator Diesel Supply — March',    requester: 'Emeka Nwankwo',   department: 'Facilities',   total_amount: 1350000,  priority: 'medium', status: 'rejected',  needed_by: '2026-03-01', description: '5,000 litres AGO for March operations.', notes: 'Budget exceeded — resubmit with revised qty', created_at: '2026-02-20' },
  { id: 8,  pr_number: 'PR-2026-008', title: 'Marketing Collateral — Q2 Campaign', requester: 'Bola Fashola',    department: 'Marketing',    total_amount: 520000,   priority: 'low',    status: 'cancelled', needed_by: '2026-04-15', description: 'Flyers, roll-up banners, and branded notebooks.', notes: 'Campaign postponed', created_at: '2026-01-30' },
]

/* ─── Bill of Quantities ────────────────────────────────────── */
export const demoBOQ = [
  { id: 10, boq_number: 'BOQ-2026-001', title: 'HQ Office Renovation',      project: 'HQ Renovation Phase 2',      prepared_by: 'Arc. Sola Balogun',  total_amount: 18500000, status: 'approved', description: 'Complete fit-out of 3rd floor — flooring, painting, electrical, partitions.', notes: '', created_at: '2026-01-15' },
  { id: 11, boq_number: 'BOQ-2026-002', title: 'Perimeter Fencing',          project: 'Warehouse Security Upgrade',  prepared_by: 'Eng. Hauwa Musa',    total_amount: 7200000,  status: 'pending',  description: 'Concrete block fence with barbed wire — 420m perimeter.', notes: '', created_at: '2026-02-01' },
  { id: 12, boq_number: 'BOQ-2026-003', title: 'Car Park Expansion',         project: 'HQ Renovation Phase 2',      prepared_by: 'Arc. Sola Balogun',  total_amount: 5400000,  status: 'draft',    description: 'Asphalting and drainage for 30 additional parking slots.', notes: 'Awaiting geotechnical report', created_at: '2026-02-10' },
  { id: 13, boq_number: 'BOQ-2026-004', title: 'Generator House Construction', project: 'Power Infrastructure',      prepared_by: 'Eng. Yemi Alade',    total_amount: 3100000,  status: 'approved', description: 'Block structure with ventilation, fuel containment and sound proofing.', notes: '', created_at: '2026-02-12' },
  { id: 14, boq_number: 'BOQ-2026-005', title: 'CCTV & Access Control',      project: 'Warehouse Security Upgrade',  prepared_by: 'Eng. Hauwa Musa',    total_amount: 4800000,  status: 'revised',  description: '24-camera system with NVR, biometric access at 6 entry points.', notes: 'Revised after vendor consultation', created_at: '2026-02-18' },
  { id: 15, boq_number: 'BOQ-2026-006', title: 'Backup Power — Solar',       project: 'Power Infrastructure',        prepared_by: 'Eng. Yemi Alade',    total_amount: 12600000, status: 'pending',  description: '25kVA hybrid inverter system with 40 panels.', notes: '', created_at: '2026-02-25' },
]

/* ─── Request for Quotation ─────────────────────────────────── */
export const demoRFQ = [
  { id: 20, rfq_number: 'RFQ-2026-001', title: 'IT Equipment Supply',            pr_reference: 'PR-2026-002', deadline: '2026-03-15', status: 'open',     quotes_count: 4, description: 'Supply of 5 Dell Latitude 5540 laptops with 3-year warranty.', notes: '', created_at: '2026-02-16' },
  { id: 21, rfq_number: 'RFQ-2026-002', title: 'Conference Furniture Supply',     pr_reference: 'PR-2026-004', deadline: '2026-03-25', status: 'open',     quotes_count: 3, description: 'Boardroom table, 12 executive chairs, and TV bracket/mount.', notes: '', created_at: '2026-02-24' },
  { id: 22, rfq_number: 'RFQ-2026-003', title: 'PPE Supply for Site Workers',     pr_reference: 'PR-2026-006', deadline: '2026-03-10', status: 'closed',   quotes_count: 5, description: '50 sets of safety helmets, boots, vests, and goggles.', notes: 'Lowest bidder: SafeGuard Nigeria Ltd', created_at: '2026-03-01' },
  { id: 23, rfq_number: 'RFQ-2026-004', title: 'Diesel Supply — Bulk Contract',   pr_reference: '',            deadline: '2026-03-20', status: 'awarded',  quotes_count: 6, description: 'Quarterly AGO supply contract — estimated 15,000 litres/quarter.', notes: 'Awarded to Total Energies', created_at: '2026-02-22' },
  { id: 24, rfq_number: 'RFQ-2026-005', title: 'Solar Power Installation',        pr_reference: '',            deadline: '2026-04-05', status: 'draft',    quotes_count: 0, description: '25kVA hybrid solar system — panels, inverter, batteries, and installation.', notes: '', created_at: '2026-03-02' },
]

/* ─── Purchase Orders ───────────────────────────────────────── */
export const demoPurchaseOrders = [
  { id: 30, po_number: 'PO-2026-001', title: 'Office Stationery Supply',     vendor: 'ABC Stationers Ltd',       pr_reference: 'PR-2026-001', rfq_reference: '',              total_amount: 185000,  delivery_date: '2026-03-10', status: 'received',           description: 'Q2 office supplies as per PR-2026-001.', notes: '', created_at: '2026-02-15' },
  { id: 31, po_number: 'PO-2026-002', title: 'Cleaning Materials',           vendor: 'CleanPro Nig. Ltd',        pr_reference: 'PR-2026-003', rfq_reference: '',              total_amount: 120000,  delivery_date: '2026-03-08', status: 'received',           description: 'Detergent, mops, sanitizers, tissue rolls.', notes: '', created_at: '2026-02-20' },
  { id: 32, po_number: 'PO-2026-003', title: 'Fleet Maintenance',            vendor: 'Autokraft Motors',         pr_reference: 'PR-2026-005', rfq_reference: '',              total_amount: 980000,  delivery_date: '2026-03-04', status: 'approved',           description: 'Engine service, tyres, and brake pads for 3 vehicles.', notes: '', created_at: '2026-02-26' },
  { id: 33, po_number: 'PO-2026-004', title: 'PPE Supply — 50 Sets',         vendor: 'SafeGuard Nigeria Ltd',    pr_reference: 'PR-2026-006', rfq_reference: 'RFQ-2026-003', total_amount: 640000,  delivery_date: '2026-03-18', status: 'issued',             description: 'Helmets, boots, vests, goggles — awarded via RFQ-2026-003.', notes: '', created_at: '2026-03-02' },
  { id: 34, po_number: 'PO-2026-005', title: 'Diesel Supply — March',        vendor: 'Total Energies',           pr_reference: '',            rfq_reference: 'RFQ-2026-004', total_amount: 1350000, delivery_date: '2026-03-05', status: 'partially_received', description: '5,000 litres AGO — quarterly contract.', notes: '3,000 litres delivered so far', created_at: '2026-02-28' },
  { id: 35, po_number: 'PO-2026-006', title: 'Generator House — Civil Works', vendor: 'BuildRight Constr. Ltd',  pr_reference: '',            rfq_reference: '',              total_amount: 3100000, delivery_date: '2026-04-15', status: 'approved',           description: 'Construction per BOQ-2026-004.', notes: '', created_at: '2026-03-01' },
  { id: 36, po_number: 'PO-2026-007', title: 'CCTV & Access Control Install', vendor: 'SecureTech Solutions',    pr_reference: '',            rfq_reference: '',              total_amount: 4800000, delivery_date: '2026-04-20', status: 'draft',              description: 'Supply & install 24-camera CCTV + biometric access per BOQ-2026-005.', notes: 'Pending final approval', created_at: '2026-03-03' },
]

/* ─── Goods Received Notes ──────────────────────────────────── */
export const demoGRN = [
  { id: 40, grn_number: 'GRN-2026-001', po_reference: 'PO-2026-001', vendor: 'ABC Stationers Ltd',    received_by: 'Amina Yusuf',    received_date: '2026-03-09', total_amount: 185000,  status: 'accepted',           description: 'All items verified — quantities and quality match PO.', notes: '', created_at: '2026-03-09' },
  { id: 41, grn_number: 'GRN-2026-002', po_reference: 'PO-2026-002', vendor: 'CleanPro Nig. Ltd',     received_by: 'Fatima Bello',   received_date: '2026-03-07', total_amount: 120000,  status: 'accepted',           description: 'All cleaning supplies received in good condition.', notes: '', created_at: '2026-03-07' },
  { id: 42, grn_number: 'GRN-2026-003', po_reference: 'PO-2026-005', vendor: 'Total Energies',        received_by: 'Emeka Nwankwo',  received_date: '2026-03-04', total_amount: 810000,  status: 'partial',            description: '3,000 of 5,000 litres received. Remaining 2,000 litres expected Mar 12.', notes: 'Partial delivery', created_at: '2026-03-04' },
  { id: 43, grn_number: 'GRN-2026-004', po_reference: 'PO-2026-003', vendor: 'Autokraft Motors',      received_by: 'Kola Adekunle',  received_date: '2026-03-05', total_amount: 980000,  status: 'pending_inspection', description: '3 vehicles serviced — awaiting QA inspection by fleet manager.', notes: '', created_at: '2026-03-05' },
  { id: 44, grn_number: 'GRN-2026-005', po_reference: 'PO-2026-004', vendor: 'SafeGuard Nigeria Ltd', received_by: 'Ngozi Eze',      received_date: '2026-03-17', total_amount: 640000,  status: 'inspected',          description: '50 PPE sets delivered. Spot-check done on 10 sets — quality OK.', notes: 'Full inspection scheduled for Mar 18', created_at: '2026-03-17' },
]

/* ─── Request for Payment ───────────────────────────────────── */
export const demoRFP = [
  { id: 50, rfp_number: 'RFP-2026-001', po_reference: 'PO-2026-001', grn_reference: 'GRN-2026-001', payee: 'ABC Stationers Ltd',    amount: 185000,  payment_method: 'bank_transfer', due_date: '2026-03-20', status: 'paid',     description: 'Full payment for office supplies — invoice #INV-ABC-0234.', notes: 'Paid via UBA on Mar 16', created_at: '2026-03-10' },
  { id: 51, rfp_number: 'RFP-2026-002', po_reference: 'PO-2026-002', grn_reference: 'GRN-2026-002', payee: 'CleanPro Nig. Ltd',     amount: 120000,  payment_method: 'bank_transfer', due_date: '2026-03-18', status: 'approved',  description: 'Full payment for cleaning materials — invoice #CP-2026-089.', notes: '', created_at: '2026-03-08' },
  { id: 52, rfp_number: 'RFP-2026-003', po_reference: 'PO-2026-005', grn_reference: 'GRN-2026-003', payee: 'Total Energies',        amount: 810000,  payment_method: 'bank_transfer', due_date: '2026-03-15', status: 'pending',   description: 'Partial payment for 3,000 litres AGO delivered.', notes: 'Remaining ₦540,000 upon full delivery', created_at: '2026-03-05' },
  { id: 53, rfp_number: 'RFP-2026-004', po_reference: 'PO-2026-003', grn_reference: 'GRN-2026-004', payee: 'Autokraft Motors',      amount: 980000,  payment_method: 'cheque',        due_date: '2026-03-25', status: 'on_hold',   description: 'Payment pending fleet QA inspection sign-off.', notes: '', created_at: '2026-03-06' },
  { id: 54, rfp_number: 'RFP-2026-005', po_reference: 'PO-2026-006', grn_reference: '',             payee: 'BuildRight Constr. Ltd', amount: 930000, payment_method: 'bank_transfer', due_date: '2026-04-01', status: 'draft',     description: '30% advance payment for generator house civil works.', notes: 'Mobilization fee per contract terms', created_at: '2026-03-04' },
]
