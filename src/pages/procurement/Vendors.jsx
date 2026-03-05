import { capitalize } from '../../utils/capitalize'

const vendors = [
  { name: 'MedSupply Co.', category: 'Medical', contact: 'info@medsupply.com', rating: '4.8', status: 'active', orders: 24 },
  { name: 'OfficeMax Ltd.', category: 'Office Supplies', contact: 'sales@officemax.com', rating: '4.5', status: 'active', orders: 18 },
  { name: 'Tech Solutions Inc.', category: 'IT & Technology', contact: 'hello@techsol.com', rating: '4.7', status: 'active', orders: 12 },
  { name: 'CleanWater Inc.', category: 'Water & Sanitation', contact: 'ops@cleanwater.org', rating: '4.9', status: 'active', orders: 8 },
  { name: 'BuildRight Construction', category: 'Construction', contact: 'info@buildright.com', rating: '4.2', status: 'pending', orders: 3 },
  { name: 'FoodAid Suppliers', category: 'Food & Nutrition', contact: 'supply@foodaid.com', rating: '4.6', status: 'active', orders: 15 },
]

export default function Vendors() {
  return (
    <div className="card animate-in">
      <div className="card-header">
        <h3>Vendor Directory</h3>
        <span className="card-badge green">{vendors.length} vendors</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Vendor</th><th>Category</th><th>Contact</th><th>Rating</th><th>Orders</th><th>Status</th></tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.name}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{v.name}</td>
                  <td>{v.category}</td>
                  <td>{v.contact}</td>
                  <td style={{ fontWeight: 600 }}>⭐ {v.rating}</td>
                  <td>{v.orders}</td>
                  <td>
                    <span className={`status-badge ${v.status}`}>
                      <span className="status-dot" />{capitalize(v.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
