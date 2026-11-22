import { useState } from 'react'
import { CheckIcon, PlusIcon } from '../../ui/icons'
import { Page } from '../../ui/Page'
import { CookMode } from './CookMode'
import { useShoppingTarget } from './shoppingTarget'
import { SLOT_LABEL, type Dish } from './types'

export function RecipeScreen({ dish, onBack, onEdit, onSwap, onPlace }: {
  dish: Dish
  onBack: () => void
  onEdit: () => void
  onSwap: () => void
  onPlace: () => void
}) {
  const target = useShoppingTarget()
  const [cooking, setCooking] = useState(false)
  const where = dish.week ? `שבוע ${dish.week} · ${SLOT_LABEL[dish.slot]}` : 'במאגר המנות'
  return (
    <Page title={dish.title} subtitle={[where, dish.cook_time, dish.servings].filter(Boolean).join(' · ')} onBack={onBack}>
      {dish.note && <div className="banner">💡 {dish.note}</div>}

      {dish.steps.length > 0
        ? <button className="btn" style={{ marginBottom: 22 }} onClick={() => setCooking(true)}>👩‍🍳 מתחילים לבשל – שלב אחר שלב</button>
        : <div className="banner">עוד אין מתכון למנה הזו. אפשר להוסיף אותו ב"עריכת המנה והמתכון".</div>}

      {dish.ingredients.length > 0 && (
        <div className="section">
          <div className="section-header big">רכיבים</div>
          <div className="section-footer" style={{ margin: '-6px 4px 10px' }}>+ מוסיף לרשימת {target.list?.name ?? 'הקניות'}, רק מה שבחרתם.</div>
          <div className="list">
            {dish.ingredients.map((i, n) => {
              const on = target.onList(i)
              return (
                <div key={n} className={`cell${on ? ' on-list' : ''}`}>
                  <div className="cell-body">
                    <div className="cell-title" style={{ whiteSpace: 'normal' }}>{i.name}</div>
                    {i.amount && <div className="cell-sub">{i.amount}</div>}
                  </div>
                  <button className={`add-btn${on ? ' on' : ''}`} aria-label={on ? `הסר "${i.name}" מרשימת הקניות` : `הוסף "${i.name}" לרשימת הקניות`} onClick={() => target.toggle(i)}>
                    {on ? <CheckIcon /> : <PlusIcon />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {dish.steps.length > 0 && (
        <div className="section">
          <div className="section-header big">אופן ההכנה</div>
          <ol className="recipe-steps">
            {dish.steps.map((s, n) => <li key={n}><span className="recipe-num">{n + 1}</span><span>{s}</span></li>)}
          </ol>
        </div>
      )}

      <div className="action-group">
        {dish.week ? <button className="action" onClick={onSwap}>החלפת מנה</button> : <button className="action" onClick={onPlace}>הוספה לתפריט</button>}
        <button className="action" onClick={onEdit}>עריכת המנה והמתכון</button>
      </div>

      {cooking && <CookMode dish={dish} onClose={() => setCooking(false)} />}
    </Page>
  )
}
