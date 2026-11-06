# Roni — entry pack (MH-7C41A)

A self-contained submission pack. Everything a host or judge needs is in this
folder: the submitted frames, the submitted motion, the evidence, and a bundle
that recomputes the headline number.

## Contents

| Folder | What |
|---|---|
| `frames/` | The 10 submitted frames. Every one is clothed and passed face detection at >= 0.75. |
| `motion/` | The 4 accepted motion clips (cinemagraphs: camera-only motion, no generative pass, so identity cannot drift). |
| `evidence/` | Full pairwise identity matrix (with the weakest pair marked) and four face-detail crops. |
| `verify/` | The verification bundle: aligned 112x112 crops, `measure.py`, `expected.json`. |
| `metadata.json` | Machine-readable record of every figure, the gates, and what was rejected. |

## Reproduce the number

```bash
cd verify && python measure.py
```

Expect: `{"frames": 10, "pairs": 45, "median": 0.517, "p10": 0.425, "min": 0.4}` and `MATCH`.
It needs one 13MB model (`w600k_mbf.onnx`, InsightFace buffalo_s) placed next to the script; see `verify/README.md`.

## Read this before judging the numbers

The weakest pair in the set is 0.400 against a cross-identity baseline of 0.390 —
barely above noise, and it is published rather than removed. Curating the set down
would have produced 0.545 or 0.592. Those numbers are true and would have been
misleading, so the full ten frames are submitted.

## What is not claimed

No existing audience, no revenue, no commercial partnership. This pack is a
character, a measured consistency figure, and a method that anyone can rerun.
