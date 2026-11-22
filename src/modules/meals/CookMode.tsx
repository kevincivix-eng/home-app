import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowIcon, CheckIcon, ClearIcon } from '../../ui/icons'
import type { Dish } from './types'

/** "10 דקות", "3–4 דקות", "20 דק׳" → minutes (the upper bound of a range) */
export function stepMinutes(step: string): number | null {
  const m = step.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*דק/)
  return m ? Number(m[2] ?? m[1]) : null
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Short beep through Web Audio; the context is created on the tap that starts the timer, so iOS allows it */
function beep(ctx: AudioContext) {
  for (const at of [0, 0.35, 0.7]) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.25, ctx.currentTime + at)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.3)
    o.connect(g).connect(ctx.destination)
    o.start(ctx.currentTime + at)
    o.stop(ctx.currentTime + at + 0.3)
  }
}

/** Full-screen, one step at a time, keeps the screen awake. Step -1 is gathering the ingredients. */
export function CookMode({ dish, onClose }: { dish: Dish; onClose: () => void }) {
  const [step, setStep] = useState(dish.ingredients.length ? -1 : 0)
  const [have, setHave] = useState<Set<number>>(new Set())
  const [timer, setTimer] = useState<{ endsAt: number; label: string } | null>(null)
  const [now, setNow] = useState(Date.now())
  const [rang, setRang] = useState(false)
  const audio = useRef<AudioContext | null>(null)

  // keep the screen on while cooking (re-acquired when the app comes back to the foreground)
  useEffect(() => {
    let lock: { release(): Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }
    const acquire = async () => { try { lock = await nav.wakeLock?.request('screen') ?? null } catch { /* not supported */ } }
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => { document.removeEventListener('visibilitychange', onVisible); lock?.release().catch(() => {}) }
  }, [])

  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [timer])

  const left = timer ? Math.max(0, Math.round((timer.endsAt - now) / 1000)) : 0
  useEffect(() => {
    if (timer && left === 0 && !rang) {
      setRang(true)
      if (audio.current) beep(audio.current)
      navigator.vibrate?.([300, 150, 300])
    }
  }, [timer, left, rang])

  const startTimer = (minutes: number) => {
    try { audio.current ??= new AudioContext() } catch { /* no audio */ }
    setRang(false)
    setNow(Date.now())
    setTimer({ endsAt: Date.now() + minutes * 60_000, label: `שלב ${step + 1}` })
  }

  const total = dish.steps.length
  const text = step >= 0 ? dish.steps[step] : null
  const minutes = text ? stepMinutes(text) : null
  const last = step === total - 1

  return createPortal(
    <div className="cook" role="dialog" aria-modal="true" aria-label={`בישול: ${dish.title}`}>
      <div className="cook-top">
        <button className="icon-btn" aria-label="סגירה" onClick={onClose}><ClearIcon /></button>
        <div className="cook-dish">{dish.title}</div>
        {timer && (
          <button className={`cook-timer${left === 0 ? ' done' : ''}`} onClick={() => setTimer(null)} aria-label="ביטול הטיימר">
            ⏱ {left === 0 ? 'הזמן נגמר!' : fmt(left)}
          </button>
        )}
      </div>

      <div className="cook-progress"><div style={{ width: `${((step + 1) / Math.max(total, 1)) * 100}%` }} /></div>

      <div className="cook-body">
        {step === -1 ? (
          <>
            <div className="cook-label">לפני שמתחילים · מוציאים הכל</div>
            <div className="cook-ings">
              {dish.ingredients.map((i, n) => (
                <button key={n} className={`cook-ing${have.has(n) ? ' have' : ''}`} onClick={() => setHave(s => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x })}>
                  <span className={`check${have.has(n) ? ' on' : ''}`}>{have.has(n) && <CheckIcon />}</span>
                  <span className="cook-ing-name">{i.name}</span>
                  {i.amount && <span className="cook-ing-amount">{i.amount}</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="cook-label">שלב {step + 1} מתוך {total}</div>
            <div className="cook-step">{text}</div>
            {minutes && (
              <button className="btn secondary cook-timer-btn" onClick={() => startTimer(minutes)}>⏱ טיימר ל־{minutes} דקות</button>
            )}
          </>
        )}
      </div>

      <div className="cook-nav">
        <button className="btn secondary" disabled={step === (dish.ingredients.length ? -1 : 0)} onClick={() => setStep(step - 1)}>
          <ArrowIcon dir="prev" /> הקודם
        </button>
        <button className="btn" onClick={() => (last ? onClose() : setStep(step + 1))}>
          {last ? 'בתיאבון! 🍽' : step === -1 ? 'מתחילים' : 'הבא'} {!last && <ArrowIcon dir="next" />}
        </button>
      </div>
    </div>,
    document.body,
  )
}
