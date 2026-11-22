import { useState } from 'react'
import { Sheet } from '../../ui/Sheet'
import { useMeals } from './store'
import { SLOT_LABEL, SLOTS, WEEKS, type Dish, type Ingredient, type RecipeIngredient, type Slot } from './types'

/** A new dish for a week (or the bank, week null); with `replace`, it takes that dish's place */
export type DishDraft = Dish | { week: number | null; slot: Slot; replace?: Dish }
export type IngredientDraft = Ingredient | { week: number; section?: string }

/** Two-step delete, like the task editor */
function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return confirm
    ? <button className="action destructive primary" onClick={onDelete}>למחוק לצמיתות?</button>
    : <button className="action destructive" onClick={() => setConfirm(true)}>{label}</button>
}

/** One ingredient per line: "name: amount" (amount optional) */
const ingredientsToText = (list: RecipeIngredient[]) => list.map(i => (i.amount ? `${i.name}: ${i.amount}` : i.name)).join('\n')
const textToIngredients = (text: string): RecipeIngredient[] =>
  text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const at = l.indexOf(':')
    return at < 0 ? { name: l, amount: null } : { name: l.slice(0, at).trim(), amount: l.slice(at + 1).trim() || null }
  }).filter(i => i.name)
const textToSteps = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean)

export function DishSheet({ dish, onClose, onSaved }: { dish: DishDraft | null; onClose: () => void; onSaved?: (id: string) => void }) {
  return <Sheet open={!!dish} onClose={onClose}>{dish && <DishBody key={'id' in dish ? dish.id : 'new'} dish={dish} onClose={onClose} onSaved={onSaved} />}</Sheet>
}

function DishBody({ dish, onClose, onSaved }: { dish: DishDraft; onClose: () => void; onSaved?: (id: string) => void }) {
  const { addDish, updateDish, deleteDish, swapDish } = useMeals()
  const existing = 'id' in dish ? dish : null
  const replace = 'replace' in dish ? dish.replace : undefined
  const [title, setTitle] = useState(existing?.title ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [slot, setSlot] = useState<Slot>(dish.slot)
  const [cookTime, setCookTime] = useState(existing?.cook_time ?? '')
  const [servings, setServings] = useState(existing?.servings ?? '')
  const [ings, setIngs] = useState(ingredientsToText(existing?.ingredients ?? []))
  const [steps, setSteps] = useState((existing?.steps ?? []).join('\n'))
  const save = async () => {
    const x = {
      title: title.trim(), note: note.trim() || null, slot, cook_time: cookTime.trim() || null, servings: servings.trim() || null,
      ingredients: textToIngredients(ings), steps: textToSteps(steps),
    }
    onClose()
    if (existing) return updateDish(existing.id, x)
    const id = await addDish({ ...x, week: replace ? null : dish.week })
    // the new dish was created in the bank; swapping puts it in the replaced dish's place
    if (replace) await swapDish(replace, { ...x, id, week: null, sort: 0, created_at: '' })
    onSaved?.(id)
  }
  const sheetTitle = existing ? 'עריכת מנה' : replace ? `במקום "${replace.title}"` : dish.week ? 'מנה חדשה' : 'מנה חדשה למאגר'
  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sheetTitle}</div>
        <button className="link-btn bold" disabled={!title.trim()} onClick={save}>{existing ? 'שמירה' : 'הוספה'}</button>
      </div>
      <div className="list section">
        <div className="field"><input autoFocus={!existing} maxLength={120} placeholder="שם המנה" value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="field"><label>זמן</label><input maxLength={60} placeholder="למשל: 45 דק׳" value={cookTime} onChange={e => setCookTime(e.target.value)} /></div>
        <div className="field"><label>כמות</label><input maxLength={60} placeholder="למשל: 6 מנות" value={servings} onChange={e => setServings(e.target.value)} /></div>
      </div>
      {!replace && (
        <div className="section">
          <div className="section-header">מתי מבשלים</div>
          <div className="seg">
            {SLOTS.map(s => <button key={s} className={s === slot ? 'on' : ''} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>)}
          </div>
        </div>
      )}
      <div className="section">
        <div className="section-header">רכיבים – שורה לכל רכיב, "שם: כמות"</div>
        <div className="list suggestion-compose">
          <textarea dir="auto" rows={6} placeholder={'בצל: 2\nשום: 3 שיניים\nמלח ופלפל'} value={ings} onChange={e => setIngs(e.target.value)} />
        </div>
      </div>
      <div className="section">
        <div className="section-header">שלבי הכנה – שורה לכל שלב</div>
        <div className="list suggestion-compose">
          <textarea dir="auto" rows={8} placeholder={'מחממים תנור ל־180 מעלות.\nקוצצים את הבצל…'} value={steps} onChange={e => setSteps(e.target.value)} />
        </div>
      </div>
      <div className="section">
        <div className="section-header">טיפ (לא חובה)</div>
        <div className="list suggestion-compose">
          <textarea dir="auto" rows={2} maxLength={400} placeholder="למשל: מפרישים לקטנה לפני החריף" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      </div>
      {existing && <div className="action-group"><DeleteButton label="מחיקת המנה" onDelete={() => { deleteDish(existing.id); onClose() }} /></div>}
    </>
  )
}

/** Pick a dish from the bank to take `current`'s place */
export function SwapSheet({ current, onClose, onSwapped, onNew, onAsk }: {
  current: Dish | null
  onClose: () => void
  onSwapped: (replacement: Dish) => void
  onNew: (d: Dish) => void
  onAsk: (d: Dish) => void
}) {
  const { dishes, swapDish } = useMeals()
  const bank = dishes.filter(d => d.week === null)
  // dishes cooked at the same point in the week first
  const sorted = current ? [...bank.filter(d => d.slot === current.slot), ...bank.filter(d => d.slot !== current.slot)] : []
  return (
    <Sheet open={!!current} onClose={onClose}>
      {current && (
        <>
          <div className="sheet-title">החלפת מנה</div>
          <div className="sheet-sub">במקום "{current.title}". המנה שתוחלף תישמר במאגר, ואפשר להחזיר אותה.</div>
          {sorted.length > 0 && (
            <div className="list section" style={{ maxHeight: '42vh', overflowY: 'auto' }}>
              {sorted.map(d => (
                <button key={d.id} className="cell plain" onClick={() => { swapDish(current, d); onClose(); onSwapped(d) }}>
                  <div className="cell-body">
                    <div className="meal-title">{d.title}</div>
                    <div className="meal-note">{[d.cook_time, SLOT_LABEL[d.slot]].filter(Boolean).join(' · ')}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="action-group">
            <button className="action" onClick={() => { onClose(); onNew(current) }}>כתיבת מנה אחרת משלי</button>
            <button className="action" onClick={() => { onClose(); onAsk(current) }}>לבקש הצעה מ-Claude</button>
          </div>
          <div className="action-group"><button className="action primary" onClick={onClose}>ביטול</button></div>
        </>
      )}
    </Sheet>
  )
}

/** Put a bank dish on the menu */
export function PlaceSheet({ dish, onClose }: { dish: Dish | null; onClose: () => void }) {
  const { updateDish, currentWeek } = useMeals()
  const [week, setWeek] = useState<number>(currentWeek)
  const [slot, setSlot] = useState<Slot | null>(null)
  if (!dish) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const s = slot ?? dish.slot
  return (
    <Sheet open onClose={onClose}>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">הוספה לתפריט</div>
        <button className="link-btn bold" onClick={() => { updateDish(dish.id, { week, slot: s }); onClose() }}>הוספה</button>
      </div>
      <div className="section">
        <div className="section-header">באיזה שבוע</div>
        <div className="seg">{WEEKS.map(w => <button key={w} className={w === week ? 'on' : ''} onClick={() => setWeek(w)}>שבוע {w}</button>)}</div>
      </div>
      <div className="section">
        <div className="section-header">מתי מבשלים</div>
        <div className="seg">{SLOTS.map(x => <button key={x} className={x === s ? 'on' : ''} onClick={() => setSlot(x)}>{SLOT_LABEL[x]}</button>)}</div>
      </div>
    </Sheet>
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
