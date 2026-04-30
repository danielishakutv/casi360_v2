import { useState, useEffect } from 'react'
import {
  ClipboardList, FileText, Store, Truck, CreditCard, ListOrdered,
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { purchaseRequestsApi, purchaseOrdersApi, procurementStatsApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'

function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

export default function ProcOverview() {
  /* Live data */
  const [prItems, setPrItems] = useState([])
  const [prMeta, setPrMeta]   = useState(null)
  const [poItems, setPoItems] = useState([])
  const [poMeta, setPoMeta]   = useState(null)
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [prRes, poRes, statsRes] = await Promise.all([
          purchaseRequestsApi.list({ per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }),
          purchaseOrdersApi.list({ per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }),
          procurementStatsApi.get(),
        ])
        if (cancelled) return
        setPrItems(extractItems(prRes))
        setPrMeta(extractMeta(prRes))
        setPoItems(extractItems(poRes))
        setPoMeta(extractMeta(poRes))
        setStats(statsRes?.data?.data || statsRes?.data || null)
      } catch {
        /* silently fall through — tables just show empty */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const prTotal  = prMeta?.total ?? prItems.length
  const poTotal  = poMeta?.total ?? poItems.length
  const boqTotal = stats?.boq?.total ?? 0
  const rfqTotal = stats?.rfq?.total ?? 0
  const rfqOpen  = (stats?.rfq?.by_status?.open ?? 0) + (stats?.rfq?.by_status?.pending ?? 0)
  const grnTotal = stats?.grn?.total ?? 0
  const rfpTotal = stats?.rfp?.total ?? 0
  const rfpPending = stats?.rfp?.by_status?.pending ?? 0

  /* Ordered to mirror the procurement document flow:
     BOQ → PR → RFQ → PO → GRN → RFP. */
  const statCards = [
    { key: 'boq', label: 'Bill of Quantities', value: boqTotal,  sub: '',                      icon: ListOrdered,   color: 'indigo' },
    { key: 'pr',  label: 'Purchase Requests', value: prTotal,    sub: '',                      icon: ClipboardList, color: 'blue' },
    { key: 'rfq', label: 'RFQs',              value: rfqTotal,   sub: rfqOpen ? `${rfqOpen} open` : '', icon: FileText, color: 'orange' },
    { key: 'po',  label: 'Purchase Orders',   value: poTotal,    sub: '',                      icon: Store,         color: 'green' },
    { key: 'grn', label: 'Goods Received',    value: grnTotal,   sub: '',                      icon: Truck,         color: 'purple' },
    { key: 'rfp', label: 'Payment Requests',  value: rfpTotal,   sub: rfpPending ? `${rfpPending} pending` : '', icon: CreditCard, color: 'red' },
  ]

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
              <div className="stat-value">{loading ? '…' : stat.value}</div>
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
          <span className="card-badge blue">{prTotal} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Req #</th><th>Title</th><th>Requester</th><th>Department</th><th>Est. Cost</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
                ) : prItems.length === 0 ? (
                  <tr><td colSpan={7} className="hr-empty-cell">No purchase requests yet</td></tr>
                ) : prItems.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.requisition_number}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title}</td>
                    <td>{r.requested_by_name || '—'}</td>
                    <td>{r.department || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{naira(r.estimated_cost)}</td>
                    <td>
                      <span className={`status-badge ${r.status}`}>
                        <span className="status-dot" />{fmtStatus(r.status)}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
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
          <span className="card-badge green">{poTotal} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
                ) : poItems.length === 0 ? (
                  <tr><td colSpan={5} className="hr-empty-cell">No purchase orders yet</td></tr>
                ) : poItems.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{o.po_number}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{o.vendor}</td>
                    <td style={{ fontWeight: 600 }}>{naira(o.total_amount)}</td>
                    <td>
                      <span className={`status-badge ${o.status}`}>
                        <span className="status-dot" />{fmtStatus(o.status)}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(o.created_at)}</td>
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
