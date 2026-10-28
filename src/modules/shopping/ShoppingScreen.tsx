import { useRef, useState } from 'react'
import { CheckIcon, ClearIcon, MinusIcon, MoreIcon, PlusIcon, SearchIcon } from '../../ui/icons'
import { GlassButton, Page } from '../../ui/Page'
import { useToast } from '../../ui/Toast'
import { categoryRank, matches, sameName } from './categories'
import { PhotoViewer, Thumb } from './Photo'
import { ItemSheet, ListSheet } from './sheets'
import { useShopping } from './store'
import type { ShoppingItem } from './types'

/** Groups items by department, in walking order */
function byCategory(items: ShoppingItem[]) {
  const groups = new Map<string, ShoppingItem[]>()
  ;[...items]
    .sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.name.localeCompare(b.name, 'he'))
    .forEach(i => groups.set(i.category, [...(groups.get(i.category) ?? []), i]))
  return [...groups.entries()]
}

export function ShoppingScreen() {
  const shop = useShopping()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [listSheet, setListSheet] = useState<'new' | 'edit' | null>(null)
  const [viewing, setViewing] = useState<ShoppingItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const list = shop.activeList

  if (!list) {
    return (
      <Page title="קניות">
        {!shop.loading && (
          <div className="empty"><div className="big">🛒</div><p>אין עדיין רשימות</p>
            <button className="btn" onClick={() => setListSheet('new')}>רשימה חדשה</button></div>
        )}
        <ListSheet mode={listSheet} onClose={() => setListSheet(null)} />
      </Page>
    )
  }

  const items = shop.items.filter(i => i.list_id === list.id)
  const q = query.trim()
  const filtered = q ? items.filter(i => matches(i.name, q)) : items
  const toBuy = filtered.filter(i => i.needed && !i.in_cart)
  const inCart = filtered.filter(i => i.needed && i.in_cart)
  const catalog = filtered.filter(i => !i.needed)
  const exact = q && items.some(i => sameName(i.name, q))
  const neededCount = items.filter(i => i.needed && !i.in_cart).length
  const cartCount = items.filter(i => i.needed && i.in_cart).length

  const add = async (name: string) => {
    await shop.addByName(list.id, name)
    setQuery('')
    inputRef.current?.focus()
  }
  const submit = () => {
    if (!q) return
    // Enter adds the exact match, else the single search hit, else a new product
    const hit = items.find(i => sameName(i.name, q)) ?? (catalog.length === 1 && toBuy.length === 0 ? catalog[0] : undefined)
    add(hit ? hit.name : q)
  }
  const finish = async () => {
    const n = await shop.finishShopping(list.id)
    toast({ text: `🎉 סיימתם קנייה · ${n} מוצרים חזרו לסל` })
  }

  return (
    <Page
      title={list.name}
      subtitle={neededCount || cartCount ? `${neededCount} לקנייה${cartCount ? ` · ${cartCount} בעגלה` : ''}` : 'הרשימה ריקה'}
      actions={<GlassButton label="אפשרויות רשימה" onClick={() => setListSheet('edit')}><MoreIcon /></GlassButton>}
    >
      <div className="list-switcher" role="tablist">
        {shop.visibleLists.map(l => {
          const n = shop.items.filter(i => i.list_id === l.id && i.needed && !i.in_cart).length
          return (
            <button key={l.id} role="tab" aria-selected={l.id === list.id} className={`chip${l.id === list.id ? ' on' : ''}`} onClick={() => { shop.setActiveList(l.id); setQuery('') }}>
              {l.icon} {l.name}{l.owner_id ? ' · אישית' : ''}{n > 0 && <span className="chip-count">{n}</span>}
            </button>
          )
        })}
        <button className="chip" aria-label="רשימה חדשה" onClick={() => setListSheet('new')}><PlusIcon /></button>
      </div>

      <form className="search" onSubmit={e => { e.preventDefault(); submit() }}>
        <SearchIcon />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="חיפוש או הוספת מוצר"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
        />
        {query && <button type="button" className="search-clear" aria-label="ניקוי" onClick={() => { setQuery(''); inputRef.current?.focus() }}><ClearIcon /></button>}
      </form>

      {q && !exact && (
        <div className="list section">
          <button className="cell plain add-row" onClick={() => add(q)}>
            <span className="add-circle"><PlusIcon /></span>
            <div className="cell-body"><div className="cell-title">הוספת "{q}"</div></div>
          </button>
        </div>
      )}

      {(toBuy.length > 0 || inCart.length > 0) && (
        <div className="section">
          <div className="section-header big">לקנייה <span className="count">{toBuy.length}</span></div>
          {byCategory(toBuy).map(([cat, list]) => (
            <div key={cat} className="cat-group">
              <div className="section-header">{cat}</div>
              <div className="list">{list.map(i => <NeededRow key={i.id} item={i} onOpen={() => setEditingItem(i)} onPhoto={() => setViewing(i)} />)}</div>
            </div>
          ))}
          {inCart.length > 0 && (
            <div className="cat-group">
              <div className="section-header">בעגלה · {inCart.length}</div>
              <div className="list">{inCart.map(i => <NeededRow key={i.id} item={i} onOpen={() => setEditingItem(i)} onPhoto={() => setViewing(i)} />)}</div>
              {!q && <button className="btn finish-btn" onClick={finish}>סיימתי קנייה · {cartCount}</button>}
            </div>
          )}
        </div>
      )}

      {catalog.length > 0 && (
        <div className="section">
          <div className="section-header big">סל המוצרים <span className="count">{catalog.length}</span></div>
          <div className="section-footer" style={{ margin: '-4px 4px 12px' }}>לחיצה מוסיפה לרשימה · לחיצה ארוכה לעריכה</div>
          {byCategory(catalog).map(([cat, list]) => (
            <div key={cat} className="cat-group">
              <div className="section-header">{cat}</div>
              <div className="catalog">
                {list.map(i => <CatalogChip key={i.id} item={i} onAdd={() => add(i.name)} onEdit={() => setEditingItem(i)} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && !q && (
        <div className="empty"><div className="big">{list.icon}</div>
          <p>הקלידו מוצר בשורת החיפוש כדי להוסיף אותו.<br />כל מוצר שתוסיפו יישמר בסל המוצרים לפעם הבאה.</p></div>
      )}

      <ItemSheet item={editingItem && shop.items.find(i => i.id === editingItem.id) || null} onClose={() => setEditingItem(null)} />
      <ListSheet mode={listSheet} onClose={() => setListSheet(null)} />
      <PhotoViewer path={viewing?.image_path ?? null} title={viewing?.name} onClose={() => setViewing(null)} />
    </Page>
  )
}

function NeededRow({ item, onOpen, onPhoto }: { item: ShoppingItem; onOpen: () => void; onPhoto: () => void }) {
  const { toggleCart, setNeeded } = useShopping()
  return (
    <div className={`cell${item.in_cart ? ' in-cart' : ''}`}>
      <button className={`check${item.in_cart ? ' on' : ''}`} aria-label={item.in_cart ? `החזר "${item.name}" מהעגלה` : `"${item.name}" בעגלה`} onClick={() => toggleCart(item)}>
        {item.in_cart && <CheckIcon />}
      </button>
      {item.image_path && <Thumb path={item.image_path} onClick={onPhoto} />}
      <button className="cell-body" onClick={onOpen} style={{ textAlign: 'start' }}>
        <div className="cell-title">
          {item.name}{item.quantity && item.quantity > 1 ? <span className="qty"> ×{item.quantity}</span> : null}
        </div>
        {item.note && <div className="cell-sub">{item.note}</div>}
      </button>
      {!item.in_cart && (
        <button className="remove-btn" aria-label={`הסר "${item.name}" מהרשימה`} onClick={() => setNeeded(item, false)}><MinusIcon /></button>
      )}
    </div>
  )
}

function CatalogChip({ item, onAdd, onEdit }: { item: ShoppingItem; onAdd: () => void; onEdit: () => void }) {
  const timer = useRef<number>()
  const long = useRef(false)
  const start = () => { long.current = false; timer.current = window.setTimeout(() => { long.current = true; navigator.vibrate?.(10); onEdit() }, 500) }
  const cancel = () => clearTimeout(timer.current)
  return (
    <button
      className="catalog-chip"
      onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
      onContextMenu={e => { e.preventDefault() }}
      onClick={() => { if (!long.current) onAdd() }}
      aria-label={`הוסף "${item.name}" לרשימה`}
    >
      {item.image_path ? <Thumb path={item.image_path} size={22} /> : <PlusIcon />}{item.name}
    </button>
  )
}
