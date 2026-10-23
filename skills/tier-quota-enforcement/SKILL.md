# SKILL: Tier Quota Enforcement (אכיפת הגבלות מסלולים) — v2.1/v2.8

**סטטוס:** אומת קצה-לקצה 15/09/2026 (שימי פיתוח)
**רקע:** בדיקת מונטיזציה של שימי ראשי מצאה שההגבלות היו קיימות בקוד אך לא נקראו בשיחות החיות. תוקן.

## החוזה — clientManager (שימי פיתוח)

`POST https://solas-6a095a77.base44.app/functions/clientManager`

| action | קלט | פלט |
|---|---|---|
| `identify` | phone | client + limits + shouldUpgrade + upgradeMessage |
| `track_message` | phone | can_continue, messages_left, upgrade_message, next_tier |
| `track_query` | phone | can_continue, queries_left, upgrade_message, next_tier |
| `upgrade` | phone, newTier, paymentId | עדכון מסלול |

הגבלות: free 5 הודעות+3 משאלות ליום | basic 50+20 | premium 999+100 | elite ללא הגבלה.
מונים מתאפסים אוטומטית כל יום. לקוח חדש נוצר אוטומטית כ-free.

## מי קורא לזה עכשיו

1. **miniShimiChat v2.1** — חילוץ טלפון לפני קריאת Gemini. טלפון ידוע + תקציב נגמר → `action=quota_reached` + `upgrade:{needed, next_tier, message, messages_left, tier}` בלי קריאת AI. הפרונטנד מחבר כפתור שדרוג לשדה הזה.
2. **handleWhatsAppWebhook v2.8** (גשר הגיבוי) — אכיפה בקו שימי בלבד. קו א.מ = קו תפעולי, ללא הגבלות.

שתיהן **fail-open**: תקלה ב-clientManager לא חוסמת שיחות.

## אימות E2E (15/09)

- 6 קריאות track_message → נחסם בהודעה ה-5 (free), messages_left=0
- miniShimiChat עם טלפון שנוצל → quota_reached + next_tier=basic, בלי קריאת AI
- הודעה בלי טלפון → עברה חופשי

## נקודות למפתח

- טלפון מנורמל אוטומטית (05X / 972X / +972X)
- אימות בפועל מהסנדבוקס דורש כותרת User-Agent של דפדפן (בלי זה Cloudflare מחזיר 403)
- `upgrade_offered_today` מונע הצפת הודעות שדרוג — הודעה אחת ליום
