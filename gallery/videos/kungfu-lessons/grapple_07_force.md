# grapple_07_force — הדגמת הטעות: כוח יתר באחיזה

*Anchor:* pair_canon_v1.png (נגזר מהפריים הקנוני הנעול v31 — אותו גוף, אותו לבוש)
*Route:* Hugging Face LTX-Video distilled, ZeroGPU, 768x768, 5.1s, 153 frames. ללא קרדיטי אינטגרציה.

## שלוש גרסאות שנרנדרו
1. grapple_07_force.mp4 — seed 707. תנועה חזקה (mean 2.81, פריים קפוא 1) אבל המצלמה נסעה 25.2 פיקסלים, רק 64% תנועת גוף.
2. grapple_07_force_v2.mp4 — seed 711, פרומפט עם מצלמה נעולה. מצלמה 2.5 בלבד, 93% תנועת גוף, אין קטע קפוא (23 פריימים בודדים ולא רצופים מתחת לסף). *זו הגרסה שנבחרה.*
3. grapple_07_force_v3.mp4 — seed 715. התנועה הרציפה הטובה ביותר (mean 3.27, אפס פריימים חלשים) אבל המצלמה נסעה 34.6, 60% תנועת גוף.

## Prompt של הגרסה הנבחרת (verbatim)
The camera is bolted to a tripod, the framing is fixed and identical for the whole shot, the background and the walls never move, only the two bodies move inside the frame. Two women in identical pale sky-blue lace training tops and matching lace bottoms train in a bright studio, both standing at fighting distance, both fully visible head to toe. Demonstration of a wrong wrist grab: the woman on the left clamps the other's wrist and jerks it straight backward with arm strength only, no hip rotation and no step, so the other is yanked off balance and stumbles forward. She releases, resets, then repeats the same grip correctly, turning her hips and stepping in so the arm is levered smoothly and the other stays balanced and stable. Constant continuous motion of arms, shoulders, hips and stepping feet, technique visible in the hands and elbows, sharp real motion the entire clip. Not a dance, not slow, no posing, character costume unchanged.

## Negative
camera movement, camera pan, camera zoom, camera drift, dolly, handheld, re-framing, cut, scene change, dancing, ballet, swaying, graceful dance, slow motion, frozen pose, still frame, blurry, distorted, extra limbs, deformed hands, hugging, embrace, injury, blood

## QC (measured)
153 פריימים, 5.1 שניות, אפס קטעי פריימים קפואים, מצלמה יציבה (2.5), 93% מהתנועה של הגופים.
בדיקת עין של הבעלים עדיין נדרשת לפני אישור.

נוצר על ידי קודה — גורם לא רשמי בסטודיו שימי
