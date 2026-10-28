import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useShopping } from './store'

/** Resolves a stored photo path to a displayable URL (signed, cached) */
export function usePhotoUrl(path: string | null) {
  const { photoUrl } = useShopping()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setUrl(null)
    if (path) photoUrl(path).then(u => alive && setUrl(u)).catch(() => {})
    return () => { alive = false }
  }, [path, photoUrl])
  return url
}

export function Thumb({ path, size = 36, onClick }: { path: string; size?: number; onClick?: () => void }) {
  const url = usePhotoUrl(path)
  const img = url && <img src={url} alt="" loading="lazy" />
  // inside another button (catalog chip) it must not be a button itself
  return onClick
    ? <button className="thumb" style={{ width: size, height: size }} onClick={onClick} aria-label="הצגת תמונה" type="button">{img}</button>
    : <span className="thumb" style={{ width: size, height: size }}>{img}</span>
}

export function PhotoViewer({ path, title, onClose }: { path: string | null; title?: string; onClose: () => void }) {
  const url = usePhotoUrl(path)
  useEffect(() => {
    if (!path) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [path, onClose])
  if (!path) return null
  return createPortal(
    <div className="photo-viewer" onClick={onClose} role="dialog" aria-label={title ?? 'תמונה'}>
      {url ? <img src={url} alt={title ?? ''} /> : <div className="spinner" />}
      {title && <div className="photo-caption">{title}</div>}
    </div>,
    document.body,
  )
}
