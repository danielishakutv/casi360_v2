import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { employeePosition } from '../utils/employees'

/**
 * Searchable employee picker.
 *
 * Filters by name / email / position as the user types. Falls back to free-text
 * entry so names outside the HR list can still be displayed.
 *
 * Props:
 *   - employees: array of HR employees (id, name, email, position/designation)
 *   - value:     currently displayed text (typically the selected name)
 *   - onSelect:  (emp) => void — called when an item is clicked
 *   - onTextChange: (text) => void — called as the user types (optional)
 *   - placeholder, disabled, required, id, name, ...standard input props
 */
export default function EmployeePicker({
  employees,
  value,
  onSelect,
  onTextChange,
  placeholder,
  disabled = false,
  required = false,
  id,
  name,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const wrapperRef = useRef(null)

  /* Keep the visible text in sync with the parent-provided value. */
  useEffect(() => {
    queueMicrotask(() => setQuery(value || ''))
  }, [value])

  /* Close the suggestion list on outside click. */
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    const list = employees || []
    if (!q) return list.slice(0, 50)
    return list
      .filter((e) => {
        const hay = `${e.name || ''} ${e.email || ''} ${employeePosition(e)}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 50)
  }, [employees, query])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={name}
          type="text"
          value={query}
          placeholder={placeholder || 'Search employee by name...'}
          disabled={disabled}
          required={required}
          onFocus={() => !disabled && setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (onTextChange) onTextChange(e.target.value)
          }}
          style={{ paddingRight: 28 }}
        />
        <ChevronDown
          size={14}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            right: 0,
            zIndex: 20,
            background: 'var(--bg-primary, #fff)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 6,
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {filtered.map((emp) => (
            <button
              type="button"
              key={emp.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(emp)
                setQuery(emp.name || '')
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border, #f1f5f9)',
                cursor: 'pointer',
                fontSize: 13,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary, #f8fafc)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                {emp.name || '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                {employeePosition(emp) || '—'}
                {emp.email ? ` · ${emp.email}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
