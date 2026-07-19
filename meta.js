/* ============================================================
   meta.js - Image metadata viewer
   EXIF-i brauzerdən oxumaq çox limitlid, amma FileReader ilə
   şəkilin ölçüsünü, hashini, dominant rəngləri və digər
   faydalı məlumatları çıxara bilərik.
   ============================================================ */

const Meta = (() => {

  function fileInfo(file) {
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeHuman: humanSize(file.size),
      lastModified: new Date(file.lastModified).toISOString(),
    };
  }

  function humanSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + " MB";
    return (b / 1024 / 1024 / 1024).toFixed(2) + " GB";
  }

  /**
   * Şəkildən metadata çıxar (browser-də mümkün olan qədər).
   */
  function inspect(imageEl) {
    const W = imageEl.naturalWidth || imageEl.width;
    const H = imageEl.naturalHeight || imageEl.height;
    const c = document.createElement("canvas");
    c.width = 32; c.height = 32;
    const ctx = c.getContext("2d");
    ctx.drawImage(imageEl, 0, 0, 32, 32);
    const data = ctx.getImageData(0, 0, 32, 32).data;

    let r = 0, g = 0, b = 0;
    let darkPx = 0, brightPx = 0;
    const n = 32 * 32;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < 30) darkPx++;
      if (lum > 220) brightPx++;
    }
    r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
    const avgHex = "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
    const darkness = Math.round(darkPx / n * 100);
    const brightness = Math.round(brightPx / n * 100);

    // Aspect ratio
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    const g0 = gcd(W, H);
    const aspect = (W / g0) + ":" + (H / g0);

    // Əsas rəng paleti (top 3)
    const palette = dominantColors(ctx, 32, 32, 3);

    return {
      width: W,
      height: H,
      megapixels: ((W * H) / 1e6).toFixed(2),
      aspectRatio: aspect,
      avgColor: avgHex,
      darkness: darkness,
      brightness: brightness,
      palette: palette,
      hasAlpha: imageEl.src && imageEl.src.startsWith("data:image/png"),
    };
  }

  function dominantColors(ctx, W, H, n) {
    const data = ctx.getImageData(0, 0, W, H).data;
    const buckets = {};
    for (let i = 0; i < data.length; i += 4) {
      // Hər kanalı 32-yə yuvarlaqla (bucket)
      const r = data[i] & 0xE0;
      const g = data[i + 1] & 0xE0;
      const b = data[i + 2] & 0xE0;
      const k = r + "," + g + "," + b;
      buckets[k] = (buckets[k] || 0) + 1;
    }
    return Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, c]) => {
        const [r, g, b] = k.split(",").map(Number);
        return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
      });
  }

  /**
   * Şəklin SHA-256 hash-i (bənzərsizlik üçün).
   */
  async function sha256(dataUrl) {
    if (!window.crypto || !crypto.subtle) return "";
    const bin = atob(dataUrl.split(",")[1] || "");
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const digest = await crypto.subtle.digest("SHA-256", arr);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function renderHTML(info) {
    return '<div class="meta-grid">' +
      '<div class="meta-row"><span class="meta-k">' + t("meta_dim") + '</span><span class="meta-v">' + info.width + ' × ' + info.height + ' (' + info.megapixels + ' MP)</span></div>' +
      '<div class="meta-row"><span class="meta-k">' + t("meta_aspect") + '</span><span class="meta-v">' + info.aspectRatio + '</span></div>' +
      '<div class="meta-row"><span class="meta-k">' + t("meta_avg") + '</span><span class="meta-v"><span class="color-swatch" style="background:' + info.avgColor + '"></span> ' + info.avgColor + '</span></div>' +
      '<div class="meta-row"><span class="meta-k">' + t("meta_palette") + '</span><span class="meta-v">' +
        info.palette.map(c => '<span class="color-swatch" style="background:' + c + '"></span>').join("") + '</span></div>' +
      '<div class="meta-row"><span class="meta-k">' + t("meta_dark") + '</span><span class="meta-v">' + info.darkness + '%</span></div>' +
      '<div class="meta-row"><span class="meta-k">' + t("meta_bright") + '</span><span class="meta-v">' + info.brightness + '%</span></div>' +
      (info.hash ? '<div class="meta-row"><span class="meta-k">' + t("meta_hash") + '</span><span class="meta-v hash-mono">' + info.hash.slice(0, 32) + '…</span></div>' : '') +
    '</div>';
  }

  return {
    fileInfo: fileInfo,
    inspect: inspect,
    sha256: sha256,
    renderHTML: renderHTML,
  };
})();
