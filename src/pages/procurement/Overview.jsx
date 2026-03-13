import { useState, useMemo } from 'react'
import {
  ClipboardList, FileText, Store, Truck, CreditCard, ListOrdered,
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import {
  demoPurchaseRequests, demoBOQ, demoRFQ,
  demoPurchaseOrders, demoGRN, demoRFP,
} from '../../data/procurementDemo'

export default function ProcOverview() {
  const [pr]  = useState(demoPurchaseRequests)
  const [boq] = useState(demoBOQ)
  const [rfq] = useState(demoRFQ)
  const [po]  = useState(demoPurchaseOrders)
  const [grn] = useState(demoGRN)
  const [rfp] = useState(demoRFP)

  const pendingPR  = useMemo(() => pr.filter((r) => r.status === 'pending').length, [pr])
  const activePO   = useMemo(() => po.filter((r) => ['approved', 'active', 'issued'].includes(r.status)).length, [po])
  const openRFQ    = useMemo(() => rfq.filter((r) => r.status === 'open' || r.status === 'pending').length, [rfq])
  const pendingRFP = useMemo(() => rfp.filter((r) => r.status === 'pending').length, [rfp])

  const statCards = [
    { key: 'pr',  label: 'Purchase Requests', value: pr.length,  sub: `${pendingPR} pending`,  icon: ClipboardList, color: 'blue' },
    { key: 'boq', label: 'Bill of Quantities', value: boq.length, sub: '',                     icon: ListOrdered,   color: 'indigo' },
    { key: 'rfq', label: 'RFQs',              value: rfq.length, sub: `${openRFQ} open`,       icon: FileText,      color: 'orange' },
    { key: 'po',  label: 'Purchase Orders',   value: po.length,  sub: `${activePO} active`,    icon: Store,         color: 'green' },
    { key: 'grn', label: 'Goods Received',    value: grn.length, sub: '',                      icon: Truck,         color: 'purple' },
    { key: 'rfp', label: 'Payment Requests',  value: rfp.length, sub: `${pendingRFP} pending`, icon: CreditCard,    color: 'red' },
  ]

  const recentPR = useMemo(() => [...pr].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), [pr])
  const recentPO = useMemo(() => [...po].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), [po])

  return (
    <>
      <div className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.key}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              {stat.sub && <div className="stat-sub">{stat.sub}</div>}
            </div>
          )
        })}
      </div>

      {/* Recent Purchase Requests */}
      <div className="card animate-in">
        <div className="card-header">
          <h3>Recent Purchase Requests</h3>
          <span className="card-badge blue">{pr.length} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>PR #</th><th>Title</th><th>Requester</th><th>Department</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentPR.length === 0 ? (
                  <tr><td colSpan={7} className="hr-empty-cell">No purchase requests yet</td></tr>
                ) : recentPR.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.pr_number}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title}</td>
                    <td>{r.requester}</td>
                    <td>{r.department}</td>
                    <td style={{ fontWeight: 600 }}>{naira(r.total_amount)}</td>
                    <td>
                      <span className={`status-badge ${r.status}`}>
                        <span className="status-dot" />{capitalize(r.status)}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Purchase Orders */}
      <div className="card animate-in">
        <div className="card-header">
          <h3>Recent Purchase Orders</h3>
          <span className="card-badge green">{po.length} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentPO.length === 0 ? (
                  <tr><td colSpan={5} className="hr-empty-cell">No purchase orders yet</td></tr>
                ) : recentPO.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{o.po_number}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{o.vendor}</td>
                    <td style={{ fontWeight: 600 }}>{naira(o.total_amount)}</td>
                    <td>
                      <span className={`status-badge ${o.status.replace(/ /g, '_')}`}>
                        <span className="status-dot" />{capitalize(o.status.replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(o.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
