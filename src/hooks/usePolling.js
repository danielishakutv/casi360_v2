import { useEffect, useRef } from 'react'

/**
 * Calls `callback` every `intervalMs` while the browser tab is visible.
 *
 * Designed for lightweight "near real-time" refreshes (messages, forums):
 *  • Pauses automatically when the tab is hidden (saves bandwidth/battery).
 *  • Fires once immediately when the tab becomes visible again, so coming
 *    back to the tab shows fresh data right away.
 *  • Always invokes the latest `callback` (kept in a ref) without restarting
 *    the timer on every render.
 *
 * It does NOT fire on mount by default — callers usually do their own initial
 * load. Pass `{ immediate: true }` to also fire once on start.
 *
 * @param {() => void} callback      Function to run on each tick (may be async).
 * @param {number}     intervalMs    Poll interval in ms. 0/falsey disables.
 * @param {object}     options
 * @param {boolean}    options.enabled    When false, polling is off.
 * @param {boolean}    options.immediate  Fire once as soon as polling starts.
 */
export function usePolling(callback, intervalMs = 8000, { enabled = true, immediate = false } = {}) {
  const savedCallback = useRef(callback)

  // Keep the ref pointed at the latest callback every render.
  useEffect(() => { savedCallback.current = callback })

  useEffect(() => {
    if (!enabled || !intervalMs) return

    let timer = null
    const tick = () => { if (!document.hidden) savedCallback.current?.() }
    const start = () => { if (!timer) timer = setInterval(tick, intervalMs) }
    const stop = () => { if (timer) { clearInterval(timer); timer = null } }

    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        savedCallback.current?.()
        start()
      }
    }

    if (immediate) savedCallback.current?.()
    start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs, immediate])
}
