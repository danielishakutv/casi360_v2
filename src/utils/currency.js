/**
 * Format a number as Nigerian Naira (₦).
 * @param {number|string} value
 * @returns {string} e.g. "₦1,250,000.00"
 */
export function naira(value) {
  return '₦' + Number(value || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
