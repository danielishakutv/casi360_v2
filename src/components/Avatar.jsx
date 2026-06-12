/**
 * Avatar — circular initials avatar with a deterministic gradient background.
 *
 * Pure presentational, dependency-free. Derives up to two initials from a
 * name and picks one of a fixed palette of gradients based on the name's
 * character codes so the same person always gets the same colour.
 *
 * @param {string} name   Display name (initials derived from first two words)
 * @param {'sm'|'md'} size  sm = 32px (replies / list rows), md = 40px (posts / threads)
 * @param {string} [title] Optional tooltip; defaults to the name
 */
const GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #2563eb, #06b6d4)',
  'linear-gradient(135deg, #10b981, #34d399)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #0ea5e9, #6366f1)',
]

function initialsFrom(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const first = words[0]?.[0] || ''
  const second = words.length > 1 ? words[1]?.[0] || '' : ''
  return (first + second).toUpperCase() || '?'
}

function gradientFor(name) {
  const key = String(name || '?')
  let sum = 0
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i)
  return GRADIENTS[sum % GRADIENTS.length]
}

export default function Avatar({ name, size = 'md', title }) {
  return (
    <span
      className={`comm-avatar comm-avatar-${size}`}
      style={{ backgroundImage: gradientFor(name) }}
      title={title || name || ''}
      aria-hidden="true"
    >
      {initialsFrom(name)}
    </span>
  )
}
