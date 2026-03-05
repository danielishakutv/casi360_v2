/**
 * Safely extract an array and pagination meta from various Laravel API response shapes.
 *
 * Supports:
 *  - Named resource:          { data: { departments: [...], meta: {...} } }
 *  - API Resource collection: { data: [...], meta: { current_page, ... } }
 *  - Paginator direct:        { data: [...], current_page, last_page, ... }
 *  - Wrapped paginator:       { data: { data: [...], current_page, ... } }
 *  - Plain array:             [...]
 *  - Non-paginated wrap:      { data: [...] }
 */

/**
 * Extract the items array from an API response.
 * Handles named resource keys (e.g. res.data.departments, res.data.employees).
 */
export function extractItems(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data

  // res.data is an object — look for the first array value (named resource key)
  if (res?.data && typeof res.data === 'object') {
    // Check for nested { data: { data: [...] } } shape first
    if (Array.isArray(res.data.data)) return res.data.data

    // Find the first array property (e.g. departments, employees, designations)
    for (const val of Object.values(res.data)) {
      if (Array.isArray(val)) return val
    }
  }

  return []
}

/**
 * Extract pagination meta from an API response.
 * Returns null if the response is not paginated.
 */
export function extractMeta(res) {
  // Shape: { data: { departments: [...], meta: {...} } }  (named resource with meta inside data)
  if (res?.data?.meta?.current_page != null) return res.data.meta

  // Shape: { data: [...], meta: { current_page, ... } }
  if (res?.meta?.current_page != null) return res.meta

  // Shape: { current_page, data: [...], last_page, ... }
  if (res?.current_page != null) {
    return {
      current_page: res.current_page,
      last_page:    res.last_page,
      from:         res.from,
      to:           res.to,
      total:        res.total,
    }
  }

  // Shape: { data: { current_page, data: [...], last_page, ... } }
  if (res?.data?.current_page != null) {
    return {
      current_page: res.data.current_page,
      last_page:    res.data.last_page,
      from:         res.data.from,
      to:           res.data.to,
      total:        res.data.total,
    }
  }

  return null
}

/**
 * Extract a flat stats/object payload from an API response.
 * Handles: { data: { stats: {...} } }, { data: { total_employees: 5, ... } }, { data: {...} }
 */
export function extractStats(res) {
  const d = res?.data
  if (!d || typeof d !== 'object') return res ?? {}

  // If data contains a 'stats' key, use it
  if (d.stats && typeof d.stats === 'object') return d.stats

  // Otherwise data itself holds the stats (skip non-stat keys like 'success', 'message')
  return d
}
