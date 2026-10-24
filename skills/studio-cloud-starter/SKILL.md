# הצתת Worker ענן ב-Kaggle — Shimi Studio (מאיץ נפילה לענן)

**סטטוס:** מוכן ומאומת. טוקן Kaggle API Token (פורמט חדש KGAT_) נמצא בסביבה ועבר אימות מול השרת.
**תאריך:** 12.09.2026, עודכן 15.09.2026 (שימי פיתוח). חלק משרשרת הנפילה של הסטודיו (חוק ברזל מסאן).

## מתי מופעל הסקיל
כשה-watchdog מחזיר decision=start_cloud: יש ג'ובים בתור ואף worker לא חי (אין פעימה ב-10 הדקות האחרונות).
שרשרת: worker מקומי → אין? ענן (הסקיל הזה) → נכשל? דיווח מיידי לסאן + שימי ראשי.

## אימות (טופל 15.09)
- החשבון: **bigshimi358**, שיטת אימות ACCESS_TOKEN (לא הזוג הישן username+key — קאגל החליפו את המנגנון)
- הטוקן בסביבה: `KAGGLE_API_TOKEN` (37 תווים, קידומת KGAT_). עותקים _2/_3 זהים.
- kaggle CLI 2.2.4 תומך בשיטה: הטוקן נקרא מ-`~/.kaggle/access_token` או מ-env `KAGGLE_API_TOKEN`

## דרישות (בדוק לפני הפעלה)
1. CLI מותקן: `which kaggle` (אם לא — `pip install -q kaggle`)
2. טוקן בסביבה: `KAGGLE_API_TOKEN` (קידומת KGAT_)
   - בטיחות: אם `~/.kaggle/access_token` חסר — צור אותו: `mkdir -p ~/.kaggle && printf '%s' "$KAGGLE_API_TOKEN" > ~/.kaggle/access_token && chmod 600 ~/.kaggle/access_token`
   - אימות מהיר: `kaggle config view` → צריך להראות username: bigshimi358, auth_method: ACCESS_TOKEN
3. המחברת: `kaggle-starter/shimi_cloud_worker_kaggle.ipynb` (v4.5: Wan 2.2 TI2V-5B GGUF + engine fallback, רישום כ-worker ענן עם סשן 8 שעות, שם Worker-Kaggle-T4). kernel-metadata.json מוכן עם id=bigshimi358/shimi-cloud-worker

## הפעלה (פקודות מדויקות)
cd /app/.agents/skills/studio-cloud-starter/kaggle-starter
mkdir -p ~/.kaggle && printf '%s' "$KAGGLE_API_TOKEN" > ~/.kaggle/access_token && chmod 600 ~/.kaggle/access_token
kaggle kernels push -p .

פלט מוצלח: "Kernel version N successfully pushed" + URL.
בדיקת מצב: kaggle kernels status bigshimi358/shimi-cloud-worker (running = מתקין, ~8-10 דק' עד worker פעיל).

## אחרי הדחיפה — חובה
1. עדכון cooldown (מונע הצתות כפולות): ישות SystemSettings אצלי, key=studio_cloud_last_start, value=ISO עכשיו (create אם אין, update אם יש).
2. מעקב: שלוף https://shimi-studio.base44.app/functions/workerApi עד שמופיע Worker-Kaggle-T4 עם פעימה טרייה (עד 15 דק'). הודע לסאן "ענן עלה".
3. אם ה-kernel נכשל (kernels status = error): kaggle kernels output bigshimi358/shimi-cloud-worker -p /tmp/kag-log → תקן → דחוף שוב פעם אחת. נכשל שוב → דיווח מיידי.

## אם הטוקן חסר או פג
אל תנסה כלום מול Kaggle. דווח מיד: "נפילת ענן נכשלה — חסר/פג טוקן Kaggle API" + פירוט הג'ובים התקועים. לסאן בוואטסאפ + לשימי ראשי ב-Agent API.
שים לב: שיטת username+key הישנה כבר לא קיימת בקאגל — אל תבקש מסאן kaggle.json, רק API Token (Settings → API → Create New Token).

## מגבלות ידועות
- Kaggle: 6 שעות GPU בשבוע (אומת ב-API 15.09: totalTimeAllowed=21600s; TPU 20 שעות), סשן עד 12 שעות (המחברת מכבה את עצמה אחרי 8).
- העלאת ComfyUI+מודלים בכל עלייה: ~8-10 דק' עד שה-worker פעיל.
- אימות חי של הרינדר הראשון עם Wan 2.2 עדיין לא בוצע — לוגים דרך kernels output.
- Colab לא מתאים להצתה אוטומטית (אין API להרצת runtime) — קאגל בלבד.

## חסם פתוח (15.09, שימי פיתוח)
- GPU לא מוצמד ל-kernel למרות enable_gpu:true + machine_shape:NvidiaTeslaT4 שמורים בשרת של קאגל. torch.cuda.is_available()=False בכל 4 הריצות.
- מכסה מלאה (0/6 שעות בשימוש) — לא מכסה.
- ההשערה המובילה: החשבון bigshimi358 לא מאומת בטלפון — קאגל מוריד בשקט ל-CPU חשבונות ללא אימות טלפון. פעולת owner: kaggle.com → Settings → Phone verification.
- טופל כבר: kernelspec חסר (תוקן), enable_gpu כמחרוזת במקום בוליאן (תוקן), דגל --accelerator nvidia (נוסף).
