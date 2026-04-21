import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [showBackOnline, setShowBackOnline] = useState(false)

  useEffect(() => {
    let timer

    function handleOnline() {
      setIsOnline(true)
      setShowBackOnline(true)
      timer = setTimeout(() => setShowBackOnline(false), 3000)
    }
    function handleOffline() {
      clearTimeout(timer)
      setIsOnline(false)
      setShowBackOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showBackOnline) return null

  return (
    <div className={`offline-banner ${isOnline ? 'back-online' : ''}`} role="status" aria-live="polite">
      {isOnline
        ? <><Wifi size={14} /> Back online</>
        : <><WifiOff size={14} /> No internet connection — some features may not work</>
      }
    </div>
  )
}
