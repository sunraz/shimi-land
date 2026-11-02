# Face-crop LoRA — הוכחת מסלול בטוח (02/11/2026)

הצינור מזהה פנים (OpenCV YuNet), חותך כל פנים ל-768x768 סביב המרכז, ומאמן **על הפנים בלבד**.
כך אפשר לקבע זהות של דמות גם כשהסט המקורי אינו SFW: לקגל מגיעים רק חיתוכי פנים.

הרצה מאומתת: `bigshimi358/shimi-lora-trainer` v11 → FACE CROPS: 5, Steps 400/400 ב-12:17 (loss 0.142), train_rc=0, infer_rc=0.
תוצר: `pytorch_lora_weights.safetensors` 46,615,272 בייט / 1,120 טנסורים + דגימות inference 1024px.
