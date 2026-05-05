import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, FileQuestion, Store, Truck, Receipt, CreditCard, ChevronRight,
} from 'lucide-react'

/* Order matters — drives the visual sequence and the slot lookup. */
const STEPS = [
  { key: 'pr',      label: 'PR',      icon: ClipboardList,   path: '/procurement/purchase-requests' },
  { key: 'rfq',     label: 'RFQ',     icon: FileQuestion,    path: '/procurement/rfq' },
  { key: 'po',      label: 'PO',      icon: Store,           path: '/procurement/purchase-orders' },
  { key: 'grn',     label: 'GRN',     icon: Truck,           path: '/procurement/grn' },
  { key: 'invoice', label: 'Invoice', icon: Receipt,         path: '/procurement/invoices' },
  { key: 'rfp',     label: 'RFP',     icon: CreditCard,      path: '/procurement/rfp' },
]

/**
 * DocumentChain — horizontal trail showing where this document sits in
 * the procurement chain (PR → RFQ → PO → GRN → Invoice → RFP).
 *
 * Props:
 *   chain:   { pr|rfq|po|grn|invoice|rfp: {id, number}|null } — from backend
 *   current: one of the step keys — highlights the current document
 *
 * Each populated step is clickable and navigates to that document's
 * list page filtered by the relevant id (best-effort — list pages
 * already show every doc; we don't have detail routes for most types).
 *
 * Empty/missing slots render greyed out so users see the gap and can
 * fill it in with the "Create next" buttons we shipped earlier.
 */
export default function DocumentChain({ chain, current }) {
  const navigate = useNavigate()
  if (!chain) return null

  const goTo = (step, slot) => {
    if (!slot) return
    // List pages don't yet support a single-doc focus param, so we
    // navigate to the list and rely on the user picking from there.
    // This is the lightest-touch implementation; can be tightened
    // later when detail routes exist.
    navigate(step.path)
  }

  return (
    <div className="doc-chain" aria-label="Document chain">
      {STEPS.map((step, idx) => {
        const slot = chain[step.key] || null
        const isCurrent = step.key === current
        const isPresent = !!slot
        const Icon = step.icon
        const label = slot?.number || step.label
        const titleAttr = slot?.number || `No ${step.label} in this chain`

        const stepClasses = [
          'doc-chain-step',
          isPresent ? 'present' : 'missing',
          isCurrent ? 'current' : '',
        ].filter(Boolean).join(' ')

        return (
          <span key={step.key} className="doc-chain-segment">
            <button
              type="button"
              className={stepClasses}
              onClick={() => isPresent && !isCurrent && goTo(step, slot)}
              disabled={!isPresent || isCurrent}
              title={titleAttr}
            >
              <span className="doc-chain-icon"><Icon size={13} /></span>
              <span className="doc-chain-label">
                <span className="doc-chain-step-name">{step.label}</span>
                <span className="doc-chain-number">{slot?.number || '—'}</span>
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight size={14} className="doc-chain-sep" />
            )}
          </span>
        )
      })}
    </div>
  )
}
