import { useState, useEffect, useCallback } from 'react'
import { Save, AlertCircle, Check, RotateCcw } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { settingsApi } from '../../services/api'
import { extractItems } from '../../utils/apiHelpers'

function renderInput(setting, value, onChange) {
  const type = setting.type || 'string'
  switch (type) {
    case 'boolean':
      return (
        <label className="toggle-switch" style={{ display: 'inline-flex' }}>
          <input type="checkbox" checked={value === true || value === 'true' || value === '1' || value === 1} onChange={(e) => onChange(e.target.checked)} />
          <span className="toggle-slider" />
        </label>
      )
    case 'integer':
    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ maxWidth: 160 }}
        />
      )
    case 'json':
      return (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      )
    case 'select':
      return (
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {(setting.options || []).map((opt) => (
            <option key={opt} value={opt}>{capitalize(String(opt))}</option>
          ))}
        </select>
      )
    default:
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export default function SystemSettings() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  // Track edited values
  const [edited, setEdited] = useState({})
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await settingsApi.getAll()
      const data = res?.data?.settings || extractItems(res)
      setSettings(data)
      setEdited({})
    } catch (err) { setError(err.message || 'Failed to load settings') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleChange(key, value) {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  function getValue(setting) {
    const key = setting.key
    return key in edited ? edited[key] : setting.value
  }

  function handleReset() {
    setEdited({})
  }

  async function handleSave() {
    const changes = Object.entries(edited)
    if (changes.length === 0) return
    setSaving(true)
    try {
      await settingsApi.bulkUpdate(
        changes.map(([key, value]) => ({ key, value }))
      )
      setEdited({})
      fetchSettings()
      showToast('Settings saved successfully')
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error')
    } finally { setSaving(false) }
  }

  // Group settings by group
  const groups = {}
  settings.forEach((s) => {
    const grp = s.group || 'General'
    if (!groups[grp]) groups[grp] = []
    groups[grp].push(s)
  })
  const groupNames = Object.keys(groups).sort()

  const hasChanges = Object.keys(edited).length > 0

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="auth-spinner large" /></div>
  }

  return (
    <>
      {toast && (
        <div className={`hr-error-banner ${toast.type === 'success' ? 'success' : ''}`} style={{ marginBottom: 12 }}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {/* Sticky save bar */}
      {hasChanges && (
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--card-bg)', border: '1px solid var(--primary)', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{Object.keys(edited).length} unsaved change(s)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="hr-btn-secondary" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <RotateCcw size={14} /> Discard
            </button>
            <button className="hr-btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {settings.length === 0 ? (
        <div className="card animate-in" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No system settings configured
        </div>
      ) : (
        groupNames.map((grp) => (
          <div key={grp} className="card animate-in" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{grp}</h3>
            </div>
            <div style={{ padding: 16 }}>
              {groups[grp].map((setting) => {
                const val = getValue(setting)
                const isModified = setting.key in edited
                return (
                  <div key={setting.key} className="hr-form-field" style={{ marginBottom: 16, maxWidth: setting.type === 'json' ? '100%' : 400, position: 'relative' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {setting.label || capitalize(setting.key.replace(/_/g, ' ').replace(/\./g, ' - '))}
                      {isModified && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />}
                    </label>
                    {setting.description && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 6px' }}>{setting.description}</p>
                    )}
                    {renderInput(setting, val, (v) => handleChange(setting.key, v))}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </>
  )
}
