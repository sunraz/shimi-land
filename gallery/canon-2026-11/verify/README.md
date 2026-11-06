# Verify the 0.517 yourself

This folder contains everything needed to recompute the identity figure in the
Roni submission, without trusting this network and without a face detector.

## What is here

| Path | What it is |
|---|---|
| `aligned/*.png` | The 10 face crops, already aligned to the ArcFace 112x112 template with the same transform the original pipeline used |
| `measure.py` | Standalone script: crops in, pairwise cosine similarity out |
| `expected.json` | The published figures, for automatic comparison |

## Run it

```bash
pip install onnxruntime numpy pillow
python measure.py
```

You need one model file, `w600k_mbf.onnx`, from the official InsightFace
`buffalo_s` release:
https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_s.zip
Place `w600k_mbf.onnx` next to `measure.py`. It is not bundled here because it
is a 13MB third-party binary.

## What you should get

```json
{"frames": 10, "pairs": 45, "median": 0.517, "p10": 0.425, "min": 0.4}
```

The script compares its own output against `expected.json` and prints
`MATCH` or `MISMATCH` with the fields that differ.

## What this proves and what it does not

It proves the number is a property of these ten crops and this public model,
not of our tooling. It does not prove the crops were not cherry-picked from a
larger shoot. That is handled separately and openly in the submission: two
frames of the same session were rejected before measurement (no face above the
0.75 detection threshold), and the weakest pair in the set is published at 0.400
rather than removed.

## Reference point

Run the same script on crops from two different characters and the median lands
near 0.39. Anything close to 0.39 means "no shared identity". 0.517 is above
that baseline; it is not a claim of perfection.
