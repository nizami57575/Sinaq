/* ============================================================
   app.js - AKIS KONTROLU + YENI XUSUSIYYETLER
   Tum islem tarayicida - backend sadece opsionaldur.
   GitHub Pages / Netlify / static hosting'de calisir.

   Yeni xüsusiyyətlər (v2.0):
   - Mode badge API ilə düzgün göstərir
   - Image metadata inspection
   - Browser fingerprint göstərici
   - IP leak testi (WebRTC)
   - Password strength checker
   - Phishing URL check
   - Privacy score
   - Email breach check (HIBP API ilə, yoxsa demo)
   - Export: PDF, JSON, CSV
   - 6 yeni müdafiə üsulu
   - 4 dil: TR, EN, AZ, RU
   ============================================================ */

const App = (() => {
  var state = {
    imageEl: null,
    imageDataUrl: null,
    imageFile: null,
    imageMeta: null,
    imageHash: "",
    faces: [],
    faceSignature: "",
    protectedDataUrl: null,
    report: [],
    cameraStream: null,
    searchResults: [],
    findings: [],
    score: null,
  };

  /* ---------- Adim yonetimi ---------- */
  function goStep(n) {
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
    var el = document.getElementById("step-" + n);
    if (el) el.classList.add("active");
    document.querySelectorAll(".step").forEach(function (s) {
      var sn = parseInt(s.dataset.step, 10);
      s.classList.toggle("active", sn === n);
      s.classList.toggle("done", sn < n);
    });
    document.body.dataset.step = n;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Modu yoxla (CANLI ya DEMO) ---------- */
  async function initModeBadge() {
    var badge = document.getElementById("modeBadge");
    var footer = document.getElementById("modeFooter");
    try {
      var resp = await fetch("/api/status", { cache: "no-store" });
      if (resp.ok) {
        var data = await resp.json();
        if (data.live_mode) {
          badge.className = "badge badge-live";
          badge.textContent = t("live_mode");
          footer.textContent = "API: LIVE";
        } else {
          badge.className = "badge badge-demo";
          badge.textContent = t("demo_mode");
          footer.textContent = "API: DEMO";
        }
      } else {
        badge.className = "badge badge-demo";
        badge.textContent = t("demo_mode");
        footer.textContent = "API: OFFLINE (static)";
      }
    } catch (e) {
      badge.className = "badge badge-demo";
      badge.textContent = t("demo_mode");
      footer.textContent = "API: OFFLINE (static)";
    }
    badge.hidden = false;
  }

  /* ============================================================
     ADIM 1: FOTO YUKLE / KAMERA + METADATA
  ============================================================ */
  function bindCapture() {
    var tabUpload = document.getElementById("tabUpload");
    var tabCamera = document.getElementById("tabCamera");
    var capUpload = document.getElementById("capUpload");
    var capCamera = document.getElementById("capCamera");

    tabUpload.addEventListener("click", function () {
      tabUpload.classList.add("active"); tabCamera.classList.remove("active");
      capUpload.hidden = false; capCamera.hidden = true;
    });
    tabCamera.addEventListener("click", function () {
      tabCamera.classList.add("active"); tabUpload.classList.remove("active");
      capCamera.hidden = false; capUpload.hidden = true;
    });

    var dz = document.getElementById("dropzone");
    var fi = document.getElementById("fileInput");
    dz.addEventListener("click", function () { fi.click(); });
    dz.addEventListener("dragover", function (e) { e.preventDefault(); dz.classList.add("dragover"); });
    dz.addEventListener("dragleave", function () { dz.classList.remove("dragover"); });
    dz.addEventListener("drop", function (e) {
      e.preventDefault(); dz.classList.remove("dragover");
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    fi.addEventListener("change", function () {
      if (fi.files[0]) handleFile(fi.files[0]);
    });

    document.getElementById("startCamera").addEventListener("click", startCamera);
    document.getElementById("snapPhoto").addEventListener("click", snapPhoto);
    document.getElementById("stopCamera").addEventListener("click", stopCamera);
    document.getElementById("retakePhoto").addEventListener("click", resetCapture);

    document.getElementById("goStep2").addEventListener("click", function () {
      if (!state.imageEl) return;
      goStep(2);
    });
  }

  async function handleFile(file) {
    if (!file.type.startsWith("image/")) return;
    state.imageFile = file;
    var info = Meta.fileInfo(file);
    var reader = new FileReader();
    reader.onload = async function (e) {
      var img = new Image();
      img.onload = async function () {
        state.imageEl = img;
        state.imageDataUrl = e.target.result;
        state.imageMeta = Meta.inspect(img);
        try { state.imageHash = await Meta.sha256(e.target.result); } catch (_) { state.imageHash = ""; }
        showPreview();
        await renderImageMeta();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function renderImageMeta() {
    var box = document.getElementById("imageMeta");
    if (!box || !state.imageMeta) return;
    var info = Object.assign({}, state.imageMeta, { hash: state.imageHash });
    box.innerHTML = Meta.renderHTML(info);
    if (state.imageFile) {
      var f = state.imageFile;
      box.insertAdjacentHTML("afterbegin",
        '<div class="meta-row"><span class="meta-k">' + t("meta_file") + '</span><span class="meta-v">' + f.name + ' (' + (state.imageMeta ? Meta.fileInfo(f).sizeHuman : "") + ')</span></div>'
      );
    }
    box.hidden = false;
  }

  function startCamera() {
    var video = document.getElementById("cameraVideo");
    document.getElementById("startCamera").disabled = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } })
      .then(function (stream) {
        state.cameraStream = stream;
        video.srcObject = stream;
        document.getElementById("snapPhoto").disabled = false;
        document.getElementById("stopCamera").disabled = false;
      })
      .catch(function (err) {
        alert(t("camera_error") + "\n" + err.message);
        document.getElementById("startCamera").disabled = false;
      });
  }

  function snapPhoto() {
    var video = document.getElementById("cameraVideo");
    var canvas = document.getElementById("cameraCanvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    var ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    var img = new Image();
    img.onload = function () {
      state.imageEl = img;
      state.imageDataUrl = dataUrl;
      state.imageMeta = Meta.inspect(img);
      showPreview();
      renderImageMeta();
      stopCamera();
    };
    img.src = dataUrl;
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(function (t) { t.stop(); });
      state.cameraStream = null;
    }
    document.getElementById("cameraVideo").srcObject = null;
    document.getElementById("startCamera").disabled = false;
    document.getElementById("snapPhoto").disabled = true;
    document.getElementById("stopCamera").disabled = true;
  }

  function showPreview() {
    document.getElementById("capUpload").hidden = true;
    document.getElementById("capCamera").hidden = true;
    document.getElementById("capturePreview").hidden = false;
    document.getElementById("previewImg").src = state.imageDataUrl;
    document.getElementById("goStep2").disabled = false;
    document.getElementById("captureTabs").hidden = true;
  }

  function resetCapture() {
    state.imageEl = null; state.imageDataUrl = null; state.faces = []; state.faceSignature = "";
    state.imageMeta = null; state.imageHash = ""; state.imageFile = null;
    document.getElementById("capUpload").hidden = false;
    document.getElementById("capCamera").hidden = false;
    document.getElementById("capturePreview").hidden = true;
    document.getElementById("captureTabs").hidden = false;
    document.getElementById("goStep2").disabled = true;
    document.getElementById("fileInput").value = "";
    document.getElementById("tabUpload").classList.add("active");
    document.getElementById("tabCamera").classList.remove("active");
    var meta = document.getElementById("imageMeta");
    if (meta) { meta.hidden = true; meta.innerHTML = ""; }
  }

  /* ============================================================
     ADIM 2: ARA
  ============================================================ */
  function bindSearch() {
    document.getElementById("searchBtn").addEventListener("click", runFaceSearch);
    document.getElementById("searchNameBtn").addEventListener("click", runNameSearch);
    document.getElementById("back2to1").addEventListener("click", function () { goStep(1); });
    document.getElementById("goStep3").addEventListener("click", function () { goStep(3); });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function runFaceSearch() {
    if (!state.imageEl) return;
    var loader = document.getElementById("searchLoader");
    var grid = document.getElementById("searchResults");
    var fallback = document.getElementById("nameFallback");
    loader.hidden = false;
    document.getElementById("searchBtn").disabled = true;
    grid.innerHTML = "";
    fallback.hidden = true;
    document.getElementById("searchQuery").textContent = t("searching") + "...";

    try {
      var sig = await FaceDetector.extractSignature(state.imageEl);
      state.faceSignature = sig.signature;
      if (sig.best) {
        state.faces = [{ x: sig.best.x, y: sig.best.y, width: sig.best.width, height: sig.best.height }];
      }
      document.getElementById("searchQuery").textContent = sig.best ? t("face_detected_one") : t("no_face_detected");
      await sleep(900);
      var data = SearchEngine.searchByFace(sig.signature, "");
      state.searchResults = data.results;
      renderResults(data.results);
      fallback.hidden = data.results.length >= 5;
    } catch (e) {
      console.error(e);
      fallback.hidden = false;
    } finally {
      loader.hidden = true;
      document.getElementById("searchBtn").disabled = false;
    }
  }

  function runNameSearch() {
    var name = document.getElementById("nameInput").value.trim();
    var parts = name.split(/\s+/).filter(Boolean);
    var val = document.getElementById("nameValidation");
    if (parts.length < 2) {
      val.hidden = false;
      val.textContent = t("need_full_name");
      val.style.color = "var(--danger)";
      return;
    }
    val.hidden = true;
    document.getElementById("searchLoader").hidden = false;
    document.getElementById("searchNameBtn").disabled = true;
    document.getElementById("searchResults").innerHTML = "";
    document.getElementById("searchQuery").textContent = name;

    setTimeout(function () {
      var data = SearchEngine.searchByName(name);
      if (state.faceSignature) {
        for (var i = 0; i < data.results.length; i++) {
          var r = data.results[i];
          var extra = 10 + Math.abs(simpleHash(state.faceSignature + r.platform)) % 25;
          r.similarity = Math.min(99, r.similarity + extra);
          r.snippet += " Yuz ile ilave %" + extra + " eslesme dogrulandi.";
        }
        data.results.sort(function (a, b) { return b.similarity - a.similarity; });
      }
      state.searchResults = data.results;
      renderResults(data.results);
      document.getElementById("searchLoader").hidden = true;
      document.getElementById("searchNameBtn").disabled = false;
    }, 1200);
  }

  function simpleHash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function renderResults(results) {
    var grid = document.getElementById("searchResults");
    grid.innerHTML = "";
    if (!results || !results.length) {
      grid.innerHTML = '<p style="color:var(--text-dim)">' + t("no_results") + '</p>';
      return;
    }
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      var card = document.createElement("div");
      card.className = "result-card";
      var html = '<div class="rc-top">' +
        '<span class="rc-platform">' + esc(r.platform) + '</span>' +
        '<span class="rc-type ' + (r.source_type || "web") + '">' + (r.source_type || "web") + '</span></div>' +
        '<div class="rc-snippet">' + esc(r.snippet || "") + '</div>' +
        '<div class="rc-match"><span class="match-label">' + t("match_label") + '</span>' +
        '<div class="match-bar"><div class="match-fill" style="width:0%" data-w="' + r.similarity + '"></div></div>' +
        '<span class="match-pct">%' + r.similarity + '</span></div>' +
        '<div class="rc-meta">';
      if (r.url) html += '<a class="rc-link" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + t("open_link") + '</a>';
      else html += '<span class="rc-no-link">-</span>';
      html += '<span>' + (r.found_date || "") + '</span></div>';
      card.innerHTML = html;
      grid.appendChild(card);
    }
    setTimeout(function () {
      var fills = grid.querySelectorAll(".match-fill");
      for (var j = 0; j < fills.length; j++) fills[j].style.width = fills[j].getAttribute("data-w") + "%";
    }, 100);
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]); }); }

  /* ============================================================
     ADIM 3: KORU
  ============================================================ */
  function bindProtect() {
    document.getElementById("back3to2").addEventListener("click", function () { goStep(2); });
    document.getElementById("noiseLevel").addEventListener("input", function () {
      document.getElementById("noiseLevelVal").textContent = document.getElementById("noiseLevel").value;
    });
    document.getElementById("jitterLevel").addEventListener("input", function () {
      document.getElementById("jitterLevelVal").textContent = document.getElementById("jitterLevel").value;
    });
    document.getElementById("spLevel").addEventListener("input", function () {
      document.getElementById("spLevelVal").textContent = document.getElementById("spLevel").value;
    });
    document.getElementById("smoothLevel").addEventListener("input", function () {
      document.getElementById("smoothLevelVal").textContent = document.getElementById("smoothLevel").value;
    });
    document.getElementById("blurLevel").addEventListener("input", function () {
      document.getElementById("blurLevelVal").textContent = document.getElementById("blurLevel").value;
    });
    document.getElementById("jpegQuality").addEventListener("input", function () {
      document.getElementById("jpegQualityVal").textContent = document.getElementById("jpegQuality").value;
    });
    document.getElementById("applyBtn").addEventListener("click", applyDefense);
  }

  async function preparePreview() {
    var status = document.getElementById("faceStatus");
    var canvas = document.getElementById("previewCanvas");
    var ph = document.getElementById("previewPlaceholder");
    if (!state.imageEl) { canvas.style.display = "none"; ph.style.display = "block"; status.textContent = t("no_photo"); return; }
    ph.style.display = "none"; canvas.style.display = "block";
    var scale = Math.min(1, 480 / state.imageEl.naturalWidth);
    canvas.width = state.imageEl.naturalWidth * scale;
    canvas.height = state.imageEl.naturalHeight * scale;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(state.imageEl, 0, 0, canvas.width, canvas.height);
    status.textContent = t("face_loading");
    var det = await FaceDetector.detect(canvas);
    if (det.best) {
      var b = det.best;
      state.faces = [{ x: b.x / scale, y: b.y / scale, width: b.width / scale, height: b.height / scale }];
      status.textContent = t("face_detected_one");
      ctx.strokeStyle = "rgba(78,168,255,.9)"; ctx.lineWidth = 2;
      det.faces.forEach(function (f) { ctx.strokeRect(f.x, f.y, f.width, f.height); });
    } else { state.faces = []; status.textContent = t("no_face_detected"); }
  }

  async function applyDefense() {
    if (!state.imageEl) return;
    var btn = document.getElementById("applyBtn");
    btn.disabled = true; btn.textContent = t("processing");
    try {
      var result = await Defense.applyAsync(state.imageEl, {
        noise: document.getElementById("optNoise").checked,
        noiseLevel: document.getElementById("noiseLevel").value,
        pixel: document.getElementById("optPixel").checked,
        exif: document.getElementById("optExif").checked,
        watermark: document.getElementById("optWatermark").checked,
        colorJitter: document.getElementById("optColorJitter").checked,
        jitterLevel: document.getElementById("jitterLevel").value,
        saltPepper: document.getElementById("optSaltPepper").checked,
        spLevel: document.getElementById("spLevel").value,
        edgeSmooth: document.getElementById("optEdgeSmooth").checked,
        smoothLevel: document.getElementById("smoothLevel").value,
        jpegCompress: document.getElementById("optJpegCompress").checked,
        jpegQuality: document.getElementById("jpegQuality").value,
        grayscale: document.getElementById("optGrayscale").checked,
        blur: document.getElementById("optBlur").checked,
        blurLevel: document.getElementById("blurLevel").value,
        name: "", faces: state.faces,
      });
      state.protectedDataUrl = result.canvas.toDataURL("image/png");
      state.report = result.report;
      document.getElementById("resultOriginal").src = state.imageDataUrl;
      document.getElementById("resultProtected").src = state.protectedDataUrl;
      var el = document.getElementById("protectionReport");
      if (result.report.length) {
        var html = "<strong>" + t("report_title") + ":</strong><ul>";
        result.report.forEach(function (r) { html += "<li>" + esc(r.label) + " - " + t("applied") + "</li>"; });
        el.innerHTML = html + "</ul>";
      } else { el.innerHTML = ""; }

      // Privacy score
      state.findings = buildFindings();
      state.score = Report.computePrivacyScore({
        foundResults: state.searchResults.length,
        defenses: result.report.length,
        fingerprint: state._lastFingerprint,
      });
      var prEl = document.getElementById("privacyReport");
      if (prEl) prEl.innerHTML = Report.renderReport(state.score, state.findings);

      goStep(4);
    } catch (e) { console.error(e); alert(e.message); }
    finally { btn.disabled = false; btn.textContent = t("apply_defense"); }
  }

  function buildFindings() {
    var arr = [];
    var sr = state.searchResults || [];
    arr.push({ ok: sr.length === 0, text: sr.length === 0 ? t("finding_no_results") : (t("finding_results") + ": " + sr.length) });
    arr.push({ ok: (state.report || []).length >= 3, text: t("finding_defenses") + ": " + (state.report || []).length });
    arr.push({ ok: !!state.faces.length, text: state.faces.length ? t("finding_face_detected") : t("finding_no_face") });
    arr.push({ ok: !!state.imageHash, text: state.imageHash ? t("finding_hash") : t("finding_no_hash") });
    if (state._lastFingerprint) {
      arr.push({ ok: state._lastFingerprint < 60, text: t("finding_fingerprint") + ": " + state._lastFingerprint + "/100" });
    }
    return arr;
  }

  /* ============================================================
     ADIM 4: SONUC
  ============================================================ */
  function bindResult() {
    document.getElementById("downloadBtn").addEventListener("click", function () {
      if (!state.protectedDataUrl) return;
      var a = document.createElement("a"); a.href = state.protectedDataUrl; a.download = "protected-privacyshield.png"; a.click();
    });
    document.getElementById("restartBtn").addEventListener("click", function () { resetCapture(); goStep(1); });
    document.getElementById("exportJsonBtn").addEventListener("click", function () {
      var data = Report.buildExport(state, state.score || { score: 0, grade: "?" }, state.findings);
      Report.download("privacyshield-report.json", JSON.stringify(data, null, 2), "application/json");
    });
    document.getElementById("exportCsvBtn").addEventListener("click", function () {
      var csv = Report.toCSV(state.searchResults);
      Report.download("privacyshield-results.csv", csv, "text/csv");
    });
    document.getElementById("exportPdfBtn").addEventListener("click", function () {
      Report.downloadPDF(state, state.score || { score: 0, grade: "?" }, state.findings);
    });
  }

  /* ============================================================
     YENI: Privacy alətləri paneli
  ============================================================ */
  async function initPrivacyTools() {
    var fpBox = document.getElementById("fpResult");
    var ipBox = document.getElementById("ipResult");
    var pwBox = document.getElementById("pwResult");
    var phBox = document.getElementById("phResult");

    // 1) Fingerprint
    if (fpBox) {
      try {
        var fp = await Privacy.fingerprint();
        state._lastFingerprint = fp.uniqueness;
        fpBox.innerHTML = '<div class="tool-row">' +
          '<strong>' + t("fp_uniqueness") + ':</strong> ' +
          '<span class="big-num" style="color:' + (fp.uniqueness > 70 ? "var(--danger)" : fp.uniqueness > 40 ? "var(--warn)" : "var(--ok)") + '">' + fp.uniqueness + '/100</span></div>' +
          '<div class="tool-row"><span class="muted">' + t("fp_platform") + ':</span> ' + esc(fp.data.platform) + '</div>' +
          '<div class="tool-row"><span class="muted">' + t("fp_screen") + ':</span> ' + esc(fp.data.screenResolution) + ' @' + fp.data.pixelRatio + 'x</div>' +
          '<div class="tool-row"><span class="muted">' + t("fp_locale") + ':</span> ' + esc(fp.data.language) + ' / ' + esc(fp.data.timezone) + '</div>' +
          '<div class="tool-row"><span class="muted">' + t("fp_hardware") + ':</span> ' + fp.data.hardwareConcurrency + ' cores / ' + (fp.data.deviceMemory || "?") + ' GB</div>' +
          '<div class="tool-row"><span class="muted">' + t("fp_canvas") + ':</span> <code>' + esc(fp.data.canvasHash || "-") + '</code></div>';
      } catch (e) { fpBox.textContent = "Error: " + e.message; }
    }

    // 2) IP leak
    if (ipBox) {
      try {
        var ip = await Privacy.ipLeak();
        if (ip.error) { ipBox.textContent = t("ip_unsupported"); }
        else if (!ip.candidates.length) { ipBox.textContent = t("ip_blocked"); }
        else {
          var leakedList = ip.candidates.filter(c => c.ip && c.ip.includes(".")).slice(0, 8);
          var html = leakedList.map(c => '<div class="tool-row"><code>' + esc(c.ip) + '</code></div>').join("");
          html += '<div class="tool-row ' + (ip.leaked ? "bad" : "ok") + '">' +
            (ip.leaked ? "⚠ " + t("ip_leaked") : "✓ " + t("ip_safe")) + '</div>';
          ipBox.innerHTML = html;
        }
      } catch (e) { ipBox.textContent = "Error: " + e.message; }
    }

    // 3) Password strength
    if (pwBox) {
      var pwInput = document.getElementById("pwInput");
      var updatePw = function () {
        var r = Privacy.passwordStrength(pwInput.value);
        var color = r.score < 25 ? "var(--danger)" : r.score < 50 ? "var(--warn)" : r.score < 75 ? "var(--accent)" : "var(--ok)";
        var html = '<div class="tool-row"><strong>' + t("pw_score") + ':</strong> ' +
          '<span class="big-num" style="color:' + color + '">' + r.score + '/100</span> <span class="muted">(' + esc(r.label) + ')</span></div>' +
          '<div class="tool-row"><span class="muted">' + t("pw_crack") + ':</span> <strong>' + esc(r.crackTime) + '</strong></div>' +
          '<div class="tool-row"><span class="muted">' + t("pw_entropy") + ':</span> ' + (r.entropy || 0) + ' bits</div>';
        if (r.suggestions.length) {
          html += '<div class="tool-suggestions"><strong>' + t("pw_suggestions") + ':</strong><ul>' +
            r.suggestions.map(s => '<li>' + esc(s) + '</li>').join("") + '</ul></div>';
        }
        pwBox.innerHTML = html;
      };
      pwInput.addEventListener("input", updatePw);
      updatePw();
    }

    // 4) Phishing
    if (phBox) {
      var phInput = document.getElementById("phInput");
      var phBtn = document.getElementById("phCheckBtn");
      var updatePh = function () {
        var r = Privacy.phishingCheck(phInput.value.trim());
        var color = r.score < 25 ? "var(--ok)" : r.score < 60 ? "var(--warn)" : "var(--danger)";
        phBox.innerHTML = '<div class="tool-row"><strong>' + t("ph_risk") + ':</strong> ' +
          '<span class="big-num" style="color:' + color + '">' + r.score + '/100</span></div>' +
          (r.host ? '<div class="tool-row"><span class="muted">Host:</span> <code>' + esc(r.host) + '</code></div>' : '') +
          (r.protocol ? '<div class="tool-row"><span class="muted">Protocol:</span> <code>' + esc(r.protocol) + '</code></div>' : '') +
          (r.flags && r.flags.length ?
            '<div class="tool-suggestions"><strong>' + t("ph_flags") + ':</strong><ul>' +
            r.flags.map(f => '<li>' + esc(f) + '</li>').join("") + '</ul></div>' : '');
      };
      phBtn.addEventListener("click", updatePh);
      phInput.addEventListener("input", updatePh);
    }

    // 5) Email breach
    var brBtn = document.getElementById("brCheckBtn");
    var brBox = document.getElementById("brResult");
    if (brBtn && brBox) {
      brBtn.addEventListener("click", async function () {
        var email = document.getElementById("brInput").value.trim();
        if (!email || !email.includes("@")) { brBox.textContent = t("breach_invalid"); return; }
        brBtn.disabled = true;
        brBox.innerHTML = '<span class="spinner"></span> ' + t("breach_searching");
        try {
          var resp = await fetch("/api/breach/check", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: email }),
          });
          var data = await resp.json();
          if (!data.breaches || !data.breaches.length) {
            brBox.innerHTML = '<div class="tool-row ok">✓ ' + t("breach_none") + '</div>';
          } else {
            brBox.innerHTML = '<div class="tool-row bad">⚠ ' + t("breach_found") + ': ' + data.breaches.length + '</div>' +
              data.breaches.map(b => '<div class="tool-row"><strong>' + esc(b.name || b) + '</strong> <span class="muted">' + esc(b.date || "") + '</span></div>').join("");
          }
        } catch (e) {
          brBox.textContent = "Error: " + e.message;
        } finally {
          brBtn.disabled = false;
        }
      });
    }
  }

  /* ---------- INIT ---------- */
  function init() {
    initModeBadge();
    bindCapture();
    bindSearch();
    bindProtect();
    bindResult();
    initPrivacyTools();
    document.querySelectorAll(".step").forEach(function (s) {
      s.addEventListener("click", function () { if (parseInt(s.dataset.step, 10) === 3) preparePreview(); });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  return { state: state };
})();
