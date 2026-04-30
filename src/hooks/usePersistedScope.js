import { useState, useEffect } from 'react'

/**
 * Boolean-state hook that persists to localStorage. Defaults to "mine"
 * (true) so a user who has never toggled sees their personal scope first.
 *
 * Falls back to in-memory state if localStorage is unavailable
 * (Safari private mode, disabled storage, etc.).
 */
export function usePersistedScope(key, defaultMine = true) {
  const [mine, setMine] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return defaultMine
      return raw === '1'
    } catch {
      return defaultMine
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, mine ? '1' : '0')
    } catch {
      /* ignore — stay with in-memory state */
    }
  }, [key, mine])

  return [mine, setMine]
}
