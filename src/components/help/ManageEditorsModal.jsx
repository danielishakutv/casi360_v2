import { useState, useEffect } from 'react'
import { Trash2, UserPlus, ShieldCheck, Search, Loader2 } from 'lucide-react'
import Modal from '../Modal'
import { helpApi } from '../../services/projects'
import { useDebounce } from '../../hooks/useDebounce'

/**
 * Super-admin only.
 *
 * Lists current editors of the knowledge base, lets the admin remove
 * any of them, and search-and-add new ones from the active user list.
 */
export default function ManageEditorsModal({ open, onClose }) {
  const [editors, setEditors] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search)
  const [candidates, setCandidates] = useState([])
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [feedback, setFeedback] = useState('')

  // Fetch the current editor list when the modal opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    helpApi.listEditors()
      .then((res) => setEditors(res?.data?.editors || []))
      .catch(() => setEditors([]))
      .finally(() => setLoading(false))
  }, [open])

  // Search eligible users (non-super-admin, not already an editor)
  useEffect(() => {
    if (!open) return
    if (debounced.trim() === '') {
      setCandidates([])
      return
    }
    setSearching(true)
    helpApi.eligibleUsers(debounced)
      .then((res) => setCandidates(res?.data?.users || []))
      .catch(() => setCandidates([]))
      .finally(() => setSearching(false))
  }, [debounced, open])

  async function addEditor(userId) {
    setBusyId(userId)
    setFeedback('')
    try {
      const res = await helpApi.addEditor(userId)
      const newEditor = res?.data?.editor
      if (newEditor) setEditors((prev) => [...prev, newEditor])
      // Drop the candidate from the search results
      setCandidates((prev) => prev.filter((u) => u.id !== userId))
      setFeedback('Editor added.')
    } catch (e) {
      setFeedback(e?.message || 'Failed to add editor.')
    } finally {
      setBusyId(null)
    }
  }

  async function removeEditor(id, name) {
    if (!window.confirm(`Remove ${name} from the editor list?`)) return
    setBusyId(id)
    setFeedback('')
    try {
      await helpApi.removeEditor(id)
      setEditors((prev) => prev.filter((e) => e.id !== id))
      setFeedback('Editor removed.')
    } catch (e) {
      setFeedback(e?.message || 'Failed to remove editor.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="md" title="Manage Knowledge Base Editors">
      <div className="help-editors">
        <p className="help-editors-help">
          Editors can create, update and delete articles in the Knowledge Base.
          Super-admins always have access; the users below get the same rights.
        </p>

        {feedback && <div className="help-editors-feedback">{feedback}</div>}

        {/* Current editors */}
        <div className="help-editors-section-title">Current Editors</div>
        {loading ? (
          <div className="help-editors-empty"><Loader2 size={16} className="spin" /> Loading…</div>
        ) : editors.length === 0 ? (
          <div className="help-editors-empty">No editors yet — add someone below.</div>
        ) : (
          <ul className="help-editors-list">
            {editors.map((e) => (
              <li key={e.id} className="help-editors-row">
                <div className="help-editors-row-info">
                  <ShieldCheck size={14} className="help-editors-row-icon" />
                  <div>
                    <div className="help-editors-name">{e.user?.name || 'Unknown user'}</div>
                    <div className="help-editors-meta">
                      {e.user?.email}{e.user?.department ? ` · ${e.user.department}` : ''}{e.user?.role ? ` · ${e.user.role}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="hr-btn-danger help-editors-row-action"
                  onClick={() => removeEditor(e.id, e.user?.name || 'this user')}
                  disabled={busyId === e.id}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new */}
        <div className="help-editors-section-title">Add an Editor</div>
        <div className="search-box help-editors-search">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {searching ? (
          <div className="help-editors-empty"><Loader2 size={16} className="spin" /> Searching…</div>
        ) : search.trim() === '' ? (
          <div className="help-editors-empty">Type a name or email to find someone.</div>
        ) : candidates.length === 0 ? (
          <div className="help-editors-empty">No matching users.</div>
        ) : (
          <ul className="help-editors-list">
            {candidates.map((u) => (
              <li key={u.id} className="help-editors-row">
                <div className="help-editors-row-info">
                  <div>
                    <div className="help-editors-name">{u.name}</div>
                    <div className="help-editors-meta">
                      {u.email}{u.department ? ` · ${u.department}` : ''}{u.role ? ` · ${u.role}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="hr-btn-primary help-editors-row-action"
                  onClick={() => addEditor(u.id)}
                  disabled={busyId === u.id}
                >
                  <UserPlus size={14} /> Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
