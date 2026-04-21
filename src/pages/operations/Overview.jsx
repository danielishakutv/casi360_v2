import { useEffect, useState } from 'react'
import { ClipboardCheck, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { approvalsApi } from '../../services/procurement'

export default function OperationsOverview() {
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    approvalsApi.pending()
      .then((res) => {
        const d = res?.data || res || {}
        setPendingCount((d.requisitions || []).length)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="animate-in">
      <div className="stats-grid">
        <div className="stat-card orange" style={{ cursor: 'pointer' }} onClick={() => navigate('/operations/approvals')}>
          <div className="stat-top"><div className="stat-icon orange"><Clock3 size={22} /></div></div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-label">Pending Operations Approvals</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 8 }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <ClipboardCheck size={20} style={{ color: 'var(--primary)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 6px', color: 'var(--text-secondary)' }}>Operations Module</h4>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                The Operations team handles the final logistics sign-off on purchase requests
                that Finance has reviewed and forwarded. Use the{' '}
                <button
                  type="button"
                  onClick={() => navigate('/operations/approvals')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 'inherit' }}
                >
                  Approvals
                </button>{' '}
                page to view and act on items awaiting your decision.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
