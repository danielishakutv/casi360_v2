import { useState, useMemo } from 'react'
import { Search, Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { demoVendorCategories, nextId } from '../../data/procurementDemo'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['active', 'inactive']
const PER_PAGE = 15

const INITIAL_FORM = { name: '', description: '', status: 'active' }

export default function VendorCategories() {
  const { can } = useAuth()
  const [items, setItems] = useState(demoVendorCategories)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

  /* ─── Filter & paginate ─── */
  const filtered = useMemo(() => {
    let r = items
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((c) => (c.name + c.description).toLowerCase().includes(q))
    }
    if (statusFilter) r = r.filter((c) => c.status === statusFilter)
    return r
  }, [items, search, statusFilter])

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
    setForm({ name: item.name, description: item.description || '', status: item.status })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      setItems((prev) => prev.map((c) => c.id === editing.id ? { ...c, ...form } : c))
    } else {
      setItems((prev) => [{
        id: nextId(),
        ...form,
        vendor_count: 0,
        created_at: new Date().toISOString().slice(0, 10),
      }, ...prev])
    }
    closeModal()
  }

  function toggleStatus(item) {
    setItems((prev) => prev.map((c) =>
      c.id === item.id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
    ))
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setItems((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search categories…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            {can('procurement.vendor_categories.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> Add Category</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Vendors</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="hr-empty-cell">No categories found</td></tr>
              ) : paged.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{cat.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300 }}>{cat.description || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{cat.vendor_count}</td>
                  <td>
                    <button
                      className={`status-toggle ${cat.status}`}
                      onClick={() => toggleStatus(cat)}
                      title={`Click to ${cat.status === 'active' ? 'deactivate' : 'activate'}`}
                    >
                      <span className="status-toggle-dot" />
                      <span>{capitalize(cat.status)}</span>
                    </button>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDate(cat.created_at)}</td>
                  <td>
                    <div className="hr-actions">
                      {can('procurement.vendor_categories.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(cat)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.vendor_categories.delete') && (
                        <button
                          className="hr-action-btn danger"
                          onClick={() => setDeleteTarget(cat)}
                          title={cat.vendor_count > 0 ? 'Cannot delete — has vendors' : 'Delete'}
                          disabled={cat.vendor_count > 0}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      {/* ─── Create / Edit Modal ─── */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Category' : 'Add New Category'} size="sm">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-field">
            <label>Category Name *</label>
            <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="e.g. Office Supplies" />
          </div>
          <div className="hr-form-field">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={3} placeholder="Brief description of this category…" />
          </div>
          <div className="hr-form-field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary">{editing ? 'Update Category' : 'Add Category'}</button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Category" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete category <strong>"{deleteTarget?.name}"</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
