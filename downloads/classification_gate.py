#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
שער אימות מנוע מקומי — Ollama Gateway Acceptance Tests v1.0
מאת: שימי פיתוח | מבנה משותף עם ראשי ושימי של סאן | 26/10/2026
================================================================
רף הכרעה מוגדר מראש (חוק 1, אמות הפעלה v2.0):
- 4 בדיקות סיווג (2 עברית, 2 אנגלית), 10 דגימות בכל אחת.
- מנוע עובר רק אם: דיוק >= 80% בכל בדיקה, וזמן תגובה חציוני <= 5 שניות לבקשה.
- כישלון בבדיקה אחת = המנוע לא מחובר למשימות הזולות של הרשת. אין יוצאים מהכלל.

שימוש: python3 classification_gate.py [OLLAMA_URL]
ברירת מחדל: http://localhost:11434  (דרך המנהרה: הכתובת שראשי יספק)
מודל ברירת מחדל: qwen2.5:3b (ניתן לשנות ב-MODEL)
"""
import json, sys, time, statistics, urllib.request

OLLAMA_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:11434"
MODEL = sys.argv[2] if len(sys.argv) > 2 else "qwen2.5:3b"
ACC_MIN = 0.80          # רף דיוק
LATENCY_MAX_S = 5.0     # רף זמן תגובה חציוני

def ask(prompt, system=None):
    body = {"model": MODEL, "prompt": prompt, "stream": False,
            "options": {"temperature": 0.0, "num_predict": 60}}
    if system: body["system"] = system
    req = urllib.request.Request(OLLAMA_URL + "/api/generate",
          data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=60) as r:
        out = json.loads(r.read().decode())
    return out.get("response", "").strip(), time.time() - t0

def classify(text, labels, lang):
    sysmsg = ("You are a classifier. Reply with EXACTLY one label, nothing else. "
              f"Possible labels: {', '.join(labels)}.") if lang == "en" else (
              "אתה מסווג. ענה בדיוק בתווית אחת ובלי כל דבר נוסף. "
              f"התוויות האפשריות: {', '.join(labels)}.")
    resp, dt = ask(text, sysmsg)
    return resp, dt

# ============ 4 הבדיקות ============
# בדיקה 1: סיווג כוונת ליד משכנתא (עברית)
TEST1 = [
    ("שלום, אני מעוניין לקחת משכנתא לדירה, אפשר לשמוע פרטים?", "new_lead"),
    ("ראיתי שיש עמלה על משכנתא, כמה אתם לוקחים?", "new_lead"),
    ("אני רוצה למחזר משכנתא קיימת, אשמח לבדוק אופציות", "new_lead"),
    ("מתי הפגישה שלי עם היועץ שנקבעה?", "existing_client"),
    ("שלחתי אתמול את תלושי המשכורת, קיבלתם?", "existing_client"),
    ("הבנק אישר את ההלוואה! מה עכשיו?", "existing_client"),
    ("אני רוצה לבטל את הפגישה", "cancel"),
    ("לא מעוניין יותר, אנא הסירו אותי מהרשימה", "cancel"),
    ("בסדר, תודה על ההסבר, אחשוב על זה", "cancel"),
    ("זה שיחה מעניינת אבל אני רק שואל בשביל חבר", "new_lead"),
]
# בדיקה 2: סינון ספאם/זבל (עברית)
TEST2 = [
    ("היי אני סוכן ביטוח, רוצה להציע שיתוף פעולה מקצועי", "spam"),
    ("מציע שירותי קידום אתרים במחירים זולים!!!", "spam"),
    ("קנית כרטיס בפייבוקס? לחץ כאן לקבלת החזר", "spam"),
    ("שלום, אשתי ואני רוצים לבדוק משכנתא הפוכה", "legit"),
    ("המתנו לך בקפה השכונתי, איפה אתה?", "legit"),
    ("שאלה לגבי ביטוח משכנתא, זה חובה?", "legit"),
    ("זיכרון הטלפון מלא, נסה שוב מאוחר יותר", "spam"),
    ("הרווחת 1000 שקל! התקשר עכשיו למימוש", "spam"),
    ("תודה על העדכון, נדבר בשבוע הבא", "legit"),
    ("אפשר לקבל הצעת מחיר לביטוח חיים?", "legit"),
]
# בדיקה 3: סיווג כוונה (אנגלית)
TEST3 = [
    ("Hi, I want to apply for a mortgage, what do you need from me?", "new_lead"),
    ("What are your fees for mortgage brokerage?", "new_lead"),
    ("Can you help refinance my current loan?", "new_lead"),
    ("When is my appointment with the advisor?", "existing_client"),
    ("I sent the documents yesterday, did you receive them?", "existing_client"),
    ("The bank approved us! What is the next step?", "existing_client"),
    ("Please cancel my meeting tomorrow", "cancel"),
    ("Not interested anymore, please remove me", "cancel"),
    ("Thanks, I will think about it and get back to you", "cancel"),
    ("Just asking for a friend, how does it work?", "new_lead"),
]
# בדיקה 4: סינון ספאם (אנגלית)
TEST4 = [
    ("Congratulations! You won a free gift card, click here", "spam"),
    ("Buy cheap SEO services, best prices!!!", "spam"),
    ("Special offer, 50% off all products today only", "spam"),
    ("Hello, we are a family looking into a first mortgage", "legit"),
    ("Could you explain how mortgage insurance works?", "legit"),
    ("Thanks for the update, talk next week", "legit"),
    ("Your account is suspended, verify immediately", "spam"),
    ("Win $1000 now! Call this number", "spam"),
    ("Can I get a quote for home insurance?", "legit"),
    ("The meeting was great, see you at the office", "legit"),
]

def run_test(name, samples, lang):
    labels = list({lbl for _, lbl in samples})
    ok, lat = 0, []
    for text, expected in samples:
        try:
            resp, dt = classify(text, labels, lang)
            lat.append(dt)
            # קבלת תווית גם אם המנוע הוסיף מילים
            hit = any(lbl.lower() in resp.lower() for lbl in labels)
            got = next((l for l in labels if l.lower() in resp.lower()), "?")
            if hit and got == expected: ok += 1
        except Exception as e:
            print(f"  שגיאה בבקשה: {e}")
    acc = ok / len(samples)
    med = statistics.median(lat) if lat else 99
    passed = acc >= ACC_MIN and med <= LATENCY_MAX_S
    print(f"[{'עובר' if passed else 'נכשל'}] {name}: דיוק {acc:.0%} ({ok}/{len(samples)}), חציון תגובה {med:.1f}s")
    return passed, acc, med

if __name__ == "__main__":
    print(f"שער אימות מנוע מקומי | URL: {OLLAMA_URL} | מודל: {MODEL}")
    print(f"רף הכרעה: דיוק >= {ACC_MIN:.0%} בכל בדיקה + חציון תגובה <= {LATENCY_MAX_S}s")
    print("=" * 60)
    # בדיקת חיבור
    try:
        resp, dt = classify("שלום", ["כן", "לא"], "he")
        print(f"חיבור למנוע: תקין (תגובת בדיקה: '{resp[:30]}', {dt:.1f}s)\n")
    except Exception as e:
        print(f"אין חיבור למנוע: {e}\nהמנוע לא עבר את השער. בדוק ש-Ollama רץ ושהכתובת נכונה.")
        sys.exit(2)
    results = [
        run_test("בדיקה 1 — כוונת ליד (עברית)", TEST1, "he"),
        run_test("בדיקה 2 — ספאם/לגיטימי (עברית)", TEST2, "he"),
        run_test("בדיקה 3 — כוונת ליד (אנגלית)", TEST3, "en"),
        run_test("בדיקה 4 — ספאם/לגיטימי (אנגלית)", TEST4, "en"),
    ]
    print("=" * 60)
    if all(r[0] for r in results):
        print("תוצאה סופית: המנוע עבר את כל 4 הבדיקות — מוסמך לקבלת המשימות הזולות של הרשת.")
        sys.exit(0)
    else:
        failed = [i+1 for i, r in enumerate(results) if not r[0]]
        print(f"תוצאה סופית: המנוע נכשל בבדיקות {failed} — לא מחברים אותו למשימות הרשת.")
        sys.exit(1)
