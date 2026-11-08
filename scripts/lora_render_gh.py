# -*- coding: utf-8 -*-
# רנדר לורה על GitHub Actions (CPU, bfloat16) — מנוע kohya-native
# מופעל מ-workflow_dispatch. פרמטרים מגיעים ממשתני סביבה.
import os, sys, math, random, re, json, subprocess, urllib.request
import numpy as np
import torch

LORA = os.environ.get("LORA", "lea")            # lea | shani
PROMPT = os.environ["PROMPT"]
NEG = os.environ.get("NEG", "deformed, distorted, extra limbs, bad anatomy, plastic skin, thin, flat chest, blurry, watermark, text, child")
SEED = int(os.environ.get("SEED", "317001"))
W = int(os.environ.get("W", "832"))
H = int(os.environ.get("H", "1216"))
STEPS = int(os.environ.get("STEPS", "28"))
CFG = float(os.environ.get("CFG", "6.0"))
SCALE = float(os.environ.get("SCALE", "0.8"))

LORA_URLS = {
  "lea":   "https://github.com/sunraz/shimi-land/releases/download/lea-lora-v1/lea_lora.safetensors",
  "shani": "https://github.com/sunraz/shimi-land/releases/download/shani-lora-v1/shani_lora.safetensors",
}
assert LORA in LORA_URLS, "לורה לא מוכרת"
WORK = os.environ.get("GITHUB_WORKSPACE", ".")
BASE = os.path.join(WORK, "_render")
os.makedirs(BASE, exist_ok=True)

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "ftfy","toml","einops","voluptuous","safetensors","transformers","accelerate","diffusers"], check=True)
CKPT = os.path.join(BASE, "realvis.safetensors")
if not os.path.exists(CKPT):
    print("מוריד מודל בסיס...", flush=True)
    urllib.request.urlretrieve("https://huggingface.co/SG161222/RealVisXL_V5.0/resolve/main/RealVisXL_V5.0_fp16.safetensors", CKPT)
LORA_PATH = os.path.join(BASE, f"{LORA}_lora.safetensors")
if not os.path.exists(LORA_PATH):
    urllib.request.urlretrieve(LORA_URLS[LORA], LORA_PATH)
print("לורה:", os.path.getsize(LORA_PATH), flush=True)

# קוד kohya
_SD = os.path.join(BASE,"sd-scripts")
if not os.path.isdir(_SD) or not os.listdir(_SD):
    subprocess.run(["git","clone","--quiet","--depth","1","https://github.com/kohya-ss/sd-scripts", _SD], check=True)
sys.path.insert(0, os.path.join(BASE,"sd-scripts"))
from library import sdxl_model_util
import networks.lora as lora

DEVICE, DTYPE = "cpu", torch.bfloat16
print("טועם מודלים (CPU)...", flush=True)
tm1, tm2, vae, unet, _, _ = sdxl_model_util.load_models_from_sdxl_checkpoint(
    sdxl_model_util.MODEL_VERSION_SDXL_BASE_V1_0, CKPT, DEVICE)
unet = unet.to(DEVICE, dtype=DTYPE).eval()
vae = vae.to(DEVICE, dtype=torch.float32).eval()
tm1 = tm1.to(DEVICE, dtype=DTYPE).eval(); tm2 = tm2.to(DEVICE, dtype=DTYPE).eval()

# אימות מיזוג: משקל לפני/אחרי
from safetensors.torch import load_file
lsd = load_file(LORA_PATH)
probe_key = next(k for k in lsd if k.startswith("lora_unet_") and k.endswith("attn1_to_q.lora_up.weight"))
pp = re.sub(r"_(\d+)", r".\1", probe_key[len("lora_unet_"):-len(".lora_up.weight")])
def get_mod(root, dotted):
    obj = root
    for tok in dotted.split("."):
        obj = obj[int(tok)] if tok.isdigit() else getattr(obj, tok)
    return obj
probe_mod = get_mod(unet, pp)
w_before = probe_mod.weight.detach().float().clone()
net, weights_sd = lora.create_network_from_weights(SCALE, LORA_PATH, vae, [tm1, tm2], unet, None, True)
net.merge_to([tm1, tm2], unet, weights_sd, DTYPE, DEVICE)
delta = (probe_mod.weight.detach().float() - w_before).abs().max().item()
print(f"WEIGHT CHANGED: {delta > 1e-4} | max delta: {delta}", flush=True)
assert delta > 1e-4, "המיזוג לא השפיע — כשל"
print("LORA VERIFIED: TRUE", flush=True)

from library.clip_tokenizer import CLIPTokenizer
tok1 = CLIPTokenizer.from_pretrained("openai/clip-vit-large-patch14")
tok2 = CLIPTokenizer.from_pretrained("laion/CLIP-ViT-bigG-14-laion2B-39B-b160k")
from diffusers import EulerDiscreteScheduler
scheduler = EulerDiscreteScheduler(num_train_timesteps=1000, beta_start=0.00085, beta_end=0.0120, beta_schedule="scaled_linear")
from PIL import Image

def timestep_embedding(x, outdim, max_period=10000):
    half = outdim // 2
    freqs = torch.exp(-math.log(max_period) * torch.arange(start=0, end=half, dtype=torch.float32) / half).to(x.device)
    args = x[:, None].float() * freqs[None]
    emb = torch.cat([torch.cos(args), torch.sin(args)], dim=-1)
    if outdim % 2 == 1: emb = torch.cat([emb, torch.zeros_like(emb[:, :1])], dim=-1)
    return emb

print("מרנדר (CPU — לוקח דקות)...", flush=True)
with torch.no_grad():
    ev1 = timestep_embedding(torch.FloatTensor([H, W]).unsqueeze(0), 256)
    ev2 = timestep_embedding(torch.FloatTensor([0, 0]).unsqueeze(0), 256)
    ev3 = timestep_embedding(torch.FloatTensor([H, W]).unsqueeze(0), 256)
    c_vector = torch.cat([ev1, ev2, ev3], dim=1).to(DEVICE, dtype=DTYPE)
    def encode(text):
        b1 = tok1(text, truncation=True, padding="max_length", return_tensors="pt")
        b2 = tok2(text, truncation=True, padding="max_length", return_tensors="pt")
        t1 = b1["input_ids"].to(DEVICE); t2 = b2["input_ids"].to(DEVICE)
        e1 = tm1(t1, output_hidden_states=True, return_dict=True)["hidden_states"][11]
        e2o = tm2(t2, output_hidden_states=True, return_dict=True)
        return torch.cat([e1, e2o["hidden_states"][-2]], dim=2), e2o["text_embeds"]
    c_ctx, c_pool = encode(PROMPT)
    uc_ctx, uc_pool = encode(NEG)
    c_vector = torch.cat([c_pool, c_vector], dim=1)
    uc_vector = torch.cat([uc_pool, c_vector.clone()], dim=1)
    text_embeddings = torch.cat([uc_ctx, c_ctx])
    vector_embeddings = torch.cat([uc_vector, c_vector])
    random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
    latents = torch.randn((1, 4, H // 8, W // 8), device="cpu", dtype=torch.float32).to(DEVICE, dtype=DTYPE)
    latents = latents * scheduler.init_noise_sigma
    scheduler.set_timesteps(STEPS, DEVICE)
    for t in scheduler.timesteps.to(DEVICE):
        lmi = scheduler.scale_model_input(latents.repeat((2,1,1,1)), t)
        npred = unet(lmi, t, text_embeddings, vector_embeddings)
        un, tx = npred.chunk(2)
        npred = un + CFG * (tx - un)
        latents = scheduler.step(npred, t, latents).prev_sample
    latents = 1 / sdxl_model_util.VAE_SCALE_FACTOR * latents
    image = vae.decode(latents.to(torch.float32)).sample
    image = (image / 2 + 0.5).clamp(0, 1).cpu().permute(0, 2, 3, 1).float().numpy()
    img = Image.fromarray((image[0] * 255).round().astype("uint8"))

OUT_DIR = os.path.join(WORK, "gallery", "lora-renders", LORA)
os.makedirs(OUT_DIR, exist_ok=True)
fn = os.path.join(OUT_DIR, f"{LORA}LORA_s{SEED}.png")
img.save(fn)
print("SAVED:", fn, os.path.getsize(fn), flush=True)
print("GITHUB LORA RENDER DONE", flush=True)
