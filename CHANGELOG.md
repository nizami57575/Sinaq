# Changelog

All notable changes to PrivacyShield are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-07-19

### Added
- **4th step — Privacy Tools (Aletler)**: New panel with 5 self-contained tools
  - Browser fingerprint inspector (canvas + audio + hardware + locale)
  - WebRTC IP leak test
  - Password strength checker (entropy-based + crack-time estimate)
  - Phishing URL heuristic checker (13 red-flag patterns)
  - Email breach check (HIBP range API with k-anonymity + offline demo)
- **4 new image defenses**:
  - Color Jitter (chrominance shift)
  - Salt & Pepper noise
  - Edge Smoothing (3×3 box filter, multi-pass)
  - JPEG recompression artifact injection
- **2 more defenses**: Grayscale, CSS Blur
- **Image metadata inspector**: dimensions, aspect ratio, dominant palette,
  average color, brightness/darkness, SHA-256 hash
- **Privacy Score**: 0-100 score with letter grade (A-F) and breakdown
  findings
- **Export**:
  - PDF (browser print) with full report
  - JSON (machine-readable full export)
  - CSV (search results spreadsheet)
- **4 languages**: TR, EN, AZ, RU (auto-detect from browser)
- **API endpoints**:
  - `GET /api/version` — version + uptime
  - `GET /api/health` — health probe
  - `POST /api/breach/check` — HIBP range lookup
- **Static-site ready**: the app gracefully degrades to demo/offline when the
  Flask backend is not reachable
- **Mode badge now reads `/api/status`** (was always "DEMO")
- **Tile-pattern visible watermark** in addition to bottom strip
- **4+1 step layout** in the stepper (1-Foto, 2-Bul, 3-Koru, 4-Sonuc, 5-Aletler)
- **LICENSE**: MIT + Ethical Use clause
- **CHANGELOG, CONTRIBUTING, SECURITY, .gitignore**

### Changed
- `app.py`: refactored, added error handlers, version endpoint, breach endpoint
- `services/web_search.py`: kept as the optional server-side search path
- `defense.js`: rewritten as async pipeline (`applyAsync` for JPEG recompress)
- `i18n.js`: 4 full dictionaries (TR, EN, AZ, RU), 200+ keys
- `index.html`: new step-5 tools panel, tool cards, image-meta block
- `style.css`: new tool-card, score-card, meta-grid components
- `search.js`: 48 platforms (was 45)

### Fixed
- `initModeBadge()` was hard-coded to "DEMO MODE" regardless of backend
  config — now actually calls `/api/status` and reports LIVE or OFFLINE
- `app.js` `runFaceSearch` did not catch errors → could freeze the UI
- `search.js` `usernameFromName` stripped all non-ASCII including Turkish
  characters — now preserves `ğüşıöçĞÜŞİÖÇ`
- `defense.js` `embedLSB` could write past the end of pixel data — clamped

### Security
- The Flask app now binds to 127.0.0.1 only (was 0.0.0.0 in some configs)
- HIBP integration uses k-anonymity: only the first 5 chars of the SHA-1
  hash are sent
- All image processing stays in-browser; the only network call is the
  optional HIBP range API

### Notes
- This is a major release. v1.x users should re-test all defenses and
  review the new tools panel.
- The `defense.js` API changed from `apply()` to `applyAsync()`. The
  synchronous `apply()` is still available for simple cases.

## [1.0.0] - 2024

### Added
- Initial release: 4-step flow (Photo, Find, Protect, Result)
- 45-platform face search simulation
- 4 defense methods (Adversarial noise, pixelate, EXIF strip, watermark)
- TR / EN bilingual UI
- Flask backend with optional Google CSE live mode
