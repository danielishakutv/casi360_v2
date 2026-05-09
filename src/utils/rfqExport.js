import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import JSZip from 'jszip'
import logoSrc from '../assets/casi_logo.jpg'

/**
 * RFQ exports — PDF, Word (.doc), CSV.
 *
 * The view-model `rfq` carries the form state plus a few server-side
 * fields the backend may have re-issued on save (rfq_number, status).
 * Two flavours are supported:
 *
 *  - Targeted: `rfq.vendors[]` lists every selected vendor. One
 *    personalised document is generated per vendor (each addressed
 *    individually). When more than one vendor is selected, all docs
 *    are bundled into a single .zip. CSV stays as a single file
 *    listing every vendor — it's a record format, not a vendor-facing
 *    document.
 *
 *  - Open call: `rfq.scope === 'open'`. A single generic document is
 *    produced with "To: All qualified suppliers" and an "Advertised
 *    on" block recording where the call was published.
 *
 * The system never emails the vendor. The procurement officer
 * downloads in their preferred format and forwards manually.
 */

/* ── PDF page geometry ─────────────────────────────────────────────── */
const ML = 14
const MR = 14
const MT = 30
const MB = 20

/* ── line-item column widths (sum = 182 mm) ───────────────────────── */
const COL = { num: 8, item: 28, desc: 60, unit: 14, qty: 10, ucost: 28, total: 34 }

/* ── formatters ────────────────────────────────────────────────────── */
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

/* ── helpers ──────────────────────────────────────────────────────── */
function isOpenCall(rfq) { return rfq.scope === 'open' }
function vendorList(rfq) { return Array.isArray(rfq.vendors) ? rfq.vendors : [] }

/**
 * Slugify a vendor name into something safe for a filename. Falls back
 * to "vendor-N" when the name reduces to nothing.
 */
function slugify(name, fallbackIdx) {
  const slug = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || `vendor-${fallbackIdx}`
}

/**
 * Trigger a browser download for a Blob with the given filename.
 */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ================================================================== */
/* PDF — single document for one recipient                             */
/* ================================================================== */
async function buildPDFBlob(rfq, recipient, logoData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  /* 1. Recipient + RFQ header grid */
  const recipientName = recipient?.name || (isOpenCall(rfq) ? 'All qualified suppliers' : '—')
  const recipientAddress = recipient?.address || (isOpenCall(rfq) ? safe(rfq.advertised_on) : '—')
  const recipientContact = recipient?.contact_person || recipient?.phone || recipient?.email || (isOpenCall(rfq) ? '—' : '—')

  autoTable(doc, {
    startY: MT + 2,
    body: [
      ['To',           recipientName,                            'RFQ Date',     fmtDate(rfq.date)],
      [isOpenCall(rfq) ? 'Advertised On' : 'Address',
                       recipientAddress || '—',                  'Source PR',    safe(rfq.pr_reference) || '—'],
      ['Contact',      recipientContact || '—',                  'Currency',     safe(rfq.currency) || 'NGN'],
      ['Scope',        isOpenCall(rfq) ? 'Open call' : 'Targeted',
                                                                 'For',          rfq.for_type === 'project' ? `Project: ${safe(rfq.project) || '—'}` : `Structure: ${safe(rfq.structure) || '—'}`],
      ['Request Type', (rfq.request_type || []).join(', ') || '—', 'Items',      String((rfq.line_items || []).length)],
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

  /* 2. Itemized list — Unit Cost and Total cells are intentionally
   *    blank: the vendor fills them in on the printed/forwarded doc
   *    when responding with their quote. */
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
        '', // vendor fills in
        '', // vendor fills in
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

  return doc.output('blob')
}

async function exportPDF(rfq) {
  const logoData = await loadLogoBase64(logoSrc)
  const baseName = rfq.rfq_number || 'request-for-quotation'

  if (isOpenCall(rfq)) {
    const blob = await buildPDFBlob(rfq, null, logoData)
    saveBlob(blob, `${baseName}_open-call.pdf`)
    return
  }

  const vendors = vendorList(rfq)
  if (vendors.length === 0) {
    const blob = await buildPDFBlob(rfq, null, logoData)
    saveBlob(blob, `${baseName}.pdf`)
    return
  }

  if (vendors.length === 1) {
    const blob = await buildPDFBlob(rfq, vendors[0], logoData)
    saveBlob(blob, `${baseName}_${slugify(vendors[0].name, 1)}.pdf`)
    return
  }

  // Multiple vendors: build one PDF per vendor and zip them up. Each
  // PDF is addressed personally so the procurement officer can forward
  // straight to the right inbox without further editing.
  const zip = new JSZip()
  for (let i = 0; i < vendors.length; i++) {
    const blob = await buildPDFBlob(rfq, vendors[i], logoData)
    const name = `${baseName}_${slugify(vendors[i].name, i + 1)}.pdf`
    zip.file(name, blob)
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  saveBlob(zipBlob, `${baseName}.zip`)
}

/* ================================================================== */
/* CSV — single file regardless of recipient count                     */
/* ================================================================== */
function exportCSV(rfq) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const vendors = vendorList(rfq)

  const rows = [
    ['Request for Quotation'],
    ['Field', 'Value'],
    ['RFQ Number',          rfq.rfq_number || ''],
    ['Status',              (rfq.status || '').replace(/_/g, ' ')],
    ['Scope',               isOpenCall(rfq) ? 'Open call' : 'Targeted'],
    ['RFQ Date',            fmtDate(rfq.date)],
    ['Source Purchase Request', rfq.pr_reference || ''],
  ]

  if (isOpenCall(rfq)) {
    rows.push([])
    rows.push(['Open Call'])
    rows.push(['Advertised On', rfq.advertised_on || ''])
  } else {
    rows.push([])
    rows.push(['Vendors Invited'])
    rows.push(['#', 'Name', 'Address', 'Contact Person', 'Phone', 'Email'])
    if (vendors.length > 0) {
      vendors.forEach((v, i) => rows.push([
        i + 1,
        v.name || '',
        v.address || '',
        v.contact_person || '',
        v.phone || '',
        v.email || '',
      ]))
    } else {
      rows.push(['—', '(none selected)', '', '', '', ''])
    }
  }

  rows.push(
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
      '', // vendor fills in
      '', // vendor fills in
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
  )

  const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  saveBlob(blob, `${rfq.rfq_number || 'request-for-quotation'}.csv`)
}

/* ================================================================== */
/* Word (.doc) — one HTML doc per recipient, zipped if >1              */
/* ================================================================== */
function buildDOCHtml(rfq, recipient, logoData) {
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const recipientName = recipient?.name || (isOpenCall(rfq) ? 'All qualified suppliers' : '')
  const recipientAddress = recipient?.address || (isOpenCall(rfq) ? (rfq.advertised_on || '') : '')
  const recipientContact = recipient?.contact_person || recipient?.phone || recipient?.email || ''

  // Unit Cost / Total cells stay empty by design — the vendor types
  // their quoted prices into the document when responding.
  const itemRows = (rfq.line_items || []).map((li, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(li.item || '')}</td>
      <td>${esc(li.description || '')}</td>
      <td>${esc(li.unit || '')}</td>
      <td style="text-align:right">${esc(li.quantity ?? '')}</td>
      <td style="text-align:right">&nbsp;</td>
      <td style="text-align:right">&nbsp;</td>
    </tr>`).join('')

  // Letterhead — logo on the left, organisation name + URL on the
  // right. Word renders the data-URI image inline so the doc stays
  // self-contained (no external fetch required when opened offline).
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
        <div style="font-weight:bold; color:#1e293b; font-size:11pt;">Request for Quotation</div>
        <div>${esc(rfq.rfq_number || '')}</div>
        <div>Status: ${esc((rfq.status || '').replace(/_/g, ' '))}</div>
        <div>${esc(fmtDate(rfq.date))}</div>
      </td>
    </tr>
  </table>
  <hr style="border:none; border-top:0.75pt solid #c8d2e0; margin:0 0 12pt;" />`

  return `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${esc(rfq.rfq_number || 'RFQ')}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
  h2 { font-size: 13pt; margin: 12pt 0 4pt; border-bottom: 1pt solid #d0d7de; padding-bottom: 2pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
  td, th { border: 0.75pt solid #b8c1cc; padding: 4pt 6pt; vertical-align: top; }
  th { background: #2563eb; color: #fff; text-align: left; }
  .label { background: #f5f7fa; font-weight: bold; width: 22%; }
  .meta-grid td { vertical-align: top; }
  .letterhead, .letterhead td { border: none !important; }
  .footer { color: #6b7280; font-size: 9pt; margin-top: 18pt; border-top: 0.75pt solid #d0d7de; padding-top: 6pt; }
</style></head>
<body>
  ${header}

  <h2>${isOpenCall(rfq) ? 'Open Call' : 'Recipient'}</h2>
  <table class="meta-grid">
    <tr><td class="label">To</td><td>${esc(recipientName)}</td>
        <td class="label">Source PR</td><td>${esc(rfq.pr_reference || '—')}</td></tr>
    <tr><td class="label">${isOpenCall(rfq) ? 'Advertised On' : 'Address'}</td><td>${esc(recipientAddress)}</td>
        <td class="label">Currency</td><td>${esc(rfq.currency || 'NGN')}</td></tr>
    <tr><td class="label">Contact</td><td>${esc(recipientContact)}</td>
        <td class="label">${rfq.for_type === 'project' ? 'Project' : 'Structure'}</td>
        <td>${esc(rfq.for_type === 'project' ? (rfq.project || '') : (rfq.structure || ''))}</td></tr>
    <tr><td class="label">Request Type</td><td colspan="3">${esc((rfq.request_type || []).join(', '))}</td></tr>
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
}

async function exportDOC(rfq) {
  const baseName = rfq.rfq_number || 'request-for-quotation'
  // Load the Care Aid letterhead once, then bake it into every doc
  // (and every per-vendor doc when the RFQ targets multiple vendors).
  const logoData = await loadLogoBase64(logoSrc)

  if (isOpenCall(rfq)) {
    const html = buildDOCHtml(rfq, null, logoData)
    saveBlob(new Blob([html], { type: 'application/msword' }), `${baseName}_open-call.doc`)
    return
  }

  const vendors = vendorList(rfq)
  if (vendors.length === 0) {
    const html = buildDOCHtml(rfq, null, logoData)
    saveBlob(new Blob([html], { type: 'application/msword' }), `${baseName}.doc`)
    return
  }

  if (vendors.length === 1) {
    const html = buildDOCHtml(rfq, vendors[0], logoData)
    saveBlob(new Blob([html], { type: 'application/msword' }), `${baseName}_${slugify(vendors[0].name, 1)}.doc`)
    return
  }

  const zip = new JSZip()
  vendors.forEach((v, i) => {
    const html = buildDOCHtml(rfq, v, logoData)
    zip.file(`${baseName}_${slugify(v.name, i + 1)}.doc`, html)
  })
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  saveBlob(zipBlob, `${baseName}_doc.zip`)
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
