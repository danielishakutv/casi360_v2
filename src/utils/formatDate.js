/**
 * Format an ISO date string to a readable short format.
 * @param {string} dateStr  e.g. "2026-03-15"
 * @returns {string} e.g. "Mar 15, 2026" or "—" if falsy
 */
export function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format an ISO datetime string to a readable date + time, for transparency
 * and accountability on dashboards and activity feeds.
 * @param {string} dateStr  e.g. "2026-03-15T14:30:00Z"
 * @returns {string} e.g. "Mar 15, 2026, 2:30 PM" or "—" if falsy
 */
export function fmtDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
