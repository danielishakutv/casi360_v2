import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, AlertCircle, ArrowLeft, X, Plus, Users, Check } from 'lucide-react'
import { messagesApi } from '../../services/communication'
import { extractItems } from '../../utils/apiHelpers'
import { useAuth } from '../../contexts/AuthContext'
import Avatar from '../../components/Avatar'
import FormatToolbar from '../../components/FormatToolbar'

/**
 * New Message — full page (replaces the former Messages.jsx compose modal).
 *
 * Recipient search/picker (chips + candidate list via messagesApi.recipients()),
 * subject, body with a formatting toolbar, and the fan-out send (one request per
 * recipient). On success we navigate back to the messages list.
 */
export default function ComposeMessage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [recipientIds, setRecipientIds] = useState([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [recipientQuery, setRecipientQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const bodyRef = useRef(null)

  const staffName = (s) => s?.name || [s?.first_name, s?.last_name].filter(Boolean).join(' ') || s?.email || 'Unknown'

  /* Load the recipient list once on mount. */
  useEffect(() => {
    messagesApi.recipients().then((r) => setStaffList(extractItems(r))).catch(() => {})
  }, [])

  const addRecipient = (id) => {
    setRecipientIds((p) => (p.includes(id) ? p : [...p, id]))
    setRecipientQuery('')
  }
  const removeRecipient = (id) => setRecipientIds((p) => p.filter((r) => r !== id))

  /* Collapse the picker and move focus to the message body. */
  function collapseRecipients() {
    setCollapsed(true)
    requestAnimationFrame(() => bodyRef.current?.focus())
  }

  async function handleSend(e) {
    e.preventDefault()
    setErrors(null)
    if (!recipientIds.length) {
      setErrors({ general: ['Select at least one recipient.'] }); return
    }
    if (!body.trim()) {
      setErrors({ general: ['Message body is required.'] }); return
    }
    setSending(true)
    try {
      // Backend sends to one recipient per request — fan out so a group
      // selection delivers an individual copy to each person.
      await Promise.all(recipientIds.map((rid) =>
        messagesApi.send({ recipient_id: rid, subject, body })
      ))
      navigate('/communication/messages')
    } catch (err) {
      if (err.status === 422 && err.errors) setErrors(err.errors)
      else setErrors({ general: [err.message] })
    } finally { setSending(false) }
  }

  const selectedStaff = recipientIds.map((rid) => staffList.find((x) => x.id === rid)).filter(Boolean)
  const canSend = recipientIds.length > 0 && body.trim().length > 0

  return (
    <div className="page-stack">
      <div className="card animate-in">
        <div className="card-header comm-detail-header">
          <button className="hr-btn-secondary comm-back-btn" onClick={() => navigate('/communication/messages')}>
            <ArrowLeft size={14} /> Back
          </button>
          <h3 className="comm-detail-title-flex">New Message</h3>
        </div>

        <div className="card-body">
          <form onSubmit={handleSend} className="hr-form comm-compose-page">
            {errors && (
              <div className="hr-error-banner" style={{ marginBottom: 12 }}>
                <AlertCircle size={16} />
                <span>{errors.general ? errors.general[0] : 'Please fix the errors below.'}</span>
              </div>
            )}

            {/* ── Collapsible Recipients ── */}
            <div className="hr-form-field">
              <div className="comm-recipients-head">
                <label><Users size={14} /> Recipients *</label>
                {collapsed ? (
                  <button type="button" className="comm-link-btn" onClick={() => setCollapsed(false)}>
                    <Plus size={13} /> Edit recipients
                  </button>
                ) : (
                  <button type="button" className="comm-link-btn" onClick={collapseRecipients} disabled={!recipientIds.length}>
                    <Check size={13} /> Done
                  </button>
                )}
              </div>

              {/* Selected recipients as removable chips (always visible) */}
              {selectedStaff.length > 0 && (
                <div className="comm-chips">
                  {selectedStaff.map((s) => (
                    <span key={s.id} className="comm-chip">
                      <Avatar name={staffName(s)} size="sm" />
                      {staffName(s)}
                      <button type="button" onClick={() => removeRecipient(s.id)} aria-label="Remove recipient" className="comm-chip-remove">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {collapsed ? (
                selectedStaff.length === 0 && (
                  <span className="comm-field-hint">No recipients selected. Click “Edit recipients” to choose.</span>
                )
              ) : (
                <>
                  <input
                    type="text"
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    placeholder="Search staff by name or email…"
                  />
                  {/* Scrollable candidate list */}
                  <div className="comm-candidate-list">
                    {(() => {
                      const q = recipientQuery.trim().toLowerCase()
                      const candidates = staffList
                        .filter((s) => s.id !== user?.id && !recipientIds.includes(s.id))
                        .filter((s) => !q || staffName(s).toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q))
                      if (!staffList.length) return <div className="comm-candidate-empty">Loading staff…</div>
                      if (!candidates.length) return <div className="comm-candidate-empty">No matching staff</div>
                      return candidates.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => addRecipient(s.id)}
                          className="comm-candidate"
                        >
                          <Avatar name={staffName(s)} size="sm" />
                          <span className="comm-candidate-text">
                            <span className="comm-candidate-name">{staffName(s)}</span>
                            {s.email ? <span className="comm-candidate-email">{s.email}</span> : null}
                          </span>
                        </button>
                      ))
                    })()}
                  </div>
                  <span className="comm-field-hint">
                    Select one or more recipients. Each person receives their own copy.
                  </span>
                </>
              )}
            </div>

            {/* ── Subject ── */}
            <div className="hr-form-field">
              <label>Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Message subject" />
            </div>

            {/* ── Body with formatting toolbar ── */}
            <div className="hr-form-field">
              <label>Message *</label>
              <div className="comm-composer-box">
                <FormatToolbar targetRef={bodyRef} value={body} onChange={setBody} />
                <textarea
                  ref={bodyRef}
                  className="comm-composer-input comm-composer-input-flush"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Type your message…"
                />
              </div>
            </div>

            <div className="hr-form-actions">
              <button type="button" className="hr-btn-secondary" onClick={() => navigate('/communication/messages')}>Cancel</button>
              <button type="submit" className="hr-btn-primary" disabled={sending || !canSend}>
                <Send size={14} /> {sending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
