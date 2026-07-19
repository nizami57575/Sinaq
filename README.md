# 🛡️ PrivacyShield v2.0 — *Find Yourself, Stay Protected*

> **Self-privacy, in your browser.** See where your face appears across the
> web, then protect your photos with 10+ state-of-the-art defenses. All image
> processing runs client-side; nothing is uploaded.

> ⚠️ **Ethical use only.** This tool is for **your own name and photo**. Do
> not use it to track, stalk, or surveil others. See [LICENSE](./LICENSE).

---

## ✨ What's new in v2.0

| Area | v1.0 | v2.0 |
|------|------|------|
| Languages | TR / EN | **TR / EN / AZ / RU** |
| Defenses | 4 | **10** (added color jitter, salt-pepper, edge smoothing, JPEG recompress, grayscale, blur) |
| Search platforms | 45 | **48+** |
| Privacy tools | — | **5 new tools** (fingerprint, IP leak, password, phishing, breach) |
| Privacy score | — | **0-100 score with letter grade** |
| Image metadata | — | **Inspect: dimensions, palette, SHA-256** |
| Export | PNG | **PNG / PDF / JSON / CSV** |
| API endpoints | 2 | **5** (`/status`, `/version`, `/health`, breach, search) |
| Mode badge | hard-coded "DEMO" | **reads `/api/status`** (LIVE / OFFLINE) |
| Tests | — | **pytest, 30+ tests** |
| Docs | README | **README + CHANGELOG + SECURITY + CONTRIBUTING + LICENSE** |

---

## 🚀 Quick start

### Option A — Static (no Python)
Just open `static/index.html` in a modern browser. The full app works
except the optional Email-breach check.

### Option B — Flask backend
```bash
cd privacy-shield
py -3 -m pip install -r requirements.txt
py -3 app.py
```
Then open <http://localhost:5000>.

### Run the tests
```bash
py -3 -m pip install -r requirements.txt
py -3 -m pytest tests/ -v
```

---

## 🛡️ 10 Defenses, all browser-side

| # | Defense | What it does |
|---|---------|--------------|
| 1 | **Adversarial Noise (Cloak)** | Imperceptible Gaussian noise that confuses face embeddings. |
| 2 | **Pixelate / Mosaic** | Lossy downscaling inside the face region. |
| 3 | **Strip EXIF** | Canvas export removes GPS, device, date. |
| 4 | **Watermark** | Visible bottom strip + tiled pattern + LSB stego signature. |
| 5 | **Color Jitter** | Per-channel random shift — scrambles the embedding. |
| 6 | **Salt & Pepper** | Random black/white dots — scrambles the pixel hash. |
| 7 | **Edge Smoothing** | 3×3 box filter — disrupts landmark detection. |
| 8 | **JPEG Recompress** | Re-encodes at a chosen quality — adds chunk artifacts. |
| 9 | **Grayscale** | Removes color — color-based tracking impossible. |
| 10 | **Blur** | Visible softening. |

All defenses accept an intensity slider 1-10.

---

## 🧰 Privacy Tools (Step 5)

| Tool | What it does |
|------|--------------|
| 🪞 **Browser Fingerprint** | Estimates how unique your browser looks (canvas + audio + hardware). |
| 🌐 **IP Leak Check** | Uses WebRTC to see if your real IP leaks. |
| 🔑 **Password Strength** | Entropy + estimated crack time + suggestions. |
| 🎣 **Phishing URL Check** | 13 heuristic red flags (IP URL, brand abuse, punycode, etc.). |
| 🔓 **Email Breach Check** | HIBP range API (k-anonymity) + offline demo. |

> All tools run **entirely in the browser**. No data is sent to a third party
> except the optional HIBP range call, which only transmits the first 5
> characters of the SHA-1 hash of your email.

---

## 🔐 Optional: live mode

Set environment variables for richer features:

```powershell
# Windows PowerShell
$env:GOOGLE_CSE_API_KEY = "AIza..."
$env:GOOGLE_CSE_ID      = "a1b2c3..."
$env:HIBP_API_KEY       = "..."   # for real email breach lookups
py -3 app.py
```

Without them, the app still works in **demo mode** (badge will say "DEMO
MODE" in the top-right).

---

## 📁 Project structure

```
privacy-shield/
├── app.py                          # Flask app + breach endpoint
├── services/
│   ├── __init__.py
│   └── web_search.py               # CSE live mode + offline simulator
├── static/
│   ├── index.html                  # 5-step SPA
│   ├── css/style.css               # Dark theme
│   └── js/
│       ├── i18n.js                 # TR/EN/AZ/RU dictionaries
│       ├── face.js                 # face-api.js wrapper
│       ├── search.js               # 48+ platform offline search
│       ├── defense.js              # 10 image defenses
│       ├── privacy.js              # 5 privacy tools
│       ├── meta.js                 # image metadata inspector
│       ├── report.js               # privacy score + export
│       └── app.js                  # flow control
├── tests/
│   ├── test_app.py
│   └── test_web_search.py
├── requirements.txt
├── README.md
├── CHANGELOG.md
├── SECURITY.md
├── CONTRIBUTING.md
├── LICENSE                         # MIT + ethical use clause
└── .gitignore
```

---

## 🌐 API

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/status` | live mode, version, feature list |
| `GET`  | `/api/version` | version + uptime |
| `GET`  | `/api/health` | health probe |
| `POST` | `/api/search/face` | `{face_signature, name?}` → results |
| `POST` | `/api/search/name` | `{name}` → results |
| `POST` | `/api/breach/check` | `{email}` → HIBP hits or demo |

All non-API routes serve the SPA shell (`index.html`), so the app is
deployable to any static host (GitHub Pages, Netlify, …).

---

## ⚖️ Ethics & Legal

- Self-privacy only. Read the [LICENSE](./LICENSE) ethical use clause.
- Defense methods are not a 100% guarantee — they are an extra layer.
- The breach-check API uses HIBP k-anonymity: your email is hashed
  locally and only the first 5 chars are sent.
- All image processing is local. The Flask backend never sees your photo.

---

## 🧪 Testing

```bash
py -3 -m pytest tests/ -v
```

Coverage focuses on:
- `services/web_search.py` (45+ platforms, deterministic sim, name matching)
- `app.py` (all 5 endpoints, validation, error paths)

Static-side (the JS modules) is best tested manually because the
defenses rely on Canvas + browser APIs.

---

## 📜 License

MIT + ethical use clause. See [LICENSE](./LICENSE).
