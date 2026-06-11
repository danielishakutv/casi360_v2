/**
 * Money formatting helpers.
 *
 * Budgets (BOQ, PR) are prepared in US Dollars at a fixed exchange rate; the
 * Naira value is derived for display from that rate. So amounts are entered
 * and stored in USD, and we show "$X" with the "₦Y" equivalent beside it.
 */

const SYMBOLS = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' }

/**
 * Format a numeric amount in the given currency. Defaults to USD.
 * @param {number|string} value
 * @param {string} currency  ISO code: USD | NGN | EUR | GBP
 * @returns {string} e.g. "$1,250.00" or "₦1,812,500.00"
 */
export function formatMoney(value, currency = 'USD') {
  const code = (currency || 'USD').toUpperCase()
  const symbol = SYMBOLS[code] || `${code} `
  const locale = code === 'NGN' ? 'en-NG' : 'en-US'
  return symbol + Number(value || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Format a number as Nigerian Naira (₦). Kept for backward compatibility.
 * @param {number|string} value
 * @returns {string} e.g. "₦1,250,000.00"
 */
export function naira(value) {
  return formatMoney(value, 'NGN')
}

/**
 * Format a number as US Dollars ($).
 * @param {number|string} value
 * @returns {string} e.g. "$1,250.00"
 */
export function usd(value) {
  return formatMoney(value, 'USD')
}

/**
 * Naira equivalent of a USD amount, using the budget USD→NGN exchange rate.
 * Returns a formatted ₦ string, or null when no positive rate is available
 * (so callers can choose to hide the secondary figure).
 * @param {number|string} usdValue
 * @param {number|string} rate  USD→NGN rate
 * @returns {string|null} e.g. "₦1,812,500.00"
 */
export function ngnEquivalent(usdValue, rate) {
  const r = Number(rate || 0)
  if (!r || r <= 0) return null
  return naira(Number(usdValue || 0) * r)
}
