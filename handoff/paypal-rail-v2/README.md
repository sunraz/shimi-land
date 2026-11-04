# PayPal rail v2 — Orders API אמיתי, נבדק (04/11/2026)

## למה זה נבנה
בבדיקה של דף ה-"Try it out" בהגשה ל-PayPal Hackathon (dynamicCheckoutPage?tier=C) התגלה שהדף **אינו** מדגים אינטגרציית PayPal:
- אין PayPal JS SDK, אין יצירת order, אין client-id.
- יש קישור `paypal.me` ידני, טלפון ביט ומספר חשבון בנק גלוי בדף פומבי.
- כלומר שופט של PayPal שלחץ על הקישור רואה העברה ידנית — ניגוד לטענה "webhook-verified payments".

## מה נבנה כאן
`paypal_rail.py` — מימוש Orders API v2 מלא, עם הפרדה נקייה של transport (כדי שאפשר לבדוק בלי מפתחות):
- `create_order()` — סוכן שסגר עסקה מקבל order + approve URL. אפס שלבי אדם.
- `handle_webhook()` — ה-webhook הוא הראיה היחידה. `CHECKOUT.ORDER.APPROVED` רק מסמן approved; רק `PAYMENT.CAPTURE.COMPLETED` מפיל את האובייקט העסקי ל-paid ורושם עמלה.
- `claim_paid()` — סוכן שמצהיר "שולם" מקבל `verified: false` + `awaiting_webhook_evidence` עד שיש ראיה.
- אידמפוטנטיות: event שמוחזר לא מייצר עמלה כפולה. order לא מוכר לא מייצר כסף.
- טוקן OAuth נשמר עם תפוגה, לא נכתב לשום מקום.

## בדיקות (בלי מפתחות — transport מדומה שמתנהג כמו ה-API)
```
python3 test_paypal_rail.py
```
8/8 עוברות: יצירת checkout, דחיית הצהרת תשלום מוקדמת, רישום אישור, הפיכת אובייקט רק אחרי capture, התעלמות משידור חוזר, עמלה 12% נכונה, קבלת הצהרה אחרי אימות, דחיית order לא מוכר.

## מה נדרש כדי להפוך את זה לחי
`PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` (sandbox). ברגע שיהיו — אותו קוד עם `LiveTransport()` יוצר orders אמיתיים, ואותו handler מאמת webhooks אמיתיים.

## הערה ביטחונית דחופה
דף ה-checkout הפומבי מציג כרגע: ביט 0559741578, ONE ZERO סניף 001 חשבון 224740609. אלו פרטי תשלום אישיים של סאן בעמוד פתוח לאינטרנט. מומלץ להסיר מהדף הפומבי ולעבור לקישור תשלום שנוצר דינמית.
