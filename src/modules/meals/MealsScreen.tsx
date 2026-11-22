import { useState } from 'react'
import { longDate, plusDays } from '../../lib/dates'
import { useToday } from '../../lib/useToday'
import { ArrowIcon, ChatIcon, CheckIcon, ChevIcon, PlusIcon } from '../../ui/icons'
import { GlassButton, Page } from '../../ui/Page'
import { SuggestionsScreen } from '../suggestions/SuggestionsScreen'
import { cycleWeek, dayRhythm } from './plan'
import { RecipeScreen } from './RecipeScreen'
import { DishSheet, IngredientSheet, PlaceSheet, SwapSheet, WeekTitleSheet, type DishDraft, type IngredientDraft } from './sheets'
import { useShoppingTarget } from './shoppingTarget'
import { useMeals } from './store'
import { PANTRY_WEEK, SLOT_LABEL, SLOT_WHEN, SLOTS, WEEKS, type Dish, type Ingredient, type Slot } from './types'

type View = 'day' | 'week' | 'month'
const VIEWS: { id: View; label: string }[] = [{ id: 'day', label: 'היום' }, { id: 'week', label: 'שבוע' }, { id: 'month', label: 'חודש' }]
const VIEW_KEY = 'home-app:meals-view'

export function MealsScreen() {
  const m = useMeals()
  const [view, setView] = useState<View>(() => { try { return (sessionStorage.getItem(VIEW_KEY) as View) || 'day' } catch { return 'day' } })
  const [week, setWeek] = useState(m.currentWeek)
  /** false = closed; a string = open the menu requests, prefilled with it */
  const [requests, setRequests] = useState<string | false>(false)
  const [recipeId, setRecipeId] = useState<string | null>(null)
  const [swapping, setSwapping] = useState<Dish | null>(null)
  const [placing, setPlacing] = useState<Dish | null>(null)
  const [dish, setDish] = useState<DishDraft | null>(null)
  const [ingredient, setIngredient] = useState<IngredientDraft | null>(null)
  const [renaming, setRenaming] = useState<number | null>(null)

  const go = (v: View) => { setView(v); try { sessionStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ } }
  const openWeek = (n: number) => { setWeek(n); go('week') }

  const openRecipe = (d: Dish) => setRecipeId(d.id)
  const recipe = m.dishes.find(d => d.id === recipeId)
  const sheets = (
    <>
      <DishSheet dish={dish} onClose={() => setDish(null)} onSaved={id => recipe && setRecipeId(id)} />
      <SwapSheet
        current={swapping}
        onClose={() => setSwapping(null)}
        onSwapped={d => setRecipeId(d.id)}
        onNew={d => setDish({ week: d.week, slot: d.slot, replace: d })}
        onAsk={d => { setRecipeId(null); setRequests(`להחליף את "${d.title}" (שבוע ${d.week}) במנה אחרת, `) }}
      />
      <PlaceSheet key={placing?.id} dish={placing} onClose={() => setPlacing(null)} />
      <IngredientSheet ingredient={ingredient} onClose={() => setIngredient(null)} />
      <WeekTitleSheet week={renaming} onClose={() => setRenaming(null)} />
    </>
  )

  if (requests !== false) return <SuggestionsScreen kind="menu" initialDraft={requests} onBack={() => setRequests(false)} />
  if (recipe) return (
    <>
      <RecipeScreen dish={recipe} onBack={() => setRecipeId(null)} onEdit={() => setDish(recipe)} onSwap={() => setSwapping(recipe)} onPlace={() => setPlacing(recipe)} />
      {sheets}
    </>
  )

  const empty = !m.loading && !m.dishes.length && !m.ingredients.length
  const title = m.weekTitle(m.currentWeek)
  return (
    <Page
      title="ארוחות"
      subtitle={`שבוע ${m.currentWeek} מתוך 4${title ? ` · ${title}` : ''}`}
      actions={<GlassButton label="בקשה לשינוי בתפריט" onClick={() => setRequests('')}><ChatIcon /></GlassButton>}
    >
      <div className="seg" style={{ marginBottom: 20 }}>
        {VIEWS.map(v => <button key={v.id} className={v.id === view ? 'on' : ''} onClick={() => go(v.id)}>{v.label}</button>)}
      </div>

      {empty ? (
        <div className="empty">
          <div className="big">🍲</div>
          <p>עוד אין תפריט.</p>
          <button className="btn" onClick={m.loadDefaults}>טען את התפריט שלנו (4 שבועות)</button>
          <p style={{ fontSize: 13 }}>אפשר לערוך כל מנה ורכיב, או לבקש שינויים דרך כפתור הבועה למעלה.</p>
        </div>
      ) : view === 'day' ? (
        <DayView onOpenWeek={openWeek} onDish={openRecipe} />
      ) : view === 'week' ? (
        <WeekView week={week} setWeek={setWeek} onDish={openRecipe} onNewDish={setDish} onIngredient={setIngredient} onRename={setRenaming} />
      ) : (
        <MonthView onOpenWeek={openWeek} onDish={openRecipe} onNewDish={setDish} onIngredient={setIngredient} />
      )}

      {sheets}
    </Page>
  )
}

const dishesOf = (dishes: Dish[], week: number, slot: Slot) => dishes.filter(d => d.week === week && d.slot === slot)

function DishList({ dishes, onDish }: { dishes: Dish[]; onDish: (d: Dish) => void }) {
  return (
    <div className="list">
      {dishes.map(d => (
        <button key={d.id} className="cell plain" onClick={() => onDish(d)}>
          <div className="cell-body">
            <div className="meal-title">{d.title}</div>
            {d.note && <div className="meal-note">{d.note}</div>}
          </div>
          <ChevIcon />
        </button>
      ))}
    </div>
  )
}

function DayView({ onOpenWeek, onDish }: { onOpenWeek: (n: number) => void; onDish: (d: Dish) => void }) {
  const { dishes, activePlan, currentWeek } = useMeals()
  const today = useToday()
  const r = dayRhythm(today)
  const eat = dishesOf(dishes, currentWeek, r.eat)
  const cook = r.cook ? dishesOf(dishes, currentWeek, r.cook) : []
  // From Wednesday on, next week's shopping is the next thing to plan
  const nextWeek = cycleWeek(plusDays(today, 7), activePlan.cycle_start)
  const showNext = r.eat === 'midweek'
  // Wednesday: the midweek dishes may already be cooked, so it reads as "what we eat"
  const optionalCook = r.cook === r.eat && !!r.cookNote
  return (
    <>
      <div className="section-header" style={{ margin: '0 4px 8px' }}>{longDate(today)}</div>
      {r.cook && !optionalCook && (
        <div className="section">
          <div className="section-header big">מבשלים היום</div>
          {r.cookNote && <div className="section-footer" style={{ margin: '-6px 4px 10px' }}>{r.cookNote}</div>}
          {cook.length ? <DishList dishes={cook} onDish={onDish} /> : <div className="banner">אין מנות ב{SLOT_LABEL[r.cook]} של השבוע.</div>}
        </div>
      )}
      {(r.cook !== r.eat || optionalCook) && (
        <div className="section">
          <div className="section-header big">מה אוכלים</div>
          <div className="section-footer" style={{ margin: '-6px 4px 10px' }}>{optionalCook ? r.cookNote : `מ${SLOT_LABEL[r.eat]}`}</div>
          {eat.length ? <DishList dishes={eat} onDish={onDish} /> : <div className="banner">אין מנות ב{SLOT_LABEL[r.eat]} של השבוע.</div>}
        </div>
      )}
      <div className="section">
        <div className="list">
          <button className="cell plain" onClick={() => onOpenWeek(showNext ? nextWeek : currentWeek)}>
            <div className="cell-body">
              <div className="cell-title">{showNext ? `קניות לשבוע הבא (שבוע ${nextWeek})` : `התפריט והקניות של שבוע ${currentWeek}`}</div>
              <div className="cell-sub">{showNext ? 'כדי שהכל יהיה בבית לבישול של שישי' : 'כל המנות ורשימת הקניות של השבוע'}</div>
            </div>
            <ChevIcon />
          </button>
        </div>
      </div>
    </>
  )
}

function IngredientRows({ ings, target, onIngredient }: { ings: Ingredient[]; target: ReturnType<typeof useShoppingTarget>; onIngredient: (i: Ingredient) => void }) {
  return (
    <div className="list">
      {ings.map(i => {
        const on = target.onList(i)
        return (
          <div key={i.id} className={`cell${on ? ' on-list' : ''}`}>
            <button className="cell-body" style={{ textAlign: 'start' }} onClick={() => onIngredient(i)}>
              <div className="cell-title">{i.name}</div>
              {i.amount && <div className="cell-sub">{i.amount}</div>}
            </button>
            <button className={`add-btn${on ? ' on' : ''}`} aria-label={on ? `הסר "${i.name}" מרשימת הקניות` : `הוסף "${i.name}" לרשימת הקניות`} onClick={() => target.toggle(i)}>
              {on ? <CheckIcon /> : <PlusIcon />}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function ShoppingSections({ week, onIngredient }: { week: number; onIngredient: (i: IngredientDraft) => void }) {
  const { ingredients } = useMeals()
  const target = useShoppingTarget()
  const ings = ingredients.filter(i => i.week === week)
  const sections = [...new Set(ings.map(i => i.section))]
  return (
    <>
      <div className="section-footer" style={{ margin: '-4px 4px 14px' }}>רק מה שתבחרו נכנס לרשימת {target.list?.name ?? 'הקניות'}: לחיצה על + מוסיפה, לחיצה נוספת מורידה. לחיצה על השם פותחת עריכה.</div>
      {sections.map(s => (
        <div className="section" key={s}>
          <div className="section-header">{s}</div>
          <IngredientRows ings={ings.filter(i => i.section === s)} target={target} onIngredient={onIngredient} />
        </div>
      ))}
      <button className="btn secondary" onClick={() => onIngredient({ week, section: sections.at(-1) })}>+ רכיב</button>
    </>
  )
}

function WeekView({ week, setWeek, onDish, onNewDish, onIngredient, onRename }: {
  week: number
  setWeek: (n: number) => void
  onDish: (d: Dish) => void
  onNewDish: (d: DishDraft) => void
  onIngredient: (i: IngredientDraft) => void
  onRename: (n: number) => void
}) {
  const { dishes, weekTitle, currentWeek } = useMeals()
  const shift = (n: number) => setWeek(((week - 1 + n + 4) % 4) + 1)
  return (
    <>
      <div className="cal-head">
        <button style={{ textAlign: 'start', minWidth: 0 }} onClick={() => onRename(week)}>
          <h2>שבוע {week}{week === currentWeek && <span className="pill" style={{ marginInlineStart: 8, verticalAlign: 'middle' }}>השבוע</span>}</h2>
          <div className="cell-sub">{weekTitle(week) || 'הוספת שם לשבוע'}</div>
        </button>
        <div className="cal-nav">
          <button className="icon-btn" aria-label="שבוע קודם" onClick={() => shift(-1)}><ArrowIcon dir="prev" /></button>
          <button className="icon-btn" aria-label="שבוע הבא" onClick={() => shift(1)}><ArrowIcon dir="next" /></button>
        </div>
      </div>

      {SLOTS.map(slot => (
        <div className="section" key={slot}>
          <div className="section-header big">{SLOT_LABEL[slot]}</div>
          <div className="section-footer" style={{ margin: '-6px 4px 10px' }}>{SLOT_WHEN[slot]}</div>
          <DishList dishes={dishesOf(dishes, week, slot)} onDish={onDish} />
          <button className="link-btn" style={{ padding: '8px 4px 0' }} onClick={() => onNewDish({ week, slot })}>+ מנה</button>
        </div>
      ))}

      <div className="section-header big" style={{ marginTop: 8 }}>רשימת קניות לשבוע {week}</div>
      <ShoppingSections week={week} onIngredient={onIngredient} />
    </>
  )
}

function MonthView({ onOpenWeek, onDish, onNewDish, onIngredient }: {
  onOpenWeek: (n: number) => void
  onDish: (d: Dish) => void
  onNewDish: (d: DishDraft) => void
  onIngredient: (i: IngredientDraft) => void
}) {
  const { dishes, weekTitle, currentWeek, setCurrentWeek } = useMeals()
  return (
    <>
      <div className="banner">
        <b>איך זה עובד:</b> מחזור של 4 שבועות שחוזר על עצמו. בשישי–שבת מבשלים עוגנים שמחזיקים עד שלישי, ובשלישי–רביעי משלימים במנה מהירה לסוף השבוע.
      </div>
      <div className="list section">
        {WEEKS.map(w => (
          <button key={w} className="cell plain" onClick={() => onOpenWeek(w)}>
            <div className="cell-body">
              <div className="cell-title">שבוע {w}{weekTitle(w) ? ` · ${weekTitle(w)}` : ''}</div>
              <div className="meal-note">{dishes.filter(d => d.week === w).map(d => d.title).join(' · ') || 'אין מנות עדיין'}</div>
            </div>
            {w === currentWeek && <span className="pill">השבוע</span>}
            <ChevIcon />
          </button>
        ))}
      </div>

      <div className="section">
        <div className="section-header">השבוע הנוכחי במחזור</div>
        <div className="seg">
          {WEEKS.map(w => <button key={w} className={w === currentWeek ? 'on' : ''} onClick={() => setCurrentWeek(w)}>שבוע {w}</button>)}
        </div>
        <div className="section-footer">השבוע מתחלף בכל יום שישי.</div>
      </div>

      <div className="section">
        <div className="section-header big">מאגר מנות</div>
        <div className="section-footer" style={{ margin: '-6px 4px 10px' }}>מנות חלופיות עם מתכון. אפשר להחליף אליהן כל מנה בתפריט, ומנה שהוחלפה חוזרת לכאן.</div>
        <DishList dishes={dishes.filter(d => d.week === null)} onDish={onDish} />
        <button className="link-btn" style={{ padding: '8px 4px 0' }} onClick={() => onNewDish({ week: null, slot: 'weekend' })}>+ מנה למאגר</button>
      </div>

      <div className="section-header big" style={{ marginTop: 8 }}>מזווה בסיס</div>
      <div className="section-footer" style={{ margin: '-6px 4px 10px' }}>בודקים פעם בחודש שיש בבית.</div>
      <ShoppingSections week={PANTRY_WEEK} onIngredient={onIngredient} />
    </>
  )
}
