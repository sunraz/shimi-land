"""מדד זהות פנים — ArcFace עם יישור 5 נקודות (YuNet landmarks).
שימוש:
  python identity_metric.py baseline DIR [DIR2 ...]     # דמיון בתוך סט
  python identity_metric.py compare REFDIR SAMPLES...   # דמיון של דגימות לסט ייחוס
"""
import cv2, numpy as np, glob, itertools, json, sys

YUNET = "/tmp/yunet.onnx"
ARC = "/root/.insightface/models/buffalo_s/w600k_mbf.onnx"
# תבנית ArcFace 112x112 (5 נקודות קנוניות)
TEMPLATE = np.array([[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366],
                     [41.5493, 92.3655], [70.7299, 92.2041]], dtype=np.float32)

def _sess():
    import onnxruntime as ort
    s = ort.InferenceSession(ARC, providers=["CPUExecutionProvider"])
    return s, s.get_inputs()[0].name

def _det(w=320):
    return cv2.FaceDetectorYN.create(YUNET, "", (w, w), 0.5, 0.3, 5000)

def aligned_face(path, det=None, sess=None, name=None, size=112):
    """מחזיר (embedding מנורמל, bbox, score) או None."""
    img = cv2.imread(path)
    if img is None: return None
    det = det or _det()
    h, w = img.shape[:2]
    det.setInputSize((w, h))
    n, faces = det.detect(img)
    if faces is None or len(faces) == 0: return None
    # סינון: רק פנים סבירות (ביטחון גבוה, גודל מינימלי) — מונע זיהויים שווא שמזהמים את הבסיס
    faces = [x for x in faces if float(x[14]) >= 0.75 and float(x[2]) >= 80]
    if not faces: return None
    f = max(faces, key=lambda x: x[2] * x[3])
    kps = np.array(f[4:14], dtype=np.float32).reshape(5, 2)
    score = float(f[14])
    M, _ = cv2.estimateAffinePartial2D(kps, TEMPLATE, method=cv2.LMEDS)
    if M is None: return None
    face = cv2.warpAffine(img, M, (size, size), flags=cv2.INTER_LINEAR)
    sess, iname = (sess or _sess())
    face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)   # ArcFace מצפה ל-RGB
    x = face.astype(np.float32)
    x = (x - 127.5) / 127.5
    x = x.transpose(2, 0, 1)[None]
    v = sess.run(None, {iname: x})[0][0]
    nv = np.linalg.norm(v)
    if nv == 0: return None
    return {"emb": v / nv, "bbox": [float(x) for x in f[:4]], "score": score, "file": path}

def _files(paths):
    out = []
    for p in paths:
        for ext in ("png", "jpg", "jpeg"):
            out += glob.glob(p.rstrip("/") + f"/**/*.{ext}", recursive=True)
    return sorted(set(out))

def load_set(paths, det=None, sess=None):
    det, sess = det or _det(), sess or _sess()
    res = []
    for p in _files(paths):
        r = aligned_face(p, det, sess)
        if r: res.append(r)
    return res

def stats(sims):
    a = np.array(sims)
    return {"n_pairs": int(len(a)), "median": round(float(np.median(a)), 3),
            "mean": round(float(a.mean()), 3), "p10": round(float(np.percentile(a, 10)), 3),
            "p90": round(float(np.percentile(a, 90)), 3), "max": round(float(a.max()), 3),
            "min": round(float(a.min()), 3)}

def baseline(dirs):
    rs = load_set(dirs)
    sims = [float(np.dot(a["emb"], b["emb"])) for a, b in itertools.combinations(rs, 2)]
    return {"faces": len(rs), "files": [r["file"].split("/")[-1] for r in rs], **stats(sims)}

def compare(ref_dirs, sample_list, max_face_diff=0.95):
    refs = load_set(ref_dirs)
    det, sess = _det(), _sess()
    out = []
    for p in sample_list:
        r = aligned_face(p, det, sess)
        if not r:
            out.append({"file": p.split("/")[-1], "face": False}); continue
        s = [float(np.dot(r["emb"], x["emb"])) for x in refs]
        out.append({"file": p.split("/")[-1], "face": True, "score_det": round(r["score"], 3),
                    **{k: v for k, v in stats(s).items()}})
    return {"ref_faces": len(refs), "ref_baseline_within": stats(
        [float(np.dot(a["emb"], b["emb"])) for a, b in itertools.combinations(refs, 2)]), "samples": out}

if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "baseline":
        print(json.dumps(baseline(sys.argv[2:]), ensure_ascii=False, indent=1))
    elif mode == "compare":
        print(json.dumps(compare([sys.argv[2]], sys.argv[3:]), ensure_ascii=False, indent=1))
