# Shimi Dev — engine fix v2 (Sun order 11/10)
# ROOT CAUSE FOUND: pipeline returns frames in 0-1 float range; the brightness checker
# assumed 0-255 => every healthy render was misflagged "BLACK OUTPUT" and saved as near-black mp4.
# Fix: robust range normalization (tensor/PIL/float/uint8) + sane check + save real mp4 + PNG proof.
import os, json, sys, traceback, gc, time, subprocess
subprocess.run(['pip', 'uninstall', '-y', '-q', 'torchao'])
subprocess.run(['pip', 'install', '-q', '-U', 'diffusers>=0.33.0', 'transformers', 'accelerate', 'imageio', 'safetensors'])

import os as _os
PROMPT_HOOK = None

import torch

QUEUE = json.loads(os.environ.get("WAN_QUEUE", "[]"))
while isinstance(QUEUE, str):
    QUEUE = json.loads(QUEUE)
OUT = "/kaggle/working"
os.makedirs(OUT, exist_ok=True)
DEV = "cuda" if torch.cuda.is_available() else "cpu"
report = {"device": DEV, "gpu": torch.cuda.get_device_name(0) if DEV == "cuda" else None,
          "torch": torch.__version__, "rendered": [], "failed": [], "probes": [], "engine": None}
print("ENGINE FIX v2 — RANGE BUG", report["gpu"], flush=True)

NEG_DEFAULT = "blurry, low quality, distorted, watermark, text, deformed, changing face, extra limbs, ugly, low resolution, jpeg artifacts"

import diffusers
from diffusers import WanPipeline
MID = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
report["diffusers"] = diffusers.__version__

PIPE = None

def build_pipe():
    global PIPE
    PIPE = WanPipeline.from_pretrained(MID, torch_dtype=torch.float16)
    if DEV == "cuda":
        PIPE.enable_model_cpu_offload()
    else:
        PIPE.to(DEV)
    try:
        PIPE.vae.enable_tiling()
    except Exception:
        pass
    return "wan21-13b-range-fix"

def to_uint8(frames):
    """Normalize any frame representation to HxWx3 uint8."""
    import numpy as np
    out = []
    for f in frames:
        a = f.cpu() if hasattr(f, "cpu") else f
        if hasattr(a, "numpy"):
            a = a.numpy()
        a = np.asarray(a)
        if a.dtype.kind == 'f':
            if a.max() <= 1.5:
                a = (np.clip(a, 0, 1) * 255).astype(np.uint8)
            else:
                a = np.clip(a, 0, 255).astype(np.uint8)
        else:
            a = a.astype(np.uint8)
        if a.ndim == 4:
            a = a[0]
        # drop alpha
        if a.shape[-1] == 4:
            a = a[..., :3]
        out.append(a)
    return out

def frames_info(frames):
    import numpy as np
    first = np.asarray(frames[0], dtype=np.float32) if not hasattr(frames[0], 'cpu') else None
    return {"n": len(frames),
            "raw_type": type(frames[0]).__name__,
            "raw_min": float(first.min()) if first is not None else None,
            "raw_max": float(first.max()) if first is not None else None}

def frame_means(u8frames):
    import numpy as np
    means = []
    for idx in (0, len(u8frames) // 2, len(u8frames) - 1):
        means.append(round(float(np.asarray(u8frames[idx], dtype=np.float32).mean()), 1))
    return means

def render(item):
    gen = torch.Generator(DEV).manual_seed(item.get("seed", 7))
    kw = dict(
        prompt=item["prompt"],
        negative_prompt=item.get("negative", NEG_DEFAULT),
        num_frames=item.get("num_frames", 81),
        guidance_scale=item.get("cfg", 6.0),
        num_inference_steps=item.get("steps", 24),
        generator=gen,
        height=item.get("height", 272),
        width=item.get("width", 480),
        max_sequence_length=512,
    )
    return PIPE(**kw).frames[0]

def save(u8frames, fid):
    import imageio
    fp = f"{OUT}/{fid}.mp4"
    imageio.mimwrite(fp, u8frames, fps=16, quality=8)
    # PNG proofs: first + middle frame
    from PIL import Image
    Image.fromarray(u8frames[0]).save(f"{OUT}/{fid}_f0.png")
    Image.fromarray(u8frames[len(u8frames) // 2]).save(f"{OUT}/{fid}_mid.png")
    return fp

def main():
    engine = build_pipe()
    report["engine"] = engine

    # Phase 1: probe — prove the frames are valid and NOT black
    p = {"id": "probe", "prompt": "A golden retriever puppy running on a sunny beach, waves behind it, photorealistic",
         "seed": 7, "num_frames": 17, "steps": 8, "cfg": 6.0}
    t0 = time.time()
    raw = render(p)
    info = frames_info(raw)
    u8 = to_uint8(raw)
    means = frame_means(u8)
    ok = min(means) > 8.0
    report["probes"].append({"engine": engine, "raw": info, "means_255": means, "ok": ok,
                              "sec": round(time.time() - t0)})
    print("PROBE raw:", json.dumps(info), "means255:", means, "ok:", ok, flush=True)
    if not ok:
        raise RuntimeError("frames genuinely dark even after range fix: " + json.dumps(report["probes"]))

    # Phase 2: real renders
    for it in QUEUE:
        fid = it["id"]
        try:
            t0 = time.time()
            raw = render(it)
            u8 = to_uint8(raw)
            means = frame_means(u8)
            if min(means) <= 8.0:
                raise RuntimeError(f"genuinely dark clip means={means}")
            fp = save(u8, fid)
            report["rendered"].append({"id": fid, "file": os.path.basename(fp), "means_255": means,
                                        "sec": round(time.time() - t0), "bytes": os.path.getsize(fp)})
            print("OK", fid, means, os.path.getsize(fp), flush=True)
        except Exception:
            report["failed"].append({"id": fid, "error": traceback.format_exc(limit=4)})
            print("FAIL", fid, flush=True)
        gc.collect()
        if DEV == "cuda":
            torch.cuda.empty_cache()

    with open(f"{OUT}/_report.json", "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print("DONE", json.dumps(report, ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
