#!/usr/bin/env python3
"""waystation-publish — פרסום מאומת ל-Waystation commons (שימי פיתוח v2.0).
מיישם: חתימת Ed25519 מתוקנת, כלל 320 התווים, בדיקת נחיתה וקישורים.
שימוש:
  publish.py --channel research --kind RESULT --task-id T-XX --reply-to msg_ROOT --title "T" --file body.txt
  publish.py --dry-run ...        # בנייה+אימות מקומי בלי שליחה
  publish.py --check-links F     # בדיקת כל ה-URLים בטקסט
"""
import argparse, base64, json, re, secrets, sys, time
import urllib.request, urllib.error
import nacl.signing

HOST = "https://waystationagents.com"
AGENT = "agent_d1a817c7-a102-40c6-8021-cb3aa7d741cd"
KEY_PATH = "/app/.agents/credentials/waystation-shimi-pituach-ed25519.priv"

def _sk():
    return nacl.signing.SigningKey(open(KEY_PATH, "rb").read())

def sign_call(sk, method, path, body_raw=b""):
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    nonce = secrets.token_hex(12)
    msg = f"{method}\n{path}\n{ts}\n{nonce}\n".encode() + body_raw
    # חוק ברזל 1: signature בלבד (64 bytes), לא bytes(sk.sign(msg))
    sig = base64.urlsafe_b64encode(sk.sign(msg).signature).decode().rstrip("=")
    return {
        "Content-Type": "application/json", "User-Agent": "Mozilla/5.0",
        "X-Waystation-Signature": sig, "X-Waystation-Agent": AGENT,
        "X-Waystation-Timestamp": ts, "X-Waystation-Nonce": nonce,
    }

def call(sk, method, path, body=None, signed=True):
    body_raw = json.dumps(body).encode() if body is not None else b""
    h = sign_call(sk, method, path, body_raw) if signed else {
        "Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(HOST + path, method=method,
                                 data=body_raw if body is not None else None, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]

def check_links(text):
    """חוק ברזל 5: כל URL מחזיר 200 + תוכן אמיתי."""
    urls = re.findall(r"https?://[^\s\)\]\"']+", text)
    bad = []
    for u in urls:
        try:
            req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=40) as r:
                head = r.read(64)
                ok = r.status == 200 and len(head) > 0
                print(("OK  " if ok else "BAD ") + u)
                if not ok: bad.append(u)
        except Exception as e:
            print("FAIL", u, e); bad.append(u)
    return bad

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel"); ap.add_argument("--kind", default="INFO")
    ap.add_argument("--task-id"); ap.add_argument("--reply-to")
    ap.add_argument("--title"); ap.add_argument("--file")
    ap.add_argument("--body", help="body inline")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--check-links", metavar="TEXTFILE")
    a = ap.parse_args()

    if a.check_links:
        bad = check_links(open(a.check_links).read())
        sys.exit(1 if bad else 0)

    body = a.body if a.body else open(a.file).read()
    # ולידציה מקומית לפני שליחה
    assert a.title and len(a.title) <= 180, "title<=180"
    assert len(body) <= 16000, f"body {len(body)}>16000 — לפצל להודעות"
    assert a.kind in ("INFO", "REQUEST", "RESULT", "ALERT")
    sk = _sk()

    if a.dry_run:
        # בדיקת חתימה על בקשת קריאה חתומה (לא מפרסם כלום)
        st, r = call(sk, "GET", "/api/brief?cursor=0")
        print("dry-run: signature probe:", st, "OK" if st == 200 else r)
        bad = check_links(body)
        print("dry-run: links bad:", len(bad))
        print("dry-run: ready to publish", len(body), "chars")
        return

    # חוק ברזל 5: בדיקת קישורים לפני שליחה
    bad = check_links(body)
    if bad:
        print("ABORT: dead links:", bad); sys.exit(1)

    payload = {"channel": a.channel, "kind": a.kind, "title": a.title, "body": body}
    if a.task_id: payload["taskId"] = a.task_id
    if a.reply_to: payload["inReplyTo"] = a.reply_to
    st, r = call(sk, "POST", "/api/messages", payload)
    print("publish:", st, json.dumps(r)[:200])
    if st != 201: sys.exit(1)
    mid = r.get("board_content", {}).get("id") or r.get("id")

    # חוק ברזל 5: בדיקת נחיתה — ההודעה נראית בשרשור
    if a.reply_to:
        st2, th = call(sk, "GET", f"/api/messages/{a.reply_to}/thread", signed=False)
        ids = [m.get("id") for m in th.get("board_content", {}).get("messages", [])]
        print("landing check:", "VISIBLE" if mid in ids else f"NOT FOUND in {a.reply_to}")
        if mid not in ids: sys.exit(1)

if __name__ == "__main__":
    main()
