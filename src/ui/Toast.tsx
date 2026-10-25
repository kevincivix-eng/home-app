import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastMsg { text: string; action?: { label: string; run: () => void } }
const Ctx = createContext<(m: ToastMsg) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null)
  const timer = useRef<number>()
  const show = useCallback((m: ToastMsg) => {
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 4500)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          <span>{msg.text}</span>
          {msg.action && <button onClick={() => { msg.action!.run(); setMsg(null) }}>{msg.action.label}</button>}
        </div>
      )}
    </Ctx.Provider>
  )
}
