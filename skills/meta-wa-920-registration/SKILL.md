> ⛔ מיושן 15/09: מספר 052-932-0920 בוטל ובדרך למחיקה ממטא (פקודת סאן). אסור לנסות לרשום/לאמת אותו. הקו החי: +1 555-327-5986. סקיל זה נשמר לתיעוד היסטורי בלבד.
# רישום מספר הגשר 052-932-0920 ב-WhatsApp Cloud API (P0 App Review)

**סטטוס:** בתהליך — קוד VOICE מתוזמן. מתעדכן.
**תאריך:** 11.09.2026, שימי פיתוח

## הזהויות האמיתיות (אומתו בגרף 11.09!)
- **Business ID:** 1404560264938379
- **אפליקציה:** OMShimi = 1404780895125336 (App mode: In development)
- **WABA אמיתי:** 1863273008148571 שם "שימי", account_review_status=APPROVED
  - ⚠️ המזהים 1592039185818649 (WABA) ו-1304414166087141 (phone) מהחבילה הישנה — **שגויים/מיושנים!** אין להשתמש.
- **מספר:** +972 52-932-0920, verified_name "שימי", **phone_number_id = 1267663429769136**, account_mode=LIVE, code_verification_status=NOT_VERIFIED
- WABA נוסף בעסק: 1799350211111655 "Test WhatsApp Business Account"
- טוקן עובד: FACEBOOK_ACCESS_TOKEN (משתמש "Shimi" — רואה את העסק 1404560264938379 דרך /owned_whatsapp_business_accounts). טוקנים 2-5 (Shimi_omf, Nayabot×3) אינם רואים נכסים.
- verify_token וובהוק: shimi_verify_2026

## הנתיבים שעובדים (v23.0, Authorization: Bearer <token>)
- גילוי WABAs של העסק: `GET /1404560264938379/owned_whatsapp_business_accounts?fields=id,name,account_review_status`
- מספרי ה-WABA: `GET /1863273008148571/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status,account_mode`
- בקשת קוד אימות: `POST /1267663429769136/request_code` גוף `{"code_method":"VOICE","language":"he_IL"}` — **חובה פרמטר language!** (code_method: SMS | VOICE | FLASH)
- אימות הקוד: `POST /1267663429769136/verify_code` גוף `{"code":"123456"}` (6 ספרות מהשיחה/SMS)
- לאחר אימות: לוודא `code_verification_status=VERIFIED` בשליפת המספר, ואז שליחת בדיקה `POST /1267663429769136/messages` גוף `{"messaging_product":"whatsapp","to":"<מספר>","type":"text","text":{"body":"בדיקה"}}`
- ⚠️ ה-endpoint הישן `register_request_code` לא קיים — שגיאת Unknown path. הנכון: `request_code`/`verify_code`.
- ⚠️ cooldown: אחרי בקשת קוד יש צ'ילדאון שעה — שגיאה 136024 "השרתים שלנו לא זמינים... המתן 1 hour". לתזמן ניסיון חוזר אוטומטי (workflow).

## ⛔ כלל ברזל מסאן (11/09)
בקשות אימות/קוד למטא על המספר הזה — **ידני בלבד, על ידי סאן בדשבורד, בהדרכת שימי פיתוח**. אסור: טיימרים, ניסיונות חוזרים אוטומטיים, הצפת בקשות (כל הצפה מפעילה צ'ילדאון ומחסימה אותנו). הטיימר שהוצב בוטל.

## זרימה להשלמה (ידנית בלבד)
1. סאן פותח את WhatsApp Manager → המספר → Send code → בוחר שיחת טלפון (VOICE) — פעולה ידנית אחת בלבד
2. verify_code עם הספרות → אישור VERIFIED
3. שליחת בדיקה חיה לטלפון אמיתי (0559741578 / 0587233211) + קליטת תשובה נכנסת (webhook)
4. סרטון ל-App Review: הדגמת Graph Explorer + לוגים

## שיעורים לרשת
- מזהי Meta מחבילות מסירה ישנות עלולים להתיישן — תמיד לגלות מחדש דרך `owned_whatsapp_business_accounts` לפני עבודה.
- משתמשי מערכת (Nayabot) עם הרשאות מושלמות אבל בלי הקצאת נכסים = subcode 33 בכל שליפה. לוודא "Edit assets" ב-Business Settings.

## ממצא שימי ראשי 23:15 (11/09) — באגים ב-handleWhatsAppWebhook

* באג 1 (תוקן על ידי ראשי 23:05): הפונקציה קראה ל-WHATSAPP_API_TOKEN שלא קיים — רק WHATSAPP_ACCESS_TOKEN קיים. מאז הפריסה שום הודעה יוצאת לא נשלחה. תוקן ופרוס.
* באג 2 (חסום — פתרון ידני): טסט ל-Graph API עם phone_number_id=1267663429769136 → subcode 33 (missing permissions). debug_token: טוקן תקף, whatsapp_business_messaging כללי, אבל whatsapp_business_management מוגבל ל-target_id 843603132080215 (WABA טסט ישן). משתמש-המערכת (app O.M.Finance-Shimi 1771482637214429) לא מוקצה כנכס על WABA 1863273008148571.
* פתרון: הקצאת נכס ב-Business Settings → System Users → Add Assets → WhatsApp Business Accounts → "שימי" 1863273008148571 → Manage phone numbers → Save. + יצירת טוקן חדש (הישן מוגבל ל-WABA ישן). הנחיה ממוספרת נשלחה לסאן דרך שימי ראשי.
* אחרי אישור סאן: עדכון WHATSAPP_ACCESS_TOKEN + טסט שליחה חיה → דיווח תוצאה לראשי.

## ⛔ עדכון קריטי 12/09 03:30 (שימי פיתוח, אימות חי מול Graph API — קריאה בלבד)
* המספר 052-932-0920 (phone_number_id 1267663429769136) **אינו קיים עוד במטא**. WABA "שימי" (1863273008148571) ריקה ממספרים (0 תוצאות ב-/phone_numbers). ההנחיה הזו הייתה תקפה עד 11/09 — המספר נעלם/הוסר מאז.
* הקו החי היחיד: +1 555-327-5986 (phone_number_id 1260165510520770) ב-WABA "א.מ פיננסים" (1805057600620616), GREEN/LIVE/CONNECTED — הקו של מנוע הייצור של שימי ראשי (v5.2, תשלומים ומשכנתאות מאומתים).
* כלל הברזל נשאר בתוקף: אם סאן יוסיף מספר ישראלי חדש — כל בקשת אימות/רישום ידנית על ידו בלבד, בהדרכה. שום אוטומציה, שום request_code/SMS/VOICE מצד הסוכנים.
* MVP שימי לקוחות יוצא לאור על הקו החי +1 555 — לא על 052.
