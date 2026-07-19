"""
app.py
------
PrivacyShield Flask application.

API:
  GET  /api/status           -> { live_mode, version, features: [...] }
  POST /api/search/face      -> { face_signature, name? } -> face search
  POST /api/search/name      -> { name }                  -> name+lastname search
  POST /api/breach/check     -> { email }                 -> HIBP breach lookup
  GET  /api/health           -> { ok: true, uptime }
  GET  /api/version          -> { version, release_date, features }

The app is also a 100% static-site-ready project. The Flask layer only powers
optional network features. All image manipulation runs in the browser.
"""
import os
import time

from flask import Flask, jsonify, request, send_from_directory

from services.web_search import is_live, search_by_face, search_by_name

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

APP_VERSION = "2.0.0"
APP_RELEASE = "2026-07-19"
START_TIME = time.time()

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path="")


# -------------------------------------------------------------------
#  Static index / assets
# -------------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


# -------------------------------------------------------------------
#  API
# -------------------------------------------------------------------
@app.route("/api/status")
def status():
    return jsonify(
        {
            "live_mode": is_live(),
            "version": APP_VERSION,
            "features": [
                "face_search",
                "name_search",
                "breach_check",
                "adversarial_noise",
                "pixel_mosaic",
                "exif_strip",
                "watermark",
                "color_jitter",
                "jpeg_compress",
                "edge_smooth",
                "salt_pepper",
                "privacy_score",
                "metadata_viewer",
                "pdf_export",
                "csv_export",
                "json_export",
                "browser_fingerprint",
                "ip_leak",
                "password_strength",
                "phishing_check",
            ],
        }
    )


@app.route("/api/version")
def version():
    return jsonify(
        {
            "version": APP_VERSION,
            "release_date": APP_RELEASE,
            "uptime_seconds": int(time.time() - START_TIME),
        }
    )


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "uptime": int(time.time() - START_TIME)})


@app.route("/api/search/face", methods=["POST"])
def api_search_face():
    """Face signature based search."""
    data = request.get_json(silent=True) or {}
    face_signature = data.get("face_signature", "")
    name_hint = data.get("name", "")
    if not face_signature or not isinstance(face_signature, str) or len(face_signature) > 500:
        return jsonify({"error": "Invalid face signature", "results": []}), 400
    if name_hint and len(name_hint) > 120:
        name_hint = ""
    return jsonify(search_by_face(face_signature, name_hint))


@app.route("/api/search/name", methods=["POST"])
def api_search_name():
    """First + last name search (used when face search is too thin)."""
    data = request.get_json(silent=True) or {}
    name = data.get("name", "")
    if not name or not isinstance(name, str) or len(name) > 120:
        return jsonify({"error": "Invalid name", "results": []}), 400
    return jsonify(search_by_name(name))


@app.route("/api/breach/check", methods=["POST"])
def api_breach_check():
    """
    Optional: HaveIBeenPwned range lookup. Email is hashed with k-anonymity,
    only the first 5 chars of the SHA-1 hash are sent. No raw email leaves
    the server. Requires HIBP_API_KEY env variable. Without it, returns
    demo data so the front-end still has something to display.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email or "@" not in email or len(email) > 200:
        return jsonify({"error": "Invalid email", "breaches": []}), 400

    hibp_key = os.environ.get("HIBP_API_KEY", "").strip()
    if hibp_key:
        try:
            import hashlib
            import requests as _r
            digest = hashlib.sha1(email.encode()).hexdigest().upper()
            prefix, suffix = digest[:5], digest[5:]
            resp = _r.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"hibp-api-key": hibp_key, "user-agent": "PrivacyShield/2.0"},
                timeout=10,
            )
            resp.raise_for_status()
            hits = []
            for line in resp.text.splitlines():
                s, count = line.split(":")
                if s.upper() == suffix:
                    hits.append({"count": int(count), "source": "HaveIBeenPwned"})
            return jsonify({"mode": "live", "email_hash_prefix": prefix, "breaches": hits})
        except Exception as e:  # pragma: no cover - network errors fall back
            return jsonify(
                {
                    "mode": "live",
                    "error": f"HIBP lookup failed: {e}",
                    "breaches": [],
                }
            )

    # Demo mode: deterministic simulation based on email hash
    import hashlib
    digest = hashlib.md5(email.encode()).hexdigest()
    seed = int(digest[:8], 16)
    simulated = seed % 7  # 0..6 breaches
    breaches = [
        {
            "name": "Adobe (2013)",
            "date": "2013-10-04",
            "count": 152_000_000,
            "data": "Email, password hints, encrypted passwords",
        },
        {
            "name": "LinkedIn (2012)",
            "date": "2012-05-05",
            "count": 164_000_000,
            "data": "Email, SHA-1 passwords (no salt)",
        },
        {
            "name": "Dropbox (2012)",
            "date": "2012-07-01",
            "count": 68_000_000,
            "data": "Email, bcrypt passwords",
        },
        {
            "name": "MyFitnessPal (2018)",
            "date": "2018-02-01",
            "count": 143_000_000,
            "data": "Email, username, password",
        },
        {
            "name": "Collection #1",
            "date": "2019-01-07",
            "count": 772_000_000,
            "data": "Email, plaintext passwords",
        },
        {
            "name": "Canva (2019)",
            "date": "2019-05-24",
            "count": 137_000_000,
            "data": "Email, username, hashed passwords",
        },
        {
            "name": "Twitter (2022)",
            "date": "2022-01-15",
            "count": 5_400_000,
            "data": "Email, phone, verified status",
        },
    ]
    return jsonify(
        {
            "mode": "demo",
            "breaches": breaches[:simulated],
        }
    )


# -------------------------------------------------------------------
#  Error handlers
# -------------------------------------------------------------------
@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not found"}), 404
    return send_from_directory(STATIC_DIR, "index.html")


@app.errorhandler(500)
def server_error(e):  # pragma: no cover
    return jsonify({"error": "Internal error", "message": str(e)}), 500


# -------------------------------------------------------------------
#  Entrypoint
# -------------------------------------------------------------------
if __name__ == "__main__":
    mode = "LIVE (Google CSE)" if is_live() else "DEMO (simulation)"
    print("=" * 60)
    print("PrivacyShield v" + APP_VERSION + " starting")
    print("Search mode: " + mode)
    print("http://localhost:5000")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5000, debug=True)
