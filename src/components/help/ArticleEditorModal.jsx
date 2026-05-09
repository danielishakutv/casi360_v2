import { useState, useEffect, useRef } from 'react'
import { Bold, Italic, Heading2, Heading3, Link as LinkIcon, List, ListOrdered, Quote, Code, Save, X, Eye } from 'lucide-react'
import Modal from '../Modal'
import Markdown from './Markdown'

export const HELP_CATEGORIES = [
  'Getting Started',
  'Navigating CASI360',
  'HR Management',
  'Procurement Workflow',
  'Vendors & Inventory',
  'Projects & Budgets',
  'Finance & Approvals',
  'Operations & Executive Approvals',
  'Communication',
  'Reports',
  'Settings & Administration',
  'Troubleshooting & FAQs',
  'Glossary',
]

/**
 * Create / edit a help article. Supports markdown with a small
 * formatting toolbar and a live preview tab.
 *
 * Props:
 *   open       — visibility
 *   article    — article object (edit mode) or null/undefined (create)
 *   onClose    — close the modal
 *   onSave     — async (data) => void  (parent handles persistence)
 */
export default function ArticleEditorModal({ open, article, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(HELP_CATEGORIES[0])
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('published')
  const [sortOrder, setSortOrder] = useState(0)
  const [tab, setTab] = useState('write')   // 'write' | 'preview'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef(null)

  // Sync state when article prop changes
  useEffect(() => {
    if (!open) return
    setTitle(article?.title || '')
    setCategory(article?.category || HELP_CATEGORIES[0])
    setContent(article?.content || article?.body || '')
    setStatus(article?.status || 'published')
    setSortOrder(article?.sort_order ?? 0)
    setTab('write')
    setError('')
  }, [open, article])

  /* ─── Toolbar — wraps or replaces the current selection ─── */
  function applyWrap(before, after = before) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end) || ''
    const next = content.slice(0, start) + before + selected + after + content.slice(end)
    setContent(next)
    // Restore caret just after the wrapped text
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + before.length + selected.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function applyLinePrefix(prefix) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + prefix.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function insertLink() {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end) || 'link text'
    const url = window.prompt('URL (use /path for internal pages, https://… for external):', '/')
    if (url == null) return
    const md = `[${selected}](${url})`
    const next = content.slice(0, start) + md + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + md.length
      ta.setSelectionRange(pos, pos)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        title: title.trim(),
        category: category.trim(),
        content,
        status,
        sort_order: Number(sortOrder) || 0,
      })
    } catch (err) {
      setError(err?.message || 'Failed to save article.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={article ? 'Edit Article' : 'New Article'}>
      <form onSubmit={handleSubmit} className="help-editor">
        {error && <div className="help-editor-error">{error}</div>}

        <div className="help-editor-meta">
          <div className="help-editor-field" style={{ flex: 2 }}>
            <label>Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Clear, action-oriented title"
            />
          </div>

          <div className="help-editor-field" style={{ flex: 1 }}>
            <label>Category *</label>
            <input
              list="help-cats"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Select or type"
            />
            <datalist id="help-cats">
              {HELP_CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        <div className="help-editor-meta">
          <div className="help-editor-field" style={{ flex: 1 }}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="published">Published — visible to everyone</option>
              <option value="draft">Draft — only editors can see</option>
            </select>
          </div>
          <div className="help-editor-field" style={{ width: 140 }}>
            <label>Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="help-editor-toolbar" role="toolbar" aria-label="Formatting">
          <button type="button" onClick={() => applyLinePrefix('## ')} title="Heading 2"><Heading2 size={16} /></button>
          <button type="button" onClick={() => applyLinePrefix('### ')} title="Heading 3"><Heading3 size={16} /></button>
          <span className="help-editor-toolbar-sep" />
          <button type="button" onClick={() => applyWrap('**')} title="Bold"><Bold size={16} /></button>
          <button type="button" onClick={() => applyWrap('*')} title="Italic"><Italic size={16} /></button>
          <button type="button" onClick={() => applyWrap('`')} title="Inline code"><Code size={16} /></button>
          <span className="help-editor-toolbar-sep" />
          <button type="button" onClick={() => applyLinePrefix('- ')} title="Bullet list"><List size={16} /></button>
          <button type="button" onClick={() => applyLinePrefix('1. ')} title="Numbered list"><ListOrdered size={16} /></button>
          <button type="button" onClick={() => applyLinePrefix('> ')} title="Quote"><Quote size={16} /></button>
          <button type="button" onClick={insertLink} title="Insert link"><LinkIcon size={16} /></button>

          <div className="help-editor-tabs">
            <button
              type="button"
              className={tab === 'write' ? 'is-active' : ''}
              onClick={() => setTab('write')}
            >Write</button>
            <button
              type="button"
              className={tab === 'preview' ? 'is-active' : ''}
              onClick={() => setTab('preview')}
            ><Eye size={14} /> Preview</button>
          </div>
        </div>

        {/* Body */}
        {tab === 'write' ? (
          <textarea
            ref={textareaRef}
            className="help-editor-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write the article in markdown.

Tips
- Use ## for section headings.
- Internal links: [Staff List](/hr/staff)
- External links: [Website](https://example.com)
- Wrap text in **bold** or *italic* using the toolbar."
            rows={18}
            required
          />
        ) : (
          <div className="help-editor-preview">
            {content ? <Markdown source={content} /> : <p className="md-empty">Nothing to preview yet — switch back to <strong>Write</strong>.</p>}
          </div>
        )}

        <div className="help-editor-actions">
          <button type="button" className="hr-btn-secondary" onClick={onClose}>
            <X size={14} /> Cancel
          </button>
          <button type="submit" className="hr-btn-primary" disabled={saving || !title.trim() || !content.trim()}>
            <Save size={14} /> {saving ? 'Saving…' : (article ? 'Save changes' : 'Publish article')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
