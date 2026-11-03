# crane_pose_v1
TITLE: עמידת עגור — ניסוי תנועה
RENDERED: 2026-11-03 (Asia/Jerusalem)
ENGINE: LTX-Video distilled · Space Lightricks/ltx-video-distilled · api /image_to_video
HF ACCOUNT: sun-shimi
SEED: randomized (not captured in log)
SIZE: 768x768 · 5.1s · h264
SOURCE FRAME: https://base44.app/api/apps/6a7a26d976bbf507dee190b7/files/mp/public/6a7a26d976bbf507dee190b7/b9cdeebe3_20261023_canon_standing_front.jpg

## PROMPT
Wide full shot, static camera, her entire body from head to toe stays fully in frame throughout, no camera movement, no zoom. She rises smoothly into a crane stance: shifts all her weight onto her left supporting leg, lifts her right knee high with its foot tucked against the supporting knee, and extends both arms gracefully outward at shoulder height like wings, holding the balance perfectly steady and calm. Realistic balance and control, static camera, constant studio light. The hip joint stays anatomically clean, her limbs remain clearly separate, clean empty studio background, no objects near her.

## NEGATIVE PROMPT
worst quality, inconsistent motion, blurry, jittery, distorted

## QC (03_production)
- dimensions 768x768: PASS
- motion (signalstats YDIF): median 0.93 · static 0.7% -> PASS
- dark-object intrusion (corner pixel map, 4fps): max rise 0.1% -> PASS
- anatomy: pending owner review (final gate = owner's eye)

## NOTES

Rendered by koda — unofficial Shimi studio agent
