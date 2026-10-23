# ShimiStudio v2.0

## מה זה
ShimiStudio היא מערכת יצירת תוכן AI מקומית (local-first). הכל רץ על המחשב שלך — אין ענן, אין שרתים, אין תשלום חודשי. המערכת מספקת פתרון מקצה לקצה ליצירת תמונות, וידאו, Face ID, Face Swap, סנכרון שפתיים (Lip Sync) ושילוב מצלמת טלפון בזמן אמת, תוך שמירה מלאה על פרטיות הנתונים.

---

## תכונות
- **יצירת תמונות מטקסט (Flux.1 / SDXL)**: יצירת תמונות באיכות 8K, כולל תמיכה בפרומפטים מורכבים.
- **יצירת וידאו מתמונה (Wan 2.2 I2V / LTX-Video)**: הנפשת תמונות סטטיות לסרטוני וידאו ריאליסטיים.
- **Face ID (IP-Adapter FaceID + InsightFace / PuLID)**: נעילת זהות פנים מ-1-3 תמונות ושמירת עקביות הדמות בכל היצירות.
- **Face Swap (ReActor / inswapper_128)**: החלפת פנים מהירה ומדויקת בתמונות ובסרטוני וידאו.
- **TTS + Lip Sync (XTTS v2 / Wav2Lip / LatentSync)**: שיבוט קול (Voice Cloning) מגרסה קולית של 6 שניות וסנכרון שפתיים מלא לווידאו.
- **מצלמת פלאפון כקלט**: חיבור מצלמת הטלפון דרך הדפדפן כקלט תמונה/וידאו בזמן אמת או ל-ControlNet pose.
- **Bulk Generation**: יצירה מסיבית של אצוות (Batches) של תמונות ווידאו לפי תבניות ופרמטרים משתנים.
- **12 סטיילים, 8 מודים, 6 סטיילי וידאו, 6 דמויות**: ספריית סגנונות ופרסונות מוכנות מראש.
- **Free API fallback (Airforce, Pollinations, HuggingFace)**: גיבוי אוטומטי ל-APIs חינמיים כאשר אין GPU מקומי זמין.
- **Base44 integration (תור עבודות)**: ניהול ותזמון משימות רינדור מרחוק דרך תור עבודות חכם ב-Base44.
- **NSFW support מלא**: תמיכה מלאה וללא צנזורה ליצירת תוכן חופשי באופן מקומי.

---

## דרישות
- **Python 3.10+** (מומלץ Python 3.11)
- **GPU NVIDIA** עם 8GB+ VRAM (מומלץ 12GB+ VRAM לרינדור וידאו ב-Wan 2.2)
- **או: Google Colab / Kaggle** (שימוש ב-GPU חינמי בענן)
- **או: Free APIs** (עבודה במצב Fallback ללא GPU מקומי)

---

## התקנה
```bash
chmod +x install.sh
./install.sh
```

---

## הפעלה
```bash
./start.sh
# או ידנית:
python3 studio.py status    # בדיקת מערכת
python3 studio.py worker    # הפעלת worker
```

---

## פקודות
הרשימה המלאה של הפקודות ב-`studio.py` בצירוף דוגמאות שימוש:

### 1. status — בדיקת תקינות המערכת
בדיקת זמינות GPU, ComfyUI, חיבור ל-Base44 וסטטוס Free APIs.
```bash
python3 studio.py status
```

### 2. worker — הפעלת ה-Worker המקומי
הפעלת תהליך רקע שמקבל משימות מתור העבודות של Base44 ומבצע אותן ב-GPU המקומי.
```bash
python3 studio.py worker --worker-id gpu-node-01
```

### 3. generate — יצירת תמונה מטקסט
יצירת תמונה בודדת תוך שימוש בסגנון ומוד מוגדרים.
```bash
python3 studio.py generate --prompt "A beautiful woman in a neon-lit cyberpunk city" --style photorealistic --mood bold --output my_image.png
```

### 4. video — יצירת וידאו מתמונה
הנפשת תמונה קיימת לווידאו באמצעות מנוע Wan 2.2 I2V.
```bash
python3 studio.py video --image input.png --style pool_scene --duration 5 --output scene.mp4
```

### 5. face-swap — החלפת פנים
החלפת פנים בתמונה או בסרטון וידאו.
```bash
python3 studio.py face-swap --source face.jpg --target video.mp4 --output output_swapped.mp4
```

### 6. face-id — חילוץ ושמירת זהות פנים
יצירת פרופיל FaceID מתמונות ייחוס של דמות.
```bash
python3 studio.py face-id --name Luna --images face1.jpg,face2.jpg,face3.jpg
```

### 7. batch — יצירת אצווית (Bulk Generation)
הרצת יצירה מסיבית של מספר תמונות/סרטונים במקביל לפי קובץ הגדרות.
```bash
python3 studio.py batch --prompts-file prompts.json --count 6 --style anime
```

### 8. pipeline — הרצת פייפליין מלא מקצה לקצה
הרצת תהליך מלא: יצירת תמונה → נעילת FaceID → הנפשת וידאו → Face Swap → TTS → Lip Sync.
```bash
python3 studio.py pipeline --prompt "Luna walking on a sunny beach" --character luna --text "Hello everyone, welcome to ShimiStudio" --output final_movie.mp4
```

### 9. camera — חיבור מצלמת פלאפון
הפעלת שרת מצלמת טלפון לקבלת פרימים בזמן אמת דרך הדפדפן.
```bash
python3 studio.py camera --port 7860
```

### 10. list — הצגת רשימת רכיבים
הצגת רשימת הסטיילים, המודים, סטיילי הווידאו והדמויות הזמינות במערכת.
```bash
python3 studio.py list --type styles
```

### 11. config — ניהול הגדרות
הצגת והגדרה של נתיבי מערכת, מפתחות API ופרמטרים של ה-Worker.
```bash
python3 studio.py config --show
```

### 12. test — הרצת בדיקות מקיפות
הרצת בדיקת תקינות לכל רכיבי המערכת (ComfyUI, Python, dependencies, APIs).
```bash
python3 studio.py test --all
```

---

## ארכיטקטורה
המערכת בנויה בארכיטקטורה מקומית (local-first) גמישה ומבוזרת:

1. **Base44 (תזמון עבודות)**: שרת הפיקוד בענן המנהל את תור העבודות (`RenderJob`). מציע תמיכה ב-Long-Polling וב-Push Webhooks לצורך התראות מיידיות ל-Worker.
2. **Worker.py (מקומי)**: תהליך רץ מקומית, מושך עבודות מ-Base44, מעביר אותן לרינדור ב-ComfyUI ומחזיר את הכתובת/התוצאה.
3. **ComfyUI (GPU מקומי)**: מנוע הרינדור הראשי המריץ את המודלים השונים (Flux.1, Wan 2.2, ReActor, XTTS v2, LatentSync).
4. **פלאפון (מצלמה כקלט)**: דפדפן הטלפון משדר פרימים בזמן אמת ל-`phone_camera.py` המשמשים כקלט ל-ControlNet pose או FaceID.
5. **Fallback: Free APIs**: במקרה של מחסור ב-GPU מקומי, המערכת מפנה את הבקשות באופן אוטומטי ל-APIs חינמיים חיצוניים (Airforce, Pollinations, HuggingFace).
6. **הכל מקומי — פרטיות מלאה**: כל העיבוד הכבד, התמונות והסרטונים נשמרים ישירות על המחשב שלך ללא מעבר בשרתים צד-שלישי.

---

## קבצים
- `config.py` — הגדרות מרכזיות, נתיבים ופרמטרים של המערכת.
- `style_library.py` — ספריית סטיילים, מודים, סטיילי וידאו ודמויות מוכנות.
- `free_api.py` — מנגנון Free API rotation וניהול מכסות יומיות.
- `comfyui_client.py` — לקוח API לתקשורת וניהול workflows ב-ComfyUI.
- `workflows.py` — תבניות ה-Workflows השונות ל-ComfyUI.
- `base44_client.py` — לקוח API לתקשורת מול שרת תור העבודות של Base44.
- `worker.py` — Worker ראשי המאזין לתור העבודות ומבצע אותן.
- `batch_generator.py` — מנגנון ליצירה מסיבית באצוות (Bulk generation).
- `pipeline.py` — פייפליין מלא המקשר בין תמונה, וידאו, קול וסנכרון שפתיים.
- `phone_camera.py` — שרת אינטרנט לחיבור מצלמת פלאפון כקלט בזמן אמת.
- `studio.py` — הממשק הראשי (CLI) להפעלת המערכת.
- `install.sh` — סקריפט התקנה אוטומטי בלחיצה אחת.
- `start.sh` — סקריפט הפעלה אוטומטי לכל הרכיבים.

---

## סטיילים

### 12 סטיילים לתמונות (Styles)
| מזהה (ID) | שם | תיאור | מודל |
|-----------|----|-------|------|
| `photorealistic` | Photorealistic | צילום ריאליסטי, תאורה טבעית, פוקוס חד, 8K | Flux.1 / SDXL |
| `cinematic` | Cinematic | פריים קולנועי, תאורה דרמטית, עומק שדה רדוד | Flux.1 / SDXL |
| `anime` | Anime | סגנון אנימה יפנית, הצללת Cel, צבעים חיים | Flux.1 / SDXL |
| `oil_painting` | Oil Painting | ציור שמן קלאסי, משיכות מכחול בולטות, טקסטורת בד | Flux.1 / SDXL |
| `watercolor` | Watercolor | ציור בצבעי מים, קצוות רכים, מעברי צבע זורמים | Flux.1 / SDXL |
| `fantasy` | Fantasy | אמנות פנטזיה קסומה, תאורה אתרית וסביבה מפורטת | Flux.1 / SDXL |
| `artistic` | Artistic | צילום אמנותי, קומפוזיציה יצירתית, Fine Art | Flux.1 / SDXL |
| `sketch` | Sketch | רישום בעיפרון, קווי קווים מפורטים, עיבוד שחור-לבן | Flux.1 / SDXL |
| `amateur_phone` | Amateur Phone Photo | תמונת טלפון חובבנית, תאורה טבעית, ללא עריכה | Flux.1 / SDXL |
| `mirror_selfie` | Mirror Selfie | סלפי מול מראה בבית, תאורה טבעית, פוזה נינוחה | Flux.1 / SDXL |
| `gym_mirror` | Gym Mirror Selfie | סלפי מראה במכון כושר, עור מזיע, תאורת מכון טבעית | Flux.1 / SDXL |
| `conservatory` | Conservatory | תמונת טלפון בחממה/מרפסת, תאורת יום אפרורית | Flux.1 / SDXL |

### 8 מודים (Moods)
| מזהה (ID) | שם | תיאור האווירה והתאורה |
|-----------|----|----------------------|
| `sensual` | Sensual | אווירה חושנית, תאורה חמה ורכה, מצב רוח אינטימי |
| `romantic` | Romantic | אווירה רומנטית, תאורת שעת הזהב, בוקה רך |
| `bold` | Bold | קומפוזיציה נועזת, ניגודיות חזקה, צללים דרמטיים |
| `ethereal` | Ethereal | זוהר אתרי, תאורה רכה מפוזרת, אווירת חלום |
| `dark` | Dark | אווירה אפלה ומסתורית, תאורה נמוכה (Low key) |
| `playful` | Playful | אנרגיה שובבית, צבעים בהירים, פוזה עליזה |
| `intimate` | Intimate | סביבה אינטימית, תאורה מעומעמת חמה, זווית קרובה |
| `passionate` | Passionate | אנרגיה תשוקתית, הבעה עזה, טונים חמים |

### 6 סטיילי וידאו (Video Styles)
| מזהה (ID) | שם | יחס מופע (Ratio) | אורך (שניות) | מנוע וידאו | תיאור הסצנה |
|-----------|----|-----------------|--------------|-------------|-------------|
| `pool_scene` | Pool Scene | 16:9 | 5s | Wan 2.2 I2V | וידאו מרוחק של בריכה, תאורת שמש קשה, תנועת מצלמה טבעית |
| `gym_scene` | Gym Scene | 9:16 | 5s | Wan 2.2 I2V | וידאו מול מראה במכון כושר, תנועה טבעית, מוזיקת רקע |
| `tiktok_dance` | TikTok Dance | 9:16 | 10s | Wan 2.2 I2V | קטע ריקוד בסגנון טיקטוק, קצב דינמי |
| `conservatory_video` | Conservatory Video | 9:16 | 5s | Wan 2.2 I2V | סיבוב איטי בחממה ומעבר לכיוון המצלמה |
| `xxx_pool` | Pool XXX | 16:9 | 5s | Wan 2.2 I2V | וידאו מפורש בבריכה עם הורדת בגדים |
| `xxx_conservatory` | Conservatory XXX | 9:16 | 5s | Wan 2.2 I2V | וידאו מפורש בחממה בזווית קבועה |

### 6 דמויות (Characters)
| שם | תואר | סגנון ברירת מחדל | מוד ברירת מחדל | תיאור הדמות |
|----|------|-------------------|----------------|-------------|
| **Luna** | Mystical Dreamer | `ethereal` | `sensual` | דמות חלומית ורומנטית, אוהבת ליצור תוכן אתרי וקסום |
| **Scarlett** | Bold & Passionate | `cinematic` | `playful` | דמות נועזת ומלאת תשוקה, יוצרת תוכן דרמטי ללא הסתייגות |
| **Jade** | Artistic Visionary | `fantasy` | `bold` | דמות אמנותית וניסיונית, מתמקדת בקומפוזיציות יצירתיות |
| **Aria** | Sensual Enchantress | `photorealistic` | `romantic` | דמות מפתה ומכושפת, מתמקדת בפורטרטים ריאליסטיים חמים |
| **Nova** | Futuristic Cyberpunk | `artistic` | `dark` | דמות עתידנית ואפלה, מתמקדת בסצנות ניאון וסייברפאנק |
| **Venus** | Elegance & Glamour | `cinematic` | `intimate` | דמות אלגנטית ויוקרתית, מתמקדת בצילומי אופנה וזוהר |

---

## דוגמאות

### 1. יצירת תמונה פשוטה
```bash
python3 studio.py generate \
  --prompt "A woman sitting in a cozy coffee shop with rain outside" \
  --style photorealistic \
  --mood romantic \
  --output coffee_shop.png
```

### 2. יצירת וידאו מתמונה עם FaceID
```bash
python3 studio.py video \
  --image face_reference.jpg \
  --face-id luna \
  --style pool_scene \
  --duration 5 \
  --output pool_luna.mp4
```

### 3. Batch generation של 6 תמונות
```bash
python3 studio.py batch \
  --prompt "Portrait of a female warrior" \
  --count 6 \
  --style fantasy \
  --mood bold \
  --output-dir ./output/batch_warrior/
```

### 4. פייפליין מלא: תמונה ← FaceID ← אנימציה ← Face Swap ← TTS ← Lip Sync
```bash
python3 studio.py pipeline \
  --prompt "A news anchor delivering an update in a studio" \
  --face-images anchor_face.jpg \
  --text "Welcome to ShimiStudio version 2.0, running fully local on your GPU." \
  --voice-sample voice_sample.wav \
  --style cinematic \
  --output full_pipeline_result.mp4
```

### 5. מצלמת פלאפון ← ControlNet pose
```bash
python3 studio.py camera \
  --use-controlnet \
  --pose-mode dwpose \
  --target-prompt "Cyberpunk dancer in futuristic attire" \
  --port 7860
```

---

## Free APIs

כאשר GPU מקומי אינו זמין או עמוס, המערכת משתמשת בסבב (Rotation) של APIs חינמיים:

| ספק (Provider) | סוג (Type) | הגבלה יומית (Daily Limit) | תמיכת NSFW | איכות | דורש אימות (Auth) |
|----------------|------------|--------------------------|-----------|-------|-------------------|
| **Airforce** | Image | 1,000 בקשות/יום | ✅ כן | High | ❌ ללא |
| **Pollinations** | Image | 100 בקשות/יום | ✅ כן | Medium | ❌ ללא |
| **HuggingFace** | Image | 50 בקשות/יום | ❌ לא | Medium | ✅ כן (`HF_TOKEN`) |
| **DeepAI** | Image | 5 בקשות/יום | ✅ כן | High | ❌ ללא |
| **Runway** | Video | 5 בקשות/יום | ✅ כן | High | ✅ כן |
| **Pika** | Video | 10 בקשות/יום | ✅ כן | High | ✅ כן |
| **Synthesia** | Video | 3 בקשות/יום | ❌ לא | High | ✅ כן |
