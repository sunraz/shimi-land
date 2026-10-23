# SHIMI KAGGLE RENDER — רינדר זהות ווידאו על GPU חינמי (v1.0, 23/10/2026)

הרמת רינדרים כשאין קרדיטים: קרנל Kaggle (T4, 30ש"ב) או Colab. שני מסלולים מוכחים:

## מסלול א׳ — רינדר זהות מתמונת רפרנס (SDXL)
מפורט ב-RUNBOOK-identity-render.md (אומת על רינדר מיכאלה):
1. PhotoMaker v2/v1 (SDXL 1.0) + רפרנס base64 כעוגן פנים.
2. נפילה: IP-Adapter FaceID Plus v2 + InsightFace.
3. נפילה: InstantID (SDXL + ControlNet).
4. בסיס: SDXL Base 1.0.
מפרט מוכח: 1024x1536, 35 steps, guidance 6.5, FP16. ניהול: `kaggle kernels status <slug>`, הורדה: `kaggle kernels output <slug> -p .`

## מסלול ב׳ — וידאו image-to-video (Wan 2.2 ב-ComfyUI)
תבנית מאומתת: engine/wan-video-kernel-template.ipynb (קרנל shira-motion05 v3, 23/10).
שרשרת: ComfyUI + VideoHelperSuite + GGUF (⚠️ חובה `pip install gguf` — בלי זה UnetLoaderGGUF נופל. זה שורש הכשל שהוכח בלוג 04) → מודלים ל-/kaggle/temp (Wan2.2-TI2V-5B-Q4_K_M.gguf 3.4GB + umt5 fp8 6.7GB + VAE 1.4GB) → פריים פותח ב-URL ציבורי → 81 פריימים 480x832.
כלל הפקה נעול: 81 פריימים (5.06 שניות) בלבד — מעל זה עיוות אנטומי של Wan.

## תיקון מנוע הווידאו ההיסטורי (engine/kaggle_engine.py)
באג שורש שאובחן 11/10: הפריימים חוזרים בטווח 0-1 והבודק הניח 0-255 → כל רינדר בריא סומן "BLACK OUTPUT". הקובץ כולל נרמול טווח עמיד (tensor/PIL/uint8) + שמירת mp4 אמיתי + הוכחת PNG.

## כללים
* לפני דחיפה: אימות תחביר בתא (ast.parse) — קרנל שבור שורף 20 דקות GPU.
* מודלים ב-/kaggle/temp לא שורדים בין קרנלים — הורדות חוזרות בכל ריצה.
* טוקן Kaggle בכספת/studio-cloud-starter.
