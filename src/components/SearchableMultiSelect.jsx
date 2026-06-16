import { useState, useRef, useEffect, useMemo } from 'react'
import { X, ChevronDown, Search } from 'lucide-react'

/**
 * Searchable multi-select. Type to filter, click to add; selections show as
 * removable chips. Used to link multiple PR / PO / GRN references on the
 * Payment Request form without retyping document numbers.
 *
 *   options  : [{ value, label }]
 *   selected : string[]                 (array of chosen values)
 *   onChange : (next: string[]) => void
 */
export default function SearchableMultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = 'Search…',
  emptyHint,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selectedSet = useMemo(() => new Set(selected), [selected])

  // Resolve each selected value to its option; fall back to the raw value so
  // references that are no longer in the list still render as a chip.
  const selectedOptions = useMemo(
    () => selected.map((v) => options.find((o) => o.value === v) || { value: v, label: v }),
    [selected, options]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return options
      .filter((o) => !selectedSet.has(o.value))
      .filter((o) => !q || o.label.toLowerCase().includes(q))
      .slice(0, 50)
  }, [options, selectedSet, query])

  function add(value) {
    if (!selectedSet.has(value)) onChange([...selected, value])
    setQuery('')
  }
  function remove(value) {
    onChange(selected.filter((v) => v !== value))
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      {selectedOptions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {selectedOptions.map((o) => (
            <span
              key={o.value}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--surface-2, #f1f5f9)', border: '1px solid var(--border, #cbd5e1)',
                borderRadius: 999, padding: '3px 10px', fontSize: 12,
              }}
            >
              {o.label}
              <button
                type="button"
                onClick={() => remove(o.value)}
                aria-label={`Remove ${o.label}`}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', color: 'var(--text-muted)' }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ paddingLeft: 30 }}
        />
        <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      </div>

      {open && (
        <div
          style={{
            position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--surface, #fff)', border: '1px solid var(--border, #cbd5e1)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
              {options.length === 0 ? (emptyHint || 'No options available.') : 'No matches.'}
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(o.value)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13 }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
