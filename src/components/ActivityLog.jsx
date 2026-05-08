import { capitalize } from '../utils/capitalize'

/**
 * Renders the activity-log timeline for a procurement document.
 *
 * The backend ships every detail response with an `audit_log` array of:
 *   { id, action, actor_id, actor_name, comments, created_at }
 *
 * Action strings come pre-stripped of the entity prefix (e.g. 'created',
 * 'submitted', 'approved'), so the component can format them uniformly
 * across BOQ / PR / RFQ / PO / GRN / Invoice / RFP.
 */
function fmtAction(a) {
  if (!a) return ''
  return capitalize(String(a).replace(/_/g, ' '))
}

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function actionColor(a) {
  switch (a) {
    case 'created':         return '#3b82f6'
    case 'updated':         return '#8b5cf6'
    case 'submitted':       return '#0ea5e9'
    case 'approved':
    case 'approve':         return '#22c55e'
    case 'rejected':
    case 'reject':          return '#ef4444'
    case 'revision':
    case 'revised':         return '#f59e0b'
    case 'paid':            return '#10b981'
    case 'received':        return '#14b8a6'
    case 'partial_received':return '#eab308'
    default:                return '#94a3b8'
  }
}

export default function ActivityLog({ entries, title = 'Activity Log' }) {
  if (!entries || entries.length === 0) return null

  return (
    <>
      <h4 style={{ margin: '16px 0 8px', fontSize: 13, fontWeight: 600 }}>{title}</h4>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          borderLeft: '2px solid var(--border, #e5e7eb)',
          marginLeft: 6,
        }}
      >
        {entries.map((e, i) => (
          <li
            key={e.id || i}
            style={{
              position: 'relative',
              paddingLeft: 16,
              paddingBottom: i === entries.length - 1 ? 0 : 14,
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: -6,
                top: 4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: actionColor(e.action),
                border: '2px solid var(--bg-primary, #fff)',
              }}
            />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {fmtAction(e.action)}
              {e.actor_name ? (
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                  {' '}by {e.actor_name}
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(e.created_at)}</div>
            {e.comments ? (
              <div style={{ fontSize: 12, marginTop: 2, color: 'var(--text-secondary, #475569)' }}>
                “{e.comments}”
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </>
  )
}
