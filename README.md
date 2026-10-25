# הבית שלנו 🏠

אפליקציה (PWA) לניהול משק הבית של קוין ומעין. מודול ראשון: **משימות קבועות**.

## הרצה מקומית
```
npm install
npm run dev     # http://localhost:5173
npm test        # טסטים ללוגיקת התזמון
```
בלי `.env.local` האפליקציה רצה ב**מצב דמו** – הנתונים נשמרים רק בדפדפן.

## חיבור Supabase
1. **SQL Editor → New query** → מדביקים את `supabase/schema.sql` → **Run**.
2. **Authentication → URL Configuration**: *Site URL* = כתובת האתר המפורסם; ב-*Redirect URLs* מוסיפים גם `http://localhost:5173/**`.
3. **Authentication → Sign In / Providers → Email**: ההרשמה פתוחה (כל אחד יכול להירשם, ורואה רק את משק הבית שלו).
   שירות המייל המובנה של Supabase מוגבל לכמה מיילים בשעה – לקהל רחב צריך להגדיר SMTP (למשל Resend) ב-*Authentication → Emails → SMTP Settings*.
4. **Project Settings → API**: *Project URL* ו-*publishable key* ל-`.env.local` (ראו `.env.example`).

## משתמשים ומשקי בית
- כל אחד נרשם בעצמו (אימייל + סיסמה), בוחר שם וצבע, ואז יוצר משק בית או מצטרף עם קוד הזמנה.
- מי שיוצר משק בית הוא **מנהל/ת**: משנה שם, מסיר/ה חברים, ממנה מנהלים נוספים, מחליף/ה קוד הזמנה.
- קישור הזמנה (`?join=CODE`) מוביל להרשמה ומצרף אוטומטית.
- ההפרדה בין משקי בית נאכפת במסד הנתונים (Row Level Security) – לא רק באפליקציה.

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
- `src/lib/household.tsx`, `src/Onboarding.tsx`, `src/HouseholdSettings.tsx` – משתמשים ומשקי בית
- `src/App.tsx` – מעטפת וטאבים; מודולים עתידיים (רשימת קניות…) נוספים כאן
