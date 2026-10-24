# Mini-Shimi Lead Routing — מנוע חילוץ מחיר + עמלת 1.5% (Sun, 15/09)

## מטרה
לקוח קונה מוצר דרך ווידג'ט מיני-שימי המותקן באתר צד ג → המערכת מחלצת את
המחיר האמיתי מדף המוצר באינטרנט, מוסיפה 1.5% עמלה, ומציגה עמוד תשלום
דינמי אחד (גרו + פייפאל) — לכל מוצר בעולם, בלי עמוד ייעודי לכל מוצר.

## חלוקת עבודה (פקודת סאן 15/09)
- **שימי פיתוח (מומש ואומת):** חילוץ הערכים מדף המוצר.
- **שימי פיננסים (מומש ואומת):** עמוד התשלום הדינמי (גרו+פייפאל) שמקבל
  את הערכים ומוסיף 1.5% בפועל (מכבד price_with_commission כמו שהוא — בלי עמלה כפולה).

## שלב 1 — חילוץ (שימי פיתוח)
`GET https://solas-6a095a77.base44.app/functions/extractProductDetails?url=<דף מוצר>`
או `POST {"url": "..."}`

תשובה:
```json
{
  "ok": true,
  "url": "...",
  "product_name": "...",
  "price": 599,
  "currency": "ILS",
  "confidence": "high",
  "commission_rate": 0.015,
  "price_with_commission": 607.98,
  "evidence": {"json_ld": true}
}
```

היררכיית מקורות (נלמדה מבדיקות חיות):
1. JSON-LD עם offers.price → high
2. `data-price-type="finalPrice"` + `data-price-amount` (Magento) → high
3. meta `product:price:amount` / itemprop microdata → medium
4. `"offers":{@type:Offer, price}` בסקריפטים → medium
5. סריקת דפוסי מחיר בטקסט (₪/ILS/$/€) → low (סיכון מחירי באנרים —
   ב-confidence=low עדיף לבקש מהמשתמש אישור לפני סליקה)

מיגון: SSRF — חסימת localhost/IPs פרטיים, רק http/https, timeout 20 שנ',
קיצוב תשובה ל-900KB. דפים שנבנים כולם ב-JS בצד לקוח מחזירים 422.

## שלב 2 — עמוד תשלום דינמי (שימי פיננסים)
מקבל את הפלט של שלב 1 ומפיק לינק תשלום חי.
פרימיטיב גרו פרוס אצל שימי פיתוח:
`POST https://solas-6a095a77.base44.app/functions/createPaymentLink`
`{"provider":"grow","amount_shekels":607.98,"product":"...","customer_name":"...","customer_phone":"..."}`
→ `{"ok":true,"payment_url":"https://pay.grow.link/..."}`.
גרו אין לו API ישיר — הכל דרך Make hook (פקודת סאן). המפתח וה-hook
נקראים מ-SystemSettings (make_api_key / grow_make_hook) — לא מהקוד,
כדי שרוטציה של מפתח Make תתוקן ברשומה אחת. מפתח מת → 401 make_api_key_rotated.
אישורי תשלום חוזרים ל-growWebhookReceiver של שימי פיננסים (PaymentRecord).
פייפאל דינמי: paypal.me/shimi358/<סכום> + אישור ידני (confirm_manual_payment).

## אימות חי E2E (15/09, על מוצרים אמיתיים מאתרים אמיתיים)
| אתר | מוצר | מחיר מחולץ | confidence | עם עמלה 1.5% |
|---|---|---|---|---|
| steimatzky.co.il (Magento) | בריגדת הספרים של מיס מורגן | 94.50 ILS | high | 95.92 |
| ivory.co.il | עכבר Logitech G903 Lightspeed | 599 ILS | high | 607.98 |
| bug.co.il | מחשב נייד HP | 4289 ILS | high | 4353.33 |

בדיקה משותפת מלאה (פיתוח→פיננסים): Logitech G903 מ-ivory → חילוץ 599 →
עמלה 607.98 → לינק גרו חי https://pay.grow.link/042ff964a9f1a997b7ebb09265f394db-Mzk5NzU4OQ (200 OK, לא נגבה).

לקח מהבדיקות: סריצת טקסט תמידית תפסה מחירי באנרים פרסומיים בסטימצקי
(משלוח חינם מעל 249₪, מנגות ב-25₪) — לכן ההיררכיה נותנת עדיפות ל-JSON-LD
ו-finalPrice. מחיר "507₪" באיבורי הוא מחיר אילת (פטור), לא מחיר המדף.

## תיעוד עמלה ברשומות (חוזה פתוח להשלמה — החלק שלא נסגר עדיין)
העמלה בסליקה מקוּדדת (שלבים 1-2), אבל **תיעוד העמלה ברשומות עדיין לא מקוּדד**
אצל שימי ראשי: PaymentRecord.commission_amount/commission_rate תמיד 0,
source_install_id תמיד None, WidgetInstallation.commission_total_earned לא
מצטבר. הלוגיקה: באישור תשלום (handlePayPalWebhook / handleGrowWebhook) —
commission = amount × WidgetInstallation.commission_rate (ברירת מחדל 1.5),
כתיבה ל-PaymentRecord + הצטברות ב-WidgetInstallation, idempotent.
החוק של סאן: אין הפצת מיני-שימי חינם ללקוחות חדשים עד שזה סגור וחי.
