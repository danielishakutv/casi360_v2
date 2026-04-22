import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoSrc from '../assets/casi_logo.jpg'

/* ── constants ─────────────────────────────────────────────────────── */
const ML = 14          // margin left
const MR = 14          // margin right
const MT = 30          // margin top  (header zone)
const MB = 20          // margin bottom (footer zone)
const CW = 210 - ML - MR  // content width = 182 mm

/* ── column widths for line-items table (must sum to CW = 182) ──────── */
const COL = { num: 8, desc: 72, unit: 20, qty: 14, ucost: 34, total: 34 }
// 8+72+20+14+34+34 = 182 ✓

/* ── formatters ─────────────────────────────────────────────────────── */
function fmt(n) {
  return 'N' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

/* ── load logo from imported asset URL → base64 data URL ────────────── */
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

/* ── per-page header ─────────────────────────────────────────────────── */
function drawHeader(doc, logoData, pr) {
  const w = doc.internal.pageSize.getWidth()

  // Logo
  if (logoData) {
    try { doc.addImage(logoData, 'JPEG', ML, 5, 18, 18) } catch {}
  }

  const tx = ML + (logoData ? 22 : 0)

  // Title
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text('Purchase Request', tx, 12)

  // Sub-line: PR number + status
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(110)
  doc.text(
    `${pr.requisition_number || ''}  ·  Status: ${(pr.status || '').replace(/_/g, ' ')}`,
    tx, 18,
  )

  // Right: org name
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(50)
  doc.text('CARE AID SUPPORT INITIATIVE', w - MR, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(130)
  doc.text('casi360.com', w - MR, 17, { align: 'right' })

  // Divider rule
  doc.setDrawColor(200, 210, 230)
  doc.setLineWidth(0.4)
  doc.line(ML, 23, w - MR, 23)

  doc.setTextColor(0)
}

/* ── per-page footer ─────────────────────────────────────────────────── */
function drawFooter(doc, pageNum, totalPages) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  // Rule
  doc.setDrawColor(200, 210, 230)
  doc.setLineWidth(0.3)
  doc.line(ML, h - 14, w - MR, h - 14)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130)
  doc.text('Digitally generated and verified from casi360.com', ML, h - 9)
  doc.text(`Page ${pageNum} of ${totalPages}`, w / 2, h - 9, { align: 'center' })
  doc.text(
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    w - MR, h - 9, { align: 'right' },
  )

  doc.setTextColor(0)
}

/* ── shared autoTable margin (keeps content clear of header/footer) ─── */
const TBL_MARGIN = { top: MT, left: ML, right: MR, bottom: MB }

/* ================================================================== */
/* PDF export                                                          */
/* ================================================================== */
export async function exportPRtoPDF(pr, items = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoData = await loadLogoBase64(logoSrc)

  /* ── 1. PR details grid ─────────────────────────────────────────── */
  autoTable(doc, {
    startY: MT + 2,
    body: [
      ['Title',     pr.title || '—',                               'Priority',   (pr.priority || '—')],
      ['Requester', pr.requested_by_name || '—',                   'Department', pr.department || '—'],
      ['Project',   pr.project_name || pr.project_code || '—',     'Est. Cost',  fmt(pr.estimated_cost)],
      ['Submitted', fmtDate(pr.submitted_at || pr.created_at),     'Needed By',  fmtDate(pr.needed_by)],
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

  /* ── 2. Justification / Notes ───────────────────────────────────── */
  const justification = pr.justification || pr.notes
  if (justification) {
    if (y > 297 - MB - 25) { doc.addPage(); y = MT + 2 }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Justification / Notes', ML, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(60)
    const lines = doc.splitTextToSize(justification, CW)

    if (y + lines.length * 4.5 > 297 - MB) { doc.addPage(); y = MT + 2 }
    doc.text(lines, ML, y)
    doc.setTextColor(0)
    y += lines.length * 4.5 + 8
  }

  /* ── 3. Line items table ────────────────────────────────────────── */
  if (items.length > 0) {
    if (y > 297 - MB - 30) { doc.addPage(); y = MT + 2 }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Line Items', ML, y)
    doc.setTextColor(0)
    y += 5

    const totalCost = items.reduce(
      (s, it) => s + (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0), 0,
    )

    autoTable(doc, {
      startY: y,
      head: [['#', 'Description', 'Unit', 'Qty', 'Unit Cost (N)', 'Total (N)']],
      body: items.map((it, i) => [
        i + 1,
        it.description || '—',
        it.unit || '—',
        it.quantity ?? '—',
        fmt(it.estimated_unit_cost),
        fmt((Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0)),
      ]),
      foot: [['', '', '', '', 'Grand Total', fmt(totalCost)]],
      theme: 'striped',
      styles: { fontSize: 8, overflow: 'linebreak', cellPadding: 2.5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      footStyles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 30, 30] },
      columnStyles: {
        0: { cellWidth: COL.num,   halign: 'center' },
        1: { cellWidth: COL.desc },
        2: { cellWidth: COL.unit },
        3: { cellWidth: COL.qty,   halign: 'right' },
        4: { cellWidth: COL.ucost, halign: 'right' },
        5: { cellWidth: COL.total, halign: 'right' },
      },
      margin: TBL_MARGIN,
      showFoot: 'lastPage',
      showHead: 'everyPage',
    })
  }

  /* ── 4. Stamp header + footer on every page ─────────────────────── */
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawHeader(doc, logoData, pr)
    drawFooter(doc, i, total)
  }

  doc.save(`${pr.requisition_number || 'purchase-request'}.pdf`)
}

/* ================================================================== */
/* CSV export (unchanged)                                              */
/* ================================================================== */
export function exportPRtoCSV(pr, items = []) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

  const rows = [
    ['Purchase Request Details'],
    ['Field', 'Value'],
    ['PR Number',     pr.requisition_number || ''],
    ['Title',         pr.title || ''],
    ['Status',        (pr.status || '').replace(/_/g, ' ')],
    ['Requester',     pr.requested_by_name || ''],
    ['Department',    pr.department || ''],
    ['Project',       pr.project_name || pr.project_code || ''],
    ['Priority',      pr.priority || ''],
    ['Estimated Cost', pr.estimated_cost || 0],
    ['Submitted',     fmtDate(pr.submitted_at || pr.created_at)],
    ['Needed By',     fmtDate(pr.needed_by)],
    ['Justification', pr.justification || pr.notes || ''],
    [],
    ['Line Items'],
    ['#', 'Description', 'Unit', 'Qty', 'Unit Cost', 'Line Total'],
    ...items.map((it, i) => [
      i + 1,
      it.description || '',
      it.unit || '',
      it.quantity ?? 0,
      it.estimated_unit_cost ?? 0,
      (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0),
    ]),
    [],
    ['', '', '', '', 'Grand Total', items.reduce(
      (s, it) => s + (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0), 0,
    )],
  ]

  const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${pr.requisition_number || 'purchase-request'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
