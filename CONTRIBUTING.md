# Contributing to PrivacyShield

Thanks for your interest! This project is for self-privacy only — please
keep that mission in mind with every change.

## Code of Conduct

- Be respectful and inclusive
- Focus on the technical merits
- Assume good intent; ask for clarification before accusing
- Decline contributions that turn this into a surveillance tool

## How to Contribute

### Reporting bugs
Open an issue with:
- Browser + version
- Steps to reproduce
- Expected vs. actual behavior
- Console error (if any)

### Suggesting features
Open an issue with `[FEATURE]` prefix. The maintainers will:
- Confirm the feature is in scope (self-privacy)
- Discuss UX
- Approve before you start coding

### Submitting pull requests
1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your change
4. Run the tests: `py -3 -m pytest tests/`
5. Run the linter: `py -3 -m pyflakes app.py services/`
6. Add a CHANGELOG entry under "Unreleased"
7. Open a PR with a clear description

## Coding Standards

### Python
- PEP 8
- Type hints encouraged
- 4-space indent
- Docstrings on every public function
- Run `py -3 -m py_compile app.py` before committing

### JavaScript
- Use `const` / `let`, never `var` (existing code is being migrated)
- 2-space indent
- ES2020 features are fine
- No external dependencies in `static/js/` — keep the static site
  self-contained. The only CDN exception is `face-api.js` (intentional)

### CSS
- CSS custom properties (`--bg`, `--accent`, …) — never hard-code colors
- Mobile-first is not required but at least make it not break

## Adding a New Defense Algorithm

1. Add the algorithm to `static/js/defense.js` as a private function
2. Add a checkbox in `static/index.html` step-3
3. Add the i18n keys for TR, EN, AZ, RU
4. If the defense has an intensity slider, add the slider with `id="xxxLevel"`
5. Wire the slider value into `app.js#applyDefense` opts
6. Add a CSS style for the new opt if needed
7. Document it in the README
8. Add a CHANGELOG entry

## Adding a New Tool (step 5)

1. Create a new module in `static/js/` (e.g. `tools/your_tool.js`)
2. Add the tool card in `static/index.html` under step-5
3. Add the i18n keys (4 languages)
4. Wire the tool's init into `app.js#initPrivacyTools`
5. Update the README

## Adding a Language

1. Copy the entire `en` block in `static/js/i18n.js`
2. Translate every value
3. Test: switch to the new language in the UI
4. Add a button in the `.lang-switch` block in `index.html`
5. Update the README

## Testing

```bash
py -3 -m pip install -r requirements.txt
py -3 -m pip install pytest
py -3 -m pytest tests/ -v
```

## License

By contributing, you agree that your contributions will be licensed under
the MIT License + Ethical Use clause (see `LICENSE`).
