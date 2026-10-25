import { useEffect, useState } from 'react'
import { today } from './dates'

/** Current day, updated when the date rolls over or the app returns to the foreground */
export function useToday() {
  const [day, setDay] = useState(today)
  useEffect(() => {
    const tick = () => setDay(today())
    const id = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [])
  return day
}
