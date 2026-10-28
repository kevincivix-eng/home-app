// Original line icons drawn in the spirit of iOS symbols (rounded caps, 1.8 stroke).
// Tab icons have an outline and a filled variant for the selected state.
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const CheckIcon = () => <svg viewBox="0 0 24 24" {...s} strokeWidth={3}><path d="M5.5 12.5l4 4L18.5 7.5" /></svg>
export const PlusIcon = () => <svg viewBox="0 0 24 24" {...s} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg>
export const ChevIcon = () => <svg className="chev" viewBox="0 0 8 14" {...s} strokeWidth={2.2}><path d="M1.5 1.5L6.5 7l-5 5.5" /></svg>
export const ArrowIcon = ({ dir }: { dir: 'prev' | 'next' }) => (
  // RTL: "previous" points right
  <svg viewBox="0 0 24 24" {...s} strokeWidth={2.4}>{dir === 'prev' ? <path d="M9.5 5l7 7-7 7" /> : <path d="M14.5 5l-7 7 7 7" />}</svg>
)
export const GripIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
)

const t = { ...s, strokeWidth: 1.8 }

export const TodayTab = ({ on }: { on?: boolean }) => (
  <svg viewBox="0 0 28 28" {...t}>
    {on
      ? <><rect x="3.5" y="3.5" width="21" height="21" rx="6.5" fill="currentColor" /><path d="M9 14.5l3.2 3.2L19 10.8" stroke="var(--tab-on-fill)" strokeWidth={2.4} /></>
      : <><rect x="3.5" y="3.5" width="21" height="21" rx="6.5" /><path d="M9 14.5l3.2 3.2L19 10.8" /></>}
  </svg>
)
export const CalendarTab = ({ on }: { on?: boolean }) => (
  <svg viewBox="0 0 28 28" {...t}>
    {on
      ? <><path d="M3.5 11.5V9.5a4 4 0 0 1 4-4h13a4 4 0 0 1 4 4v2z" fill="currentColor" /><path d="M3.5 11.5h21v9a4 4 0 0 1-4 4h-13a4 4 0 0 1-4-4z" fill="currentColor" opacity=".35" stroke="none" /><rect x="3.5" y="5.5" width="21" height="19" rx="4" /><path d="M9 3v4.5M19 3v4.5" /></>
      : <><rect x="3.5" y="5.5" width="21" height="19" rx="4" /><path d="M3.5 11.5h21M9 3v4.5M19 3v4.5" /></>}
  </svg>
)
export const StatsTab = ({ on }: { on?: boolean }) => (
  <svg viewBox="0 0 28 28" {...t} strokeWidth={on ? 3.4 : 2.4}><path d="M6 23v-7M11.3 23V7M16.6 23v-9M22 23V11" /></svg>
)
export const SettingsTab = ({ on }: { on?: boolean }) => (
  <svg viewBox="0 0 28 28" {...t}>
    <path d="M5 8.5h18M5 14h18M5 19.5h18" />
    <circle cx="10" cy="8.5" r="2.6" fill={on ? 'currentColor' : 'var(--tab-bg)'} />
    <circle cx="18" cy="14" r="2.6" fill={on ? 'currentColor' : 'var(--tab-bg)'} />
    <circle cx="12" cy="19.5" r="2.6" fill={on ? 'currentColor' : 'var(--tab-bg)'} />
  </svg>
)

export const CartTab = ({ on }: { on?: boolean }) => (
  <svg viewBox="0 0 28 28" {...t}>
    <path d="M3.5 4.5h3l2.6 13h12.4l2.5-9.5H8" fill={on ? 'currentColor' : 'none'} fillOpacity={on ? 0.35 : 0} />
    <path d="M3.5 4.5h3l2.6 13h12.4l2.5-9.5H8" />
    <circle cx="11" cy="22.5" r="1.8" fill="currentColor" /><circle cx="20" cy="22.5" r="1.8" fill="currentColor" />
  </svg>
)
export const SearchIcon = () => <svg viewBox="0 0 24 24" {...s} strokeWidth={2.2}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L20 20" /></svg>
export const ClearIcon = () => (
  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="var(--card)" strokeWidth={2} strokeLinecap="round" /></svg>
)
export const MinusIcon = () => <svg viewBox="0 0 24 24" {...s} strokeWidth={2.4}><path d="M6 12h12" /></svg>
export const MoreIcon = () => <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18.5" cy="12" r="2" /></svg>
