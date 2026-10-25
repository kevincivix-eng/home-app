# הבית שלנו 🏠

אפליקציה (PWA) לניהול משק הבית של קוין ומעין. מודול ראשון: **משימות קבועות**.

## הרצה מקומית
```
npm install
npm run dev     # http://localhost:5173
npm test        # טסטים ללוגיקת התזמון
```
בלי `.env.local` האפליקציה רצה ב**מצב דמו** – הנתונים נשמרים רק בדפדפן.

## חיבור Supabase (סנכרון בין הטלפונים)
1. פותחים פרויקט חינמי ב-[supabase.com](https://supabase.com).
2. **SQL Editor → New query** → מדביקים את `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user → Create new user** – פעמיים (קוין ומעין), עם אימייל וסיסמה. מסמנים *Auto Confirm User*.
4. **Authentication → Sign In / Providers → Email** – לכבות *Allow new users to sign up* (כדי שרק שניכם תוכלו להיכנס).
5. **Project Settings → API** – מעתיקים את *Project URL* ואת *anon public key* ל-`.env.local` (ראו `.env.example`).

## פרסום ל-GitHub Pages
1. ריפו ב-GitHub, **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. כל push ל-`main` בונה ומפרסם.

## התקנה באייפון
Safari → הכתובת של האתר → כפתור שיתוף → **הוספה למסך הבית** → התחברות פעם אחת.

## איך זה עובד
- משימה **מופיעה** ב-`due_date` ו**הופכת לאדומה** אחרי תקופה אחת (יומית – למחרת, שבועית – אחרי שבוע וכו').
- סימון כבוצע שומר מי עשה, מי סימן, ואם זה היה בזמן; המופע הבא נקבע **מיום הביצוע**.
- גרירה בלוח או "דחה" נרשמים כהזזה – וזה מה שמזין את "מה אנחנו דוחים" בסטטיסטיקה.
- טעינה ראשונית מפזרת את המשימות לאורך התקופה; משימה חדשה משובצת ליום הכי פנוי.

## מבנה
- `src/modules/chores/schedule.ts` – לוגיקת תזמון (פונקציות טהורות + טסטים)
- `src/modules/chores/backend.ts` – Supabase / localStorage
- `src/modules/chores/store.tsx` – state + פעולות
- `src/App.tsx` – מעטפת וטאבים; מודולים עתידיים (רשימת קניות…) נוספים כאן
