import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function fmt(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export function exportPRtoPDF(pr, items = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Purchase Request', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`${pr.requisition_number || ''}  ·  Status: ${(pr.status || '').replace(/_/g, ' ')}`, 14, 26)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 32,
    body: [
      ['Title', pr.title || '—', 'Priority', (pr.priority || '—')],
      ['Requester', pr.requested_by_name || '—', 'Department', pr.department || '—'],
      ['Project', pr.project_name || pr.project_code || '—', 'Est. Cost', fmt(pr.estimated_cost)],
      ['Submitted', fmtDate(pr.submitted_at || pr.created_at), 'Needed By', fmtDate(pr.needed_by)],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, fillColor: [245, 247, 250] },
      2: { fontStyle: 'bold', cellWidth: 28, fillColor: [245, 247, 250] },
    },
  })

  let y = doc.lastAutoTable.finalY + 6

  const justification = pr.justification || pr.notes
  if (justification) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Justification / Notes', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(justification, 182)
    doc.text(lines, 14, y)
    y += lines.length * 4 + 6
  }

  if (items.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Line Items', 14, y)
    y += 4

    const totalCost = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0), 0)

    autoTable(doc, {
      startY: y,
      head: [['#', 'Description', 'Unit', 'Qty', 'Unit Cost (₦)', 'Total (₦)']],
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
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      footStyles: { fontStyle: 'bold', fillColor: [235, 245, 255] },
      columnStyles: { 0: { cellWidth: 8 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    })
  }

  doc.save(`${pr.requisition_number || 'purchase-request'}.pdf`)
}

export function exportPRtoCSV(pr, items = []) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

  const header = [
    ['Purchase Request Details'],
    ['Field', 'Value'],
    ['PR Number', pr.requisition_number || ''],
    ['Title', pr.title || ''],
    ['Status', (pr.status || '').replace(/_/g, ' ')],
    ['Requester', pr.requested_by_name || ''],
    ['Department', pr.department || ''],
    ['Project', pr.project_name || pr.project_code || ''],
    ['Priority', pr.priority || ''],
    ['Estimated Cost', pr.estimated_cost || 0],
    ['Submitted', fmtDate(pr.submitted_at || pr.created_at)],
    ['Needed By', fmtDate(pr.needed_by)],
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
    ['', '', '', '', 'Grand Total', items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0), 0)],
  ]

  const csv = header.map((row) => row.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${pr.requisition_number || 'purchase-request'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
