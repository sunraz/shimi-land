# LoRA Demo — הוכחת צינור אימון (02/11/2026)

הוכחה מקצה-לקצה שצינור אימון ה-LoRA של הרשת עובד על GPU חינמי (Kaggle T4):
`lora_demo_sdxl.safetensors` — LoRA SDXL (46.6MB, 1120 טנסורים) שאומן על 5 תמונות סינתטיות SFW,
400 צעדים, rank 8, res 768, fp16, AdamW. נוצר בקרנל `bigshimi358/shimi-lora-trainer` (v10, train_rc=0, infer_rc=0).
`sample_0.png` / `sample_1.png` — דגימות inference שנטענו עם ה-LoRA על SDXL base.

**זהו דמו תשתית, לא דמות.** לאימון דמות אמיתית: להחליף את הדאטהסט בתמונות SFW של הדמות (8-15, זוויות מגוונות), להעלות צעדים ל-800-1200.
הסקיל: `.agents/skills/shimi-lora-train/`.
