# ShimiStudio-CLI

מערכת יצירת וידאו AI מהטרמינל — בלי IDE, בלי ענן, בלי עלויות.

## דרישות

- **Python 3.10+** ([הורדה](https://www.python.org/downloads/))
- **Git** ([הורדה](https://git-scm.com/downloads))
- **GPU NVIDIA עם 6GB+ VRAM** — מומלץ (עובד גם על CPU אבל איטי מאוד)
- **32GB RAM** — מספיק בהחלט

## התקנה (חד-פעמית)

```bash
python setup.py
```

הסקריפט יעשה הכל אוטומטית:
1. יצירת סביבה וירטואלית
2. התקנת PyTorch (CUDA או CPU לפי החומרה)
3. התקנת ComfyUI
4. התקנת Custom Nodes (VideoHelperSuite, AnimateDiff)
5. הורדת מודלים (~18GB, כתובות מאומתות)

**רק מודלים:**
```bash
python setup.py --models
```

**בדיקת מערכת:**
```bash
python setup.py --check
```

## הפעלה

```bash
python start.py
```

ComfyUI יפעל ב-`http://localhost:8188`.

**עם URL ציבורי (לניסוי מרוחק):**
```bash
python start.py --share
```

**פורט מותאם:**
```bash
python start.py --port 9000
```

## יצירת וידאו

**יצירה בסיסית:**
```bash
python generate.py --prompt "a cat playing piano in a jazz bar"
```

**בחירת מנוע:**
```bash
python generate.py --prompt "sunset over mountains" --engine wan21
python generate.py --prompt "city at night, neon lights" --engine ltx
```

**רשימת מנועים:**
```bash
python generate.py --engines
```

**הגדרות מתקדמות:**
```bash
python generate.py --prompt "ocean waves" \
    --engine wan21 \
    --width 1024 --height 576 \
    --length 41 --steps 30 \
    --cfg 3.5 --seed 123 \
    --output my_video
```

**פרמטרים:**
| פרמטר | ברירת מחדל | תיאור |
|-------|-----------|-------|
| `--prompt` | — | תיאור הוידאו (חובה) |
| `--negative` | "" | מה לא לכלול |
| `--engine` | wan21 | wan21 / ltx |
| `--seed` | 42 | seed לשחזור תוצאות |
| `--width` | 832/768 | רוחב בפיקסלים |
| `--height` | 480/512 | גובה בפיקסלים |
| `--length` | 25 | מספר פריימים |
| `--steps` | 20 | צעדי דגימה (יותר = איכות, לאט יותר) |
| `--cfg` | 3.5/3.0 | עוצמת הנחיה |
| `--output` | shimistudio | קידומת שם קובץ |
| `--port` | 8188 | פורט ComfyUI |
| `--timeout` | 600 | timeout בשניות |

## מנועים

| מנוע | גודל | VRAM | מהירות | איכות |
|------|------|------|--------|-------|
| Wan 2.1 T2V 1.3B | 2.8GB | 4-6GB | מהיר | טובה |
| LTX-Video 2B | 6.3GB | 8GB | מהיר מאוד | טובה |

הקבצים נשמרים בתיקיית `output/`.

## פתרון בעיות

**"לא מצליח להתחבר ל-ComfyUI"** — ודא ש-`start.py` רץ בטרמינל נפרד.

**יצירה איטית** — על CPU זה יקח דקות-שעות. GPU מומלץ.

**CUDA out of memory** — נסה `--length 13 --width 640 --height 384` (פחות פריימים/רזולוציה).

**הורדת מודל נכשלה** — בדוק חיבור אינטרנט, הרץ `python setup.py --models` שוב.

## מבנה קבצים

```
ShimiStudio-CLI/
├── setup.py          # התקנה חד-פעמית
├── start.py          # הפעלת שרת ComfyUI
├── generate.py       # יצירת וידאו מטקסט
├── models.py         # רישום מודלים (כתובות מאומתות)
├── workflows.py      # תבניות ComfyUI
├── requirements.txt  # תלויות Python
├── README.md         # הוראות אלו
├── ComfyUI/          # נוצר אוטומטית ע"י setup.py
├── venv/             # נוצר אוטומטית ע"י setup.py
└── output/           # נוצר אוטומטית ע"י generate.py
```
