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
