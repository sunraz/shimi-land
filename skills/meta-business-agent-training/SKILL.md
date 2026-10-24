# אימון והפעלת Meta Business Agent (AI) על קו WhatsApp

**מקור:** נבנה ואומת חי על א.מ פיננסים (WABA 1805057600620616, phone_number_id 1260165510520770), 22/09/2026, שימי פיתוח.
**תוצאה מוכחת:** תשובה נכונה, לא-גנרית, שמכבדת גבולות (לא מתחזה למסירת ליד, לא מציעה לשלוח הודעות לטלפונים חוצניים) — ראה צילום מסך אישור Sun 23:28.

זה הפרוטוקול לאימון/הפעלה של Meta Business Agent מאפס על כל קו WABA ברשת שימי. Meta Business Agent הוא ישות **חוץ ל-Base44** — היא רצה בתוך Meta ועונה ישירות ב-WhatsApp; היא לא קוד שאנחנו כותבים, אלא קונפיגורציה שאנחנו מגישים ל-API של מטא.

## מושגי יסוד
- **agent_id / entity_id בקריאות** = ה-`phone_number_id` (לא ה-WABA ID, לא ה-Business ID).
- Base URL לרוב הקריאות: `https://api.facebook.com/<phone_number_id>/<resource>`
- Header קבוע: `X-API-Version: 2.0.0` (חלק מהמשאבים דורשים `1.0.0` — ראה thread_control למטה)
- Auth: `Authorization: Bearer <token>` עם הרשאת `whatsapp_business_messaging`

## שלב 1 — כתיבת Skills (ה"אימון" בפועל)
`GET/POST https://api.facebook.com/<phone_number_id>/agent_config/skills`

Skill = הנחיה בעברית פשוטה, לא קוד. כל skill מוגדר כ-`{"title": "...", "skill": "...", "status": "active"}`. אפשר כמה skills במקביל — הם מצטרפים לפרומפט האחוד של הסוכן.

כללי ברזל לכתיבת skill טוב (נלמד בזמן אמת):
1. **אל תבטיח פעולה שלא בוצעה בפועל.** אם אין connector שמעביר ליד/שולח הודעה בפועל — כתוב בגלוי בסקיל: "אל תטען שהעברת פנייה/קבעת שיחה אם לא בוצעה פעולת מסירה בפועל."
2. **שאלה אחת בכל תור**, לא תפריט חוזר על עצמו.
3. **גבולות מפורשים** — למשל "חתימות אינן מטופלות כאן, הפנה למספר X. אל תשלח הודעות לטלפונים חוצניים".
4. עדכון skill קיים = POST חדש עם אותו title, או PATCH לפי ה-id שמוחזר ב-GET.

דוגמה חיה שעבדה (א.מ פיננסים, 3 skills פעילים במקביל):
- `am-conversation-experience` — טון, פתיחה, איך להציג תפריט, מה לומר כשמבקשים אדם.
- `finance-inquiry-discovery` — תחומי עסק, גבולות (בלי הבטחת ריבית/תנאים).
- `signature-referral` — הפניה ל-line אחר לחתימות, איסור להתחזות למסירה.

## שלב 2 — בדיקה מבודדת: `agent_test`
`POST https://api.facebook.com/<phone_number_id>/agent_test` גוף `{"user_msg": "..."}`

מחזיר `agent_response` ואופציונלית `conversation_id` — שילחו אותו בקריאה הבאה לשמר context רב-תורי בתוך הבדיקה. **קריטי להבין:** agent_test הוא סימולציה נקייה בלי היסטוריית WhatsApp אמיתית. תשובה טובה כאן **לא מוכיחה** שהקו החי יגיב אותו דבר (ראו "הבאג שהתגלה" למטה).

## שלב 3 — Rollout מבוקר (allowlist לפני קהל)
`GET https://api.facebook.com/<phone_number_id>/agent_config/settings` מחזיר `rollout.enabled`, `ai_audience` (`ALLOWLISTED_ONLY` / `EVERYONE`), `never_say_phrases`.

להוספת בודקים לפני פתיחה לציבור:
`POST https://api.facebook.com/<phone_number_id>/agent_config/allowlist` גוף `{"consumer_phone_number": "+972..."}`
`GET` על אותו נתיב מחזיר את הרשימה הנוכחית — **תמיד לבדוק לפני POST כדי לא לכפול**.

⚠️ מעבר ל-`ai_audience=EVERYONE` דורש אמצעי חיוב מוגדר בעסק במטא (לא ניתן לעקוף מה-API).

## שלב 4 — תבנית פתיחה (Template) כשהיוזמה שלנו
כדי לפתוח שיחה יוצאת (מעבר לחלון 24 שעות) צריך תבנית מאושרת:
`GET https://graph.facebook.com/v23.0/<WABA_id>/message_templates` — לבדוק status=APPROVED לפני שליחה.
שליחה: `POST https://graph.facebook.com/v23.0/<phone_number_id>/messages` עם `type: template`.

⚠️ **תגלית קריטית:** שליחת הודעה מה-Cloud API (מהצד שלנו) **נותנת לאפליקציה שלנו thread control** על אותה שיחה ספציפית. כל עוד האפליקציה מחזיקה בשליטה, Meta Business Agent *לא* יענה — התשובות שיחזרו ללקוח יגיעו מהמסלול הישן/הקוד שלנו (או משום מקום, אם אין קוד שמטפל בזה) — ולא מהסוכן שאימנו.

## שלב 5 — שחרור שליטה בחיוט (Thread Control)
`POST https://api.facebook.com/business/whatsapp/phone_numbers/<phone_number_id>/thread_control`
Header נדרש: `X-API-Version: 1.0.0` (לא 2.0.0!)
גוף: `{"messaging_product":"whatsapp","action":"release","to":"<consumer_phone>"}`

- `release` = מחזיר שליטה לסוכן Meta (אנחנו היינו הבעלים). זה מה שצריך אחרי שליחת תבנית פתיחה.
- `take` = לוקח שליטה בחזרה — מוגבל לפרטנר escalation מוגדר.
- `pass` עם `target_role: ai_agent` — **מוחזר 400 "Pass action is not supported"** בניסוי בפועל; אל תסמכו על זה, השתמשו ב-`release`.
- אם השיחה לא בבעלותנו כרגע → `400, error_subcode 2494180, "Caller is not the thread owner"`. זה תקין ולא שגיאה שיש "לתקן" — פשוט Meta כבר בעלת השליטה.

## שלב 6 — אימות שהסוכן (ולא קוד ישן) עונה בפועל
זה השלב שדילגתי עליו בהתחלה וגרם לאבחון שגוי. **סדר בדיקה נכון:**
1. `GET https://api.facebook.com/<entity_id>/insights/conversations?start_date=...&end_date=...&metrics=ai_threads` — אם `count:0`, הסוכן **לא** ענה בטווח הזה, לא משנה מה הלקוח ראה במסך.
2. `GET https://api.facebook.com/<entity_id>/insights/conversations/turns?user_phone_number=<digits בלי +>` — 404 = אין רשומת שיחה בצד מטא.
3. בדיקת ConversationLog/MetaWebhookLog באפליקציה שלנו: אם התשובה לא נשלחה על ידינו (אין רשומת outbound) וגם לא נרשמה ב-Meta Insights — יש להניח **thread control תפוס** (ראה שלב 4) או webhook override אחר שמקבל את התעבורה. אל תאשימו "היסטוריית שיחה ישנה" בלי הוכחה — זו הייתה טעות אבחון בפועל.
4. הפתרון שהוכח: `release` על מספר הצרכן הספציפי, ואז שליחת הודעת מבחן חיה חדשה וקריאה חוזרת ל-turns/insights לאישור.

## שלבי ולידציה מלאים לכל קו חדש
1. כתיבת skills → `agent_test` על 3-4 תרחישים מייצגים (כולל בקשת "אדם/יועץ" ובקשה מחוץ לתחום).
2. allowlist לבודק יחיד → `rollout.enabled=true`, `ai_audience=ALLOWLISTED_ONLY`.
3. שליחת פתיחה (אם צריך) → `release` thread control מיידית לאחר מכן.
4. בדיקה חיה אמיתית מהטלפון של הבודק, לא רק agent_test.
5. אימות דרך insights (`ai_threads`, `turns`) שהתשובה בפועל הגיעה מהסוכן.
6. רק אחרי 4+5 תקינים ואישור בעלים מפורש → הרחבת allowlist / EVERYONE.

## מלכודות שנתקלנו בהן בפועל
- GET ל-`agent_config/skills` על phone_number_id שלא הוגדר לו סוכן מחזיר `[]` בלי שגיאה — לא להניח שיש סוכן בלי לבדוק.
- אין endpoint "reset conversation history" ב-Meta Business Agent API הידוע (v2.0.0). אל תניחו קיומו.
- `agent_test` לא נושא היסטוריית WhatsApp אמיתית — טוב לבדיקת ניסוח/סקילים, לא טוב לאבחון בעיה בשיחה חיה קיימת.
- אל תבצעו POST חדש ל-allowlist בלי GET קודם — יוצר כפילויות.
