import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns'

/** Dates are stored as local calendar days: 'YYYY-MM-DD'. */
export type Day = string

export const toDay = (d: Date): Day => format(d, 'yyyy-MM-dd')
export const fromDay = (d: Day): Date => parseISO(d)
export const today = (): Day => toDay(new Date())
export const plusDays = (d: Day, n: number): Day => toDay(addDays(fromDay(d), n))
export const plusMonths = (d: Day, n: number): Day => toDay(addMonths(fromDay(d), n))
/** a - b in calendar days */
export const diffDays = (a: Day, b: Day): number => differenceInCalendarDays(fromDay(a), fromDay(b))

const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export const weekdayName = (d: Day) => WEEKDAYS[fromDay(d).getDay()]
export const shortDate = (d: Day) => { const x = fromDay(d); return `${x.getDate()}/${x.getMonth() + 1}` }
export const longDate = (d: Day) => { const x = fromDay(d); return `יום ${weekdayName(d)}, ${x.getDate()} ב${MONTHS[x.getMonth()]}` }

/** Relative label: "היום", "מחר", "בעוד 3 ימים", "לפני יומיים"... */
export function relativeDay(d: Day, ref: Day = today()): string {
  const n = diffDays(d, ref)
  if (n === 0) return 'היום'
  if (n === 1) return 'מחר'
  if (n === -1) return 'אתמול'
  if (n === 2) return 'מחרתיים'
  if (n > 0) return n < 7 ? `ביום ${weekdayName(d)}` : `ב-${shortDate(d)}`
  return `לפני ${daysText(-n)}`
}

/** For "עד …": "היום", "מחר", "יום שישי", "24/11" */
export function untilDay(d: Day, ref: Day = today()): string {
  const n = diffDays(d, ref)
  if (n === 0) return 'היום'
  if (n === 1) return 'מחר'
  if (n > 1 && n < 7) return `יום ${weekdayName(d)}`
  return shortDate(d)
}

export const daysText = (n: number) => (n === 1 ? 'יום' : n === 2 ? 'יומיים' : `${n} ימים`)
