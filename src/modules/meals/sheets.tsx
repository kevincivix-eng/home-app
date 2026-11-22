import { useState } from 'react'
import { Sheet } from '../../ui/Sheet'
import { useMeals } from './store'
import { SLOT_LABEL, SLOTS, type Dish, type Ingredient, type Slot } from './types'

export type DishDraft = Dish | { week: number; slot: Slot }
export type IngredientDraft = Ingredient | { week: number; section?: string }

/** Two-step delete, like the task editor */
function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return confirm
    ? <button className="action destructive primary" onClick={onDelete}>למחוק לצמיתות?</button>
    : <button className="action destructive" onClick={() => setConfirm(true)}>{label}</button>
}

export function DishSheet({ dish, onClose }: { dish: DishDraft | null; onClose: () => void }) {
  return <Sheet open={!!dish} onClose={onClose}>{dish && <DishBody key={'id' in dish ? dish.id : 'new'} dish={dish} onClose={onClose} />}</Sheet>
}

function DishBody({ dish, onClose }: { dish: DishDraft; onClose: () => void }) {
  const { addDish, updateDish, deleteDish } = useMeals()
  const existing = 'id' in dish ? dish : null
  const [title, setTitle] = useState(existing?.title ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [slot, setSlot] = useState<Slot>(dish.slot)
  const save = () => {
    const x = { title: title.trim(), note: note.trim() || null, slot }
    if (existing) updateDish(existing.id, x)
    else addDish({ ...x, week: dish.week })
    onClose()
  }
  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">{existing ? 'עריכת מנה' : 'מנה חדשה'}</div>
        <button className="link-btn bold" disabled={!title.trim()} onClick={save}>{existing ? 'שמירה' : 'הוספה'}</button>
      </div>
      <div className="list section">
        <div className="field"><input autoFocus={!existing} maxLength={120} placeholder="שם המנה" value={title} onChange={e => setTitle(e.target.value)} /></div>
      </div>
      <div className="section">
        <div className="section-header">מתי מבשלים</div>
        <div className="seg">
          {SLOTS.map(s => <button key={s} className={s === slot ? 'on' : ''} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>)}
        </div>
      </div>
      <div className="section">
        <div className="section-header">איך זה עובד אצלנו (לא חובה)</div>
        <div className="list suggestion-compose">
          <textarea dir="auto" rows={3} maxLength={400} placeholder="למשל: מפרישים לקטנה לפני החריף" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>
      {existing && <div className="action-group"><DeleteButton label="מחיקת המנה" onDelete={() => { deleteDish(existing.id); onClose() }} /></div>}
    </>
  )
}

export function IngredientSheet({ ingredient, onClose }: { ingredient: IngredientDraft | null; onClose: () => void }) {
  return <Sheet open={!!ingredient} onClose={onClose}>{ingredient && <IngredientBody key={'id' in ingredient ? ingredient.id : 'new'} ing={ingredient} onClose={onClose} />}</Sheet>
}

function IngredientBody({ ing, onClose }: { ing: IngredientDraft; onClose: () => void }) {
  const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useMeals()
  const existing = 'id' in ing ? ing : null
  const sections = [...new Set(ingredients.filter(i => i.week === ing.week).map(i => i.section))]
  const [name, setName] = useState(existing?.name ?? '')
  const [amount, setAmount] = useState(existing?.amount ?? '')
  const [section, setSection] = useState(ing.section ?? sections[0] ?? '')
  const [newSection, setNewSection] = useState<string | null>(sections.length ? null : '')
  const finalSection = (newSection?.trim() || section).trim()
  const save = () => {
    const x = { name: name.trim(), amount: amount.trim() || null, section: finalSection }
    if (existing) updateIngredient(existing.id, x)
    else addIngredient({ ...x, week: ing.week })
    onClose()
  }
  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">{existing ? 'עריכת רכיב' : 'רכיב חדש'}</div>
        <button className="link-btn bold" disabled={!name.trim() || !finalSection} onClick={save}>{existing ? 'שמירה' : 'הוספה'}</button>
      </div>
      <div className="list section">
        <div className="field"><input autoFocus={!existing} maxLength={80} placeholder="שם הרכיב" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><input maxLength={80} placeholder="כמות (לא חובה), למשל: 700 גרם" value={amount} onChange={e => setAmount(e.target.value)} /></div>
      </div>
      <div className="section">
        <div className="section-header">מחלקה ברשימה</div>
        <div className="list chips">
          {sections.map(s => (
            <button key={s} className={`chip${s === section && newSection === null ? ' on' : ''}`} onClick={() => { setSection(s); setNewSection(null) }}>{s}</button>
          ))}
          {newSection === null
            ? <button className="chip" onClick={() => setNewSection('')}>+ מחלקה חדשה</button>
            : <input className="chip-input" maxLength={40} placeholder="למשל: קצבייה" aria-label="שם המחלקה" value={newSection} onChange={e => setNewSection(e.target.value)} />}
        </div>
      </div>
      {existing && <div className="action-group"><DeleteButton label="מחיקת הרכיב" onDelete={() => { deleteIngredient(existing.id); onClose() }} /></div>}
    </>
  )
}

export function WeekTitleSheet({ week, onClose }: { week: number | null; onClose: () => void }) {
  return <Sheet open={week !== null} onClose={onClose}>{week !== null && <WeekTitleBody key={week} week={week} onClose={onClose} />}</Sheet>
}

function WeekTitleBody({ week, onClose }: { week: number; onClose: () => void }) {
  const { weekTitle, renameWeek } = useMeals()
  const [title, setTitle] = useState(weekTitle(week))
  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">שם לשבוע {week}</div>
        <button className="link-btn bold" onClick={() => { renameWeek(week, title); onClose() }}>שמירה</button>
      </div>
      <div className="list section">
        <div className="field"><input autoFocus maxLength={60} placeholder="למשל: איטלקי מנחם" value={title} onChange={e => setTitle(e.target.value)} /></div>
      </div>
    </>
  )
}
