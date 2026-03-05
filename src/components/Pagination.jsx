import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination controls.
 *
 * Props:
 *  - meta         {object}    Pagination meta from the API (current_page, last_page, from, to, total)
 *  - onPageChange {function}  Called with the new page number
 */
export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) return null

  const { current_page, last_page, from, to, total } = meta

  // Build visible page numbers with surrounding window
  const delta = 2
  const pages = []
  for (
    let i = Math.max(1, current_page - delta);
    i <= Math.min(last_page, current_page + delta);
    i++
  ) {
    pages.push(i)
  }

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Showing {from}&ndash;{to} of {total}
      </span>

      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(current_page - 1)}
          disabled={current_page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {pages[0] > 1 && (
          <>
            <button className="pagination-btn" onClick={() => onPageChange(1)}>1</button>
            {pages[0] > 2 && <span className="pagination-ellipsis">&hellip;</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            className={`pagination-btn ${p === current_page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        {pages[pages.length - 1] < last_page && (
          <>
            {pages[pages.length - 1] < last_page - 1 && (
              <span className="pagination-ellipsis">&hellip;</span>
            )}
            <button className="pagination-btn" onClick={() => onPageChange(last_page)}>
              {last_page}
            </button>
          </>
        )}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(current_page + 1)}
          disabled={current_page >= last_page}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
