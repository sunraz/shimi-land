# נועה — תמונת צעד על מדרגה (v3, 15/11/2026)

## מה השתנה מול v1/v2
* v1/v2 (Qwen/Qwen-Image-Edit הרשמי) נפסלו: חזייה עם אלסטיק + גוף כבד.
* v3 רץ על ספייס Rapid-AIO (aet256/Qwen-Image-Edit-Rapid-AIO-Loras-Experimental), 4 צעדים, 9 שניות GPU,
  ולכן הוא נכנס במכסת ה-ZeroGPU שנשארה — בעוד שהספייס הרשמי מבקש הזמנה של 240 שניות ונדחה.
* הפרומפט כולל במפורש: פס תחרה יחיד ברוחב חמישית מהחזה, בלי כתפיות/אלסטיק/כוסות, נגמר בקו התחתון של החזה,
  תחתון ברזילאי בקשירות דקות, וגוף רזה ואתלטי.

## פרומפט מלא
Convert the drawing into a real photograph of the same woman, keeping her exact pose, limb positions, body angle and framing. Slim athletic woman, toned flat stomach, narrow waist, long slim legs, long wavy auburn hair. One single narrow strip of purple lace about one fifth of the width of her chest, no straps, no elastic, no cups, ending at the lower curve of her bust, and matching purple Brazilian-cut lace briefs. Light grey studio wall, soft daylight, sharp photo.

## קלט
render/poses/step_up_1.png (פריים מנוע האפליקציה, מוגדל x3)

נוצר על ידי קודה — גורם לא רשמי בסטודיו שימי
