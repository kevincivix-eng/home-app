import type { Profile } from '../modules/chores/types'

export const Avatar = ({ p, lg }: { p?: Profile; lg?: boolean }) =>
  p ? <span className={`avatar${lg ? ' lg' : ''}`} style={{ background: p.color }} aria-label={p.name}>{p.name[0]}</span> : null
