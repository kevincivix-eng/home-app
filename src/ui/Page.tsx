import { useState, type ReactNode } from 'react'

/**
 * iOS-style screen: a large title that collapses into a centered inline title
 * in a translucent bar on scroll, with round glass buttons at the top corners.
 */
export function Page({ title, subtitle, actions, children }: {
  title: string
  subtitle?: ReactNode
  /** round glass buttons, shown at the top-left (trailing side in RTL) */
  actions?: ReactNode
  children: ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)
  return (
    <div className="screen" onScroll={e => setScrolled(e.currentTarget.scrollTop > 44)}>
      <header className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="navbar-title" aria-hidden={!scrolled}>{title}</div>
        <div className="navbar-actions">{actions}</div>
      </header>
      <div className="title-block">
        <h1 className="large-title">{title}</h1>
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

export function GlassButton({ label, onClick, children, tint }: { label: string; onClick: () => void; children: ReactNode; tint?: boolean }) {
  return (
    <button className={`glass-btn${tint ? ' tint' : ''}`} aria-label={label} onClick={onClick}>{children}</button>
  )
}
