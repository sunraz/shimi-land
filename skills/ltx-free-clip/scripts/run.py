#!/usr/bin/env python3
# ltx-free-clip — קליפ וידאו חינמי מפריים דרך מרחב ZeroGPU חי (gradio_client)
# שימוש:
#   run.py check
#   run.py upload --file <path>
#   run.py render --image <url> --prompt "..." --out out.mp4 [--duration 5] [--height 1216] [--width 704]
#   run.py batch --config jobs.json
# טוקן HF: env HF_TOKEN / /tmp/hf_token / token.txt לצד הסקריפט (מצורף לחבילה).
#           הוראות השגת טוקן עצמאי לכל סוכן — ב-TOKEN.md.
import argparse, json, os, subprocess, sys, time

SPACE = "Lightricks/ltx-video-distilled"
API_NAME = "/image_to_video"
NEG = "worst quality, inconsistent motion, blurry, jittery, distorted"

def ensure_deps():
    try:
        import gradio_client  # noqa
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "gradio_client"], check=True)

def hf_token():
    # 1. משתנה סביבה
    t = os.environ.get("HF_TOKEN")
    # 2. /tmp/hf_token
    if not t and os.path.exists("/tmp/hf_token"):
        t = open("/tmp/hf_token").read().strip()
    # 3. token.txt לצד הסקריפט (מגיע עם החבילה)
    if not t:
        cand = os.path.join(os.path.dirname(os.path.abspath(__file__)), "token.txt")
        if os.path.exists(cand):
            t = open(cand).read().strip()
    return t or None

def install_token():
    """מעתיק את הטוקן המצורף ל-/tmp/hf_token כך שגם ריצות עתידיות ימצאו אותו."""
    t = hf_token()
    if t:
        try:
            open("/tmp/hf_token", "w").write(t)
        except Exception:
            pass
    return t

def upload(path):
    r = subprocess.run(["curl", "-s", "-F", f"file=@{path}", "https://x0.at"],
                       capture_output=True, text=True, timeout=600)
    link = r.stdout.strip()
    if not link.startswith("http"):
        print("העלאה נכשלה:", r.stdout[:200]); sys.exit(1)
    print(link)
    return link

def check():
    import urllib.request, json as j
    req = urllib.request.Request(f"https://huggingface.co/api/spaces/{SPACE}",
                                 headers={"User-Agent": "shimi"})
    d = j.loads(urllib.request.urlopen(req, timeout=30).read())
    rt = d.get("runtime") or {}
    ok = rt.get("stage") == "RUNNING" and rt.get("hardware", {}).get("current", "").startswith("zero")
    print(f"stage={rt.get('stage')} hw={rt.get('hardware')} -> {'✅ חי' if ok else '❌ לא זמין — חפש חלופה לפי SKILL.md'}")
    return ok

def quota_error(e):
    msg = str(e)
    return "exceeded your ZeroGPU quota" in msg, msg

def render(image, prompt, out, duration=5, height=1216, width=704, seed=None):
    ensure_deps()
    install_token()
    from gradio_client import Client, handle_file
    import inspect
    kw = {}
    if hf_token():
        params = inspect.signature(Client.__init__).parameters
        kw["token" if "token" in params else "hf_token"] = hf_token()
    c = Client(SPACE, verbose=False, **kw)
    try:
        res = c.predict(
            prompt=prompt, negative_prompt=NEG,
            input_image_filepath=handle_file(image), input_video_filepath=None,
            height_ui=height, width_ui=width, mode="image-to-video",
            duration_ui=duration, ui_frames_to_use=9,
            seed_ui=seed or 42, randomize_seed=seed is None,
            ui_guidance_scale=1, improve_texture_flag=True,
            api_name=API_NAME)
    except Exception as e:
        is_q, msg = quota_error(e)
        print(json.dumps({"ok": False, "quota_exceeded": is_q,
                          "error": msg[:300]}, ensure_ascii=False))
        sys.exit(2)
    src = res[0]["video"] if isinstance(res[0], dict) else res[0]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "wb") as f, open(src, "rb") as s:
        f.write(s.read())
    print(json.dumps({"ok": True, "file": out, "seed": res[1],
                      "size": os.path.getsize(out)}, ensure_ascii=False))

def batch(config_path):
    """jobs.json: [{"name","image","prompt"}, ...] — מדווח אילו הושלמו ואילו נותרו בסוף."""
    jobs = json.load(open(config_path))
    done, remaining = [], []
    for j in jobs:
        out = f"{j['name']}.mp4"
        if os.path.exists(out):
            done.append(j["name"]); continue
        print(f"🎬 {j['name']}", flush=True)
        try:
            render(j["image"], j["prompt"], out)
            done.append(j["name"])
            upload(out)
        except SystemExit as e:
            if e.code == 2:  # מכסה
                remaining = [x["name"] for x in jobs if x["name"] not in done]
                print(json.dumps({"ok": False, "done": done, "remaining": remaining},
                                 ensure_ascii=False))
                return
            raise
    print(json.dumps({"ok": True, "done": done}, ensure_ascii=False))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    up = sub.add_parser("upload"); up.add_argument("--file", required=True)
    r = sub.add_parser("render")
    r.add_argument("--image", required=True); r.add_argument("--prompt", required=True)
    r.add_argument("--out", required=True); r.add_argument("--duration", type=float, default=5)
    r.add_argument("--height", type=int, default=1216); r.add_argument("--width", type=int, default=704)
    r.add_argument("--seed", type=int, default=None)
    b = sub.add_parser("batch"); b.add_argument("--config", required=True)
    a = p.parse_args()
    if a.cmd == "check": check()
    elif a.cmd == "upload": upload(a.file)
    elif a.cmd == "render": render(a.image, a.prompt, a.out, a.duration, a.height, a.width, a.seed)
    elif a.cmd == "batch": batch(a.config)
