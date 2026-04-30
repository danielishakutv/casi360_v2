import { User, Users } from 'lucide-react'

/**
 * Two-option scope toggle: "Mine" vs "All organisation".
 *
 * Renders nothing for users who don't have the matching `*.view_all`
 * permission — those users are silently restricted to the personal scope
 * by the backend, so a toggle would be misleading.
 *
 * Props:
 *   value       — true when "Mine" is selected
 *   onChange    — fires with the new boolean (true=mine, false=all)
 *   canViewAll  — true when the current user holds the relevant view_all permission
 *   className   — optional extra classes for layout tweaks
 */
export default function MineToggle({ value, onChange, canViewAll, className = '' }) {
  if (!canViewAll) return null

  return (
    <div className={`mine-toggle ${className}`.trim()} role="group" aria-label="Scope filter">
      <button
        type="button"
        className={`mine-toggle-option ${value ? 'active' : ''}`}
        onClick={() => onChange(true)}
        aria-pressed={value}
      >
        <User size={13} />
        <span>Mine</span>
      </button>
      <button
        type="button"
        className={`mine-toggle-option ${!value ? 'active' : ''}`}
        onClick={() => onChange(false)}
        aria-pressed={!value}
      >
        <Users size={13} />
        <span>All</span>
      </button>
    </div>
  )
}
