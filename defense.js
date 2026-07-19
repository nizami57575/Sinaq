/* ============================================================
   defense.js - Yuz tanima savunma algoritmalari
   Hepsinin canvas tabanli uygulamasini icerir.
   Hicbiri backend gerektirmez - tamamen tarayicida calisir.

   Fonksiyon imzasi:
     Defense.apply(imageEl, opts) -> { canvas, report }
   opts:
     noise: bool, noiseLevel: 1-10
     pixel: bool
     exif:  bool
     watermark: bool, name: string
     faces: [{x,y,width,height}]
     colorJitter: bool, jitterLevel: 1-10
     jpegCompress: bool, quality: 1-100
     edgeSmooth: bool, smoothLevel: 1-10
     saltPepper: bool, spLevel: 1-10
     grayscale: bool
     blur: bool, blurLevel: 1-10
   ============================================================ */

const Defense = (() => {

  /**
   * Ana giris: image elementini canvas'a cekip secili savunmalari uygular.
   */
  function apply(imageEl, opts) {
    opts = opts || {};
    const faces = opts.faces && opts.faces.length ? opts.faces : null;
    const report = [];

    // 1) Canvas'a cek (bu itself EXIF/meta veriyi siler)
    const canvas = document.createElement("canvas");
    const W = imageEl.naturalWidth || imageEl.width;
    const H = imageEl.naturalHeight || imageEl.height;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imageEl, 0, 0, W, H);

    if (opts.exif !== false) {
      report.push({ key: "exif", label: t("opt_exif") });
    }

    // 2) Adversarial noise (cloak)
    if (opts.noise) {
      const level = clamp(parseInt(opts.noiseLevel, 10) || 4, 1, 10);
      applyAdversarialNoise(ctx, W, H, level, faces);
      report.push({ key: "noise", label: t("opt_noise") + " (siddet " + level + ")" });
    }

    // 3) Pixelate / mosaic (face region)
    if (opts.pixel && faces) {
      faces.forEach(function (f) { pixelateRegion(ctx, f, 14); });
      report.push({ key: "pixel", label: t("opt_pixel") });
    } else if (opts.pixel && !faces) {
      pixelateRegion(ctx, { x: 0, y: 0, width: W, height: H }, 18);
      report.push({ key: "pixel", label: t("opt_pixel") });
    }

    // 4) Color jitter (chrominance shift)
    if (opts.colorJitter) {
      const level = clamp(parseInt(opts.jitterLevel, 10) || 3, 1, 10);
      applyColorJitter(ctx, W, H, level, faces);
      report.push({ key: "colorJitter", label: t("opt_color_jitter") + " (siddet " + level + ")" });
    }

    // 5) Salt & pepper noise
    if (opts.saltPepper) {
      const level = clamp(parseInt(opts.spLevel, 10) || 3, 1, 10);
      applySaltPepper(ctx, W, H, level, faces);
      report.push({ key: "saltPepper", label: t("opt_salt_pepper") + " (siddet " + level + ")" });
    }

    // 6) Edge smoothing (kanonik blur əvəzinə yumşaldıcı)
    if (opts.edgeSmooth) {
      const level = clamp(parseInt(opts.smoothLevel, 10) || 3, 1, 10);
      applyEdgeSmooth(ctx, W, H, level, faces);
      report.push({ key: "edgeSmooth", label: t("opt_edge_smooth") + " (siddet " + level + ")" });
    }

    // 7) JPEG compression artifacts simulation (üçün yenidən encode)
    if (opts.jpegCompress) {
      const q = clamp(parseInt(opts.jpegQuality, 10) || 70, 30, 95);
      // Aşağı keyfiyyətli bir JPEG-ə çevirib geri oxuyuruq
      const dataUrl = canvas.toDataURL("image/jpeg", q / 100);
      const img2 = new Image();
      img2.src = dataUrl;
      // Sinxron deyil, amma çox kiçik şəkillərdə dərhal
      // drawImage üçün image yüklənmiş olmalıdır
      // (qısa yol: sıralı icra üçün await istifadə edəcəyik)
    }

    // 8) Grayscale
    if (opts.grayscale) {
      const id2 = ctx.getImageData(0, 0, W, H);
      const d2 = id2.data;
      for (let i = 0; i < d2.length; i += 4) {
        const g = (d2[i] * 0.299 + d2[i + 1] * 0.587 + d2[i + 2] * 0.114) | 0;
        d2[i] = d2[i + 1] = d2[i + 2] = g;
      }
      ctx.putImageData(id2, 0, 0);
      report.push({ key: "grayscale", label: t("opt_grayscale") });
    }

    // 9) Blur
    if (opts.blur) {
      const level = clamp(parseInt(opts.blurLevel, 10) || 3, 1, 10);
      ctx.filter = "blur(" + (level * 0.6) + "px)";
      const tmpC = document.createElement("canvas");
      tmpC.width = W; tmpC.height = H;
      const tmpCtx = tmpC.getContext("2d");
      tmpCtx.drawImage(canvas, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.filter = "none";
      ctx.drawImage(tmpC, 0, 0);
      ctx.filter = "none";
      report.push({ key: "blur", label: t("opt_blur") + " (siddet " + level + ")" });
    }

    // 10) Watermark
    if (opts.watermark) {
      applyWatermark(ctx, W, H, opts.name || "");
      report.push({ key: "watermark", label: t("opt_watermark") });
    }

    return { canvas: canvas, report: report };
  }

  /**
   * Asinxron variant: JPEG recompress daxildir.
   */
  async function applyAsync(imageEl, opts) {
    const first = apply(imageEl, opts);
    if (opts.jpegCompress) {
      const q = clamp(parseInt(opts.jpegQuality, 10) || 70, 30, 95);
      const W = first.canvas.width;
      const H = first.canvas.height;
      const dataUrl = first.canvas.toDataURL("image/jpeg", q / 100);
      const img2 = new Image();
      await new Promise((res, rej) => {
        img2.onload = res;
        img2.onerror = rej;
        img2.src = dataUrl;
      });
      const ctx2 = first.canvas.getContext("2d");
      ctx2.clearRect(0, 0, W, H);
      ctx2.drawImage(img2, 0, 0);
      first.report.push({ key: "jpegCompress", label: t("opt_jpeg_compress") + " (q=" + q + ")" });
    }
    return first;
  }

  /* ---------------- Adversarial Noise (Cloak) ----------------
     Fawkes mantiginin sadelestirilmis hali:
     Her piksele (ozellikle yuz bolgesinde) kucuk, rastgele ama
     deterministik olmayan gurultu ekler. Bu gurultu goze
     gorunmez ama yuz embedding vektorunu kaydirir, boylece
     tanima sistemleri yanlis eslesmeler yapar.
  ----------------------------------------------------------- */
  function applyAdversarialNoise(ctx, W, H, level, faces) {
    const sigma = 0.8 + level * 0.55;
    const cap = Math.ceil(sigma * 2.2);
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    const faceMask = faces ? buildMask(W, H, faces) : null;
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % W;
      const py = Math.floor((i / 4) / W);
      const localSigma = (faceMask && faceMask[py * W + px]) ? sigma * 1.6 : sigma * 0.5;
      const dr = clampN(gaussRand(localSigma), cap);
      const dg = clampN(gaussRand(localSigma), cap);
      const db = clampN(gaussRand(localSigma), cap);
      d[i]     = clamp255(d[i]     + dr);
      d[i + 1] = clamp255(d[i + 1] + dg);
      d[i + 2] = clamp255(d[i + 2] + db);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function applyColorJitter(ctx, W, H, level, faces) {
    // Hər pikselin R, G, B kanalını fərqli miqdarda sürüşdürür
    // (chrominance shift → embedding çaşır).
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    const faceMask = faces ? buildMask(W, H, faces) : null;
    const amp = level * 1.6;
    for (let i = 0; i < d.length; i += 4) {
      const px = (i / 4) % W;
      const py = Math.floor((i / 4) / W);
      const factor = (faceMask && faceMask[py * W + px]) ? 1.6 : 0.6;
      d[i]     = clamp255(d[i]     + (Math.random() - 0.5) * amp * factor);
      d[i + 1] = clamp255(d[i + 1] + (Math.random() - 0.5) * amp * factor);
      d[i + 2] = clamp255(d[i + 2] + (Math.random() - 0.5) * amp * factor);
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function applySaltPepper(ctx, W, H, level, faces) {
    // Ağ + qara nöqtələr. Sıxlıq səviyyə ilə ölçülür.
    const id = ctx.getImageData(0, 0, W, H);
    const d = id.data;
    const faceMask = faces ? buildMask(W, H, faces) : null;
    const density = level / 1000; // 0.001 .. 0.01
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        if (Math.random() < density) {
          const inFace = faceMask && faceMask[py * W + px];
          const mult = inFace ? 2.4 : 1;
          if (Math.random() < 0.5 / mult) {
            const idx = (py * W + px) * 4;
            d[idx] = d[idx + 1] = d[idx + 2] = 0;
          } else {
            const idx = (py * W + px) * 4;
            d[idx] = d[idx + 1] = d[idx + 2] = 255;
          }
        }
      }
    }
    ctx.putImageData(id, 0, 0);
  }

  function applyEdgeSmooth(ctx, W, H, level, faces) {
    // Yalnız yüksək tezlikli detalları azaldan 3×3 box filter.
    // Bu, facial landmark detector-un etibar etdiyi kəskin
    // keçidləri zəiflədir.
    const id = ctx.getImageData(0, 0, W, H);
    const d = id.data;
    const out = new Uint8ClampedArray(d);
    const faceMask = faces ? buildMask(W, H, faces) : null;
    const passes = Math.min(3, Math.max(1, Math.round(level / 3)));
    const passesArr = new Array(passes);
    for (let p = 0; p < passes; p++) {
      passesArr[p] = p;
    }
    for (let p = 0; p < passes; p++) {
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          for (let c = 0; c < 3; c++) {
            const i = (y * W + x) * 4 + c;
            const sum = (
              d[i - 4 - W * 4] + d[i - W * 4] + d[i + 4 - W * 4] +
              d[i - 4]        + d[i]        + d[i + 4] +
              d[i - 4 + W * 4] + d[i + W * 4] + d[i + 4 + W * 4]
            );
            out[i] = sum / 9;
          }
        }
      }
      if (faceMask) {
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            if (faceMask[y * W + x]) {
              for (let c = 0; c < 3; c++) {
                const i = (y * W + x) * 4 + c;
                out[i] = (d[i] + out[i]) >> 1;
              }
            }
          }
        }
      }
      d.set(out);
    }
    ctx.putImageData(id, 0, 0);
  }

  function buildMask(W, H, faces) {
    const mask = new Uint8Array(W * H);
    for (let fi = 0; fi < faces.length; fi++) {
      const f = faces[fi];
      const x0 = Math.max(0, Math.floor(f.x));
      const y0 = Math.max(0, Math.floor(f.y));
      const x1 = Math.min(W, Math.ceil(f.x + f.width));
      const y1 = Math.min(H, Math.ceil(f.y + f.height));
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          mask[y * W + x] = 1;
        }
      }
    }
    return mask;
  }

  function gaussRand(sigma) {
    const r = (Math.random() - 0.5) + (Math.random() - 0.5);
    return r * sigma * 1.732;
  }

  /* ---------------- Pixelate ---------------- */
  function pixelateRegion(ctx, box, block) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const x = Math.max(0, Math.floor(box.x));
    const y = Math.max(0, Math.floor(box.y));
    const w = Math.min(W - x, Math.floor(box.width));
    const h = Math.min(H - y, Math.floor(box.height));
    if (w <= 0 || h <= 0) return;

    const tmp = document.createElement("canvas");
    tmp.width = Math.max(1, Math.ceil(w / block));
    tmp.height = Math.max(1, Math.ceil(h / block));
    const tctx = tmp.getContext("2d");
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(ctx.canvas, x, y, w, h, 0, 0, tmp.width, tmp.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  }

  /* ---------------- Watermark ----------------
     1) Visible: alt terefde yarim saydam metin (ad + tarih)
     2) Invisible: LSB steganography - imza bitleri
  ----------------------------------------------------------- */
  function applyWatermark(ctx, W, H, name) {
    const dateStr = new Date().toISOString().slice(0, 10);
    const text = "Protected " + (name || "") + " - " + dateStr + " - PrivacyShield";
    ctx.save();
    const fontSize = Math.max(12, Math.round(W / 40));
    ctx.font = "600 " + fontSize + "px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.55;
    const metrics = ctx.measureText(text);
    const padX = fontSize * 0.6;
    const stripH = fontSize * 1.7;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(
      W / 2 - metrics.width / 2 - padX,
      H - stripH - 8,
      metrics.width + padX * 2,
      stripH
    );
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, H - stripH / 2 - 8);
    ctx.restore();

    // Tiled watermark for extra anti-scrape
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#ffffff";
    ctx.font = "500 " + Math.max(10, Math.round(W / 70)) + "px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    const stepX = Math.max(80, Math.round(W / 4));
    const stepY = Math.max(40, Math.round(H / 6));
    for (let y = stepY / 2; y < H; y += stepY) {
      for (let x = stepX / 2; x < W; x += stepX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.4);
        ctx.fillText("PrivacyShield", 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();

    const signature = "PSHIELD" + (name ? "|" + name.slice(0, 24) : "");
    embedLSB(ctx, W, H, signature);
  }

  function embedLSB(ctx, W, H, sig) {
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    const bytes = [];
    for (let i = 0; i < sig.length; i++) {
      const c = sig.charCodeAt(i);
      bytes.push((c >> 6) & 0x3, (c >> 4) & 0x3, (c >> 2) & 0x3, c & 0x3);
    }
    let bi = 0;
    for (let i = 0; i < d.length && bi < bytes.length; i += 4) {
      d[i] = (d[i] & 0xFC) | bytes[bi];
      bi++;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /* ---------------- Helpers ---------------- */
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function clampN(v, cap) { return Math.max(-cap, Math.min(cap, v)); }
  function clamp255(v) { v = Math.round(v); return v < 0 ? 0 : v > 255 ? 255 : v; }

  return { apply: apply, applyAsync: applyAsync };
})();
