import { useState } from 'react'
import { useAuth } from './lib/auth'
import { inviteLink, useHousehold, type Member } from './lib/household'
import { ColorPicker, HouseholdSetup } from './Onboarding'
import { Avatar } from './ui/Avatar'
import { ChevIcon } from './ui/icons'
import { Sheet } from './ui/Sheet'
import { useToast } from './ui/Toast'

export function HouseholdSettings() {
  const { userId, email, signOut } = useAuth()
  const h = useHousehold()
  const toast = useToast()
  const [sheet, setSheet] = useState<'profile' | 'rename' | 'add' | Member | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const household = h.household!
  const owners = h.members.filter(m => m.role === 'owner')
  const soleMember = h.members.length === 1
  const lastOwner = h.isOwner && owners.length === 1 && !soleMember

  const share = async () => {
    const url = inviteLink(household.invite_code)
    const text = `הצטרפו ל"${household.name}" באפליקציית הבית שלנו`
    try {
      if (navigator.share) await navigator.share({ title: 'הזמנה למשק בית', text, url })
      else { await navigator.clipboard.writeText(url); toast({ text: 'הקישור הועתק' }) }
    } catch { /* user cancelled */ }
  }

  return (
    <>
      <div className="section">
        <div className="section-header">הפרופיל שלי</div>
        <div className="list">
          <button className="cell plain" onClick={() => setSheet('profile')}>
            <Avatar p={h.profile ?? undefined} lg />
            <div className="cell-body"><div className="cell-title">{h.profile?.name}</div><div className="cell-sub">{email}</div></div>
            <ChevIcon />
          </button>
          <button className="cell plain" style={{ color: 'var(--red)' }} onClick={signOut}>התנתקות</button>
        </div>
      </div>

      <div className="section">
        <div className="section-header">משק הבית</div>
        <div className="list">
          <button className="cell plain" onClick={() => h.isOwner && setSheet('rename')} disabled={!h.isOwner}>
            <div className="cell-body"><div className="cell-title" style={{ fontWeight: 600 }}>{household.name}</div><div className="cell-sub">{h.members.length} חברים</div></div>
            {h.isOwner && <ChevIcon />}
          </button>
          {h.members.map(m => {
            const canManage = h.isOwner && m.id !== userId
            return (
              <button key={m.id} className="cell plain" onClick={() => canManage && setSheet(m)} disabled={!canManage}>
                <Avatar p={m} />
                <div className="cell-body"><div className="cell-title">{m.name}{m.id === userId ? ' (אני)' : ''}</div></div>
                {m.role === 'owner' && <span className="pill">מנהל/ת</span>}
                {canManage && <ChevIcon />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="section">
        <div className="section-header">הזמנת בני בית</div>
        <div className="list" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>קוד הזמנה</div>
          <div dir="ltr" style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, margin: '4px 0 12px', fontVariantNumeric: 'tabular-nums', userSelect: 'text' }}>{household.invite_code}</div>
          <button className="btn" onClick={share}>שליחת קישור הזמנה</button>
          {h.isOwner && <button className="link-btn" style={{ fontSize: 15, marginTop: 12 }} onClick={async () => { await h.regenerateInvite(); toast({ text: 'נוצר קוד חדש – הקוד הקודם כבר לא תקף' }) }}>יצירת קוד חדש</button>}
        </div>
        <div className="section-footer">מי שמקבל/ת את הקישור נרשם/ת ומצטרף/ת אוטומטית למשק הבית.</div>
      </div>

      <div className="section">
        <div className="list">
          {h.households.length > 1 && h.households.filter(x => x.id !== household.id).map(x => (
            <button key={x.id} className="cell plain" onClick={() => h.switchHousehold(x.id)}>
              <div className="cell-body"><div className="cell-title">מעבר ל: {x.name}</div></div><ChevIcon />
            </button>
          ))}
          <button className="cell plain" style={{ color: 'var(--tint-strong)' }} onClick={() => setSheet('add')}>הצטרפות / יצירת משק בית נוסף</button>
          {confirmLeave ? (
            <button className="cell plain" style={{ color: 'var(--red)', fontWeight: 600 }} onClick={() => (soleMember ? h.deleteHousehold() : h.leave())}>
              {soleMember ? 'למחוק את משק הבית וכל הנתונים? לחצו לאישור' : 'לעזוב את משק הבית? לחצו לאישור'}
            </button>
          ) : (
            <button className="cell plain" style={{ color: lastOwner ? 'var(--text-3)' : 'var(--red)' }} disabled={lastOwner} onClick={() => setConfirmLeave(true)}>
              {soleMember ? 'מחיקת משק הבית' : 'עזיבת משק הבית'}
            </button>
          )}
        </div>
        {lastOwner && <div className="section-footer">כדי לעזוב, קודם הגדירו חבר/ה נוסף/ת כמנהל/ת.</div>}
      </div>

      <Sheet open={sheet === 'profile'} onClose={() => setSheet(null)}>
        {sheet === 'profile' && <ProfileEditor onClose={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet === 'rename'} onClose={() => setSheet(null)}>
        {sheet === 'rename' && <RenameHousehold onClose={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet === 'add'} onClose={() => setSheet(null)}>
        {sheet === 'add' && <HouseholdSetup onCancel={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={typeof sheet === 'object' && sheet !== null} onClose={() => setSheet(null)}>
        {typeof sheet === 'object' && sheet && (
          <>
            <div className="sheet-title">{sheet.name}</div>
            <div className="sheet-sub">{sheet.role === 'owner' ? 'מנהל/ת' : 'חבר/ה'}</div>
            <div className="action-group">
              {sheet.role !== 'owner' && <button className="action" onClick={() => { h.makeOwner(sheet.id); setSheet(null) }}>הגדרה כמנהל/ת</button>}
              <button className="action destructive" onClick={() => { h.removeMember(sheet.id); setSheet(null) }}>הסרה ממשק הבית</button>
            </div>
            <div className="action-group"><button className="action primary" onClick={() => setSheet(null)}>סגור</button></div>
          </>
        )}
      </Sheet>
    </>
  )
}

function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { profile, saveProfile } = useHousehold()
  const [name, setName] = useState(profile?.name ?? '')
  const [color, setColor] = useState(profile?.color ?? '#007aff')
  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">הפרופיל שלי</div>
        <button className="link-btn bold" disabled={!name.trim()} onClick={async () => { await saveProfile({ name: name.trim(), color }); onClose() }}>שמור</button>
      </div>
      <div className="list section"><div className="field"><input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="שם" /></div></div>
      <div className="section-header">צבע</div>
      <div className="list section"><ColorPicker value={color} onChange={setColor} /></div>
    </>
  )
}

function RenameHousehold({ onClose }: { onClose: () => void }) {
  const { household, renameHousehold } = useHousehold()
  const [name, setName] = useState(household?.name ?? '')
  return (
    <>
      <div className="sheet-nav">
        <button className="link-btn" onClick={onClose}>ביטול</button>
        <div className="sheet-title">שם משק הבית</div>
        <button className="link-btn bold" disabled={!name.trim()} onClick={async () => { await renameHousehold(name); onClose() }}>שמור</button>
      </div>
      <div className="list section"><div className="field"><input value={name} onChange={e => setName(e.target.value)} maxLength={60} /></div></div>
    </>
  )
}
