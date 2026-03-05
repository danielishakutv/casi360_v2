/**
 * Safely extract an array and pagination meta from various Laravel API response shapes.
 *
 * Supports:
 *  - API Resource collection: { data: [...], meta: { current_page, last_page, ... } }
 *  - Paginator direct:        { data: [...], current_page, last_page, ... }
 *  - Wrapped paginator:       { data: { data: [...], current_page, last_page, ... } }
 *  - Plain array:             [...]
 *  - Non-paginated wrap:      { data: [...] }
 */

/**
 * Extract the items array from an API response.
 */
export function extractItems(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data?.data)) return res.data.data   // wrapped paginator
  if (Array.isArray(res?.data)) return res.data               // resource collection / direct paginator
  return []
}

/**
 * Extract pagination meta from an API response.
 * Returns null if the response is not paginated.
 */
export function extractMeta(res) {
  // Shape: { data: [...], meta: { current_page, last_page, ... } }
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
