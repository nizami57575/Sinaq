/* ============================================================
   report.js - Privacy score, threat dashboard, export (PDF/JSON/CSV)
   Hicbiri backend gerektirmez.
   ============================================================ */

const Report = (() => {

  /**
   * Ümumi gizlilik balı: 0-100
   * - Axtarış nəticələrinin sayı (az = yaxşı)
   * - Tətbiq olunan müdafiələrin sayı
   * - İstifadəçi seçimləri (məxfilik ayarları)
   */
  function computePrivacyScore(ctx) {
    // ctx: { foundResults: int, defenses: int, fingerprint: number, dnt: bool, ... }
    let score = 100;
    const found = ctx.foundResults || 0;
    score -= Math.min(50, found * 1.5);

    const defenses = ctx.defenses || 0;
    score += Math.min(15, defenses * 1.8);

    if (ctx.fingerprint && ctx.fingerprint > 70) score -= 5;
    if (ctx.dnt) score += 3;
    if (ctx.cookiesBlocked) score += 5;
    if (ctx.strongPassword) score += 5;

    score = Math.max(0, Math.min(100, Math.round(score)));
    let grade;
    if (score >= 80) grade = "A";
    else if (score >= 65) grade = "B";
    else if (score >= 50) grade = "C";
    else if (score >= 35) grade = "D";
    else grade = "F";
    return { score: score, grade: grade };
  }

  /**
   * Hesabatı vizuallaşdırmaq üçün HTML.
   */
  function renderReport(score, findings) {
    var color =
      score.score >= 80 ? "var(--ok)" :
      score.score >= 50 ? "var(--warn)" : "var(--danger)";
    return '<div class="score-card">' +
      '<div class="score-circle" style="--c:' + color + '">' +
        '<div class="score-value">' + score.score + '</div>' +
        '<div class="score-grade">' + score.grade + '</div>' +
      '</div>' +
      '<div class="score-info">' +
        '<h3>' + t("score_title") + '</h3>' +
        '<p class="muted">' + t("score_explained") + '</p>' +
        '<ul class="findings">' + findings.map(function (f) {
          return '<li class="finding ' + (f.ok ? "ok" : "bad") + '">' +
            '<span class="finding-icon">' + (f.ok ? "✓" : "⚠") + '</span>' +
            '<span>' + f.text + '</span></li>';
        }).join("") + '</ul>' +
      '</div>' +
    '</div>';
  }

  /**
   * Nəticələri CSV formatına çevir (export üçün).
   */
  function toCSV(results) {
    if (!results || !results.length) return "";
    var headers = ["platform", "type", "similarity", "url", "snippet", "found_date"];
    var lines = [headers.join(",")];
    results.forEach(function (r) {
      lines.push([
        csvSafe(r.platform || ""),
        csvSafe(r.source_type || ""),
        csvSafe(String(r.similarity || "")),
        csvSafe(r.url || ""),
        csvSafe(r.snippet || ""),
        csvSafe(r.found_date || ""),
      ].join(","));
    });
    return lines.join("\n");
  }

  function csvSafe(s) {
    s = String(s);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /**
   * Tam hesabat obyekti (export üçün).
   */
  function buildExport(state, score, findings) {
    return {
      meta: {
        tool: "PrivacyShield",
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        userLocale: navigator.language,
      },
      privacyScore: score,
      findings: findings,
      searchResults: state.searchResults || [],
      defensesApplied: state.report || [],
      stats: {
        platformsMatched: (state.searchResults || []).length,
        totalPlatforms: 48,
        matchRate: ((state.searchResults || []).length / 48 * 100).toFixed(1) + "%",
      },
    };
  }

  /**
   * Fayl endir.
   */
  function download(filename, content, mime) {
    var blob = (content instanceof Blob) ? content : new Blob([content], { type: mime || "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  /**
   * PDF ixracı (jsPDF-sız, browser print API istifadə edir).
   */
  function downloadPDF(state, score, findings) {
    var data = buildExport(state, score, findings);
    var win = window.open("", "_blank");
    if (!win) { alert("Pop-up blocked."); return; }
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>PrivacyShield Report</title>' +
      '<style>body{font-family:Segoe UI,sans-serif;padding:32px;color:#1a1f3a;}' +
      'h1{color:#4ea8ff;border-bottom:2px solid #4ea8ff;padding-bottom:8px;}' +
      'h2{color:#7c5cff;margin-top:24px;}' +
      '.score{font-size:48px;color:#38d39f;font-weight:800;}' +
      'table{width:100%;border-collapse:collapse;margin-top:12px;}' +
      'th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px;}' +
      'th{background:#f4f6fb;}' +
      '.ok{color:#0a8a64;}.bad{color:#c0392b;}' +
      '.footer{margin-top:32px;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:8px;}' +
      '</style></head><body>' +
      '<h1>🛡️ PrivacyShield — Privacy Report</h1>' +
      '<p><strong>Generated:</strong> ' + data.meta.exportedAt + '</p>' +
      '<h2>Privacy score</h2><div class="score">' + data.privacyScore.score + ' / 100  (Grade ' + data.privacyScore.grade + ')</div>' +
      '<h2>Findings</h2><ul>' +
      data.findings.map(function (f) {
        return '<li class="' + (f.ok ? "ok" : "bad") + '">' + (f.ok ? "✓" : "⚠") + ' ' + f.text + '</li>';
      }).join("") + '</ul>' +
      '<h2>Search results (' + data.searchResults.length + ')</h2>' +
      (data.searchResults.length ?
        '<table><thead><tr><th>Platform</th><th>Type</th><th>Match %</th><th>URL</th><th>Date</th></tr></thead><tbody>' +
        data.searchResults.map(function (r) {
          return '<tr><td>' + esc(r.platform) + '</td><td>' + esc(r.source_type) + '</td><td>' + r.similarity + '</td><td>' + esc(r.url) + '</td><td>' + esc(r.found_date) + '</td></tr>';
        }).join("") + '</tbody></table>' : '<p>No matches.</p>') +
      '<h2>Defenses applied</h2><ul>' +
      (data.defensesApplied.length ? data.defensesApplied.map(function (r) {
        return '<li>✓ ' + esc(r.label) + '</li>';
      }).join("") : '<li>None</li>') + '</ul>' +
      '<div class="footer">Generated by PrivacyShield — for self-privacy use only.</div>' +
      '</body></html>';
    win.document.write(html);
    win.document.close();
    setTimeout(function () { win.print(); }, 300);
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]); }); }

  return {
    computePrivacyScore: computePrivacyScore,
    renderReport: renderReport,
    toCSV: toCSV,
    buildExport: buildExport,
    download: download,
    downloadPDF: downloadPDF,
  };
})();
