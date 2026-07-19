# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in PrivacyShield, please report it
privately. **Do not open a public issue.**

- **Email**: security@privacyshield.local (placeholder — replace with real address)
- **Subject prefix**: `[SECURITY]`
- **PGP**: see `keys/security.pub` (when available)

We will:
1. Acknowledge receipt within 48 hours
2. Provide a triage assessment within 7 days
3. Coordinate disclosure timing (typically 90 days)

## What Counts as a Vulnerability

Please report:
- XSS in templates / rendered search results
- CSRF that lets an attacker use the user's camera
- Server-side code execution via image metadata
- Information leakage from the Flask backend
- Cryptographic weaknesses in the LSB watermark
- Anything that breaks the "everything stays in the browser" promise
  when the optional backend is enabled

## Out of Scope

- Reports about features that intentionally process images client-side
  (the user is the data subject; that is the design)
- Reports about the third-party CDN scripts (face-api.js) — file upstream
- Reports that require the user to install malicious browser extensions
- Theoretical attacks against well-known crypto algorithms

## Threat Model

PrivacyShield assumes:
- The user is the legitimate owner of the photo they upload
- The user's browser is up to date
- The user trusts the CDN that serves `face-api.js` (jsDelivr)

PrivacyShield does **not** defend against:
- A malicious local app reading the file system
- Browser zero-days
- A user uploading someone else's photo (ethical use clause)

## Best Practices for Operators

If you self-host the Flask backend:

1. Bind to `127.0.0.1` only (default in this repo) — do not expose to the
   public internet
2. Use a reverse proxy (nginx / Caddy) if you need remote access — add
   rate limiting and authentication
3. Never commit `GOOGLE_CSE_API_KEY`, `HIBP_API_KEY`, or any secret to
   git
4. Run behind HTTPS if accessed from the public internet
5. Keep Flask and `requests` up to date: `pip install -U -r requirements.txt`
6. Review the dependency tree periodically: `pip list --outdated`
