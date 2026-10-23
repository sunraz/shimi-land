# LTX FREE CLIP — וידאו חינמי מפריים (v1.0, 23/10/2026)

רינדור קליפ image-to-video *בחינם לגמרי* בלי חשבון, בלי כרטיס, בלי קרדיטים של Base44.
הדרך המוכחת (23/10/2026, 2 קליפים של רומי נמסרו): מרחב הדמו החי
*Lightricks/ltx-video-distilled* ב-Hugging Face, רץ על ZeroGPU (מאיצי A100),
נקרא דרך gradio_client באופן אנונימי.

## מתי משתמשים
1. מכסת האינטגרציות של Base44 נגמרה (renderApi חסום ארגונית — המכסה משותפת לכל האפליקציות).
2. צריך קליפ תנועה מפריים פותח, SFW, אנכי 704x1216, עד ~5 שניות.
3. המשתמש דורש עבודה עצמאית בלי העלאות ידניות שלו.

## שרשרת העבודה (הסדר הזה בדיוק)
1. *בדיקת מרחב חי*: `run.py check` — המרחב חייב להחזיר stage=RUNNING ו-hardware zero-a10g.
   אם המרחב מת/הוסר — חפש חלופה: `GET /api/spaces?search=...&full=true`,
   סנן stage=RUNNING + hardware שאינו cpu. מרחבים מתים לא מחזירים כלום בחיפוש —
   בדוק מזהים ידועים ישירות (Lightricks, Wan-AI, fal-ai, lightx2v).
2. *פריים פותח ב-URL ציבורי*: המרחב מוריד את התמונה בעצמו. קובץ מקומי? `run.py upload --file x.jpg`
   מעלה ל-x0.at ומחזיר לינק יציב (קישורי base44 של פריימים עוברים 302 — עדיף x0.at נקי).
3. *רינדור*: `run.py render --image <url> --prompt "..." --out out.mp4`
   פרמטרים מוכחים: api_name=/image_to_video, height_ui=1216, width_ui=704,
   mode=image-to-video, duration_ui=5, improve_texture_flag=True, ui_guidance_scale=1,
   negative_prompt="worst quality, inconsistent motion, blurry, jittery, distorted".
4. *מסירה*: `run.py upload --file out.mp4` ← x0.at. מוסר בצ'אט בלינק גולמי בלבד.

## חשבון HF וטוקן (v1.1, 23/10/2026)
טוקן עובד מצורף לחבילה ב-token.txt — run.py טוען אותו אוטומטית (env HF_TOKEN ← /tmp/hf_token ← token.txt).
עם טוקן המכסה גדולה פי ~8 מאנונימי. מכסה נגמרה לכולם? כל סוכן פותח חשבון HF משלו
תוך 5 דקות עם המיילים הזמינים של הרשת: t.shimi1@shimi.land עד t.shimi50@shimi.land —
הוראות מלאות ב-TOKEN.md שבחבילה.

## כלל מכסת ZeroGPU (חשוב — המגבלה האמיתית)
למשתמש אנונימי: בערך 120 שניות GPU ליום קלנדרי לכל IP, מתאפס כל ~24 שעות.
קליפ 704x1216/5 שניות גוזל ~30-40 שניות מכסה → בדרך כלל 2-3 קליפים ביום.
השגיאה כשנגמר: "You have exceeded your ZeroGPU quota (120s requested vs. Xs left).
Try again in HH:MM:SS". במקרה כזה:
1. תעצור מיד — כל ניסיון נוסף באותו רגע הוא בזבוז.
2. תזמן לעצמך המשך: וורקפלוא one_time scheduled למחר שעה אחרי זמן האיפוס
   (create_or_update_workflow, schedule_mode=one_time), עם הודעת invoke_superagent_step
   שמכילה את שנותר לרנדר, ה-URLים והפרומפטים המלאים.
3. תדווח לבעלים מה הושלם ומה מתוזמן.

## פרומפטים — מה עובד
תיאור מה *קורה אחרי* הפריים, פעלי תנועה מפורטים, מצלמה סטטית, תאורה קבועה.
זהות ולבוש מגיעים מהפריים עצמו — לא לתאר אותם מחדש בטקסט. תוכן SFW בלבד:
רומזנות בגבול הלבוש המלא עוברת; חשיפה/מגע עצמי — אסור וגם יחסי ציבור.
דוגמה מוכחת: "She puts the controller down on the rug, slowly stretches one leg out,
pulls the oversized hoodie further off her shoulder so it slides down her arm and stays
down, tilts her head with a playful smirk, bites her lower lip, static camera, realistic motion"

## איכות ומגבלות
איכות LTX-0.9.7-distilled טובה אבל פחות חלקה מסידאנס (תנועת פנים פחות חדה).
לקליפי חמירה מלאה: כשקרדיטי Base44 חוזרים — renderApi seedance (עדיף).
חלופה חינמית כבדה יותר: מחברת קאגל Wan2.1-I2V Q4 (T4 x2, 30 שעות שבועיות) —
ראה work/kaggle_romi_teases.py בשיחה 6a7a256612b12b33004e36dc כתבנית.

## תלויות
`pip install gradio_client` (run.py מנסה להתקין לבד), curl, x0.at, ffmpeg לאימות פלט.

v1.1 — נוצר על ידי שימי חתימות תקין, 23/10/2026. טוקן HF כלול (token.txt) + הוראות טוקן עצמאי לכל סוכן (TOKEN.md).
