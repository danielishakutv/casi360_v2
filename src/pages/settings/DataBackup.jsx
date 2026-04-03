import { useState, useRef } from 'react'
import { Download, Upload, DatabaseBackup, AlertCircle, Check, FileDown, FileUp, X } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { settingsApi } from '../../services/api'
import Modal from '../../components/Modal'

const ENTITIES = [
  { key: 'users', label: 'Users' },
  { key: 'staff', label: 'Staff' },
  { key: 'departments', label: 'Departments' },
  { key: 'designations', label: 'Designations' },
  { key: 'projects', label: 'Projects' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'purchase_requests', label: 'Purchase Requests' },
  { key: 'purchase_orders', label: 'Purchase Orders' },
  { key: 'goods_received_notes', label: 'Goods Received Notes' },
  { key: 'inventory_items', label: 'Inventory Items' },
  { key: 'settings', label: 'Settings' },
]

const FORMATS = ['json', 'csv']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['.json', '.csv']

export default function DataBackup() {
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')

  // Export
  const [selectedEntities, setSelectedEntities] = useState([])
  const [exportFormat, setExportFormat] = useState('json')
  const [exporting, setExporting] = useState(false)

  // Import
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Backup
  const [backupModal, setBackupModal] = useState(false)
  const [backingUp, setBackingUp] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function toggleEntity(key) {
    setSelectedEntities((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    )
  }

  function selectAll() {
    setSelectedEntities(ENTITIES.map((e) => e.key))
  }

  function clearAll() {
    setSelectedEntities([])
  }

  async function handleExport() {
    if (selectedEntities.length === 0) { showToast('Select at least one entity', 'error'); return }
    setExporting(true)
    try {
      const res = await settingsApi.exportData({
        entities: selectedEntities.join(','),
        format: exportFormat,
      })
      // If the API returns a download URL
      if (res?.data?.url) {
        window.open(res.data.url, '_blank')
        showToast('Export started — download should begin shortly')
      } else if (res?.data) {
        // If the API returns data directly, create a downloadable blob
        const blob = new Blob(
          [exportFormat === 'json' ? JSON.stringify(res.data, null, 2) : res.data],
          { type: exportFormat === 'json' ? 'application/json' : 'text/csv' }
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `export_${new Date().toISOString().slice(0, 10)}.${exportFormat}`
        a.click()
        URL.revokeObjectURL(url)
        showToast('Export downloaded successfully')
      } else {
        showToast('Export completed')
      }
    } catch (err) { showToast(err.message || 'Export failed', 'error') }
    finally { setExporting(false) }
  }

  function handleFileDrop(e) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) validateAndSetFile(file)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  function validateAndSetFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ACCEPTED_TYPES.includes(ext)) {
      showToast('Only .json and .csv files are accepted', 'error')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast('File must be smaller than 10MB', 'error')
      return
    }
    setImportFile(file)
  }

  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      const res = await settingsApi.importData(formData)
      if (res?.success === false) {
        showToast(res.message || 'Import failed', 'error')
      } else {
        showToast(res?.message || 'Data imported successfully')
        setImportFile(null)
      }
    } catch (err) { showToast(err.message || 'Import failed', 'error') }
    finally { setImporting(false) }
  }

  async function handleBackup() {
    setBackingUp(true)
    try {
      const res = await settingsApi.backup()
      setBackupModal(false)
      showToast(res?.message || res?.data?.message || 'Backup initiated successfully')
    } catch (err) { showToast(err.message || 'Backup failed', 'error') }
    finally { setBackingUp(false) }
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ─── Export Section ─── */}
        <div className="card animate-in" style={{ gridColumn: 'span 1' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileDown size={18} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Export Data</h3>
          </div>
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Select data to export and choose a format.</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Entities</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="hr-btn-secondary" onClick={selectAll} style={{ fontSize: 11, padding: '2px 8px' }}>Select All</button>
                <button className="hr-btn-secondary" onClick={clearAll} style={{ fontSize: 11, padding: '2px 8px' }}>Clear</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 16 }}>
              {ENTITIES.map((ent) => (
                <label key={ent.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedEntities.includes(ent.key)} onChange={() => toggleEntity(ent.key)} />
                  {ent.label}
                </label>
              ))}
            </div>

            <div className="hr-form-field" style={{ marginBottom: 16, maxWidth: 160 }}>
              <label style={{ fontSize: 12 }}>Format</label>
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                {FORMATS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </div>

            <button className="hr-btn-primary" onClick={handleExport} disabled={exporting || selectedEntities.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>

        {/* ─── Import Section ─── */}
        <div className="card animate-in" style={{ gridColumn: 'span 1' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileUp size={18} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Import Data</h3>
          </div>
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Upload a JSON or CSV file to import data.</p>

            {/* Drag/drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              style={{
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: 32,
                textAlign: 'center',
                cursor: 'pointer',
                background: dragActive ? 'rgba(59,130,246,0.04)' : 'transparent',
                transition: 'all 0.15s ease',
                marginBottom: 12,
              }}
            >
              <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Drop file here or click to browse</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>.json or .csv, max 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {importFile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface, var(--card-bg-hover, #f5f5f5))', borderRadius: 6, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{importFile.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtSize(importFile.size)}</div>
                </div>
                <button onClick={() => setImportFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            )}

            <button className="hr-btn-primary" onClick={handleImport} disabled={importing || !importFile} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={14} />
              {importing ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Backup Section ─── */}
      <div className="card animate-in" style={{ marginTop: 16 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <DatabaseBackup size={18} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Backup</h3>
        </div>
        <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Create a full system backup</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>This will create a backup of the entire database and uploaded files.</p>
          </div>
          <button className="hr-btn-primary" onClick={() => setBackupModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            <DatabaseBackup size={14} /> Create Backup
          </button>
        </div>
      </div>

      {/* Backup Confirmation Modal */}
      <Modal open={backupModal} onClose={() => setBackupModal(false)} title="Confirm Backup" size="sm">
        <div className="hr-confirm-delete">
          <p>Are you sure you want to create a full system backup?</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>This may take a few minutes depending on the data size.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setBackupModal(false)}>Cancel</button>
            <button className="hr-btn-primary" onClick={handleBackup} disabled={backingUp}>
              {backingUp ? 'Creating Backup...' : 'Create Backup'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
