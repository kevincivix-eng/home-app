import { useState } from 'react'
import { Sheet } from '../../ui/Sheet'
import { useChores } from '../chores/store'
import { CATEGORIES } from './categories'
import { useShopping } from './store'
import type { ShoppingItem } from './types'

export function ItemSheet({ item, onClose }: { item: ShoppingItem | null; onClose: () => void }) {
  return (
    <Sheet open={!!item} onClose={onClose}>
      {item && <ItemBody key={item.id} item={item} onClose={onClose} />}
    </Sheet>
  )
}

function ItemBody({ item, onClose }: { item: ShoppingItem; onClose: () => void }) {
  const { updateItem, setNeeded, deleteItem } = useShopping()
  const [name, setName] = useState(item.name)
  const [qty, setQty] = useState(item.quantity ?? 1)
  const [note, setNote] = useState(item.note ?? '')
  const [category, setCategory] = useState(item.category)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async () => {
    await updateItem(item.id, { name: name.trim(), quantity: qty > 1 ? qty : null, note: note.trim() || null, category })
    onClose()
  }

  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">מוצר</div>
        <button className="link-btn bold" disabled={!name.trim()} onClick={save}>שמור</button>
      </div>

      <div className="list section">
        <div className="field"><input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="שם המוצר" /></div>
        <div className="field">
          <label>כמות</label>
          <div className="stepper">
            <button aria-label="פחות" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>−</button>
            <span>{qty}</span>
            <button aria-label="עוד" onClick={() => setQty(Math.min(999, qty + 1))}>+</button>
          </div>
        </div>
        <div className="field"><input value={note} onChange={e => setNote(e.target.value)} maxLength={120} placeholder="הערה (לא חובה) – למשל: לא בשלות" /></div>
      </div>

      <div className="section">
        <div className="section-header">מחלקה</div>
        <div className="list chips">
          {CATEGORIES.map(c => <button key={c} className={`chip${c === category ? ' on' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
      </div>

      {item.times_bought > 0 && (
        <div className="section-footer" style={{ marginBottom: 16 }}>
          נקנה {item.times_bought} פעמים{item.last_bought_at ? ` · לאחרונה ב-${new Date(item.last_bought_at).toLocaleDateString('he-IL')}` : ''}
        </div>
      )}

      <div className="action-group">
        <button className="action" onClick={() => { setNeeded(item, !item.needed); onClose() }}>
          {item.needed ? 'הסר מהרשימה (נשאר בסל)' : 'הוסף לרשימה'}
        </button>
        {confirmDelete
          ? <button className="action destructive primary" onClick={() => { deleteItem(item.id); onClose() }}>למחוק את המוצר מהסל לגמרי?</button>
          : <button className="action destructive" onClick={() => setConfirmDelete(true)}>מחיקת המוצר</button>}
      </div>
    </>
  )
}

const ICONS = ['🛒', '💊', '🏠', '🥦', '🧴', '🧹', '🐶', '👶', '🎁', '🛠️', '🍷', '📦']

export function ListSheet({ mode, onClose }: { mode: 'new' | 'edit' | null; onClose: () => void }) {
  return (
    <Sheet open={!!mode} onClose={onClose}>
      {mode && <ListBody key={mode} mode={mode} onClose={onClose} />}
    </Sheet>
  )
}

function ListBody({ mode, onClose }: { mode: 'new' | 'edit'; onClose: () => void }) {
  const { activeList, addList, updateList, deleteList, items, visibleLists } = useShopping()
  const { me } = useChores()
  const editing = mode === 'edit' ? activeList : undefined
  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? '🛒')
  const [owner, setOwner] = useState<string | null>(editing?.owner_id ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const count = editing ? items.filter(i => i.list_id === editing.id).length : 0

  const save = async () => {
    const l = { name: name.trim(), icon, owner_id: owner }
    if (editing) await updateList(editing.id, l)
    else await addList(l)
    onClose()
  }

  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">{editing ? 'עריכת רשימה' : 'רשימה חדשה'}</div>
        <button className="link-btn bold" disabled={!name.trim()} onClick={save}>{editing ? 'שמור' : 'צור'}</button>
      </div>

      <div className="list section">
        <div className="field"><input autoFocus={!editing} value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="שם הרשימה – למשל: שוק, טבע, IKEA" /></div>
      </div>

      <div className="section">
        <div className="section-header">אייקון</div>
        <div className="list chips icon-chips">
          {ICONS.map(i => <button key={i} className={`chip${i === icon ? ' on' : ''}`} onClick={() => setIcon(i)}>{i}</button>)}
        </div>
      </div>

      <div className="section">
        <div className="section-header">של מי</div>
        <div className="seg">
          <button className={owner === null ? 'on' : ''} onClick={() => setOwner(null)}>משותפת לבית</button>
          {me && <button className={owner === me.id ? 'on' : ''} onClick={() => setOwner(me.id)}>אישית שלי</button>}
        </div>
      </div>

      {editing && visibleLists.length > 1 && (
        <div className="action-group">
          {confirmDelete
            ? <button className="action destructive primary" onClick={() => { deleteList(editing.id); onClose() }}>למחוק את "{editing.name}" ו-{count} מוצרים?</button>
            : <button className="action destructive" onClick={() => setConfirmDelete(true)}>מחיקת הרשימה</button>}
        </div>
      )}
    </>
  )
}
