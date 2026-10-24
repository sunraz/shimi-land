# SKILL: Grow-via-Make Payments (גרו דרך Make) — v1.0

**סטטוס:** אומת קצה-לקצה 15/09/2026 (שימי פיתוח)
**חוק מסאן (15/09):** לגרו אין API ישיר. כל הסליקה של גרו עוברת דרך Make hook — וזהו.

## מה קיים וחי

1. **createPaymentLink** — `https://solas-6a095a77.base44.app/functions/createPaymentLink` (אפליקציית שימי פיתוח)
   - `POST {provider:'grow'|'paypal', amount_shekels, product, customer_name?, customer_phone?, max_payments?}`
   - grow → קורא ל-Make hook עם `x-make-apikey` מה-SystemSettings → מחזיר `{ok, payment_url}`
   - paypal → מחזיר קישור `paypal.me/shimi358/{amount}` (אישור ידני אחרי תשלום)
   - `GET` → סטטוס תשתית בלי סודות
   - fail-closed ב-401: מחזיר `make_api_key_rotated` — זה הסימן שהמפתח התחלף

2. **dynamicCheckoutPage** — `https://solas-6a095a77.base44.app/functions/dynamicCheckoutPage`
   - עמוד סליקה דינמי אחד לכל מוצר (משימת סאן 15/09)
   - `?amount=49.90&product=מסלול B&name=דני&phone=052...` — או קוד מסלול בלבד: `?tier=C`
   - קוד מסלול בלי סכום → מחיר קנוני אוטומטי: B=49.90, C=99.90, D=149.90, E=249.90, F=499.00 (מקור: grow_config של שימי ראשי)
   - מציג: כפתור גרו (ביט/כרטיס/Google Pay), כפתור PayPal, פרטי העברה ידנית (ביט 0559741578, ONE ZERO 18/001/224740609)

## הקונפיג (לא בקוד — ב-SystemSettings של שימי פיתוח)

| מפתח | תוכן |
|---|---|
| `make_api_key` | מפתח x-make-apikey הנוכחי. **מתחלף בממשק Make ללא התראה** |
| `grow_make_hook` | כתובת ה-hook המלאה |
| `grow_canonical_prices` | B:49.90,C:99.90,D:149.90,E:249.90,F:499.00 |
| `paypal_me_base` | https://www.paypal.me/shimi358 |

## חוזה Make hook (מאומת)

```
POST https://hook.eu1.make.com/<id>
Header: x-make-apikey: <make_api_key>
Body: { amount_shekels, product, customer_name?, customer_phone? }
→ 200 { status:'ok', payment_url:'https://pay.grow.link/...' }
→ 401 = מפתח מת (rotate)
```

אישורי תשלום חוזרים אוטומטית ל-`growWebhookReceiver` של שימי פיננסים (solas-80cef424) → PaymentRecord לפי transaction_id → workflow "Payment Verification Protocol".

## נוהל רוטציית מפתח (כשהסליקה מחזירה make_api_key_rotated)

1. פותחים Make → ה-webhook של גרו → מעתיקים את ה-API key הנוכחי (או מסאן מספק)
2. מעדכנים את הרשומה `make_api_key` ב-SystemSettings של שימי פיתוח
3. בודקים: `POST createPaymentLink {provider:'grow', amount_shekels:1, product:'בדיקה'}` → צריך ok:true + payment_url
4. מעדכנים את שימי פיננסים (בעל תחום התשלומים) שהמפתח התחלף

**לעולם לא מטמיעים את המפתח בקוד** — כל הדבקה יוצרת עותק מת בפריסה הבאה.

## חלוקת תחומים (אושרה עם שימי פיננסים 15/09)

* **גרו** — כל הרשת דרך createPaymentLink של שימי פיתוח (פיננסים אימץ, לא מחזיק מפתח Make משלו). אישורים נכנסים ל-growWebhookReceiver של פיננסים → PaymentRecord.
* **PayPal** — פיננסים ממשיך בזרימה האוטומטית המלאה שלו (Orders API + capture בוובהוק, בלי ידני). ה-paypal.me של createPaymentLink/dynamicCheckoutPage הוא fallback לסכומים דינמיים בלבד.

## מה לא נבדק עדיין

- `max_payments` (תשלומים) — שדה קיים בקוד אך לא אומת מול Make
- מנוי חודשי מול חד-פעמי — נקבע במודול "Create Payment Link" בתוך Make, לא ב-hook
- באג ידוע בשער shimiGateway: לתפקיד leads/finance יש הרשאת create_payment_link ב-get_protocol אך הפעולה עצמה מחזירה "invalid token for this agent" — דווח לשימי ראשי 15/09
