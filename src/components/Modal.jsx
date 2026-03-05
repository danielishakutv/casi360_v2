import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    if (!open) return

    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={`modal-content modal-${size}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
