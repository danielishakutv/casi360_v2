import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Save, AlertCircle, Check, RotateCcw, Search,
  Building2, Globe, Palette, Server, ShoppingCart, Settings as SettingsIcon,
  ExternalLink, Image as ImageIcon, Eye, Clock, Calendar, Languages, Coins,
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { settingsApi } from '../../services/api'
import { extractItems } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'

/* Friendly metadata per group — icon, display label, helper sentence. */
const GROUP_META = {
  organization: {
    icon: Building2,
    label: 'Organization',
    description: 'Identity, contact, and registration details.',
  },
  localization: {
    icon: Globe,
    label: 'Localization',
    description: 'Timezone, language, currency, and date formatting.',
  },
  appearance: {
    icon: Palette,
    label: 'Appearance',
    description: 'Brand colours, logo, and login screen.',
  },
  system: {
    icon: Server,
    label: 'System',
    description: 'Maintenance mode, sessions, password rules, registration.',
  },
  procurement: {
    icon: ShoppingCart,
    label: 'Procurement',
    description: 'Approval thresholds and workflow rules.',
  },
}

function metaFor(group) {
  return GROUP_META[group] || { icon: SettingsIcon, label: capitalize(group), description: '' }
}

function isBoolValue(v) {
  return v === true || v === 'true' || v === '1' || v === 1
}

function isColorField(setting) {
  return /color/i.test(setting.key) && (setting.type === 'string' || !setting.type)
}

function isUrlField(setting) {
  return /(_url|website)$/i.test(setting.key)
}

function fieldLabel(setting) {
  return setting.label || capitalize((setting.key || '').replace(/_/g, ' ').replace(/\./g, ' › '))
}

/* ─────────────────────── Field rows ─────────────────────── */

function ToggleRow({ setting, value, isModified, onChange }) {
  const on = isBoolValue(value)
  return (
    <div className={`syss-toggle ${isModified ? 'modified' : ''}`}>
      <div className="syss-toggle-text">
        <span className="syss-field-label">
          {fieldLabel(setting)}
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
        </span>
        {setting.description && <span className="syss-field-desc">{setting.description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={fieldLabel(setting)}
        className={`settings-switch ${on ? 'on' : ''}`}
        onClick={() => onChange(!on)}
      >
        <span className="settings-switch-thumb" />
      </button>
    </div>
  )
}

function ColorRow({ setting, value, isModified, onChange }) {
  const safe = typeof value === 'string' && value.startsWith('#') ? value : '#000000'
  return (
    <div className={`syss-field ${isModified ? 'modified' : ''}`}>
      <div className="syss-field-head">
        <label htmlFor={`f-${setting.key}`}>
          {fieldLabel(setting)}
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
        </label>
        {setting.description && <p className="syss-field-desc">{setting.description}</p>}
      </div>
      <div className="syss-color-wrap">
        <input
          type="color"
          aria-label={`${fieldLabel(setting)} colour picker`}
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="syss-color-swatch"
        />
        <input
          id={`f-${setting.key}`}
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={9}
          className="syss-color-text"
        />
      </div>
    </div>
  )
}

function UrlRow({ setting, value, isModified, onChange }) {
  const hasValue = typeof value === 'string' && value.trim().length > 0
  return (
    <div className={`syss-field ${isModified ? 'modified' : ''}`}>
      <div className="syss-field-head">
        <label htmlFor={`f-${setting.key}`}>
          {fieldLabel(setting)}
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
        </label>
        {setting.description && <p className="syss-field-desc">{setting.description}</p>}
      </div>
      <div className="syss-url-wrap">
        <input
          id={`f-${setting.key}`}
          type="url"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
        {hasValue && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="syss-url-open"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  )
}

function NumberRow({ setting, value, isModified, onChange }) {
  return (
    <div className={`syss-field ${isModified ? 'modified' : ''}`}>
      <div className="syss-field-head">
        <label htmlFor={`f-${setting.key}`}>
          {fieldLabel(setting)}
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
        </label>
        {setting.description && <p className="syss-field-desc">{setting.description}</p>}
      </div>
      <input
        id={`f-${setting.key}`}
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="syss-number"
      />
    </div>
  )
}

function SelectRow({ setting, value, isModified, onChange }) {
  return (
    <div className={`syss-field ${isModified ? 'modified' : ''}`}>
      <div className="syss-field-head">
        <label htmlFor={`f-${setting.key}`}>
          {fieldLabel(setting)}
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
        </label>
        {setting.description && <p className="syss-field-desc">{setting.description}</p>}
      </div>
      <select
        id={`f-${setting.key}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {(setting.options || []).map((opt) => (
          <option key={opt} value={opt}>{capitalize(String(opt))}</option>
        ))}
      </select>
    </div>
  )
}

function JsonRow({ setting, value, isModified, onChange }) {
  return (
    <div className={`syss-field full ${isModified ? 'modified' : ''}`}>
      <div className="syss-field-head">
        <label htmlFor={`f-${setting.key}`}>
          {fieldLabel(setting)}
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
        </label>
        {setting.description && <p className="syss-field-desc">{setting.description}</p>}
      </div>
      <textarea
        id={`f-${setting.key}`}
        value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        className="syss-json"
      />
    </div>
  )
}

function StringRow({ setting, value, isModified, onChange }) {
  // Use textarea for long-form strings
  const isLong = setting.type === 'text' || (typeof value === 'string' && value.length > 80)
  return (
    <div className={`syss-field ${isLong ? 'full' : ''} ${isModified ? 'modified' : ''}`}>
      <div className="syss-field-head">
        <label htmlFor={`f-${setting.key}`}>
          {fieldLabel(setting)}
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
        </label>
        {setting.description && <p className="syss-field-desc">{setting.description}</p>}
      </div>
      {isLong ? (
        <textarea
          id={`f-${setting.key}`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          id={`f-${setting.key}`}
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

/* Pick the right row component for a setting. */
function FieldRow(props) {
  const { setting } = props
  const type = setting.type || 'string'

  if (type === 'boolean') return <ToggleRow {...props} />
  if (type === 'json')    return <JsonRow {...props} />
  if (type === 'select')  return <SelectRow {...props} />
  if (type === 'integer' || type === 'number') return <NumberRow {...props} />
  if (isColorField(setting)) return <ColorRow {...props} />
  if (isUrlField(setting))   return <UrlRow {...props} />
  return <StringRow {...props} />
}

/* Split a list of settings into [toggles, fields] so booleans render as a
   tidy column, fields render in a responsive grid. */
function splitByKind(list) {
  const toggles = []
  const fields  = []
  list.forEach((s) => {
    if ((s.type || 'string') === 'boolean') toggles.push(s)
    else fields.push(s)
  })
  return { toggles, fields }
}

/* ─────────────────────── Appearance panel ─────────────────────── */
/* Bespoke layout for the appearance group — large colour swatches,
   live preview of how the colours render on real UI elements, and
   image-thumbnail previews for the favicon + login background. */

function isHex(v) {
  return typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.trim())
}

function BrandColorCard({ setting, value, isModified, onChange, role, helper }) {
  const safe = isHex(value) ? value : '#000000'
  return (
    <div className={`syss-app-color-card ${isModified ? 'modified' : ''}`}>
      <input
        type="color"
        className="syss-app-swatch"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${role} colour picker`}
      />
      <div className="syss-app-color-meta">
        <div className="syss-app-color-role">
          <strong>{role}</strong>
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
        </div>
        <input
          type="text"
          className="syss-app-color-hex"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={9}
          spellCheck={false}
        />
        {(helper || setting.description) && (
          <p className="syss-app-color-help">{helper || setting.description}</p>
        )}
      </div>
    </div>
  )
}

function LivePreview({ primary, accent }) {
  const safePrimary = isHex(primary) ? primary : '#1E40AF'
  const safeAccent  = isHex(accent)  ? accent  : '#F59E0B'
  return (
    <div className="syss-app-preview">
      <div className="syss-app-preview-head">
        <Eye size={14} />
        <strong>Live preview</strong>
        <span>How these colours render across the app</span>
      </div>
      <div className="syss-app-preview-body">
        <button type="button" className="syss-app-preview-btn" style={{ background: safePrimary }}>
          Primary action
        </button>
        <button
          type="button"
          className="syss-app-preview-btn outline"
          style={{ color: safePrimary, borderColor: safePrimary }}
        >
          Secondary
        </button>
        <span
          className="syss-app-preview-badge"
          style={{ background: `${safeAccent}1f`, color: safeAccent, borderColor: `${safeAccent}40` }}
        >
          Accent badge
        </span>
        <a
          href="#preview"
          className="syss-app-preview-link"
          style={{ color: safePrimary }}
          onClick={(e) => e.preventDefault()}
        >
          A sample link →
        </a>
        <div
          className="syss-app-preview-tile"
          style={{ background: `linear-gradient(135deg, ${safePrimary}, ${safeAccent})` }}
        >
          <span>Aa</span>
        </div>
      </div>
    </div>
  )
}

function BrandAssetCard({ setting, value, isModified, onChange, role, helper, aspect = 'wide' }) {
  const hasValue = typeof value === 'string' && value.trim().length > 0
  // Track which URL failed to load. When `value` changes, this naturally
  // becomes stale and we retry the image — no useEffect reset needed.
  const [failedUrl, setFailedUrl] = useState(null)
  const showImage = hasValue && failedUrl !== value

  return (
    <div className={`syss-app-asset-card ${isModified ? 'modified' : ''}`}>
      <div className="syss-app-asset-head">
        <strong>{role}</strong>
        {isModified && <span className="syss-modified-dot" aria-label="modified" />}
      </div>
      <div className={`syss-app-thumb aspect-${aspect}`}>
        {showImage ? (
          <img key={value} src={value} alt={role} onError={() => setFailedUrl(value)} />
        ) : (
          <div className="syss-app-thumb-empty">
            <ImageIcon size={22} />
            <span>{hasValue ? 'Could not load image' : 'No image set'}</span>
          </div>
        )}
      </div>
      <div className="syss-url-wrap">
        <input
          type="url"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
        />
        {hasValue && (
          <a href={value} target="_blank" rel="noreferrer" className="syss-url-open" title="Open in new tab">
            <ExternalLink size={14} />
          </a>
        )}
      </div>
      {(helper || setting.description) && (
        <p className="syss-app-asset-help">{helper || setting.description}</p>
      )}
    </div>
  )
}

function AppearancePanel({ list, getValue, isEdited, onChange }) {
  const byKey = useMemo(() => {
    const m = {}
    list.forEach((s) => { m[s.key] = s })
    return m
  }, [list])

  const primary  = byKey.primary_color
  const accent   = byKey.accent_color
  const logoUrl  = byKey.organization_logo_url || byKey.logo_url
  const favicon  = byKey.favicon_url
  const loginBg  = byKey.login_bg_url

  // Anything not handled by the bespoke cards falls back to the generic
  // FieldRow grid so future seeded keys don't disappear from the UI.
  const handledKeys = new Set([
    'primary_color', 'accent_color',
    'favicon_url', 'login_bg_url',
    'organization_logo_url', 'logo_url',
  ].filter(Boolean))
  const rest = list.filter((s) => !handledKeys.has(s.key))

  const primaryValue = primary ? getValue(primary) : null
  const accentValue  = accent  ? getValue(accent)  : null

  return (
    <div className="syss-app-panel">
      {(primary || accent) && (
        <div className="syss-app-section">
          <div className="syss-app-section-head">
            <Palette size={15} />
            <h4>Brand colours</h4>
            <span>Used for primary actions, accents, and badges across the app.</span>
          </div>

          <div className="syss-app-color-grid">
            {primary && (
              <BrandColorCard
                setting={primary}
                value={primaryValue}
                isModified={isEdited(primary.key)}
                onChange={(v) => onChange(primary.key, v)}
                role="Primary"
                helper="Buttons, links, and active selections."
              />
            )}
            {accent && (
              <BrandColorCard
                setting={accent}
                value={accentValue}
                isModified={isEdited(accent.key)}
                onChange={(v) => onChange(accent.key, v)}
                role="Accent"
                helper="Highlights, badges, and secondary callouts."
              />
            )}
          </div>

          <LivePreview primary={primaryValue} accent={accentValue} />
        </div>
      )}

      {(logoUrl || favicon || loginBg) && (
        <div className="syss-app-section">
          <div className="syss-app-section-head">
            <ImageIcon size={15} />
            <h4>Brand assets</h4>
            <span>Image URLs used on the login screen and browser tab.</span>
          </div>

          <div className="syss-app-asset-grid">
            {logoUrl && (
              <BrandAssetCard
                setting={logoUrl}
                value={getValue(logoUrl)}
                isModified={isEdited(logoUrl.key)}
                onChange={(v) => onChange(logoUrl.key, v)}
                role="Organization logo"
                helper="Shown in the sidebar header and login card."
                aspect="square"
              />
            )}
            {favicon && (
              <BrandAssetCard
                setting={favicon}
                value={getValue(favicon)}
                isModified={isEdited(favicon.key)}
                onChange={(v) => onChange(favicon.key, v)}
                role="Favicon"
                helper="Small icon shown on the browser tab. PNG or ICO, 32×32 recommended."
                aspect="square"
              />
            )}
            {loginBg && (
              <BrandAssetCard
                setting={loginBg}
                value={getValue(loginBg)}
                isModified={isEdited(loginBg.key)}
                onChange={(v) => onChange(loginBg.key, v)}
                role="Login background"
                helper="Full-bleed image behind the sign-in form. 1920×1080 or larger."
                aspect="wide"
              />
            )}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="syss-fields">
          {rest.map((s) => (
            <FieldRow
              key={s.key}
              setting={s}
              value={getValue(s)}
              isModified={isEdited(s.key)}
              onChange={(v) => onChange(s.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── Localization panel ─────────────────────── */
/* Bespoke layout for the localization group: regional preset buttons,
   live time-zone clock, format previews, and currency-with-symbol picker
   so super admins don't have to type IANA strings or ISO codes by hand. */

const TIMEZONE_OPTIONS = [
  { group: 'Africa', items: [
    { value: 'Africa/Lagos',         label: 'Lagos (WAT)' },
    { value: 'Africa/Abuja',         label: 'Abuja (WAT)' },
    { value: 'Africa/Accra',         label: 'Accra (GMT)' },
    { value: 'Africa/Cairo',         label: 'Cairo (EET)' },
    { value: 'Africa/Casablanca',    label: 'Casablanca (WET)' },
    { value: 'Africa/Johannesburg',  label: 'Johannesburg (SAST)' },
    { value: 'Africa/Nairobi',       label: 'Nairobi (EAT)' },
  ]},
  { group: 'Europe', items: [
    { value: 'Europe/London',  label: 'London (GMT)' },
    { value: 'Europe/Paris',   label: 'Paris (CET)' },
    { value: 'Europe/Berlin',  label: 'Berlin (CET)' },
  ]},
  { group: 'Americas', items: [
    { value: 'America/New_York',     label: 'New York (ET)' },
    { value: 'America/Chicago',      label: 'Chicago (CT)' },
    { value: 'America/Los_Angeles',  label: 'Los Angeles (PT)' },
  ]},
  { group: 'Asia & Pacific', items: [
    { value: 'Asia/Dubai',     label: 'Dubai (GST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Tokyo',     label: 'Tokyo (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  ]},
  { group: 'Universal', items: [
    { value: 'UTC', label: 'UTC' },
  ]},
]

const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦',    name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$',    name: 'US Dollar' },
  { code: 'EUR', symbol: '€',    name: 'Euro' },
  { code: 'GBP', symbol: '£',    name: 'Pound Sterling' },
  { code: 'GHS', symbol: 'GH₵',  name: 'Ghanaian Cedi' },
  { code: 'KES', symbol: 'KSh',  name: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand' },
  { code: 'XOF', symbol: 'CFA',  name: 'West African Franc' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African Franc' },
  { code: 'CAD', symbol: 'CA$',  name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar' },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'sw', label: 'Kiswahili' },
  { value: 'ar', label: 'العربية' },
]

const DATE_FORMAT_OPTIONS = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'D MMM YYYY',
  'MMMM D, YYYY',
]

/* Format a real Date using one of our DATE_FORMAT_OPTIONS strings.
   Token order matters — replace longest tokens first so YYYY isn't
   eaten by the YY rule and MMMM isn't eaten by MM. */
function formatDateTokens(fmt, date = new Date()) {
  const day      = date.getDate()
  const dayPad   = String(day).padStart(2, '0')
  const monthIdx = date.getMonth()
  const monthNum = String(monthIdx + 1).padStart(2, '0')
  const monthShort = date.toLocaleString('en-GB', { month: 'short' })
  const monthLong  = date.toLocaleString('en-GB', { month: 'long' })
  const year     = date.getFullYear()

  return fmt
    .replace(/MMMM/g, monthLong)
    .replace(/MMM/g, monthShort)
    .replace(/DD/g, dayPad)
    .replace(/MM/g, monthNum)
    .replace(/YYYY/g, year)
    .replace(/D/g, String(day))
}

function formatTimeIn(tz, mode = '12h') {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: mode !== '24h',
    }).format(new Date())
  } catch {
    return '—'
  }
}

function formatMoney(symbol = '₦', value = 125000.5) {
  return `${symbol}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/* Tick once per minute so the live clocks stay current without burning CPU. */
function useMinuteTick() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])
}

function TimezoneCard({ value, isModified, onChange }) {
  useMinuteTick()
  const safe = value || 'Africa/Lagos'
  return (
    <div className={`syss-loc-card ${isModified ? 'modified' : ''}`}>
      <div className="syss-loc-card-head">
        <span className="syss-loc-icon"><Clock size={16} /></span>
        <div>
          <strong>Timezone</strong>
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
          <p>Used for date/time display across the app.</p>
        </div>
      </div>
      <select
        className="syss-loc-select"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Timezone"
      >
        {TIMEZONE_OPTIONS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="syss-loc-preview">
        <span className="syss-loc-preview-label">Local time</span>
        <strong className="syss-loc-preview-value">{formatTimeIn(safe)}</strong>
      </div>
    </div>
  )
}

function LanguageCard({ value, isModified, onChange }) {
  const safe = value || 'en'
  return (
    <div className={`syss-loc-card ${isModified ? 'modified' : ''}`}>
      <div className="syss-loc-card-head">
        <span className="syss-loc-icon"><Languages size={16} /></span>
        <div>
          <strong>Language</strong>
          {isModified && <span className="syss-modified-dot" aria-label="modified" />}
          <p>Default interface language for new users.</p>
        </div>
      </div>
      <select
        className="syss-loc-select"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Language"
      >
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function DateTimeCard({ dateValue, dateModified, onDateChange,
                       timeValue, timeModified, onTimeChange,
                       tz }) {
  useMinuteTick()
  const safeDate = dateValue || 'DD/MM/YYYY'
  const safeTime = timeValue === '24h' ? '24h' : '12h'
  const datePreview = formatDateTokens(safeDate)
  const timePreview = formatTimeIn(tz || 'Africa/Lagos', safeTime)
  return (
    <div className={`syss-loc-card wide ${(dateModified || timeModified) ? 'modified' : ''}`}>
      <div className="syss-loc-card-head">
        <span className="syss-loc-icon"><Calendar size={16} /></span>
        <div>
          <strong>Date &amp; time format</strong>
          {(dateModified || timeModified) && <span className="syss-modified-dot" aria-label="modified" />}
          <p>How dates and times appear throughout the app.</p>
        </div>
      </div>

      <div className="syss-loc-row">
        <div className="syss-loc-row-field">
          <label>Date format</label>
          <select
            className="syss-loc-select"
            value={safeDate}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Date format"
          >
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt} — {formatDateTokens(opt)}</option>
            ))}
          </select>
        </div>
        <div className="syss-loc-row-field">
          <label>Time format</label>
          <div className="syss-loc-segmented" role="radiogroup" aria-label="Time format">
            <button
              type="button"
              role="radio"
              aria-checked={safeTime === '12h'}
              className={safeTime === '12h' ? 'active' : ''}
              onClick={() => onTimeChange('12h')}
            >
              12-hour
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={safeTime === '24h'}
              className={safeTime === '24h' ? 'active' : ''}
              onClick={() => onTimeChange('24h')}
            >
              24-hour
            </button>
          </div>
        </div>
      </div>

      <div className="syss-loc-preview wide">
        <span className="syss-loc-preview-label">Preview</span>
        <strong className="syss-loc-preview-value">{datePreview} · {timePreview}</strong>
      </div>
    </div>
  )
}

function CurrencyCard({ codeValue, codeModified, onCodeChange,
                       symbolValue, symbolModified, onSymbolChange }) {
  const safeCode = codeValue || 'NGN'
  const known = CURRENCY_OPTIONS.find((c) => c.code === safeCode)
  // Allow free-form code if not in the list, but show the dropdown plus a
  // text fallback so we don't lock the super admin out.
  const isCustom = !known

  /* When the user picks a known currency from the dropdown, sync the
     symbol automatically — this is almost always what they want. */
  function handleCodeChange(next) {
    onCodeChange(next)
    const meta = CURRENCY_OPTIONS.find((c) => c.code === next)
    if (meta && meta.symbol !== symbolValue) {
      onSymbolChange(meta.symbol)
    }
  }

  const safeSymbol = symbolValue || known?.symbol || '₦'

  return (
    <div className={`syss-loc-card wide ${(codeModified || symbolModified) ? 'modified' : ''}`}>
      <div className="syss-loc-card-head">
        <span className="syss-loc-icon"><Coins size={16} /></span>
        <div>
          <strong>Currency</strong>
          {(codeModified || symbolModified) && <span className="syss-modified-dot" aria-label="modified" />}
          <p>Default currency for budgets, expenses, and invoices.</p>
        </div>
      </div>

      <div className="syss-loc-row">
        <div className="syss-loc-row-field">
          <label>Currency</label>
          <select
            className="syss-loc-select"
            value={isCustom ? '__custom__' : safeCode}
            onChange={(e) => {
              if (e.target.value === '__custom__') return
              handleCodeChange(e.target.value)
            }}
            aria-label="Currency"
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} · {c.code} — {c.name}
              </option>
            ))}
            {isCustom && (
              <option value="__custom__">{safeCode} — Custom</option>
            )}
          </select>
        </div>
        <div className="syss-loc-row-field">
          <label>Symbol</label>
          <input
            type="text"
            className="syss-loc-symbol-input"
            value={safeSymbol}
            onChange={(e) => onSymbolChange(e.target.value)}
            maxLength={6}
            aria-label="Currency symbol"
          />
        </div>
        <div className="syss-loc-row-field">
          <label>Code</label>
          <input
            type="text"
            className="syss-loc-code-input"
            value={safeCode}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            maxLength={3}
            placeholder="NGN"
            aria-label="ISO 4217 currency code"
          />
        </div>
      </div>

      <div className="syss-loc-preview wide">
        <span className="syss-loc-preview-label">Preview</span>
        <strong className="syss-loc-preview-value">{formatMoney(safeSymbol)}</strong>
      </div>
    </div>
  )
}

function LocalizationPanel({ list, getValue, isEdited, onChange }) {
  const byKey = useMemo(() => {
    const m = {}
    list.forEach((s) => { m[s.key] = s })
    return m
  }, [list])

  const tz       = byKey.timezone
  const lang     = byKey.language
  const dateFmt  = byKey.date_format
  const timeFmt  = byKey.time_format
  const currCode = byKey.currency
  const currSym  = byKey.currency_symbol

  const handled = new Set([
    'timezone', 'language',
    'date_format', 'time_format',
    'currency', 'currency_symbol',
  ])
  const rest = list.filter((s) => !handled.has(s.key))

  const tzValue = tz ? getValue(tz) : null

  return (
    <div className="syss-loc-panel">
      <div className="syss-loc-grid">
        {tz && (
          <TimezoneCard
            value={tzValue}
            isModified={isEdited(tz.key)}
            onChange={(v) => onChange(tz.key, v)}
          />
        )}
        {lang && (
          <LanguageCard
            value={getValue(lang)}
            isModified={isEdited(lang.key)}
            onChange={(v) => onChange(lang.key, v)}
          />
        )}
      </div>

      {(dateFmt || timeFmt) && (
        <DateTimeCard
          dateValue={dateFmt ? getValue(dateFmt) : null}
          dateModified={dateFmt ? isEdited(dateFmt.key) : false}
          onDateChange={(v) => dateFmt && onChange(dateFmt.key, v)}
          timeValue={timeFmt ? getValue(timeFmt) : null}
          timeModified={timeFmt ? isEdited(timeFmt.key) : false}
          onTimeChange={(v) => timeFmt && onChange(timeFmt.key, v)}
          tz={tzValue}
        />
      )}

      {(currCode || currSym) && (
        <CurrencyCard
          codeValue={currCode ? getValue(currCode) : null}
          codeModified={currCode ? isEdited(currCode.key) : false}
          onCodeChange={(v) => currCode && onChange(currCode.key, v)}
          symbolValue={currSym ? getValue(currSym) : null}
          symbolModified={currSym ? isEdited(currSym.key) : false}
          onSymbolChange={(v) => currSym && onChange(currSym.key, v)}
        />
      )}

      {rest.length > 0 && (
        <div className="syss-fields">
          {rest.map((s) => (
            <FieldRow
              key={s.key}
              setting={s}
              value={getValue(s)}
              isModified={isEdited(s.key)}
              onChange={(v) => onChange(s.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── Main page ─────────────────────── */

export default function SystemSettings() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [edited, setEdited] = useState({})
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [activeGroup, setActiveGroup] = useState(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await settingsApi.getAll()
      const raw = res?.data?.settings
      let flat
      if (Array.isArray(raw)) {
        flat = raw
      } else if (raw && typeof raw === 'object') {
        flat = Object.values(raw).flat()
      } else {
        flat = extractItems(res)
      }
      setSettings(flat)
      setEdited({})
    } catch (err) {
      setError(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleChange = useCallback((key, value) => {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }, [])

  function getValue(setting) {
    return setting.key in edited ? edited[setting.key] : setting.value
  }

  function handleReset() { setEdited({}) }

  async function handleSave() {
    if (Object.keys(edited).length === 0) return
    setSaving(true)
    try {
      await settingsApi.bulkUpdate(edited)
      setEdited({})
      fetchSettings()
      showToast('Settings saved successfully')
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  /* Group + counts. */
  const groups = useMemo(() => {
    const g = {}
    settings.forEach((s) => {
      const k = s.group || 'general'
      if (!g[k]) g[k] = []
      g[k].push(s)
    })
    return g
  }, [settings])

  const groupNames = useMemo(() => Object.keys(groups).sort(), [groups])

  /* Default the active group to the first one once data loads. */
  useEffect(() => {
    if (!activeGroup && groupNames.length) {
      setActiveGroup(groupNames[0])
    }
  }, [activeGroup, groupNames])

  /* Search across all settings. */
  const searchResults = useMemo(() => {
    if (!debouncedSearch) return null
    const q = debouncedSearch.toLowerCase()
    return settings.filter((s) =>
      (s.label || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.key || '').toLowerCase().includes(q)
    )
  }, [debouncedSearch, settings])

  /* Search-result groupings (group label shown alongside each setting). */
  const groupedSearchResults = useMemo(() => {
    if (!searchResults) return null
    const out = {}
    searchResults.forEach((s) => {
      const k = s.group || 'general'
      if (!out[k]) out[k] = []
      out[k].push(s)
    })
    return out
  }, [searchResults])

  const hasChanges = Object.keys(edited).length > 0
  const editedCount = Object.keys(edited).length

  if (loading) {
    return (
      <div className="syss-loading">
        <div className="auth-spinner large" />
      </div>
    )
  }

  if (settings.length === 0) {
    return (
      <div className="card animate-in syss-empty">
        <SettingsIcon size={28} />
        <h3>No system settings configured</h3>
        <p>Run the SystemSettingsSeeder on the server to populate defaults.</p>
      </div>
    )
  }

  const activeMeta = activeGroup ? metaFor(activeGroup) : null
  const activeList = activeGroup ? groups[activeGroup] || [] : []
  const { toggles: activeToggles, fields: activeFields } = splitByKind(activeList)

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

      {/* Header — title + search */}
      <div className="card animate-in syss-header">
        <div className="syss-header-text">
          <h2>System Settings</h2>
          <p>Edit organisation, branding, and platform-wide rules. Changes save together so you can review before committing.</p>
        </div>
        <div className="search-box syss-search">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search settings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Two-column shell */}
      <div className="card animate-in syss-shell">
        {/* Group nav */}
        <nav className="syss-nav" aria-label="Setting groups">
          {groupNames.map((g) => {
            const meta = metaFor(g)
            const Icon = meta.icon
            const count = groups[g].length
            const isActive = activeGroup === g && !debouncedSearch
            return (
              <button
                key={g}
                type="button"
                className={`syss-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => { setActiveGroup(g); setSearch('') }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="syss-nav-icon"><Icon size={16} /></span>
                <span className="syss-nav-text">
                  <strong>{meta.label}</strong>
                  <span>{count} {count === 1 ? 'setting' : 'settings'}</span>
                </span>
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <section className="syss-content">
          {searchResults ? (
            /* Search mode */
            searchResults.length === 0 ? (
              <div className="syss-empty-results">
                <Search size={22} />
                <p>No settings match <strong>“{debouncedSearch}”</strong>.</p>
                <button className="hr-btn-secondary" onClick={() => setSearch('')}>Clear search</button>
              </div>
            ) : (
              Object.entries(groupedSearchResults).map(([g, list]) => {
                const meta = metaFor(g)
                const Icon = meta.icon
                const { toggles, fields } = splitByKind(list)
                return (
                  <div key={g} className="syss-section">
                    <div className="syss-section-head">
                      <span className="syss-section-icon"><Icon size={16} /></span>
                      <div>
                        <h3>{meta.label}</h3>
                        <p>{list.length} match{list.length === 1 ? '' : 'es'}</p>
                      </div>
                    </div>
                    {toggles.length > 0 && (
                      <div className="syss-toggles">
                        {toggles.map((s) => (
                          <FieldRow
                            key={s.key}
                            setting={s}
                            value={getValue(s)}
                            isModified={s.key in edited}
                            onChange={(v) => handleChange(s.key, v)}
                          />
                        ))}
                      </div>
                    )}
                    {fields.length > 0 && (
                      <div className="syss-fields">
                        {fields.map((s) => (
                          <FieldRow
                            key={s.key}
                            setting={s}
                            value={getValue(s)}
                            isModified={s.key in edited}
                            onChange={(v) => handleChange(s.key, v)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )
          ) : (
            /* Group mode */
            activeMeta && (
              <div className="syss-section">
                <div className="syss-section-head">
                  <span className="syss-section-icon"><activeMeta.icon size={16} /></span>
                  <div>
                    <h3>{activeMeta.label}</h3>
                    {activeMeta.description && <p>{activeMeta.description}</p>}
                  </div>
                </div>

                {activeGroup === 'appearance' ? (
                  <AppearancePanel
                    list={activeList}
                    getValue={getValue}
                    isEdited={(k) => k in edited}
                    onChange={handleChange}
                  />
                ) : activeGroup === 'localization' ? (
                  <LocalizationPanel
                    list={activeList}
                    getValue={getValue}
                    isEdited={(k) => k in edited}
                    onChange={handleChange}
                  />
                ) : (
                  <>
                    {activeToggles.length > 0 && (
                      <div className="syss-toggles">
                        {activeToggles.map((s) => (
                          <FieldRow
                            key={s.key}
                            setting={s}
                            value={getValue(s)}
                            isModified={s.key in edited}
                            onChange={(v) => handleChange(s.key, v)}
                          />
                        ))}
                      </div>
                    )}

                    {activeFields.length > 0 && (
                      <div className="syss-fields">
                        {activeFields.map((s) => (
                          <FieldRow
                            key={s.key}
                            setting={s}
                            value={getValue(s)}
                            isModified={s.key in edited}
                            onChange={(v) => handleChange(s.key, v)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeList.length === 0 && (
                  <div className="syss-empty-results">
                    <p>This group has no settings yet.</p>
                  </div>
                )}
              </div>
            )
          )}
        </section>
      </div>

      {/* Sticky save bar */}
      {hasChanges && (
        <div className="syss-savebar" role="region" aria-label="Unsaved changes">
          <div className="syss-savebar-info">
            <span className="syss-savebar-dot" />
            <strong>{editedCount}</strong> unsaved change{editedCount === 1 ? '' : 's'}
          </div>
          <div className="syss-savebar-actions">
            <button className="hr-btn-secondary" onClick={handleReset} disabled={saving}>
              <RotateCcw size={14} /> Discard
            </button>
            <button className="hr-btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
