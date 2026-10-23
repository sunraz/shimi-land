import asyncio, json, re, time, urllib.request
from playwright.async_api import async_playwright

MAIL_ADDR = "<USERNAME_PLACEHOLDER>@maxxspace.com"
MAIL_PASS = "<PASSWORD_PLACEHOLDER>"
BP_USER = "<USERNAME_PLACEHOLDER>"
BP_PASS = "<PASSWORD_PLACEHOLDER>"

def mail_token():
    req = urllib.request.Request("https://api.mail.tm/token",
        data=json.dumps({"address": MAIL_ADDR, "password": MAIL_PASS}).encode(),
        headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=20))["token"]

def get_code(since_ts=0):
    try:
        tok = mail_token()
        req = urllib.request.Request("https://api.mail.tm/messages",
            headers={"Authorization": "Bearer " + tok})
        d = json.load(urllib.request.urlopen(req, timeout=20))
        msgs = d.get("hydra:member", d) if isinstance(d, dict) else d
        for m in (msgs or [])[:5]:
            req = urllib.request.Request(f"https://api.mail.tm/messages/{m['id']}",
                headers={"Authorization": "Bearer " + tok})
            full = json.load(urllib.request.urlopen(req, timeout=20))
            txt = full.get("text") or ""
            html = full.get("html") or ["",""]
            html = html[1] if isinstance(html, list) else html
            body = txt + " " + html + " " + full.get("intro","")
            match = re.findall(r"\b(\d{6})\b", body)
            if match: return match[0]
    except Exception as e:
        print("mail err:", str(e)[:60])
    return None

async def safe_load(page, ms=15000):
    try: await page.wait_for_load_state("networkidle", timeout=ms)
    except Exception: pass

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = await browser.new_context(locale="en-US")
        page = await ctx.new_page()
        await page.goto("https://signin.byteplus.com/auth/signup", timeout=60000)
        await page.wait_for_timeout(5000)
        await page.fill("#Email_input", MAIL_ADDR)
        await page.fill("#Identity_input", BP_USER)
        await page.fill("#Password_input", BP_PASS)
        # תיבות סימון (תנאים)
        boxes = await page.query_selector_all("input[type=checkbox]")
        for b in boxes:
            if not await b.is_checked():
                await b.click()
        await page.wait_for_timeout(500)
        # שליחה
        btn = await page.query_selector("button:has-text('Continue')")
        await btn.click()
        await safe_load(page, 25000)
        print("אחרי Continue:", page.url[:70])
        await page.wait_for_timeout(3000)
        # אולי נדרש קוד אימות למייל
        print("מחפש קוד במייל...")
        code = None
        for i in range(20):
            time.sleep(8)
            code = get_code()
            if code:
                print(f"קוד: {code} (ניסיון {i+1})")
                break
        if not code:
            print("אין קוד — מצלם ויוצא")
            await page.screenshot(path="no_code.png")
            await browser.close(); return
        # הזנת קוד
        otp = await page.query_selector("#code_input, input[type=text], input[placeholder*=code]")
        if otp:
            await otp.fill(code)
            vbtn = await page.query_selector("button:has-text('Continue'), button:has-text('Verify'), button:has-text('Submit')")
            if vbtn: await vbtn.click()
            await safe_load(page, 25000)
            print("אחרי קוד:", page.url[:70])
        await page.wait_for_timeout(5000)
        await page.screenshot(path="after_signup.png")
        await ctx.storage_state(path="bp_session.json")
        print("סופי:", page.url[:80])
        print("כותרת:", await page.title())
        await browser.close()

asyncio.run(main())
