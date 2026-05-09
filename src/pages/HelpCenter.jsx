import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search, BookOpen, Send, AlertCircle, ChevronDown, ChevronRight,
  Plus, Pencil, Trash2, ShieldCheck, LifeBuoy,
} from 'lucide-react'
import { helpApi } from '../services/projects'
import { extractItems } from '../utils/apiHelpers'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../contexts/AuthContext'
import Markdown from '../components/help/Markdown'
import ArticleEditorModal, { HELP_CATEGORIES } from '../components/help/ArticleEditorModal'
import ManageEditorsModal from '../components/help/ManageEditorsModal'

const PRIORITIES = ['low', 'medium', 'high']

export default function HelpCenter() {
  const { isSuperAdmin } = useAuth()

  /* ─── articles ─── */
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [activeCategory, setActiveCategory] = useState(null) // null = all
  const [expandedId, setExpandedId] = useState(null)
  const articleRefs = useRef({})

  /* ─── editor modals ─── */
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState(null)
  const [editorsModalOpen, setEditorsModalOpen] = useState(false)

  /* ─── ticket form ─── */
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('medium')
  const [submitting, setSubmitting] = useState(false)
  const [ticketMsg, setTicketMsg] = useState('')

  /* ─── load articles ─── */
  function reload() {
    setLoading(true)
    return helpApi.listArticles({ search: debouncedSearch || undefined, per_page: 0 })
      .then((res) => {
        setArticles(extractItems(res))
        setCanManage(Boolean(res?.data?.meta?.can_manage))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [debouncedSearch])

  /* ─── group articles by category ─── */
  const grouped = useMemo(() => {
    const map = new Map()
    // Preserve canonical category order, then append any unknown categories at the end
    HELP_CATEGORIES.forEach((c) => map.set(c, []))
    articles.forEach((a) => {
      const c = a.category || 'Uncategorized'
      if (!map.has(c)) map.set(c, [])
      map.get(c).push(a)
    })
    // Sort each category's articles by sort_order then title
    for (const [k, v] of map) {
      v.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title))
      if (v.length === 0) map.delete(k)
    }
    return map
  }, [articles])

  const categories = Array.from(grouped.keys())
  const totalCount = articles.length

  /* ─── jump to a category ─── */
  function jumpTo(cat) {
    setActiveCategory(cat)
    requestAnimationFrame(() => {
      const el = document.getElementById(`help-cat-${slug(cat)}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  /* ─── article actions ─── */
  function openCreate() {
    setEditingArticle(null)
    setEditorOpen(true)
  }
  function openEdit(article) {
    setEditingArticle(article)
    setEditorOpen(true)
  }
  async function saveArticle(data) {
    if (editingArticle) {
      await helpApi.updateArticle(editingArticle.id, data)
    } else {
      await helpApi.createArticle(data)
    }
    setEditorOpen(false)
    await reload()
  }
  async function deleteArticle(article) {
    if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return
    await helpApi.deleteArticle(article.id)
    await reload()
  }

  /* ─── ticket submit ─── */
  async function submitTicket(e) {
    e.preventDefault()
    setSubmitting(true)
    setTicketMsg('')
    try {
      await helpApi.submitTicket({ subject, message, priority })
      setTicketMsg('Ticket submitted successfully. Our team will respond soon.')
      setSubject(''); setMessage(''); setPriority('medium')
    } catch { setTicketMsg('Failed to submit ticket. Please try again.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="animate-in help-center">
      {/* ─── Hero / search header ─── */}
      <div className="help-hero">
        <div className="help-hero-content">
          <div className="help-hero-icon"><LifeBuoy size={28} /></div>
          <div>
            <h1>Help Center</h1>
            <p>Guides, walk-throughs and answers to keep you moving in CASI360.</p>
          </div>
        </div>
        <div className="help-hero-search">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search the knowledge base…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {totalCount > 0 && !loading && (
            <span className="help-hero-count">
              {totalCount} {totalCount === 1 ? 'article' : 'articles'}
            </span>
          )}
        </div>
      </div>

      {/* ─── Manage bar (editors / super admins) ─── */}
      {canManage && (
        <div className="help-manage-bar">
          <span className="help-manage-label">
            <ShieldCheck size={14} /> You can manage the Knowledge Base
          </span>
          <div className="help-manage-actions">
            <button className="hr-btn-primary" onClick={openCreate}>
              <Plus size={14} /> New Article
            </button>
            {isSuperAdmin() && (
              <button className="hr-btn-secondary" onClick={() => setEditorsModalOpen(true)}>
                <ShieldCheck size={14} /> Manage Editors
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Main layout: categories rail + articles ─── */}
      <div className="help-layout">
        {/* Category rail */}
        <aside className="help-rail">
          <div className="help-rail-title">Categories</div>
          <ul className="help-rail-list">
            <li>
              <button
                type="button"
                className={`help-rail-link ${activeCategory == null ? 'is-active' : ''}`}
                onClick={() => { setActiveCategory(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >
                <span>All Articles</span>
                <span className="help-rail-count">{totalCount}</span>
              </button>
            </li>
            {categories.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  className={`help-rail-link ${activeCategory === c ? 'is-active' : ''}`}
                  onClick={() => jumpTo(c)}
                >
                  <span>{c}</span>
                  <span className="help-rail-count">{grouped.get(c).length}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Articles */}
        <section className="help-articles">
          <div className="card">
            <div className="card-header">
              <h3><BookOpen size={18} /> Knowledge Base</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <div className="help-empty">Loading articles…</div>
              ) : totalCount === 0 ? (
                <div className="help-empty">
                  No articles found{search ? ` for “${search}”` : ''}.
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat}
                    id={`help-cat-${slug(cat)}`}
                    className="help-cat"
                  >
                    <div className="help-cat-header">
                      <h4>{cat}</h4>
                      <span className="help-cat-count">{grouped.get(cat).length}</span>
                    </div>

                    <ul className="help-cat-list">
                      {grouped.get(cat).map((a) => {
                        const isOpen = expandedId === a.id
                        return (
                          <li key={a.id} className={`help-article ${isOpen ? 'is-open' : ''}`} ref={(el) => { articleRefs.current[a.id] = el }}>
                            <button
                              type="button"
                              className="help-article-toggle"
                              onClick={() => setExpandedId(isOpen ? null : a.id)}
                              aria-expanded={isOpen}
                            >
                              <span className="help-article-toggle-icon">
                                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                              <span className="help-article-title">{a.title}</span>
                              {a.status === 'draft' && <span className="help-article-badge">Draft</span>}
                            </button>

                            {isOpen && (
                              <div className="help-article-body">
                                <Markdown source={a.content || a.body} />

                                {canManage && (
                                  <div className="help-article-admin">
                                    <button
                                      type="button"
                                      className="hr-btn-secondary"
                                      onClick={(e) => { e.stopPropagation(); openEdit(a) }}
                                    >
                                      <Pencil size={14} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="hr-btn-danger"
                                      onClick={(e) => { e.stopPropagation(); deleteArticle(a) }}
                                    >
                                      <Trash2 size={14} /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ─── Ticket form ─── */}
      <div className="card help-ticket">
        <div className="card-header">
          <h3><Send size={18} /> Still need help? Submit a ticket</h3>
        </div>
        <div className="card-body" style={{ padding: '0 16px 16px' }}>
          {ticketMsg && (
            <div
              className="hr-error-banner help-ticket-feedback"
              style={{ color: ticketMsg.includes('success') ? 'var(--success)' : 'var(--danger)' }}
            >
              <AlertCircle size={16} /> {ticketMsg}
            </div>
          )}
          <form onSubmit={submitTicket} className="hr-form">
            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Brief description of your issue"
                />
              </div>
              <div className="hr-form-field">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="hr-form-field">
              <label>Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="Describe your issue in detail…"
              />
            </div>
            <div className="hr-form-actions">
              <button type="submit" className="hr-btn-primary" disabled={submitting}>
                <Send size={14} /> {submitting ? 'Submitting…' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─── Modals ─── */}
      <ArticleEditorModal
        open={editorOpen}
        article={editingArticle}
        onClose={() => setEditorOpen(false)}
        onSave={saveArticle}
      />
      <ManageEditorsModal
        open={editorsModalOpen}
        onClose={() => setEditorsModalOpen(false)}
      />
    </div>
  )
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
