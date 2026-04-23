import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoSrc from '../assets/casi_logo.jpg'

/* ── constants ─────────────────────────────────────────────────────── */
const ML = 14
const MR = 14
const MT = 30
const MB = 20
const CW = 210 - ML - MR

/* ── line-item column widths (sum = 182) ───────────────────────────── */
const COL = { num: 8, section: 22, desc: 46, unit: 12, qty: 11, rate: 24, amount: 27, comment: 32 }
// 8+22+46+12+11+24+27+32 = 182

/* ── formatters ─────────────────────────────────────────────────────── */
function fmt(n) {
  return 'N' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

/* ── signoff helpers ────────────────────────────────────────────────── */
function findMarketSurveys(signoffs) {
  return (signoffs || []).filter((s) => s.type === 'market_survey')
}
function findBudgetHolder(signoffs) {
  return (signoffs || []).find((s) => s.type === 'budget_holder') || null
}
function findPreparedBy(signoffs) {
  return (signoffs || []).find((s) => s.type === 'prepared_by') || null
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
function drawHeader(doc, logoData, boq) {
  const w = doc.internal.pageSize.getWidth()

  if (logoData) {
    try { doc.addImage(logoData, 'JPEG', ML, 5, 18, 18) } catch { /* ignore */ }
  }

  const tx = ML + (logoData ? 22 : 0)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(20, 20, 20)
  doc.text('Bill of Quantities', tx, 12)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(110)
  doc.text(
    `${boq.boq_number || ''}  ·  Status: ${(boq.status || '').replace(/_/g, ' ')}`,
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

/* ── per-page footer ─────────────────────────────────────────────────── */
function drawFooter(doc, pageNum, totalPages) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

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

const TBL_MARGIN = { top: MT, left: ML, right: MR, bottom: MB }

/* ================================================================== */
/* PDF export                                                          */
/* ================================================================== */
export async function exportBOQtoPDF(boq, items = [], signoffs = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoData = await loadLogoBase64(logoSrc)

  /* ── 1. BOQ details grid ────────────────────────────────────────── */
  autoTable(doc, {
    startY: MT + 2,
    body: [
      ['Title',        boq.title || '—',              'BOQ Date',     fmtDate(boq.date || boq.created_at)],
      ['Prepared By',  boq.prepared_by || '—',        'Department',   boq.department || '—'],
      ['Project',      boq.project_code || '—',       'Category',     boq.category || '—'],
      ['PR Reference', boq.pr_reference || '—',       'Delivery',     boq.delivery_location || '—'],
      ['Items',        String(boq.item_count ?? items.length ?? 0), 'Grand Total', fmt(boq.grand_total)],
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

  /* ── 2. Notes ───────────────────────────────────────────────────── */
  if (boq.notes) {
    if (y > 297 - MB - 25) { doc.addPage(); y = MT + 2 }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text('Notes', ML, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(60)
    const lines = doc.splitTextToSize(boq.notes, CW)

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
    doc.text('Itemized List', ML, y)
    doc.setTextColor(0)
    y += 5

    const totalCost = items.reduce(
      (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0), 0,
    )

    autoTable(doc, {
      startY: y,
      head: [['#', 'Section', 'Description', 'Unit', 'Qty', 'Rate (N)', 'Amount (N)', 'Comment']],
      body: items.map((it, i) => [
        i + 1,
        it.section || '—',
        it.description || '—',
        it.unit || '—',
        it.quantity ?? '—',
        fmt(it.unit_rate),
        fmt((Number(it.quantity) || 0) * (Number(it.unit_rate) || 0)),
        it.comment || '',
      ]),
      foot: [['', '', '', '', '', 'Grand Total', fmt(totalCost), '']],
      theme: 'striped',
      styles: { fontSize: 7.5, overflow: 'linebreak', cellPadding: 2.2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 30, 30] },
      columnStyles: {
        0: { cellWidth: COL.num,     halign: 'center' },
        1: { cellWidth: COL.section },
        2: { cellWidth: COL.desc },
        3: { cellWidth: COL.unit },
        4: { cellWidth: COL.qty,     halign: 'right' },
        5: { cellWidth: COL.rate,    halign: 'right' },
        6: { cellWidth: COL.amount,  halign: 'right' },
        7: { cellWidth: COL.comment },
      },
      margin: TBL_MARGIN,
      showFoot: 'lastPage',
      showHead: 'everyPage',
    })
    y = doc.lastAutoTable.finalY + 7
  }

  /* ── 4. Sign-off block ──────────────────────────────────────────── */
  const surveys = findMarketSurveys(signoffs)
  const ms1 = surveys[0] || {}
  const ms2 = surveys[1] || {}
  const bh  = findBudgetHolder(signoffs) || {}
  const pb  = findPreparedBy(signoffs) || {}

  if (y > 297 - MB - 60) { doc.addPage(); y = MT + 2 }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40)
  doc.text('Sign-offs', ML, y)
  doc.setTextColor(0)
  y += 5

  const labelCell = (t) => ({ content: t, styles: { fontStyle: 'bold', fillColor: [245, 247, 250] } })

  autoTable(doc, {
    startY: y,
    head: [['', 'Prepared By', 'Market Survey 1', 'Market Survey 2', 'Budget Holder']],
    body: [
      [labelCell('Name'),      pb.name || boq.prepared_by || '', ms1.name || '',     ms2.name || '',     bh.name || ''],
      [labelCell('Position'),  pb.position || '',                ms1.position || '', ms2.position || '', bh.position || ''],
      [labelCell('Email'),     pb.email || '',                   ms1.email || '',    ms2.email || '',    bh.email || ''],
      [labelCell('Date'),      fmtDateOrBlank(pb.date || boq.date || boq.created_at),
                               fmtDateOrBlank(ms1.date),
                               fmtDateOrBlank(ms2.date),
                               fmtDateOrBlank(bh.date)],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.4, minCellHeight: 9, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 40 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 40 },
    },
    margin: TBL_MARGIN,
  })
  y = doc.lastAutoTable.finalY + 4

  /* Signatures are not required — the document is digitally generated and system-verified. */
  if (y + 10 > 297 - MB) { doc.addPage(); y = MT + 2 }
  doc.setFillColor(239, 246, 255)
  doc.setDrawColor(191, 219, 254)
  doc.setLineWidth(0.3)
  doc.roundedRect(ML, y, CW, 8, 1.5, 1.5, 'FD')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(30, 64, 175)
  doc.text(
    'Handwritten signature not required — this document is digitally generated and system-verified by casi360.com.',
    ML + CW / 2, y + 5.2, { align: 'center' },
  )
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0)
  y += 12

  if (bh.budget_available) {
    if (y + 6 > 297 - MB) { doc.addPage(); y = MT + 2 }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40)
    doc.text(`Availability of Budget: ${bh.budget_available}`, ML, y)
    doc.setTextColor(0)
  }

  /* ── 5. Stamp header + footer on every page ─────────────────────── */
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawHeader(doc, logoData, boq)
    drawFooter(doc, i, total)
  }

  doc.save(`${boq.boq_number || 'bill-of-quantities'}.pdf`)
}

/* ================================================================== */
/* CSV export                                                          */
/* ================================================================== */
export function exportBOQtoCSV(boq, items = [], signoffs = []) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

  const surveys = findMarketSurveys(signoffs)
  const ms1 = surveys[0] || {}
  const ms2 = surveys[1] || {}
  const bh  = findBudgetHolder(signoffs) || {}
  const pb  = findPreparedBy(signoffs) || {}

  const rows = [
    ['Bill of Quantities'],
    ['Field', 'Value'],
    ['BOQ Number',   boq.boq_number || ''],
    ['Title',        boq.title || ''],
    ['Status',       (boq.status || '').replace(/_/g, ' ')],
    ['Prepared By',  boq.prepared_by || ''],
    ['Department',   boq.department || ''],
    ['Project Code', boq.project_code || ''],
    ['Category',     boq.category || ''],
    ['PR Reference', boq.pr_reference || ''],
    ['Delivery Location', boq.delivery_location || ''],
    ['BOQ Date',     fmtDate(boq.date || boq.created_at)],
    ['Grand Total',  boq.grand_total ?? 0],
    ['Notes',        boq.notes || ''],
    [],
    ['Itemized List'],
    ['#', 'Section', 'Description', 'Unit', 'Qty', 'Unit Rate', 'Amount', 'Comment'],
    ...items.map((it, i) => [
      i + 1,
      it.section || '',
      it.description || '',
      it.unit || '',
      it.quantity ?? 0,
      it.unit_rate ?? 0,
      (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0),
      it.comment || '',
    ]),
    [],
    ['', '', '', '', '', 'Grand Total', items.reduce(
      (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0), 0,
    ), ''],
    [],
    ['Sign-offs'],
    ['Note', 'Handwritten signature not required — this document is digitally generated and system-verified by casi360.com.'],
    ['Role', 'Name', 'Position', 'Email', 'Date'],
    ['Prepared By',
      pb.name || boq.prepared_by || '',
      pb.position || '',
      pb.email || '',
      fmtDateOrBlank(pb.date || boq.date || boq.created_at)],
    ['Market Survey 1',
      ms1.name || '', ms1.position || '', ms1.email || '',
      fmtDateOrBlank(ms1.date)],
    ['Market Survey 2',
      ms2.name || '', ms2.position || '', ms2.email || '',
      fmtDateOrBlank(ms2.date)],
    ['Budget Holder',
      bh.name || '', bh.position || '', bh.email || '',
      fmtDateOrBlank(bh.date)],
  ]

  if (bh.budget_available) {
    rows.push([], ['Availability of Budget', bh.budget_available])
  }

  const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${boq.boq_number || 'bill-of-quantities'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
