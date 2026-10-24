#!/usr/bin/env python3
# landing_verify v1.0 — שימי פיתוח, 24/10/2026
# גרעין ההמצאה "Landing-Verify as a Service": בדיקת נחיתה אוטומטית של פרסומים
# מנקודת המבט של הקורא — לפני הכרזת הצלחה.
# שימוש: python3 landing_verify.py <url> [--expect "טקסט נדרש"] [--cut 320]
import json, sys, re, urllib.request, urllib.error
from html.parser import HTMLParser

CUT_DEFAULT = 320  # Waystation חותך תיאור משימה ב-~320 תווים

class LinkGrab(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []; self.text = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            for k, v in attrs:
                if k == "href" and v and v.startswith("http"): self.links.append(v)
    def handle_data(self, data): self.text.append(data)

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:
        return 0, str(e)

def verify(url, expect=None, cut=CUT_DEFAULT):
    status, body = fetch(url)
    result = {"url": url, "http_status": status, "ok": status == 200}
    if status != 200:
        result["verdict"] = "FAIL: הדף לא נחת (לא 200) — הקורא לא רואה כלום"
        return result
    parser = LinkGrab(); parser.feed(body)
    full_text = " ".join(parser.text).strip()
    result["text_len"] = len(full_text)
    result["has_real_content"] = len(full_text) > 50
    if expect:
        result["expect_found"] = expect in full_text or expect in body
    # בדיקת קיצוץ: תיאור שנחתך ב-cut תווים ללא סיומת טבעית
    if cut:
        snippet = full_text[:cut]
        result["truncation_warning"] = len(full_text) > cut and not any(t in snippet[-15:] for t in [".", "!", "?", ":"])
    # בדיקת קישורים פנימיים (עד 10 ראשונים כדי לא להעמיס)
    dead = []
    for link in parser.links[:10]:
        s, _ = fetch(link, timeout=12)
        if s not in (200, 301, 302):
            dead.append({"link": link, "status": s})
    result["links_checked"] = min(len(parser.links), 10)
    result["dead_links"] = dead
    result["verdict"] = "PASS" if (result["has_real_content"] and not dead and not result.get("truncation_warning")) else "WARN"
    if not result["has_real_content"]:
        result["verdict"] = "FAIL: הדף ריק מתוכן אמיתי"
    if dead:
        result["verdict"] = f"FAIL: {len(dead)} קישורים מתים מתוך {result['links_checked']} שנבדקו"
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: landing_verify.py <url> [--expect text] [--cut N]"); sys.exit(1)
    url = sys.argv[1]; expect = None; cut = CUT_DEFAULT
    args = sys.argv[2:]
    if "--expect" in args: expect = args[args.index("--expect") + 1]
    if "--cut" in args: cut = int(args[args.index("--cut") + 1])
    print(json.dumps(verify(url, expect, cut), ensure_ascii=False, indent=1))
