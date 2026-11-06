#!/usr/bin/env python3
"""
SINGULARITY/CHARACTER REPRO — measure identity consistency from aligned crops.

Why this file exists: the submission claims a median identity of 0.517 across
10 frames. A number you cannot recompute is a claim, not a measurement.

This script needs NO face detector, NO alignment, NO network of its own beyond
one model download. The crops in ./aligned are already aligned to the ArcFace
112x112 template by the same transform the original pipeline used, so the only
remaining variable is the embedding model itself.

Usage:
    pip install onnxruntime numpy pillow
    python measure.py

Expected output is in expected.json. If you get something else, this bundle is
broken or the crops were altered — that is the point of publishing it.
"""

import glob
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = os.path.join(HERE, "w600k_mbf.onnx")
MODEL_URL = (
    "https://github.com/deepinsight/insightface/releases/download/v0.7/"
    "buffalo_s.zip"
)
EXPECTED = os.path.join(HERE, "expected.json")


def load_session():
    try:
        import onnxruntime as ort
    except ImportError:
        sys.exit("missing dependency: pip install onnxruntime numpy pillow")

    if not os.path.exists(MODEL):
        sys.exit(
            "model not found: w600k_mbf.onnx\n"
            "Get it from the insightface buffalo_s release and place it next to "
            "this script:\n  " + MODEL_URL + "\n"
            "(that zip contains models/buffalo_s/w600k_mbf.onnx — this file only)"
        )
    so = ort.SessionOptions()
    so.log_severity_level = 3
    return ort.InferenceSession(MODEL, so, providers=["CPUExecutionProvider"])


def embed(sess, path):
    """112x112 aligned crop -> L2-normalised 512-d embedding."""
    from PIL import Image

    img = Image.open(path).convert("RGB").resize((112, 112))
    x = np.asarray(img, dtype=np.float32)
    x = (x - 127.5) / 127.5
    x = x.transpose(2, 0, 1)[None]
    iname = sess.get_inputs()[0].name
    v = sess.run(None, {iname: x})[0][0]
    n = np.linalg.norm(v)
    if n == 0:
        return None
    return v / n


def main():
    crops = sorted(glob.glob(os.path.join(HERE, "aligned", "*.png")))
    if not crops:
        sys.exit("no crops found in ./aligned")

    sess = load_session()
    vecs, names = [], []
    for p in crops:
        v = embed(sess, p)
        if v is not None:
            vecs.append(v)
            names.append(os.path.basename(p))

    n = len(vecs)
    if n < 2:
        sys.exit("need at least 2 usable crops")

    sims = []
    for i in range(n):
        for j in range(i + 1, n):
            sims.append(float(np.dot(vecs[i], vecs[j])))
    sims = np.array(sims)

    result = {
        "frames": n,
        "pairs": int(len(sims)),
        "median": round(float(np.median(sims)), 3),
        "p10": round(float(np.percentile(sims, 10)), 3),
        "min": round(float(np.min(sims)), 3),
        "max": round(float(np.max(sims)), 3),
    }

    print(json.dumps(result, indent=2))

    if os.path.exists(EXPECTED):
        exp = json.load(open(EXPECTED))
        keys = ("frames", "pairs", "median", "p10", "min")
        bad = [k for k in keys if result.get(k) != exp.get(k)]
        print("\n" + ("MATCH — reproduces the published figures exactly."
                      if not bad else
                      "MISMATCH on: " + ", ".join(bad)))
        return 0 if not bad else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
