import logoSrc from '../assets/casi_logo.jpg'

/**
 * Purchase Order exports — Word (.doc) and CSV.
 *
 * The view-model `po` carries the form state plus a few fields the
 * backend may have re-issued on save (po_number, status). The
 * downloaded document is a fully-priced PO (unlike RFQ, which
 * leaves prices for the vendor to fill in) — the PO records what
 * the organisation has agreed to pay.
 *
 * The system never emails the vendor. The procurement officer
 * downloads in their preferred format and forwards manually.
 */

/* ── formatters ────────────────────────────────────────────────────── */
function fmt(symbol, n) {
  const v = Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${symbol || ''}${v}`
}
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function fmtDateOrBlank(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function lineTotal(li) {
  return (Number(li.quantity) || 0) * (Number(li.unit_price) || 0)
}

/* ── shared loader for the logo ────────────────────────────────────── */
async function loadLogoBase64(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/jpeg'))
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ================================================================== */
/* Word (.doc) — HTML with Office namespaces                          */
/* ================================================================== */
function buildDOCHtml(po, logoData) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const symbol = po.currency_symbol || ''

  const items = po.line_items || []
  const subtotal = items.reduce((s, li) => s + lineTotal(li), 0)
  const tax = Number(po.sales_tax) || 0
  const charges = Number(po.delivery_charges) || 0
  const grand = subtotal + tax + charges

  const itemRows = items.map((li, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(li.pr_no || '')}</td>
      <td>${esc(li.project_code || '')}</td>
      <td>${esc(li.budget_line || '')}</td>
      <td>${esc(li.description || '')}</td>
      <td>${esc(li.unit || '')}</td>
      <td style="text-align:right">${esc(li.quantity ?? '')}</td>
      <td style="text-align:right">${li.unit_price ? esc(fmt(symbol, li.unit_price)) : ''}</td>
      <td style="text-align:right">${li.unit_price ? esc(fmt(symbol, lineTotal(li))) : ''}</td>
    </tr>`).join('')

  const logoCell = logoData
    ? `<img src="${logoData}" alt="Care Aid" style="height:54pt; width:auto;" />`
    : ''

  const header = `
  <table class="letterhead" style="border:none; margin-bottom:6pt;">
    <tr>
      <td style="border:none; vertical-align:middle; width:60pt; padding:0 8pt 0 0;">${logoCell}</td>
      <td style="border:none; vertical-align:middle;">
        <div style="font-size:14pt; font-weight:bold; color:#1e293b; letter-spacing:0.5pt;">CARE AID SUPPORT INITIATIVE</div>
        <div style="font-size:9pt; color:#6b7280;">casi360.com</div>
      </td>
      <td style="border:none; vertical-align:middle; text-align:right; color:#6b7280; font-size:9pt;">
        <div style="font-weight:bold; color:#1e293b; font-size:11pt;">Purchase Order</div>
        <div>${esc(po.po_number || '')}</div>
        <div>Status: ${esc((po.status || '').replace(/_/g, ' '))}</div>
        <div>${esc(fmtDate(po.date))}</div>
      </td>
    </tr>
  </table>
  <hr style="border:none; border-top:0.75pt solid #c8d2e0; margin:0 0 12pt;" />`

  const paymentTerms = (po.payment_terms || []).join(', ') || '—'

  return `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${esc(po.po_number || 'PO')}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 10.5pt; color: #111; }
  h2 { font-size: 12pt; margin: 12pt 0 4pt; border-bottom: 1pt solid #d0d7de; padding-bottom: 2pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
  td, th { border: 0.75pt solid #b8c1cc; padding: 4pt 6pt; vertical-align: top; }
  th { background: #2563eb; color: #fff; text-align: left; }
  .label { background: #f5f7fa; font-weight: bold; width: 22%; }
  .meta-grid td { vertical-align: top; }
  .letterhead, .letterhead td { border: none !important; }
  .footer { color: #6b7280; font-size: 9pt; margin-top: 18pt; border-top: 0.75pt solid #d0d7de; padding-top: 6pt; }
  .totals td { border: none; padding: 2pt 6pt; }
  .totals .label { background: transparent; text-align: right; font-weight: normal; width: 75%; }
  .totals .amount { text-align: right; font-weight: bold; width: 25%; }
  .totals .grand .label, .totals .grand .amount { font-size: 12pt; border-top: 1pt solid #1e293b; padding-top: 4pt; }
</style></head>
<body>
  ${header}

  <h2>Order Details</h2>
  <table class="meta-grid">
    <tr><td class="label">PO Number</td><td>${esc(po.po_number || '')}</td>
        <td class="label">Date</td><td>${esc(fmtDate(po.date))}</td></tr>
    <tr><td class="label">Department</td><td>${esc(po.department_name || '—')}</td>
        <td class="label">Currency</td><td>${esc(po.currency || 'NGN')}</td></tr>
    <tr><td class="label">Source PR</td><td>${esc(po.pr_reference || '—')}</td>
        <td class="label">Source RFQ</td><td>${esc(po.rfq_reference || '—')}</td></tr>
    <tr><td class="label">Location</td><td colspan="3">${esc(po.location || '—')}</td></tr>
  </table>

  <h2>Vendor</h2>
  <table class="meta-grid">
    <tr><td class="label">Name</td><td>${esc(po.vendor_name || '')}</td>
        <td class="label">Contact Person</td><td>${esc(po.vendor_contact_person || '')}</td></tr>
    <tr><td class="label">Address</td><td>${esc(po.vendor_address || '')}</td>
        <td class="label">Telephone</td><td>${esc(po.vendor_phone || '')}</td></tr>
  </table>

  <h2>Deliver To</h2>
  <table class="meta-grid">
    <tr><td class="label">Name</td><td>${esc(po.deliver_name || '')}</td>
        <td class="label">Position</td><td>${esc(po.deliver_position || '')}</td></tr>
    <tr><td class="label">Address</td><td>${esc(po.deliver_address || '')}</td>
        <td class="label">Contact</td><td>${esc(po.deliver_contact || '')}</td></tr>
  </table>

  <h2>Payment &amp; Delivery</h2>
  <table class="meta-grid">
    <tr><td class="label">Payment Terms</td><td>${esc(paymentTerms)}</td>
        <td class="label">Delivery Date</td><td>${esc(fmtDateOrBlank(po.delivery_date) || '—')}</td></tr>
    <tr><td class="label">Delivery Terms</td><td colspan="3">${esc(po.delivery_terms || '—')}</td></tr>
  </table>

  <h2>Itemized List</h2>
  <table>
    <tr><th>#</th><th>PR No</th><th>Project</th><th>Budget Line</th><th>Description</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
    ${itemRows || '<tr><td colspan="9" style="text-align:center; color:#888;">No items</td></tr>'}
  </table>

  <table class="totals">
    <tr><td class="label">Subtotal</td><td class="amount">${esc(fmt(symbol, subtotal))}</td></tr>
    <tr><td class="label">Sales Tax</td><td class="amount">${esc(fmt(symbol, tax))}</td></tr>
    <tr><td class="label">Delivery Charges</td><td class="amount">${esc(fmt(symbol, charges))}</td></tr>
    <tr class="grand"><td class="label">TOTAL</td><td class="amount">${esc(fmt(symbol, grand))}</td></tr>
  </table>

  ${po.remarks ? `<h2>Remarks</h2><div style="white-space:pre-wrap;">${esc(po.remarks)}</div>` : ''}

  <h2>Signatures</h2>
  <table>
    <tr><th>Role</th><th>Name</th><th>Position</th><th>Signature</th><th>Date</th></tr>
    ${[
      ['Prepared By', po.prepared_by],
      ['Approved By', po.approved_by],
      ['Reviewed By', po.reviewed_by],
      ['Supplier Acceptance &amp; Stamp', po.supplier_acceptance],
    ].map(([label, sig]) => `
    <tr>
      <td>${label}</td>
      <td>${esc(sig?.name || '')}</td>
      <td>${esc(sig?.position || '')}</td>
      <td>${esc(sig?.signature || '')}</td>
      <td>${esc(fmtDateOrBlank(sig?.date))}</td>
    </tr>`).join('')}
  </table>

  <div class="footer">
    This document is digitally generated and system-verified by casi360.com.
  </div>
</body>
</html>`
}

async function exportDOC(po) {
  const logoData = await loadLogoBase64(logoSrc)
  const html = buildDOCHtml(po, logoData)
  const baseName = po.po_number || 'purchase-order'
  saveBlob(new Blob([html], { type: 'application/msword' }), `${baseName}.doc`)
}

/* ================================================================== */
/* CSV                                                                 */
/* ================================================================== */
function exportCSV(po) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const symbol = po.currency_symbol || ''
  const items = po.line_items || []
  const subtotal = items.reduce((s, li) => s + lineTotal(li), 0)
  const tax = Number(po.sales_tax) || 0
  const charges = Number(po.delivery_charges) || 0
  const grand = subtotal + tax + charges

  const rows = [
    ['Purchase Order'],
    ['Field', 'Value'],
    ['PO Number',     po.po_number || ''],
    ['Status',        (po.status || '').replace(/_/g, ' ')],
    ['Date',          fmtDate(po.date)],
    ['Department',    po.department_name || ''],
    ['Currency',      po.currency || 'NGN'],
    ['Source PR',     po.pr_reference || ''],
    ['Source RFQ',    po.rfq_reference || ''],
    ['Location',      po.location || ''],
    [],
    ['Vendor'],
    ['Name',           po.vendor_name || ''],
    ['Contact Person', po.vendor_contact_person || ''],
    ['Address',        po.vendor_address || ''],
    ['Telephone',      po.vendor_phone || ''],
    [],
    ['Deliver To'],
    ['Name',     po.deliver_name || ''],
    ['Position', po.deliver_position || ''],
    ['Address',  po.deliver_address || ''],
    ['Contact',  po.deliver_contact || ''],
    [],
    ['Payment & Delivery'],
    ['Payment Terms',  (po.payment_terms || []).join(', ')],
    ['Delivery Terms', po.delivery_terms || ''],
    ['Delivery Date',  fmtDateOrBlank(po.delivery_date)],
    [],
    ['Itemized List'],
    ['#', 'PR No', 'Project', 'Budget Line', 'Description', 'Unit', 'Qty', 'Unit Price', 'Total'],
    ...items.map((li, i) => [
      i + 1,
      li.pr_no || '',
      li.project_code || '',
      li.budget_line || '',
      li.description || '',
      li.unit || '',
      li.quantity ?? '',
      li.unit_price ? fmt(symbol, li.unit_price) : '',
      li.unit_price ? fmt(symbol, lineTotal(li)) : '',
    ]),
    [],
    ['Subtotal',         fmt(symbol, subtotal)],
    ['Sales Tax',        fmt(symbol, tax)],
    ['Delivery Charges', fmt(symbol, charges)],
    ['TOTAL',            fmt(symbol, grand)],
    [],
    ['Remarks', po.remarks || ''],
    [],
    ['Signatures'],
    ['Role', 'Name', 'Position', 'Signature', 'Date'],
    ...[
      ['Prepared By', po.prepared_by],
      ['Approved By', po.approved_by],
      ['Reviewed By', po.reviewed_by],
      ['Supplier Acceptance & Stamp', po.supplier_acceptance],
    ].map(([label, sig]) => [
      label,
      sig?.name || '',
      sig?.position || '',
      sig?.signature || '',
      fmtDateOrBlank(sig?.date),
    ]),
  ]

  const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  saveBlob(blob, `${po.po_number || 'purchase-order'}.csv`)
}

/* ================================================================== */
/* Public entry-point                                                  */
/* ================================================================== */
export function exportPO(format, po) {
  switch (format) {
    case 'doc': return exportDOC(po)
    case 'csv': return exportCSV(po)
    default:    return exportDOC(po)
  }
}
