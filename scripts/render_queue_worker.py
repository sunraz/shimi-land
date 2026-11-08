# -*- coding: utf-8 -*-
"""Shimi render queue worker — runs on GitHub Actions.
phases: claim -> render -> complete. No secrets on our server: the key lives here in Actions.
"""
import os, sys, json, glob, subprocess, urllib.request, urllib.error

API = "https://xn--eebao6b.wtf/api/fn/jobApi.php"
KEY = os.environ["RENDER_KEY"]
STATE = "queue_state.json"
RAW = "https://raw.githubusercontent.com/sunraz/shimi-land/main/"


def call(payload):
    req = urllib.request.Request(
        API, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "x-api-key": KEY}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def claim():
    d = call({"action": "claim", "worker": "gh-actions", "limit": 2})
    jobs = d.get("jobs", [])
    json.dump(jobs, open(STATE, "w"))
    print("claimed", len(jobs))
    return jobs


def render():
    jobs = json.load(open(STATE)) if os.path.exists(STATE) else []
    results = []
    for j in jobs:
        res = {"id": j["id"], "status": "failed", "error": "", "file": ""}
        if j.get("kind") != "image":
            res["error"] = f"engine not installed for kind={j.get('kind')}"
            results.append(res)
            continue
        p = j.get("params") or {}
        env = dict(os.environ)
        env.update({
            "LORA": (j.get("model") or "lea"),
            "PROMPT": j["prompt"],
            "NEG": p.get("negative") or env.get("NEG", ""),
            "SEED": str(p.get("seed") or "317001"),
            "W": str(p.get("width") or 832),
            "H": str(p.get("height") or 1216),
        })
        before = set(glob.glob("gallery/lora-renders/**/*.png", recursive=True))
        try:
            subprocess.run([sys.executable, "scripts/lora_render_gh.py"], env=env, check=True, timeout=6000)
            after = set(glob.glob("gallery/lora-renders/**/*.png", recursive=True))
            new = sorted(after - before)
            if new:
                res.update(status="done", file=new[-1])
            else:
                res["error"] = "render produced no file"
        except Exception as e:
            res["error"] = str(e)[:400]
        results.append(res)
    json.dump(results, open(STATE, "w"))
    print(json.dumps(results, ensure_ascii=False))


def complete():
    results = json.load(open(STATE)) if os.path.exists(STATE) else []
    for r in results:
        payload = {"action": "complete", "job_id": r["id"], "status": r["status"]}
        if r.get("file"):
            payload["result_url"] = RAW + r["file"]
        if r.get("error"):
            payload["error"] = r["error"]
        print(call(payload))


if __name__ == "__main__":
    phase = sys.argv[1] if len(sys.argv) > 1 else "claim"
    {"claim": claim, "render": render, "complete": complete}[phase]()
