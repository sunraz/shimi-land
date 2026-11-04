# הגשה — סט קאנון סינתטי "רוני"
**Submission — Synthetic Character Canon "Roni"**

רשת שימי · שימי פיתוח · 04/11/2026

---

## תקציר (עברית)

סט קאנון של דמות סינתטית אחת: 10 פריימים לבושים, תנאי הפקה אחידים, עם **ציון עקביות זהות מדוד של 0.517** (חציון קוסינוס ב-embedding של זיהוי פנים). הדמות מוצגת כסוכנת AI לכל דבר — עם זהות חזותית עקבית, לוח תוכן חודשי, וקול כתיבה — ולא כתמונה בודדת.

מה שמייחד את ההגשה: **העקביות נמדדת ולא מוצהרת.** כל פריים עבר זיהוי פנים בביטחון ≥0.75, וכל זוג פריימים נמדד מול כיול של שתי דמויות שונות (0.390). הסט עובר את רף 0.50, ואף זוג לא נופל לרמת הרעש.

## Abstract (English)

A canon set of one synthetic character: 10 clothed frames under a single production setup, with a **measured identity-consistency score of 0.517** (median cosine similarity in a face-recognition embedding). Presented not as a single image but as a complete AI persona: stable visual identity, a 30-day content calendar, and a defined voice.

What sets this submission apart: **consistency is measured, not claimed.** Every frame passes face detection at ≥0.75 confidence, and every frame pair is benchmarked against a cross-identity calibration of 0.390. The set clears the 0.50 threshold and no pair falls to noise level.

---

## השיטה / Method

1. **Face detection** — YuNet, confidence ≥0.75, minimum face width 80px (rejects false positives that would poison the baseline).
2. **Alignment** — 5-point similarity transform to the canonical 112×112 ArcFace template.
3. **Embedding** — ArcFace `w600k_mbf`, normalized, cosine similarity.
4. **Score** — median over all frame pairs (45 pairs for 10 frames); plus p10 and minimum to expose weak frames.
5. **Calibration** — the identical pipeline scores 0.390 between two *different* characters, so a score near 0.39 means "no shared identity".

כלי המדידה בקוד פתוח: `tools/identity_metric.py` (רץ על CPU, ללא GPU).

## Results

| Metric | Value |
|---|---|
| Frames with a detected face | 10 |
| Identity consistency (median cosine) | **0.517** |
| 10th percentile | 0.425 |
| Weakest pair | 0.400 |
| Cross-identity calibration (different characters) | 0.390 |
| Detection confidence, all frames | ≥ 0.75 |

## Negative results we published along the way

אנחנו מפרסמים גם את מה שלא עבד, כי זה מה שמונע מהתחום לחזור על אותן טעויות:

| Approach | Best measured identity score | Verdict |
|---|---|---|
| LoRA on face crops (12 configs: 2 checkpoints × 3 weights × 2 seeds) | 0.425 | below gate |
| Self-distillation bootstrap | 0.429 | degradation |
| IP-Adapter from reference | 0.245 | below noise |
| SDXL fixed seed + 4 prompt variants | 0.389 | no consistency |

המסקנה שמוגשת יחד עם הסט: עקביות דמות **אינה** מושגת על ידי אימון מחדש של זהות בכל סצנה — היא מושגת על ידי הפקה אחידה, סינון מדיד ושער קבלה מספרי.

## Disclosure / גילוי נאות

- כל הפריימים סינתטיים, נוצרו על ידי מערכת AI גנ�רטיבית של רשת שימי. הדמות בדויה ואינה מתארת אדם אמיתי.
- התוכן SFW: הדמות לבושה בכל הפריימים. פריימים שלא עמדו בתנאי תוכן לא נכללו.
- הציון נמדד ולא הוערך בעין; כל המספרים ניתנים לשחזור עם הכלי המקושר.

## Links

- עמוד ההגשה החי: https://aidoor.shimi.land/gallery/roni-canon-sfw-04-11/index.html
- מדידה גולמית: https://aidoor.shimi.land/gallery/roni-canon-sfw-04-11/measurement.json
- כלי המדידה: https://aidoor.shimi.land/tools/identity_metric.py
- תיעוד הניסויים השליליים: https://aidoor.shimi.land/gallery/lora-identity-closed/README.md
