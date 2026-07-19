/* ============================================================
   face.js - Yuz tespiti (face-api.js) + yuz imzasi cikarma
   - detect(): yuzleri bulur, en buyugunu dondurur
   - extractSignature(): imza stringi uretir (backend aramasi icin)
   - Model CDN'den yuklenir. Yuklenemezse imza piksel-tabanli olur.
   ============================================================ */

const FaceDetector = (() => {
  const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
  let modelsLoaded = false;
  let loadPromise = null;

  async function loadModels() {
    if (modelsLoaded) return true;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      if (typeof faceapi === "undefined") {
        console.warn("face-api.js yuklenmedi (CDN). Yuz tespiti atlanacak.");
        return false;
      }
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        if (faceapi.nets.faceLandmark68Net) {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        }
        modelsLoaded = true;
        return true;
      } catch (e) {
        console.warn("Model yukleme hatasi:", e);
        return false;
      }
    })();
    return loadPromise;
  }

  /**
   * Verilen girdide tum yuzleri bulur.
   * Donus: { faces: [...], ok: bool, best: enBuyukYuz|null }
   */
  async function detect(input) {
    const ok = await loadModels();
    if (!ok || typeof faceapi === "undefined") {
      return { faces: [], ok: false, best: null };
    }
    try {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
      const detections = await faceapi.detectAllFaces(input, options);

      const faces = detections.map(function (d) {
        const b = d.box;
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      });
      let best = null;
      if (faces.length) {
        best = faces.reduce(function (a, b) {
          return (a.width * a.height > b.width * b.height) ? a : b;
        });
      }
      return { faces: faces, ok: true, best: best };
    } catch (e) {
      console.warn("Yuz tespit hatasi:", e);
      return { faces: [], ok: false, best: null };
    }
  }

  /**
   * Bir girdiden yuz imzasi cikarir.
   * face-api landmarks varsa -> landmark koordinat hash'i
   * yoksa -> piksel histogram imzasi
   * Donus: { signature: string, method: "landmark"|"pixels"|"none", best: yuz|null }
   */
  async function extractSignature(input) {
    const ok = await loadModels();
    const result = { signature: "", method: "none", best: null };

    // Landmark-tabanli imza dene
    if (ok && typeof faceapi !== "undefined") {
      try {
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
        const withLandmarks = await faceapi
          .detectAllFaces(input, options)
          .withFaceLandmarks();

        if (withLandmarks && withLandmarks.length) {
          const bestDet = withLandmarks.reduce(function (a, b) {
            return (a.detection.box.width * a.detection.box.height >
                    b.detection.box.width * b.detection.box.height) ? a : b;
          });
          const pts = bestDet.landmarks.positions;
          let sig = "LM:";
          for (let i = 0; i < pts.length; i++) {
            sig += Math.round(pts[i].x) + "," + Math.round(pts[i].y) + ";";
          }
          const box = bestDet.detection.box;
          result.signature = sig;
          result.method = "landmark";
          result.best = { x: box.x, y: box.y, width: box.width, height: box.height };
          return result;
        }
      } catch (e) {
        console.warn("Landmark cikarma hatasi:", e);
      }
    }

    // Piksel-tabanli imza
    try {
      const det = await detect(input);
      if (det.best) {
        result.best = det.best;
        result.signature = pixelSignature(input, det.best);
        result.method = "pixels";
      } else {
        result.signature = pixelSignature(input, null);
        result.method = "pixels";
      }
    } catch (e) {
      result.signature = "fallback-" + Date.now();
      result.method = "none";
    }
    return result;
  }

  /**
   * Bolgenin (yuz veya tum gorsel) piksellerinden imza uretir.
   */
  function pixelSignature(input, region) {
    try {
      const srcW = input.naturalWidth || input.width;
      const srcH = input.naturalHeight || input.height;
      const N = 16;
      const c = document.createElement("canvas");
      c.width = N; c.height = N;
      const ctx = c.getContext("2d");
      if (region) {
        ctx.drawImage(input, region.x, region.y, region.width, region.height, 0, 0, N, N);
      } else {
        ctx.drawImage(input, 0, 0, srcW, srcH, 0, 0, N, N);
      }
      const data = ctx.getImageData(0, 0, N, N).data;
      let sum = 0;
      let sig = "PX:";
      for (let i = 0; i < data.length; i += 4) {
        const g = (data[i] + data[i + 1] + data[i + 2]) / 3;
        sum += g;
        sig += Math.round(g / 16);
      }
      sig += ":M" + Math.round(sum / (N * N));
      return sig;
    } catch (e) {
      return "pxerr-" + Date.now();
    }
  }

  return {
    loadModels: loadModels,
    detect: detect,
    extractSignature: extractSignature,
    isReady: function () { return modelsLoaded; },
  };
})();
