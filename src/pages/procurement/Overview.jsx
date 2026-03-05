import {
  ClipboardList, FileText, Store, Package, TrendingUp, TrendingDown
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'

const stats = [
  { label: 'Open Requisitions', value: '24', change: '+5', up: true, icon: ClipboardList, color: 'blue' },
  { label: 'Pending POs', value: '12', change: '+2', up: true, icon: FileText, color: 'orange' },
  { label: 'Active Vendors', value: '38', change: '+3', up: true, icon: Store, color: 'green' },
  { label: 'Inventory Items', value: '1,245', change: '-18', up: false, icon: Package, color: 'purple' },
]

const recentOrders = [
  { id: 'PO-2026-042', vendor: 'MedSupply Co.', amount: '$12,500', status: 'approved', date: 'Mar 2, 2026' },
  { id: 'PO-2026-041', vendor: 'OfficeMax Ltd.', amount: '$3,200', status: 'pending', date: 'Mar 1, 2026' },
  { id: 'PO-2026-040', vendor: 'Tech Solutions', amount: '$8,750', status: 'approved', date: 'Feb 28, 2026' },
  { id: 'PO-2026-039', vendor: 'CleanWater Inc.', amount: '$22,000', status: 'active', date: 'Feb 25, 2026' },
]

export default function ProcOverview() {
  return (
    <>
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.label}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
                <div className={`stat-change ${stat.up ? 'up' : 'down'}`}>
                  {stat.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {stat.change}
                </div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="card animate-in">
        <div className="card-header">
          <h3>Recent Purchase Orders</h3>
          <span className="card-badge orange">{recentOrders.length} recent</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>PO Number</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{o.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{o.vendor}</td>
                    <td style={{ fontWeight: 600 }}>{o.amount}</td>
                    <td>
                      <span className={`status-badge ${o.status}`}>
                        <span className="status-dot" />{capitalize(o.status)}
                      </span>
                    </td>
                    <td>{o.date}</td>
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
