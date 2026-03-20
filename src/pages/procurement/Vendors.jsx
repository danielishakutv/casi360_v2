import { useState, useMemo } from 'react'
import { Search, Plus, Pencil, Trash2, Eye, Star } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { demoVendors, nextId } from '../../data/procurementDemo'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['active', 'inactive', 'blacklisted']
const CATEGORIES = [
  'Office Supplies', 'Cleaning & Janitorial', 'Vehicle Maintenance',
  'Safety & PPE', 'Fuel & Petroleum', 'Construction', 'Security & IT',
  'IT Equipment', 'Catering & Events', 'Printing & Branding',
  'Furniture', 'Medical Supplies', 'Consultancy', 'Other',
]
const PER_PAGE = 15

const INITIAL_FORM = {
  name: '', category: '', contact_person: '', email: '', phone: '',
  address: '', tin: '', bank_name: '', account_no: '',
  status: 'active', rating: 3, notes: '',
}

export default function Vendors() {
  const [items, setItems] = useState(demoVendors)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = useMemo(() => {
    let r = items
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((i) => (i.name + i.vendor_code + i.contact_person + i.category + i.email).toLowerCase().includes(q))
    }
    if (statusFilter) r = r.filter((i) => i.status === statusFilter)
    if (categoryFilter) r = r.filter((i) => i.category === categoryFilter)
    return r
  }, [items, search, statusFilter, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const meta = {
    current_page: page, last_page: totalPages, per_page: PER_PAGE,
    total: filtered.length,
    from: filtered.length ? (page - 1) * PER_PAGE + 1 : 0,
    to: Math.min(page * PER_PAGE, filtered.length),
  }

  function openCreate() { setEditing(null); setForm(INITIAL_FORM); setModalOpen(true) }
  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name, category: item.category || '', contact_person: item.contact_person || '',
      email: item.email || '', phone: item.phone || '', address: item.address || '',
      tin: item.tin || '', bank_name: item.bank_name || '', account_no: item.account_no || '',
      status: item.status, rating: item.rating || 3, notes: item.notes || '',
    })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      setItems((prev) => prev.map((i) => i.id === editing.id ? { ...i, ...form, rating: Number(form.rating) } : i))
    } else {
      const id = nextId()
      const code = `VND-${String(items.length + 1).padStart(3, '0')}`
      setItems((prev) => [{
        id, vendor_code: code, ...form,
        rating: Number(form.rating),
        created_at: new Date().toISOString().slice(0, 10),
      }, ...prev])
    }
    closeModal()
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  /* Rating stars display */
  const RatingStars = ({ value }) => (
    <span className="vendor-rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={13} className={s <= value ? 'star-filled' : 'star-empty'} />
      ))}
    </span>
  )

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search vendors…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> Add Vendor</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Vendor Name</th>
                <th>Category</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Rating</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No vendors found</td></tr>
              ) : paged.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{v.vendor_code}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{v.name}</td>
                  <td style={{ fontSize: 12 }}>{v.category}</td>
                  <td>{v.contact_person || '—'}</td>
                  <td style={{ fontSize: 12 }}>{v.phone || '—'}</td>
                  <td><RatingStars value={v.rating} /></td>
                  <td><span className={`status-badge ${v.status}`}><span className="status-dot" />{capitalize(v.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(v)} title="View"><Eye size={15} /></button>
                      <button className="hr-action-btn" onClick={() => openEdit(v)} title="Edit"><Pencil size={15} /></button>
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(v)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      {/* ─── View Modal ─── */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Vendor Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.vendor_code} — {viewItem.name}</h3></div>
            <div className="note-detail-meta">
              <span><strong>Category:</strong> {viewItem.category}</span>
              <span><strong>Contact:</strong> {viewItem.contact_person}</span>
              <span><strong>Email:</strong> {viewItem.email || '—'}</span>
              <span><strong>Phone:</strong> {viewItem.phone || '—'}</span>
              <span><strong>Address:</strong> {viewItem.address || '—'}</span>
              <span><strong>TIN:</strong> {viewItem.tin || '—'}</span>
              <span><strong>Bank:</strong> {viewItem.bank_name || '—'}</span>
              <span><strong>Account No:</strong> {viewItem.account_no || '—'}</span>
              <span><strong>Rating:</strong> {viewItem.rating}/5</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
              <span><strong>Added:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.notes || 'No notes'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Create / Edit Modal ─── */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Vendor' : 'Add New Vendor'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Vendor Name *</label><input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="Company / business name" /></div>
            <div className="hr-form-field"><label>Category *</label>
              <select value={form.category} onChange={(e) => updateField('category', e.target.value)} required>
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Contact Person *</label><input type="text" value={form.contact_person} onChange={(e) => updateField('contact_person', e.target.value)} required placeholder="Full name" /></div>
            <div className="hr-form-field"><label>Email</label><input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="email@example.com" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Phone *</label><input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required placeholder="08012345678" /></div>
            <div className="hr-form-field"><label>Address</label><input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Business address" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>TIN</label><input type="text" value={form.tin} onChange={(e) => updateField('tin', e.target.value)} placeholder="Tax Identification Number" /></div>
            <div className="hr-form-field"><label>Bank Name</label><input type="text" value={form.bank_name} onChange={(e) => updateField('bank_name', e.target.value)} placeholder="Bank name" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Account Number</label><input type="text" value={form.account_no} onChange={(e) => updateField('account_no', e.target.value)} placeholder="Bank account number" /></div>
            <div className="hr-form-field"><label>Rating</label>
              <select value={form.rating} onChange={(e) => updateField('rating', e.target.value)}>
                <option value={1}>1 — Poor</option>
                <option value={2}>2 — Fair</option>
                <option value={3}>3 — Good</option>
                <option value={4}>4 — Very Good</option>
                <option value={5}>5 — Excellent</option>
              </select>
            </div>
          </div>
          <div className="hr-form-field"><label>Status</label>
            <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
          </div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3} placeholder="Additional notes about this vendor…" /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary">{editing ? 'Update Vendor' : 'Add Vendor'}</button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Vendor" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
