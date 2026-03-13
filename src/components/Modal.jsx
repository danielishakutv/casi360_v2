import { useEffect, useRef, useId } from 'react'
import { X } from 'lucide-react'

/**
 * Reusable modal dialog.
 *
 * Props:
 *  - open      {boolean}   Whether the modal is visible
 *  - onClose   {function}  Called when the user requests to close
 *  - title     {string}    Header text
 *  - size      {'sm'|'md'|'lg'}  Width preset (default 'md')
 *  - children  {ReactNode} Modal body content
 */
export default function Modal({ open, onClose, title, size = 'md', children }) {
  const overlayRef = useRef(null)
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    // Focus the dialog container on open
    dialogRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Focus trap — keep Tab cycling inside the modal
  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    if (!dialog) return

    const handleTab = (e) => {
      if (e.key !== 'Tab') return
      const focusable = dialog.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    dialog.addEventListener('keydown', handleTab)
    return () => dialog.removeEventListener('keydown', handleTab)
  }, [open])

  if (!open) return null

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div
        className={`modal-content modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
