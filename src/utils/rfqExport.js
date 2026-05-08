import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoSrc from '../assets/casi_logo.jpg'

/**
 * RFQ exports — PDF, Word (.doc), CSV.
 *
 * The view-model passed in is the `form` state from
 * CreateRequestForQuotation, plus a few server-side fields the backend
 * may have re-issued on save (rfq_number, status). The exports are
 * driven entirely from the in-memory form so the downloaded document
 * always reflects what the user just saved.
 *
 * The system never emails the vendor. The procurement officer
 * downloads in their preferred format and forwards manually.
 */

/* ── PDF page geometry ─────────────────────────────────────────────── */
const ML = 14
const MR = 14
const MT = 30
const MB = 20
const CW = 210 - ML - MR

/* ── line-item column widths (sum = 182 mm) ───────────────────────── */
const COL = { num: 8, item: 28, desc: 60, unit: 14, qty: 10, ucost: 28, total: 34 }

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
function safe(v) { return v == null ? '' : String(v) }

function lineTotal(li) {
  return (Number(li.quantity) || 0) * (Number(li.unit_cost) || 0)
}

/* ── shared loader for the logo (PDF only) ────────────────────────── */
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

/* ── PDF header / footer ──────────────────────────────────────────── */
function drawHeader(doc, logoData, rfq) {
  const w = doc.internal.pageSize.getWidth()
  if (logoData) {
    try { doc.addImage(logoData, 'JPEG', ML, 5, 18, 18) } catch { /* ignore */ }
  }
  const tx = ML + (logoData ? 22 : 0)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text('Request for Quotation', tx, 12)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(110)
  doc.text(
    `${rfq.rfq_number || ''}  ·  Status: ${(rfq.status || '').replace(/_/g, ' ')}`,
    tx, 18,
  )

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50)
  doc.text('CARE AID SUPPORT INITIATIVE', w - MR, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(130)
  doc.text('casi360.com', w - MR, 17, { align: 'right' })

  doc.setDrawColor(200, 210, 230)
  doc.setLineWidth(0.4)
  doc.line(ML, 23, w - MR, 23)
  doc.setTextColor(0)
}

function drawFooter(doc, pageNum, totalPages) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setDrawColor(200, 210, 230)
  doc.setLineWidth(0.3)
  doc.line(ML, h - 14, w - MR, h - 14)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130)
  doc.text('This document is digitally generated and system-verified by casi360.com.', ML, h - 9)
  doc.text(`Page ${pageNum} of ${totalPages}`, w / 2, h - 9, { align: 'center' })
  doc.text(
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    w - MR, h - 9, { align: 'right' },
  )
  doc.setTextColor(0)
}

const TBL_MARGIN = { top: MT, left: ML, right: MR, bottom: MB }

/* ================================================================== */
/* PDF                                                                 */
/* ================================================================== */
async function exportPDF(rfq) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoData = await loadLogoBase64(logoSrc)
  const symbol = rfq.currency_symbol || ''

  /* 1. Supplier + RFQ header grid */
  autoTable(doc, {
    startY: MT + 2,
    body: [
      ['Supplier',     safe(rfq.supplier_name) || '—',         'RFQ Date',     fmtDate(rfq.date)],
      ['Address',      safe(rfq.supplier_address) || '—',      'Source PR',    safe(rfq.pr_reference) || '—'],
      ['Contact',      safe(rfq.contact) || '—',               'Currency',     safe(rfq.currency) || 'NGN'],
      ['Company Rep',  safe(rfq.company_rep) || '—',           'For',          rfq.for_type === 'project' ? `Project: ${safe(rfq.project) || '—'}` : `Structure: ${safe(rfq.structure) || '—'}`],
      ['Request Type', (rfq.request_type || []).join(', ') || '—', 'Items',    String((rfq.line_items || []).length)],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.8, overflow: 'linebreak' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26, fillColor: [245, 247, 250] },
      1: { cellWidth: 65 },
      2: { fontStyle: 'bold', cellWidth: 26, fillColor: [245, 247, 250] },
      3: { cellWidth: 65 },
    },
    margin: TBL_MARGIN,
  })

  let y = doc.lastAutoTable.finalY + 7

  /* 2. Itemized list — vendor fills in costs, so unit/total cost are blank by design */
  if ((rfq.line_items || []).length > 0) {
    if (y > 297 - MB - 30) { doc.addPage(); y = MT + 2 }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Itemized List', ML, y)
    doc.setTextColor(0)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['#', 'Item', 'Description (Specs / TOR)', 'Unit', 'Qty', 'Unit Cost', 'Total']],
      body: rfq.line_items.map((li, i) => [
        i + 1,
        safe(li.item),
        safe(li.description),
        safe(li.unit),
        li.quantity ?? '',
        li.unit_cost ? fmt(symbol, li.unit_cost) : '',
        li.unit_cost ? fmt(symbol, lineTotal(li)) : '',
      ]),
      theme: 'striped',
      styles: { fontSize: 7.5, overflow: 'linebreak', cellPadding: 2.2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: COL.num,   halign: 'center' },
        1: { cellWidth: COL.item },
        2: { cellWidth: COL.desc },
        3: { cellWidth: COL.unit },
        4: { cellWidth: COL.qty,   halign: 'right' },
        5: { cellWidth: COL.ucost, halign: 'right' },
        6: { cellWidth: COL.total, halign: 'right' },
      },
      margin: TBL_MARGIN,
    })
    y = doc.lastAutoTable.finalY + 4
  }

  /* 3. Delivery */
  if (y + 16 > 297 - MB) { doc.addPage(); y = MT + 2 }
  autoTable(doc, {
    startY: y,
    head: [['Delivery Location', 'Supplier\'s Delivery Duration']],
    body: [[safe(rfq.delivery_location) || '—', safe(rfq.delivery_duration) || '—']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.4, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { cellWidth: 91 }, 1: { cellWidth: 91 } },
    margin: TBL_MARGIN,
  })
  y = doc.lastAutoTable.finalY + 7

  /* 4. RFQ Received By */
  if (y + 30 > 297 - MB) { doc.addPage(); y = MT + 2 }
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text('RFQ Received By — Logistics Officer', ML, y)
  doc.setTextColor(0)
  y += 5

  autoTable(doc, {
    startY: y,
    head: [['Name', 'Date', 'Signature', 'Company Stamp']],
    body: [[
      safe(rfq.received_by_name) || '',
      fmtDateOrBlank(rfq.received_by_date),
      safe(rfq.received_by_signature) || '',
      safe(rfq.company_stamp) || '',
    ]],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.4, minCellHeight: 14, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 36 },
      2: { cellWidth: 50 },
      3: { cellWidth: 46 },
    },
    margin: TBL_MARGIN,
  })

  /* 5. Stamp header + footer on every page */
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawHeader(doc, logoData, rfq)
    drawFooter(doc, i, total)
  }

  doc.save(`${rfq.rfq_number || 'request-for-quotation'}.pdf`)
}

/* ================================================================== */
/* CSV                                                                 */
/* ================================================================== */
function exportCSV(rfq) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const symbol = rfq.currency_symbol || ''

  const rows = [
    ['Request for Quotation'],
    ['Field', 'Value'],
    ['RFQ Number',          rfq.rfq_number || ''],
    ['Status',              (rfq.status || '').replace(/_/g, ' ')],
    ['RFQ Date',            fmtDate(rfq.date)],
    ['Source Purchase Request', rfq.pr_reference || ''],
    [],
    ['Supplier'],
    ['Name',                rfq.supplier_name || ''],
    ['Address',             rfq.supplier_address || ''],
    ['Company Representative', rfq.company_rep || ''],
    ['Contact',             rfq.contact || ''],
    [],
    ['Request Type',        (rfq.request_type || []).join(', ')],
    [rfq.for_type === 'project' ? 'Project' : 'Structure',
                            rfq.for_type === 'project' ? (rfq.project || '') : (rfq.structure || '')],
    ['Currency',            rfq.currency || 'NGN'],
    [],
    ['Itemized List'],
    ['#', 'Item', 'Description', 'Unit', 'Qty', 'Cost per Unit', 'Total Cost'],
    ...(rfq.line_items || []).map((li, i) => [
      i + 1,
      li.item || '',
      li.description || '',
      li.unit || '',
      li.quantity ?? '',
      li.unit_cost ? fmt(symbol, li.unit_cost) : '',
      li.unit_cost ? fmt(symbol, lineTotal(li)) : '',
    ]),
    [],
    ['Delivery'],
    ['Location',            rfq.delivery_location || ''],
    ['Supplier Duration',   rfq.delivery_duration || ''],
    [],
    ['RFQ Received By — Logistics Officer'],
    ['Name', 'Date', 'Signature', 'Company Stamp'],
    [
      rfq.received_by_name || '',
      fmtDateOrBlank(rfq.received_by_date),
      rfq.received_by_signature || '',
      rfq.company_stamp || '',
    ],
  ]

  const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${rfq.rfq_number || 'request-for-quotation'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ================================================================== */
/* Word (.doc)                                                         */
/* ================================================================== */
/**
 * Word will happily open an HTML file with a .doc extension and the
 * right Office namespaces in the <html> tag. That avoids pulling in a
 * heavy DOCX-generation library and gives the user an editable Word
 * document with reasonable fidelity for a single-page RFQ.
 */
function exportDOC(rfq) {
  const symbol = rfq.currency_symbol || ''
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const itemRows = (rfq.line_items || []).map((li, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(li.item || '')}</td>
      <td>${esc(li.description || '')}</td>
      <td>${esc(li.unit || '')}</td>
      <td style="text-align:right">${esc(li.quantity ?? '')}</td>
      <td style="text-align:right">${li.unit_cost ? esc(fmt(symbol, li.unit_cost)) : ''}</td>
      <td style="text-align:right">${li.unit_cost ? esc(fmt(symbol, lineTotal(li))) : ''}</td>
    </tr>`).join('')

  const html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${esc(rfq.rfq_number || 'RFQ')}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 4pt; }
  h2 { font-size: 13pt; margin: 12pt 0 4pt; border-bottom: 1pt solid #d0d7de; padding-bottom: 2pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
  td, th { border: 0.75pt solid #b8c1cc; padding: 4pt 6pt; vertical-align: top; }
  th { background: #2563eb; color: #fff; text-align: left; }
  .label { background: #f5f7fa; font-weight: bold; width: 22%; }
  .meta-grid td { vertical-align: top; }
  .footer { color: #6b7280; font-size: 9pt; margin-top: 18pt; border-top: 0.75pt solid #d0d7de; padding-top: 6pt; }
</style></head>
<body>
  <h1>Request for Quotation</h1>
  <div style="color:#555; font-size:10pt; margin-bottom:10pt;">
    ${esc(rfq.rfq_number || '')} &middot; Status: ${esc((rfq.status || '').replace(/_/g, ' '))} &middot; ${esc(fmtDate(rfq.date))}
  </div>

  <h2>Supplier</h2>
  <table class="meta-grid">
    <tr><td class="label">Name</td><td>${esc(rfq.supplier_name || '')}</td>
        <td class="label">Source PR</td><td>${esc(rfq.pr_reference || '—')}</td></tr>
    <tr><td class="label">Address</td><td>${esc(rfq.supplier_address || '')}</td>
        <td class="label">Currency</td><td>${esc(rfq.currency || 'NGN')}</td></tr>
    <tr><td class="label">Company Rep</td><td>${esc(rfq.company_rep || '')}</td>
        <td class="label">${rfq.for_type === 'project' ? 'Project' : 'Structure'}</td>
        <td>${esc(rfq.for_type === 'project' ? (rfq.project || '') : (rfq.structure || ''))}</td></tr>
    <tr><td class="label">Contact</td><td>${esc(rfq.contact || '')}</td>
        <td class="label">Request Type</td><td>${esc((rfq.request_type || []).join(', '))}</td></tr>
  </table>

  <h2>Itemized List</h2>
  <table>
    <tr><th>#</th><th>Item</th><th>Description (Specs / TOR)</th><th>Unit</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr>
    ${itemRows || '<tr><td colspan="7" style="text-align:center; color:#888;">No items</td></tr>'}
  </table>

  <h2>Delivery</h2>
  <table class="meta-grid">
    <tr><td class="label">Location</td><td>${esc(rfq.delivery_location || '')}</td>
        <td class="label">Supplier Duration</td><td>${esc(rfq.delivery_duration || '')}</td></tr>
  </table>

  <h2>RFQ Received By &mdash; Logistics Officer</h2>
  <table>
    <tr><th>Name</th><th>Date</th><th>Signature</th><th>Company Stamp</th></tr>
    <tr>
      <td>${esc(rfq.received_by_name || '')}</td>
      <td>${esc(fmtDateOrBlank(rfq.received_by_date))}</td>
      <td>${esc(rfq.received_by_signature || '')}</td>
      <td>${esc(rfq.company_stamp || '')}</td>
    </tr>
  </table>

  <div class="footer">
    This document is digitally generated and system-verified by casi360.com.
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${rfq.rfq_number || 'request-for-quotation'}.doc`
  a.click()
  URL.revokeObjectURL(url)
}

/* ================================================================== */
/* Public entry-point                                                  */
/* ================================================================== */
export function exportRFQ(format, rfq) {
  switch (format) {
    case 'pdf': return exportPDF(rfq)
    case 'doc': return exportDOC(rfq)
    case 'csv': return exportCSV(rfq)
    default:    return exportPDF(rfq)
  }
}
