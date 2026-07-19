/* ============================================================
   privacy.js - Gizlilik alətləri
   - Browser fingerprint göstərici
   - IP sızıntı yoxlaması (WebRTC)
   - Password strength checker
   - Phishing URL check (client-side heuristics)
   ============================================================ */

const Privacy = (() => {

  // ---- 1) Browser Fingerprint ----------------------------------
  // Skor: nə qədər çox unikal məlumat sənə "iz" buraxır.
  // Burada yalnız ekran, dil, timezone və s. kimiümumi API-lərdən
  // istifadə edirik, heç bir tracker deyilik.
  async function fingerprint() {
    const data = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: (navigator.languages || []).join(","),
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || "?",
      deviceMemory: navigator.deviceMemory || "?",
      maxTouchPoints: navigator.maxTouchPoints || 0,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === "1",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "?",
      timezoneOffset: new Date().getTimezoneOffset(),
      screenResolution: `${screen.width}x${screen.height}`,
      availableResolution: `${screen.availWidth}x${screen.availHeight}`,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
      canvasHash: await canvasHash(),
      audioHash: await audioHashSafe(),
    };

    // Skor: 0-100, nə qədər yüksək = o qədər çox unikal
    let score = 0;
    if (data.languages) score += 8;
    if (data.hardwareConcurrency !== "?") score += 10;
    if (data.deviceMemory !== "?") score += 10;
    score += 12; // canvas
    if (data.audioHash) score += 10;
    if (data.timezone !== "?") score += 8;
    if (data.screenResolution !== "?x?") score += 10;
    if (data.colorDepth) score += 5;
    if (data.pixelRatio && data.pixelRatio !== 1) score += 5;
    if (data.platform) score += 5;
    if (!data.doNotTrack) score += 8; // DNT yoxdursa artıq
    if (data.cookieEnabled) score += 5;
    if (data.maxTouchPoints > 0) score += 4;
    score = Math.min(100, score);

    return { data: data, uniqueness: score };
  }

  function canvasHash() {
    try {
      const c = document.createElement("canvas");
      c.width = 240; c.height = 60;
      const ctx = c.getContext("2d");
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(0, 0, 240, 60);
      ctx.fillStyle = "#069";
      ctx.font = "14px 'Arial'";
      ctx.fillText("PrivacyShield-fp ✓ çiğ", 4, 24);
      ctx.fillStyle = "rgba(120, 60, 200, 0.7)";
      ctx.fillText("PrivacyShield-fp ✓ çiğ", 4, 48);
      return djb2(c.toDataURL());
    } catch (e) { return ""; }
  }

  async function audioHashSafe() {
    try {
      if (!window.OfflineAudioContext) return "";
      const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const ctx = new Ctx(1, 44100, 44100);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 10000;
      const comp = ctx.createDynamicsCompressor();
      osc.connect(comp);
      comp.connect(ctx.destination);
      osc.start(0);
      const buf = await ctx.startRendering();
      const ch = buf.getChannelData(0);
      let sum = 0;
      for (let i = 4500; i < 5000; i++) sum += Math.abs(ch[i]);
      return String(Math.round(sum));
    } catch (e) { return ""; }
  }

  function djb2(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  // ---- 2) IP Leak (WebRTC) -------------------------------------
  // WebRTC bəzi hallarda real IP-ni sızdıra bilər. Bu test lokal
  // ICE namizədlərini yığıb göstərir. Heç bir şey göndərilmir.
  async function ipLeak() {
    return new Promise((resolve) => {
      const candidates = [];
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { pc.close(); } catch (e) {}
        resolve({ candidates: candidates, leaked: candidates.some(c => isPublicIP(c.ip)) });
      };
      let pc;
      try {
        pc = new RTCPeerConnection({ iceServers: [] });
      } catch (e) { resolve({ candidates: [], leaked: false, error: e.message }); return; }
      pc.createDataChannel("");
      pc.onicecandidate = (e) => {
        if (!e.candidate) { finish(); return; }
        const m = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9:]+)/i.exec(e.candidate.candidate || "");
        if (m) candidates.push({ ip: m[1], type: e.candidate.candidate });
        if (candidates.length > 30) finish();
      };
      pc.createOffer()
        .then(o => pc.setLocalDescription(o))
        .catch(err => { resolve({ candidates: [], leaked: false, error: String(err) }); });
      setTimeout(finish, 1500);
    });
  }

  function isPublicIP(ip) {
    if (!ip) return false;
    if (ip.includes(":")) return !/^fe80:/i.test(ip) && !/^fc/i.test(ip);
    if (ip.startsWith("127.") || ip.startsWith("0.")) return false;
    if (ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
    if (ip.startsWith("172.")) {
      const second = parseInt(ip.split(".")[1], 10);
      if (second >= 16 && second <= 31) return false;
    }
    if (ip.startsWith("169.254.")) return false;
    return true;
  }

  // ---- 3) Password strength -----------------------------------
  function passwordStrength(pw) {
    if (!pw) return { score: 0, label: t("pw_empty"), crackTime: "0s", suggestions: [] };
    let score = 0;
    const suggestions = [];
    if (pw.length >= 8) score += 10; else suggestions.push(t("pw_too_short"));
    if (pw.length >= 12) score += 10;
    if (pw.length >= 16) score += 10;
    if (/[a-z]/.test(pw)) score += 8;
    if (/[A-Z]/.test(pw)) score += 8;
    if (/[0-9]/.test(pw)) score += 8;
    if (/[^a-zA-Z0-9]/.test(pw)) score += 12; else suggestions.push(t("pw_no_symbol"));
    if (/(.)\1\1/.test(pw)) { score -= 10; suggestions.push(t("pw_repeat")); }
    if (/^(123|abc|qwerty|password|admin)/i.test(pw)) { score -= 15; suggestions.push(t("pw_common")); }
    score = Math.max(0, Math.min(100, score));

    // Çox kobud "crack time" təxmini (entropiya → saniyə)
    const charset = (/[a-z]/.test(pw) ? 26 : 0) + (/[A-Z]/.test(pw) ? 26 : 0) + (/[0-9]/.test(pw) ? 10 : 0) + (/[^a-zA-Z0-9]/.test(pw) ? 32 : 0);
    const entropy = pw.length * Math.log2(charset || 1);
    const guesses = Math.pow(2, entropy);
    const seconds = guesses / 1e10; // 10 GH/s qarşı
    const crackTime = humanTime(seconds);

    let label;
    if (score < 25) label = t("pw_weak");
    else if (score < 50) label = t("pw_fair");
    else if (score < 75) label = t("pw_good");
    else label = t("pw_strong");

    return { score: score, label: label, crackTime: crackTime, suggestions: suggestions, entropy: Math.round(entropy) };
  }

  function humanTime(seconds) {
    if (seconds < 1) return t("time_instant");
    if (seconds < 60) return Math.round(seconds) + " " + t("time_sec");
    if (seconds < 3600) return Math.round(seconds / 60) + " " + t("time_min");
    if (seconds < 86400) return Math.round(seconds / 3600) + " " + t("time_hour");
    if (seconds < 31536000) return Math.round(seconds / 86400) + " " + t("time_day");
    const years = seconds / 31536000;
    if (years < 1000) return Math.round(years) + " " + t("time_year");
    if (years < 1e6) return Math.round(years / 1000) + "K " + t("time_year");
    if (years < 1e9) return Math.round(years / 1e6) + "M " + t("time_year");
    return t("time_eons");
  }

  // ---- 4) Phishing URL check (heuristic) ----------------------
  // Server-yə sorğu göndərmir. Yalnız URL-ə baxır.
  function phishingCheck(url) {
    if (!url) return { score: 0, flags: [] };
    const flags = [];
    let risk = 0;
    let parsed;
    try { parsed = new URL(url); } catch (e) {
      return { score: 100, flags: [t("phish_invalid")] };
    }
    const host = parsed.hostname.toLowerCase();
    if (/^https?$/.test(parsed.protocol) === false) {
      flags.push(t("phish_no_protocol"));
      risk += 30;
    } else if (parsed.protocol === "http:") {
      flags.push(t("phish_http"));
      risk += 15;
    }
    if (host.split(".").length > 4) {
      flags.push(t("phish_many_dots"));
      risk += 10;
    }
    if (/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/.test(host)) {
      flags.push(t("phish_ip_url"));
      risk += 25;
    }
    const brandList = ["paypal", "apple", "google", "microsoft", "amazon", "facebook", "instagram", "whatsapp", "netflix", "bank", "metamask", "binance"];
    brandList.forEach((b) => {
      if (host.includes(b) && !host.endsWith(b + ".com") && !host.endsWith("." + b + ".com")) {
        flags.push(t("phish_brand").replace("{brand}", b));
        risk += 20;
      }
    });
    if (host.includes("@") || host.includes("%")) { flags.push(t("phish_obfuscated")); risk += 25; }
    if (parsed.password) { flags.push(t("phish_userinfo")); risk += 30; }
    if (host.length > 40) { flags.push(t("phish_long_host")); risk += 10; }
    if (/-(login|verify|secure|update|account|confirm|banking)-/.test(host)) { flags.push(t("phish_keyword")); risk += 15; }
    if (/xn--/.test(host)) { flags.push(t("phish_punycode")); risk += 20; }
    if (parsed.port && !["80", "443", ""].includes(parsed.port)) { flags.push(t("phish_odd_port")); risk += 10; }
    return { score: Math.min(100, risk), flags: flags, host: host, protocol: parsed.protocol };
  }

  return {
    fingerprint: fingerprint,
    ipLeak: ipLeak,
    passwordStrength: passwordStrength,
    phishingCheck: phishingCheck,
  };
})();
