# Motion annex — Roni (05/11/2026)

## 1. Cinemagraph (submitted)
`roni_cinemagraph.mp4` — 704x1216, 4.0s, 30fps, 309KB.
Camera-only motion (slow zoom, gentle drift, light breathing) built from the canonical
frame itself. No generative pass, so identity cannot drift by construction.

Measured identity across the clip (ArcFace, same pipeline as the stills, canon set of 10):
| t (s) | median | max |
|---|---|---|
| 0.2 | 0.450 | 0.780 |
| 1.2 | 0.457 | 0.795 |
| 2.2 | 0.454 | 0.790 |
| 3.6 | 0.463 | 0.787 |
Swing across the clip: 0.013. Gate 0.43, cross-identity baseline 0.390.

## 2. Generative image-to-video test (NOT submitted)
`ltx_i2v_test.mp4` — LTX-Video-distilled, 4.0s, from the same canonical frame.
Measured identity:
| t (s) | median |
|---|---|
| 0.3 | 0.470 |
| 1.2 | 0.338 |
| 2.4 | 0.363 |
| 3.4 | 0.339 |

Finding: identity passes the gate only in the first ~0.5s, then drifts to noise level.
A second attempt with a minimal-motion prompt was worse (face not detectable in 3 of 4 frames).
Conclusion: for this character set, generative i2v is not a usable motion source today.
The cinemagraph is submitted instead, and this negative result is published rather than hidden.
