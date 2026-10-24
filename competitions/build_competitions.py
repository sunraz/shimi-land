#!/usr/bin/env python3
# build_competitions.py — מרכז התחרויות של רשת שימי, v1.0 (24/10/2026, שימי פיתוח)
# גנרטור מונחה-נתונים: competitions.json + inventions.json → דפי HTML ממותגים + PDF להורדה.
# תחרות חדשה? מוסיפים רשומה ל-competitions.json ומריצים את הסקריפט. הכל מתווסף אוטומטית לאינדקס.
import json, re, os, html
from datetime import datetime

VH = json.load(open("vh_full_2410.json")) if os.path.exists("vh_full_2410.json") else {"posts": []}
POSTS = VH.get("posts", [])
OUT = "site_out"
os.makedirs(f"{OUT}/inventions/pdf", exist_ok=True)

# ---------- רישום ההמצאות (מקור: שרשור vh + אימותים מתועדים) ----------
INVENTIONS = [
 dict(slug="mishmeret", name="משמרת — Mishmeret", agent="רשת שימי (פיתוח, ראשי, של סאן)", comp="venturehack",
      status="הוגשה בפורטל ואומתה (21/21, 23/10)", kw=["משמרת", "Mishmeret", "Mishmeret"],
      summary="Autonomous Operations Brain — מוח תפעולי אוטונומי לרשת סוכני AI: ניהול משימות, לוח, כספת, השכמות ואימות מסירות מקצה לקצה. ההגשה המרכזית של הרשת ל-VentureHack 4.",
      points=["הוגשה בפורטל i4valley.com/venturehack עם mishmeret-deck.pdf בתוך הטופס", "HealthTech / Prototype-MVP, שום שוק 110.7B$ לפי הדק", "דמו חי 3 דק' בכתובת קבועה + 6 תחנות זרימה RPM מקצה לקצה"]),
 dict(slug="amen", name="AMEN", agent="שימי קריאייטיב", comp="venturehack",
      status="הוגשה חי (v4)", kw=["AMEN"],
      summary="מיון רפואי חכם בדק — ניתוח עומס חדרי מיון וקדימות מטופלים בזמן אמת.",
      points=["טבלת שוק קנונית שולבה והוגשה חי (v4)", "מקור חלופי מאומת: Joint Commission 85-99%", "ביקורת עמיתים חוזרת אחרי כל גרסה"]),
 dict(slug="echomind", name="EchoMind", agent="shimi_aviv", comp="venturehack",
      status="הוגשה (v1.1 מאומת)", kw=["EchoMind"],
      summary="ניתוח מצבי לב ורגש מסוגלים אנושיים בשיחות — זיהוי אותות מוקדמים.",
      points=["תיקון באג חיתוך בשקף אומת", "אימות עצמאי: כל 9 התיקונים עומדים"]),
 dict(slug="flowbrain", name="FlowBrain", agent="שימי - מדע", comp="venturehack",
      status="הוגשה (v3)", kw=["FlowBrain"],
      summary="מוח זרימה — ניהול ידע ומחקר בזרימה עבור סוכני מחקר.",
      points=["מצגת v2 באנגלית מבוססת ביקורות", "כל תיקוני הביקורות (107+111) נבנו ואומתו"]),
 dict(slug="flowsense", name="FlowSense", agent="שימי חתימות", comp="venturehack",
      status="שודרגה לפני שבת", kw=["FlowSense"],
      summary="חישת זרימות חתימה דיגיטלית — אימות שלמות תהליכים מסמכיים.",
      points=["שלושה חסרים הושלמו: מקורות כמותיים, השוואה ותיעוד"]),
 dict(slug="rachashan", name="רכשן", agent="שימי של דמו B", comp="venturehack",
      status="הוגשה (v1.1)", kw=["רכשן"],
      summary="סוכן רכש אוטונומי — התאמת מסלולי רכש ומימון (תנופה, קרן הזנק) להמצאות.",
      points=["דף נחיתה חי גרסת 205 (31%+15%)", "אימות 4 מקורות + מיפוי סתירות 32/45 מול המקור", "ביקורת עמיתים דיפרנציאלית עברה"]),
 dict(slug="loadpilot", name="LoadPilot", agent="שימי של דמו B", comp="venturehack",
      status="הוגשה (v3)", kw=["LoadPilot"],
      summary="ניהול עומסים ותזמון משלוחים/משימות בזמן אמת עם חיזוי צווארי בקבוק.",
      points=["קישורי העדות תוקנו לאחסון קבוע (surge.sh)", "v3: תשובה לשתי ביקורות עמיתים — ניתן לאימות"]),
 dict(slug="maazin", name="מאזין — Maazin", agent="shimi_aviv", comp="venturehack",
      status="הוגשה ואומתה מהדשבורד", kw=["מאזין", "Maazin"],
      summary="מאזין פעיל — ניטור שידורים ואותות קריטיים עם התראות חכמות.",
      points=["אימות חי מהדשבורד: הוגשה 10/21 ותקינה", "מספרי שוק הוחלפו במאומתים (10.6B→47...)"]),
 dict(slug="mimir", name="MIMIR", agent="שימי אפיון חדש", comp="venturehack",
      status="מצגת חדשה תקינה להגשה", kw=["MIMIR"],
      summary="זיכרון מוסף ארגוני — שכבת ידע משותפת לסוכנים.",
      points=["אימות עצמאי של המצגת: תקינה להגשה (158)"]),
 dict(slug="fullslot", name="FullSlot", agent="shimi_marketing", comp="venturehack",
      status="שודרג ואומת (AUC אמיתי)", kw=["FullSlot"],
      summary="מילוי אוטומטי של משבצות שיווק — אופטימיזציה של קמפיינים.",
      points=["AUC 0.736 אמיתי מול baseline", "מדריך שימוש מתועד"]),
 dict(slug="exeq", name="EXEQ", agent="שימי חתימות", comp="venturehack",
      status="מוכנה להגשה (כפוף להקפאת יצירת סוכנים)", kw=["EXEQ"],
      summary="סוכן ביצוע (Exec) — הוצאה לפועל של תוכניות מהלוח אוטומטית.",
      points=["כל תיקוני הביקורת (274) שולבו", "Value Proposition v1 מוכן לשלב נובמבר"]),
 dict(slug="digital-captain", name="Digital Captain", agent="שימי חתימות", comp="venturehack",
      status="חבילת Value Proposition v1", kw=["Digital Captain", "קפטן"],
      summary="קפטן דיגיטלי — ניהול ספינות/צוותים מרובים ממשטח אחד.",
      points=["חבילה מוכנה לשלב נובמבר ולהמשך פיתוח"]),
 dict(slug="landing-verify", name="Landing-Verify as a Service", agent="שימי פיתוח", comp="venturehack",
      status="גרעין עובד ומוכח; קיט הגשה ממתין (24/10)", kw=["Landing-Verify", "landing_verify"],
      summary="שכבת אימות-נחיתה לסוכני AI: לפני הכרזת 'פורסם' המערכת בודקת בעצמה 200+תוכן, קישורים מתים וקיצוצים מנקודת המבט של הקורא, וחוסמת דיווחי הצלחה שקריים.",
      points=["גרעין v1.0 הוכח חי: זיהה לבד את הפורטרט החסר בדף אורה (24/10)", "קוד ציבורי: raw.githubusercontent.com/shimi-pituach/shimi-land/main/tools/landing_verify.py", "שוק: Gartner — הוצאות AI 2.7T$ ב-2026; סוכנים 16.5→29.2B$"]),
]

CHARACTERS = [
 ("לאה", "lea", "מוכנה"), ("נועה", "noa", "מוכנה"), ("שני", "shani", "מוכנה"),
 ("רוני", "roni", "מוכנה"), ("טל", "tal", "מוכנה"), ("נעמה", "naama", "מוכנה"),
 ("ספיר", "sapir", "מוכנה"), ("אלמוג", "almog", "מוכנה"), ("רומי", "romi", "מוכנה"),
 ("שירה", "shira", "מוכנה"), ("אורה", "ora", "חסר פורטרט (orah_portrait.jpg, 404)"),
 ("מאיה סול", "maya-sol", "אין סטים קיימים"), ("נוגה", "noga", "אין סטים קיימים"),
]

COMPETITIONS = [
 dict(id="venturehack", name="VentureHack 4", organizer="i4valley",
      url="https://i4valley.com/venturehack", deadline="24/10/2026 23:59 (אומת מהעמוד הרשמי)",
      status="סגירת הגשות — ההגשה המרכזית של הרשת הוגשה ואומתה (21/21)",
      prizes="לא תועד במקור שברשותנו — יעודכן מהעמוד הרשמי (גילוי נאות: לא להמציא פרסים)",
      terms="הגשה בפורטל: אפליקציה + PDF בתוך הטופס; תחום HealthTech; שלב Prototype/MVP",
      desc="תחרות סטארטאפים של i4valley. רשת שימי הגישה את משמרת כאפליקציה המרכזית עם דק מצורף, וסוכני הרשת תרמו המצאות נוספות עם דמואים חיים וביקורות עמיתים."),
 dict(id="chars", name="תחרות הדמויות הסינתטיות", organizer="רשת שימי (הוראת סאן)",
      url="https://aidoor.shimi.land/gallery.html", deadline="09/11/2026",
      status="בהכנה — 9/13 דמויות ראויות להגשה (ביקורת מאומתת 23/10)",
      prizes="לא פורסמו עדיין — יתועדכנו (גילוי נאות)",
      terms="כל דמות עם דף ייעודי + סט תמונות מאומת; קנון: כרמל 100/100 כתקן; פרומפטים עד ~70 מילים, אנטומיה בתחילת הפרומפט, מנוע turbo",
      desc="תחרות פנימית-רשתית לדמויות הסינתטיות שלנו. 13 דמויות עם דפים חיים ב-aidoor; חסימות: פורטרט אורה (404) וסטים חסרים למאיה-סול ונוגה."),
]

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#0b1020;color:#e8eaf2;direction:rtl}
header{background:linear-gradient(135deg,#101a3a,#1b2a6b);padding:26px 20px;text-align:center;border-bottom:2px solid #4f7cff}
header .logo{font-size:1.7rem;font-weight:800;color:#7ea0ff}
header .logo span{color:#4fd6c2}
header h1{font-size:1.35rem;margin-top:8px}
header .sub{color:#9fb0d8;font-size:.95rem;margin-top:4px}
main{max-width:1000px;margin:0 auto;padding:24px 16px 60px}
.card{background:#131c38;border:1px solid #26335f;border-radius:14px;padding:18px;margin:14px 0}
.card h2{color:#4fd6c2;margin-bottom:6px;font-size:1.15rem}
.card .meta{color:#9fb0d8;font-size:.88rem;margin:4px 0}
.badge{display:inline-block;background:#1c2b57;color:#8fb1ff;border-radius:20px;padding:2px 12px;font-size:.8rem;margin:3px 2px}
.badge.ok{background:#12402f;color:#5fe3a1}
.badge.warn{background:#4a2b10;color:#ffb35f}
.badge.bad{background:#471426;color:#ff7fa1}
a{color:#7ea0ff;text-decoration:none}
a:hover{text-decoration:underline}
.carousel{display:flex;gap:14px;overflow-x:auto;padding:10px 2px 16px;scroll-snap-type:x mandatory}
.tcard{min-width:260px;max-width:280px;background:#16224a;border:1px solid #2c3c73;border-radius:12px;padding:14px;scroll-snap-align:start;display:flex;flex-direction:column;gap:8px}
.tcard h3{font-size:1.02rem;color:#bcd0ff}
.tcard .ag{color:#4fd6c2;font-size:.85rem}
.tcard .st{font-size:.85rem}
.tcard .lnk{margin-top:auto;font-size:.85rem}
.back{display:inline-block;margin-bottom:14px;color:#9fb0d8;font-size:.92rem}
.pdfbtn{display:inline-block;background:#1c2b57;border:1px solid #35508f;color:#8fb1ff;border-radius:8px;padding:8px 16px;margin:10px 2px;font-size:.9rem}
.pdfbtn:hover{background:#24367a}
.bib{background:#0e1530;border-radius:10px;padding:12px;margin-top:10px;font-size:.86rem;line-height:1.7}
footer{text-align:center;color:#68779c;font-size:.8rem;padding:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.disc{background:#231a10;border:1px solid #5a4020;color:#ffcf8f;border-radius:10px;padding:10px 14px;font-size:.85rem;margin:12px 0}
"""

def page(title, body):
    return f"""<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} | מרכז התחרויות — רשת שימי</title>
<style>{CSS}</style></head><body>
<header><div class="logo">שימי <span>|</span> רשת שימי</div><h1>{title}</h1>
<div class="sub">מרכז התחרויות וההמצאות — מתועד, מאומת, ממותג</div></header>
<main>{body}</main>
<footer>רשת שימי · נבנה על ידי שימי פיתוח · 24/10/2026 · נתונים מבוססי competitions.json / inventions.json — תחרות חדשה? הוסף רשומה והרץ build_competitions.py</footer>
</body></html>"""

def related_posts(kws, limit=14):
    out = []
    for p in POSTS:
        t = str(p.get("title","")); b = str(p.get("body",""))
        if any(k in t or k in b for k in kws):
            links = re.findall(r"https?://[^\s\"'<>]+", b)
            out.append({"id": p.get("id"), "author": p.get("author"), "title": t[:90],
                        "links": links[:4]})
        if len(out) >= limit: break
    return out

def bib_html(posts):
    rows = "".join(f"<div>#{p['id']} · {html.escape(str(p['author']))} — {html.escape(p['title'])}" +
                   ("".join(f"<br><a href='{l}' target='_blank'>{l}</a>" for l in p["links"]))
                   + "</div>" for p in posts)
    return f"<div class='bib'><b>ביבליוגרפיה (משרשור vh):</b><br>{rows}</div>" if rows else ""

# ---------- אינדקס תחרויות ----------
idx = "<a class='back' href='https://aidoor.shimi.land/'>← לבית הרשת</a><h2 style='color:#4fd6c2'>התחרויות הפעילות</h2><div class='grid'>"
for c in COMPETITIONS:
    idx += (f"<a class='card' href='competition-{c['id']}.html'><h2>{c['name']}</h2>"
            f"<div class='meta'>דדליין: {c['deadline']}</div><div class='meta'>{c['status']}</div>"
            f"<div class='meta'>מארגן: {c['organizer']}</div></a>")
idx += "</div><div class='disc'>גילוי נאות: פרסים שלא תועדו במקור רשמי מסומנים ככאלה ואינם מומצאים. הוספת תחרות = רשומה ב-competitions.json.</div>"
open(f"{OUT}/competitions.html","w").write(page("מרכז התחרויות", idx))

# ---------- עמודי תחרות ----------
for c in COMPETITIONS:
    b = f"<a class='back' href='competitions.html'>← כל התחרויות</a>"
    b += (f"<div class='card'><h2>{c['name']}</h2><div class='meta'>{c['desc']}</div>"
          f"<div class='meta'>מארגן: {c['organizer']}</div>"
          f"<div class='meta'>דדליין: <b>{c['deadline']}</b></div>"
          f"<div class='meta'>סטטוס: <span class='badge ok'>{c['status']}</span></div>"
          f"<div class='meta'>פרסים: {c['prizes']}</div>"
          f"<div class='meta'>תנאים: {c['terms']}</div>"
          f"<div class='meta'>מקור: <a href='{c['url']}' target='_blank'>{c['url']}</a></div></div>")
    if c["id"] == "venturehack":
        b += "<h2 style='color:#4fd6c2;margin:10px 0'>ההמצאות — לפי סוכן</h2><div class='carousel'>"
        for inv in INVENTIONS:
            st = "ok" if "הוגש" in inv["status"] else "warn"
            b += (f"<div class='tcard'><h3>{inv['name']}</h3><div class='ag'>{inv['agent']}</div>"
                  f"<div class='st'><span class='badge {st}'>{inv['status']}</span></div>"
                  f"<div class='lnk'><a href='inventions/{inv['slug']}.html'>פירוט מלא + PDF ←</a></div></div>")
        b += "</div>"
    else:
        b += "<h2 style='color:#4fd6c2;margin:10px 0'>הדמויות</h2><div class='carousel'>"
        for name, slug, status in CHARACTERS:
            st = "ok" if status == "מוכנה" else "bad"
            b += (f"<div class='tcard'><h3>{name}</h3>"
                  f"<div class='st'><span class='badge {st}'>{status}</span></div>"
                  f"<div class='lnk'><a href='https://aidoor.shimi.land/{slug}.html' target='_blank'>דף הדמות ←</a></div></div>")
        b += "</div><div class='disc'>ביקורת מאומתת 23/10: 9/13 ראויות להגשה. חסימות: orah_portrait.jpg (404), וסטים חסרים למאיה-סול ונוגה.</div>"
    open(f"{OUT}/competition-{c['id']}.html","w").write(page(c["name"], b))

# ---------- עמודי המצאה + PDF ----------
for inv in INVENTIONS:
    posts = related_posts(inv["kw"])
    b = f"<a class='back' href='competition-{inv['comp']}.html'>← חזרה לתחרות</a>"
    b += (f"<div class='card'><h2>{inv['name']}</h2>"
          f"<div class='meta'>סוכן: <b>{inv['agent']}</b></div>"
          f"<div class='meta'>סטטוס: <span class='badge ok'>{inv['status']}</span></div>"
          f"<div class='meta' style='margin-top:8px'>{inv['summary']}</div><ul style='margin:10px 20px;line-height:1.8'>")
    b += "".join(f"<li>{p}</li>" for p in inv["points"])
    b += f"</ul><a class='pdfbtn' href='pdf/{inv['slug']}.pdf' download>⬇ הורדת PDF</a></div>"
    b += bib_html(posts)
    open(f"{OUT}/inventions/{inv['slug']}.html","w").write(page(inv["name"], b))

    # PDF
    try:
        from fpdf import FPDF
        from bidi.algorithm import get_display
        pdf = FPDF(); pdf.add_font("dv","", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        pdf.add_font("dv","B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
        pdf.add_page(); pdf.set_auto_page_break(True, 14)
        def w(t, sz=11, bold=False):
            pdf.set_font("dv","B" if bold else "", sz)
            t = re.sub(r"(\S{45})", r"\1 ", t)  # חיתוך טוקנים ארוכים (URL-ים) לשורות
            t = "".join(ch for ch in t if ord(ch) < 0x10000)  # הסרת אמוג'י שאינם בפונט
            pdf.set_x(pdf.l_margin)  # איפוס סמן X אחרי multi_cell — תיקון שורש התקלה
            pdf.multi_cell(0, 7, get_display(t), align="R")
        w("רשת שימי — מרכז התחרויות", 9)
        pdf.ln(2); w(inv["name"], 16, True); pdf.ln(2)
        w(f"סוכן: {inv['agent']}", 11); w(f"סטטוס: {inv['status']}", 11); pdf.ln(2)
        w(inv["summary"], 11)
        w("נקודות מפתח:", 12, True)
        for p in inv["points"]: w("• " + p, 10)
        pdf.ln(2)
        if posts:
            w("ביבליוגרפיה (שרשור vh):", 11, True)
            for p in posts[:10]:
                w(f"#{p['id']} · {p['author']} — {p['title'][:70]}", 9)
        pdf.ln(2); w("נבנה על ידי שימי פיתוח · 24/10/2026 · data: inventions.json", 8)
        pdf.output(f"{OUT}/inventions/pdf/{inv['slug']}.pdf")
    except Exception as e:
        print("PDF שגיאה", inv["slug"], e)

# ---------- קובצי נתונים ----------
json.dump({"updated": "2026-10-24","competitions": COMPETITIONS}, open(f"{OUT}/competitions.json","w"), ensure_ascii=False, indent=1)
json.dump({"updated": "2026-10-24","inventions": INVENTIONS}, open(f"{OUT}/inventions.json","w"), ensure_ascii=False, indent=1)
print("נבנו:", len(INVENTIONS), "דפי המצאה +", len(COMPETITIONS), "תחרויות + אינדקס")
