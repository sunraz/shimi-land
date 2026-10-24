#!/usr/bin/env python3
# koda-motion-clip — CLI מלא להפקת קליפ תנועה קאנוני
# שימוש: python3 run.py quote|start|status|assemble|lesson-clips [args]
import argparse, json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER_API = "https://base44.app/api/apps/6a7a26d976bbf507dee190b7/functions/renderApi"
DARK_BG, TXT, TXT2 = "#08080A", "#F5F5F5", "#7fb0ff"

def sh(cmd, timeout=120):
    class R: returncode = 124; stderr = "timeout"
    try: return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired: return R()

def api(payload):
    r = sh(["curl","-s","-X","POST",RENDER_API,"-H","Content-Type: application/json",
            "-d",json.dumps(payload)], timeout=90)
    try: return json.loads(r.stdout)
    except Exception: return {"ok": False, "error": r.stdout[:200]}

def cards(outdir, top, sub=None, W=1280, H=720):
    """כרטיסי כותרת וחתימה בעברית RTL תקינה (reshaper+bidi) — כלל הברזל."""
    import arabic_reshaper
    from bidi.algorithm import get_display
    from PIL import Image, ImageDraw, ImageFont
    reshaper = arabic_reshaper.ArabicReshaper({'support_ligatures': True})
    heb = lambda t: get_display(reshaper.reshape(t))
    FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    def one(path, t1, t2=None):
        img = Image.new("RGB", (W, H), DARK_BG)
        d = ImageDraw.Draw(img)
        d.text((W//2, H//2 - (40 if t2 else 0)), heb(t1), font=ImageFont.truetype(FB, 58), fill=TXT, anchor="mm")
        if t2: d.text((W//2, H//2 + 50), heb(t2), font=ImageFont.truetype(FR, 34), fill=TXT2, anchor="mm")
        img.save(path)
    os.makedirs(outdir, exist_ok=True)
    one(os.path.join(outdir, "title.png"), top, sub)
    one(os.path.join(outdir, "sig.png"), "סקיל: קודה motion-clip · הפקה: שימי פיתוח · DNA: שימי חתימות")
    return os.path.join(outdir, "title.png"), os.path.join(outdir, "sig.png")

def seg(img_or_none, out, dur, vf=None):
    if img_or_none is None: return False
    vf = vf or ("split[bg][fg];[bg]scale=1280:720,boxblur=8,eq=brightness=-0.18[b];"
               "[fg]scale=-2:720[f];[b][f]overlay=(W-w)/2:0,format=yuv420p")
    vf2 = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x08080A,format=yuv420p"
    for f in (vf, vf2):
        r = sh(["ffmpeg","-y","-v","error","-loop","1","-t",str(dur),"-i",img_or_none,
                "-vf",f,"-c:v","libx264","-preset","medium","-crf","26","-r","24","-an",out], timeout=100)
        if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) > 10000: return True
    return False

def cmd_quote(a):
    print(json.dumps(api({"action":"quote","model":a.model,"seconds":a.seconds,
                          "prompt":open(a.prompt_file).read().strip() if a.prompt_file else a.prompt}),
                     ensure_ascii=False, indent=1))

def cmd_start(a):
    p = open(a.prompt_file).read().strip() if a.prompt_file else a.prompt
    assert a.frame_url and a.frame_url.startswith("https://") and "private" not in a.frame_url, \
        "פריים פותח חייב URL ציבורי (העלה קודם והעבר לינק)"
    r = api({"action":"video_start","model":a.model,"seconds":a.seconds,"prompt":p,
             "image_url":a.frame_url,"generate_audio":False})
    print(json.dumps(r, ensure_ascii=False))
    if r.get("video_id"): print("next: run.py status --id", r["video_id"])

def cmd_status(a):
    while True:
        r = api({"action":"video_status","video_id":a.id})
        st = r.get("status","?")
        print(f"[{time.strftime('%H:%M:%S')}] {st}", flush=True)
        if st in ("completed","failed"):
            print("URL:", r.get("output_url") or r.get("video_url"))
            err = (r.get("raw") or {}).get("error")
            if err: print("error:", json.dumps(err, ensure_ascii=False)[:200])
            return
        time.sleep(a.interval)

def cmd_assemble(a):
    title, sig = cards(a.out or "assemble_out", a.title, a.sub)
    d = a.out or "assemble_out"; os.makedirs(d, exist_ok=True)
    raw = os.path.abspath(a.raw)
    segs = []
    assert seg(title, os.path.join(d,"s0.mp4"), 1.6, "format=yuv420p,fade=t=out:st=1.2:d=0.4"), "title encode fail"
    segs.append(os.path.join(d,"s0.mp4"))
    r = sh(["ffmpeg","-y","-v","error","-i",raw,"-c:v","libx264","-preset","medium","-crf","26",
            "-vf","format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=%0.1f:d=0.4" % (a.raw_len-0.4),
            "-r","24","-an",os.path.join(d,"s1.mp4")], timeout=180)
    assert r.returncode == 0, r.stderr[-200:]
    segs.append(os.path.join(d,"s1.mp4"))
    assert seg(sig, os.path.join(d,"s2.mp4"), 2.2, "format=yuv420p,fade=t=in:st=0:d=0.4"), "sig encode fail"
    segs.append(os.path.join(d,"s2.mp4"))
    printf = os.path.join(d, "concat.txt")
    open(printf,"w").write("".join(f"file '{s}'\n" for s in segs))
    out = a.final or os.path.join(d, "final.mp4")
    r = sh(["ffmpeg","-y","-v","error","-f","concat","-safe","0","-i",printf,"-c","copy",out], timeout=90)
    assert r.returncode == 0, r.stderr[-200:]
    print("FINAL:", out, os.path.getsize(out)//1024, "KB")

def cmd_lesson_clips(a):
    """בניית קליפ לכל תרגיל מפריימיו. clips.json: [{id,title,frames:[urls]}]"""
    cfg = json.load(open(a.config))
    for c in cfg:
        clip_id = c["id"]; d = os.path.join(a.out, "cache", clip_id)
        final = os.path.join(a.out, f"kungfu_{clip_id}.mp4")
        if os.path.exists(final) and os.path.getsize(final) > 50000:
            print("SKIP", clip_id); continue
        title, sig = cards(d, c.get("top","קונג פו עם לאה"), c["title"])
        segs, dur_of = [], [1.6]
        assert seg(title, os.path.join(d,"st.mp4"), 1.6, "format=yuv420p,fade=t=out:st=1.2:d=0.4")
        segs.append(os.path.join(d,"st.mp4"))
        for i, u in enumerate(c["frames"]):
            dest = os.path.join(d, os.path.basename(u))
            if not os.path.exists(dest) or os.path.getsize(dest) < 1000:
                sh(["curl","-s","-o",dest,u], timeout=60)
            with open(dest,"rb") as fh: head = fh.read(2)
            assert head in (b"\xff\xd8", b"\x89P"), f"frame 404/corrupt: {u}"
            so = os.path.join(d, f"s{i}.mp4")
            assert seg(dest, so, 2.2), f"scene fail {clip_id} f{i}"
            segs.append(so); dur_of.append(2.2)
        assert seg(sig, os.path.join(d,"sg.mp4"), 2.2, "format=yuv420p,fade=t=in:st=0:d=0.4")
        segs.append(os.path.join(d,"sg.mp4")); dur_of.append(2.2)
        inputs = []
        for s in segs: inputs += ["-i", s]
        n = len(segs); parts, prev, off = [], "[0:v]", 0.0
        for i in range(1, n):
            off += dur_of[i-1] - 0.35
            o = f"[v{i}]" if i < n-1 else "[v]"
            parts.append(f"{prev}[{i}:v]xfade=transition=fade:duration=0.35:offset={off:.2f}{o}")
            prev = f"[v{i}]"
        fc = ";".join(parts) if n > 2 else "[0:v][1:v]concat=n=2:v=1:a=0[v]"
        r = sh(["ffmpeg","-y","-v","error",*inputs,"-filter_complex",fc,"-map","[v]",
                "-c:v","libx264","-preset","medium","-crf","26","-r","24","-an",final], timeout=180)
        if r.returncode == 0: print("CLIP OK", clip_id, os.path.getsize(final)//1024, "KB")
        else: print("CLIP FAIL", clip_id, r.stderr[-160:])

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    q = sub.add_parser("quote"); q.add_argument("--model", default="grok"); q.add_argument("--seconds", type=int, default=8)
    q.add_argument("--prompt", default=""); q.add_argument("--prompt-file")
    s = sub.add_parser("start"); s.add_argument("--model", default="grok"); s.add_argument("--seconds", type=int, default=6)
    s.add_argument("--frame-url", required=True); s.add_argument("--prompt", default=""); s.add_argument("--prompt-file")
    st = sub.add_parser("status"); st.add_argument("--id", required=True); st.add_argument("--interval", type=int, default=50)
    asm = sub.add_parser("assemble"); asm.add_argument("--raw", required=True); asm.add_argument("--title", required=True)
    asm.add_argument("--sub"); asm.add_argument("--raw-len", type=float, default=6.0)
    asm.add_argument("--out", default="assemble_out"); asm.add_argument("--final")
    lc = sub.add_parser("lesson-clips"); lc.add_argument("--config", required=True); lc.add_argument("--out", default=".")
    a = ap.parse_args()
    {"quote":cmd_quote,"start":cmd_start,"status":cmd_status,"assemble":cmd_assemble,"lesson-clips":cmd_lesson_clips}[a.cmd](a)
