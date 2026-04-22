import { Check, Clock, X, ChevronRight, SkipForward, RotateCcw } from 'lucide-react'

const STATUS_ICON = {
  approved:  <Check size={10} />,
  forwarded: <ChevronRight size={10} />,
  pending:   <Clock size={10} />,
  revision:  <RotateCcw size={10} />,
  rejected:  <X size={10} />,
  waiting:   null,
  skipped:   <SkipForward size={10} />,
}

const STATUS_TITLE = {
  approved:  'Approved',
  forwarded: 'Approved & Forwarded',
  pending:   'Awaiting approval',
  revision:  'Sent back for revision',
  rejected:  'Rejected',
  waiting:   'Not yet reached',
  skipped:   'Skipped',
}

/**
 * Renders the 3-stage approval chain as a compact visual strip.
 *
 * `chain` — array of { stage, stage_label, status, actor_name?, decided_at? }
 * `compact` — smaller size, hides label text on mobile
 */
export default function ApprovalChain({ chain = [], compact = true }) {
  if (!chain.length) return null

  return (
    <div className={`approval-chain${compact ? ' compact' : ''}`}>
      {chain.map((step, idx) => {
        const status = step.status || 'waiting'
        const icon = STATUS_ICON[status] ?? null
        const title = step.actor_name
          ? `${step.stage_label}: ${STATUS_TITLE[status] ?? status}${step.actor_name ? ` by ${step.actor_name}` : ''}`
          : `${step.stage_label}: ${STATUS_TITLE[status] ?? status}`

        return (
          <span key={step.stage ?? idx} style={{ display: 'contents' }}>
            {idx > 0 && <span className="approval-chain-arrow">›</span>}
            <span className={`approval-chain-step ${status}`} title={title}>
              {icon}
              <span className="approval-chain-step-name">{step.stage_label}</span>
            </span>
          </span>
        )
      })}
    </div>
  )
}

/* ─── Helper: convert flat demo fields → chain array ─── */
export function buildChainFromDemo(item) {
  return [
    {
      stage: 'budget_holder',
      stage_label: 'Budget Holder',
      stage_order: 1,
      status: item.line_manager_status || 'waiting',
      actor_name: item.line_manager_name || null,
    },
    {
      stage: 'finance',
      stage_label: 'Finance',
      stage_order: 2,
      status: item.finance_status || 'waiting',
      actor_name: item.finance_actor || null,
    },
    {
      stage: 'procurement',
      stage_label: 'Procurement',
      stage_order: 3,
      status: item.procurement_status || 'waiting',
      actor_name: item.procurement_actor || item.operations_actor || null,
    },
  ]
}

/* ─── Helper: derive chain from live API PR fields (fallback) ─── */
export function buildChainFromPR(pr) {
  if (pr.approval_chain?.length) return pr.approval_chain
  const active = pr.active_stage
  return [
    { stage: 'budget_holder', stage_label: 'Budget Holder', stage_order: 1, status: active === 'budget_holder' ? 'pending' : (active ? 'approved' : 'waiting') },
    { stage: 'finance',       stage_label: 'Finance',       stage_order: 2, status: active === 'finance'       ? 'pending' : (active === 'procurement' ? 'approved' : 'waiting') },
    { stage: 'procurement',   stage_label: 'Procurement',   stage_order: 3, status: active === 'procurement'   ? 'pending' : 'waiting' },
  ]
}
