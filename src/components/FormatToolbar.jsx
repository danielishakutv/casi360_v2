import { Bold, Italic, Strikethrough, Code } from 'lucide-react'

/**
 * Quick formatting buttons for a textarea, WhatsApp-style.
 * Wraps the current selection (or the caret position) in the marker.
 *
 * Props:
 *   targetRef  ref to the <textarea> being edited
 *   value      current text value
 *   onChange   (nextValue) => void  — same setter the textarea uses
 *   compact    smaller variant (optional)
 */
const ACTIONS = [
  { key: 'bold',   marker: '*', icon: Bold,          title: 'Bold  *text*' },
  { key: 'italic', marker: '_', icon: Italic,        title: 'Italic  _text_' },
  { key: 'strike', marker: '~', icon: Strikethrough, title: 'Strikethrough  ~text~' },
  { key: 'mono',   marker: '`', icon: Code,          title: 'Monospace  `text`' },
]

export default function FormatToolbar({ targetRef, value, onChange, compact = false }) {
  function apply(marker) {
    const ta = targetRef?.current
    const val = value ?? ''
    const start = ta?.selectionStart ?? val.length
    const end = ta?.selectionEnd ?? val.length
    const selected = val.slice(start, end)
    const next = val.slice(0, start) + marker + selected + marker + val.slice(end)
    onChange(next)
    // Restore focus + re-select the wrapped text after React re-renders.
    requestAnimationFrame(() => {
      if (!ta) return
      ta.focus()
      const pos = start + marker.length
      ta.setSelectionRange(pos, pos + selected.length)
    })
  }

  return (
    <div className={`comm-format-toolbar${compact ? ' compact' : ''}`} role="toolbar" aria-label="Text formatting">
      {ACTIONS.map((a) => {
        const Icon = a.icon
        return (
          <button
            key={a.key}
            type="button"
            className="comm-format-btn"
            title={a.title}
            aria-label={a.title}
            // preventDefault on mousedown so the textarea keeps its selection
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(a.marker)}
          >
            <Icon size={14} />
          </button>
        )
      })}
      {!compact && <span className="comm-format-hint">*bold*&nbsp; _italic_&nbsp; ~strike~&nbsp; `mono`</span>}
    </div>
  )
}
