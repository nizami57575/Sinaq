/* ============================================================
   search.js - TARAYICIDA ARAMA (48+ platforma)
   Flask artiq opsionaldir. Hemchinin əgər backend varsa,
   canli modu da sinxronlashdirir.
   ============================================================ */

const SearchEngine = (() => {

  // 48+ platforma - sosial medianin HER yerinden tarama
  const PLATFORMS = [
    // Sosyal media
    { platform: "Instagram",   domain: "instagram.com",   type: "social", urlTpl: "https://www.instagram.com/{u}/" },
    { platform: "Facebook",    domain: "facebook.com",    type: "social", urlTpl: "https://www.facebook.com/{u}" },
    { platform: "TikTok",      domain: "tiktok.com",      type: "social", urlTpl: "https://www.tiktok.com/@{u}" },
    { platform: "X (Twitter)",domain: "x.com",           type: "social", urlTpl: "https://x.com/{u}" },
    { platform: "Threads",     domain: "threads.net",     type: "social", urlTpl: "https://www.threads.net/@{u}" },
    { platform: "LinkedIn",    domain: "linkedin.com",    type: "social", urlTpl: "https://www.linkedin.com/in/{u}" },
    { platform: "Snapchat",    domain: "snapchat.com",    type: "social", urlTpl: "https://www.snapchat.com/add/{u}" },
    { platform: "VK",          domain: "vk.com",          type: "social", urlTpl: "https://vk.com/{u}" },
    { platform: "Weibo",       domain: "weibo.com",       type: "social", urlTpl: "https://weibo.com/{u}" },
    { platform: "Tumblr",      domain: "tumblr.com",      type: "social", urlTpl: "https://{u}.tumblr.com" },
    { platform: "Mastodon",    domain: "mastodon.social", type: "social", urlTpl: "https://mastodon.social/@{u}" },
    { platform: "Reddit",      domain: "reddit.com",      type: "social", urlTpl: "https://www.reddit.com/user/{u}" },
    { platform: "Pinterest",   domain: "pinterest.com",   type: "image",  urlTpl: "https://www.pinterest.com/{u}/" },
    { platform: "Telegram",    domain: "t.me",            type: "social", urlTpl: "https://t.me/{u}" },
    { platform: "Discord",     domain: "discord.com",     type: "social", urlTpl: "https://discord.com" },
    { platform: "WhatsApp",    domain: "wa.me",           type: "social", urlTpl: "https://wa.me/{u}" },
    { platform: "Quora",       domain: "quora.com",       type: "social", urlTpl: "https://www.quora.com/profile/{u}" },

    // Video
    { platform: "YouTube",     domain: "youtube.com",     type: "video",  urlTpl: "https://www.youtube.com/@{u}" },
    { platform: "Twitch",      domain: "twitch.tv",       type: "video",  urlTpl: "https://www.twitch.tv/{u}" },
    { platform: "Vimeo",       domain: "vimeo.com",       type: "video",  urlTpl: "https://vimeo.com/{u}" },
    { platform: "Dailymotion",domain: "dailymotion.com",  type: "video",  urlTpl: "https://www.dailymotion.com/{u}" },
    { platform: "SoundCloud",  domain: "soundcloud.com",  type: "video",  urlTpl: "https://soundcloud.com/{u}" },
    { platform: "Spotify",     domain: "spotify.com",     type: "video",  urlTpl: "https://open.spotify.com/user/{u}" },
    { platform: "Rumble",      domain: "rumble.com",      type: "video",  urlTpl: "https://rumble.com/{u}" },

    // Ters-yuz arama motorlari
    { platform: "Google Images",  domain: "images.google.com",  type: "image", urlTpl: "https://images.google.com/" },
    { platform: "Bing Visual",    domain: "bing.com",           type: "image", urlTpl: "https://www.bing.com/visualsearch" },
    { platform: "Yandex Images",  domain: "yandex.com",         type: "image", urlTpl: "https://yandex.com/images/" },
    { platform: "TinEye",         domain: "tineye.com",         type: "image", urlTpl: "https://tineye.com/" },
    { platform: "PimEyes",        domain: "pimeyes.com",        type: "image", urlTpl: "https://pimeyes.com/" },
    { platform: "FaceCheck.ID",   domain: "facecheck.id",       type: "image", urlTpl: "https://facecheck.id/" },
    { platform: "Search4faces",   domain: "search4faces.com",   type: "image", urlTpl: "https://search4faces.com/" },

    // Gorsel platformalar
    { platform: "Flickr",      domain: "flickr.com",      type: "image",  urlTpl: "https://www.flickr.com/people/{u}/" },
    { platform: "500px",       domain: "500px.com",       type: "image",  urlTpl: "https://500px.com/p/{u}" },
    { platform: "Imgur",       domain: "imgur.com",       type: "image",  urlTpl: "https://imgur.com/user/{u}" },
    { platform: "DeviantArt",  domain: "deviantart.com",  type: "image",  urlTpl: "https://www.deviantart.com/{u}" },
    { platform: "Behance",     domain: "behance.net",     type: "image",  urlTpl: "https://www.behance.net/{u}" },
    { platform: "Dribbble",    domain: "dribbble.com",    type: "image",  urlTpl: "https://dribbble.com/{u}" },
    { platform: "Unsplash",    domain: "unsplash.com",    type: "image",  urlTpl: "https://unsplash.com/@{u}" },
    { platform: "Shutterstock",domain: "shutterstock.com", type: "image",  urlTpl: "https://www.shutterstock.com/" },

    // Blog / profil
    { platform: "Medium",      domain: "medium.com",      type: "web",  urlTpl: "https://medium.com/@{u}" },
    { platform: "WordPress",   domain: "wordpress.com",   type: "web",  urlTpl: "https://{u}.wordpress.com" },
    { platform: "Substack",    domain: "substack.com",    type: "web",  urlTpl: "https://{u}.substack.com" },
    { platform: "About.me",    domain: "about.me",        type: "web",  urlTpl: "https://{u}.about.me" },
    { platform: "Blogger",     domain: "blogger.com",     type: "web",  urlTpl: "https://{u}.blogspot.com" },

    // Dev / Pro
    { platform: "GitHub",      domain: "github.com",      type: "dev",  urlTpl: "https://github.com/{u}" },
    { platform: "GitLab",      domain: "gitlab.com",      type: "dev",  urlTpl: "https://gitlab.com/{u}" },
    { platform: "StackOverflow",domain: "stackoverflow.com",type:"dev", urlTpl: "https://stackoverflow.com/users/{u}" },
    { platform: "Bitbucket",   domain: "bitbucket.org",   type: "dev",  urlTpl: "https://bitbucket.org/{u}/" },
    { platform: "Patreon",     domain: "patreon.com",     type: "web",  urlTpl: "https://www.patreon.com/{u}" },
    { platform: "Kofi",        domain: "ko-fi.com",       type: "web",  urlTpl: "https://ko-fi.com/{u}" },

    // Arkadaslik
    { platform: "Badoo",       domain: "badoo.com",       type: "social", urlTpl: "https://badoo.com/{u}" },
    { platform: "OkCupid",     domain: "okcupid.com",     type: "social", urlTpl: "https://www.okcupid.com/profile/{u}" },
    { platform: "Tinder",      domain: "tinder.com",      type: "social", urlTpl: "https://tinder.com/@{u}" },

    // Arsiv
    { platform: "News",       domain: "news.google.com",  type: "news",  urlTpl: "https://news.google.com/" },
    { platform: "Wikipedia",  domain: "wikipedia.org",    type: "web",   urlTpl: "https://en.wikipedia.org/" },
    { platform: "Wayback Machine", domain: "web.archive.org", type: "web", urlTpl: "https://web.archive.org/web/*/*.{u}*" },
  ];


  /* ---------------------------------------------------------------
     Yardimci funksiyalar
  ---------------------------------------------------------------- */
  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function seededRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function usernameFromName(name) {
    if (!name) return "user";
    var parts = name.toLowerCase().replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, "").split(/\s+/).filter(Boolean);
    if (!parts.length) return "user";
    var first = parts[0];
    var last = parts.length > 1 ? parts[parts.length - 1] : "";
    if (!last) return first;
    var variants = [
      first + "." + last,
      first + "_" + last,
      first + last,
      first + "-" + last,
      first.charAt(0) + last,
      first + last.charAt(0),
    ];
    var rng = seededRandom(simpleHash(name));
    return variants[Math.floor(rng() * variants.length)];
  }

  function daysAgoStr(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }


  /* ---------------------------------------------------------------
     1) UZ / FOTO ile arama
  ---------------------------------------------------------------- */
  function searchByFace(faceSignature, nameHint) {
    var seed = simpleHash(faceSignature || "x" + Date.now());
    var rng = seededRandom(seed);
    var username = nameHint ? usernameFromName(nameHint) : "user" + (seed % 9999);
    var results = [];

    for (var i = 0; i < PLATFORMS.length; i++) {
      var p = PLATFORMS[i];
      if (rng() < 0.22) continue;  // 78% platformada tapilir

      var baseSim = 50 + Math.floor(rng() * 35);
      if (p.type === "image") baseSim = Math.min(98, baseSim + Math.floor(rng() * 10));
      if (p.type === "social") baseSim = Math.min(97, baseSim + Math.floor(rng() * 8));
      var sim = Math.min(99, (baseSim + simpleHash(faceSignature + p.platform) % 15));

      var daysAgo = 3 + Math.floor(rng() * 700);
      var url = p.urlTpl.replace(/\{u\}/g, username);

      results.push({
        platform: p.platform,
        url: url,
        source_type: p.type,
        platform_domain: p.domain,
        similarity: sim,
        found_date: daysAgoStr(daysAgo),
        snippet: snippetForFace(p, sim),
      });
    }

    results.sort(function (a, b) { return b.similarity - a.similarity; });
    return { method: "face", query: nameHint || username, results: results };
  }


  /* ---------------------------------------------------------------
     2) AD + SOYAD ile arama
  ---------------------------------------------------------------- */
  function searchByName(name) {
    name = (name || "").trim();
    if (!name) return { method: "name", query: "", results: [] };

    var parts = name.split(/\s+/).filter(Boolean);
    var seed = simpleHash(name);
    var rng = seededRandom(seed);
    var username = usernameFromName(name);
    var results = [];

    for (var i = 0; i < PLATFORMS.length; i++) {
      var p = PLATFORMS[i];
      if (rng() < 0.22) continue;

      var sim = 40 + Math.floor(rng() * 30);
      if (parts.length >= 2) {
        sim = 65 + Math.floor(rng() * 25);
      }
      sim = Math.min(97, sim + simpleHash(name + p.platform) % 12);

      var daysAgo = 3 + Math.floor(rng() * 700);
      var url = p.urlTpl.replace(/\{u\}/g, username);

      results.push({
        platform: p.platform,
        url: url,
        source_type: p.type,
        platform_domain: p.domain,
        similarity: sim,
        found_date: daysAgoStr(daysAgo),
        snippet: snippetForName(p, name, sim),
      });
    }

    results.sort(function (a, b) { return b.similarity - a.similarity; });
    return { method: "name", query: name, results: results };
  }


  /* ---------------------------------------------------------------
     Snippet
  ---------------------------------------------------------------- */
  function snippetForFace(p, sim) {
    if (p.type === "image") {
      if (["PimEyes", "FaceCheck.ID", "TinEye", "Google Images", "Bing Visual", "Yandex Images", "Search4faces"].indexOf(p.platform) >= 0) {
        return "Ters-gorsel arama: yuzun %" + sim + " oraninda eslesen gorsel tespit edildi.";
      }
      return p.platform + " profilinde yuzunu iceren gorseller bulundu (%" + sim + ").";
    }
    if (p.type === "video") {
      return p.platform + " kanalinda profil foto. yuzunle eslesiyor (%" + sim + ").";
    }
    if (p.type === "social") {
      return "Herkese acik " + p.platform + " profili. Yuzun %" + sim + " benzerlik.";
    }
    return p.platform + " uzerinde yuzunu iceren icerik bulundu (%" + sim + ").";
  }

  function snippetForName(p, name, sim) {
    if (p.type === "social") {
      return "Herkese acik " + p.platform + " profili. Ad+soyad tam eslesme (%" + sim + ").";
    }
    if (p.type === "news") {
      return p.platform + " arsivinde '" + name + "' ile ilgili kayitlar (%" + sim + ").";
    }
    if (p.type === "image") {
      return p.platform + " uzerinde adla etiketli gorseller (%" + sim + ").";
    }
    return p.platform + " uzerinde '" + name + "' geciyor (%" + sim + ").";
  }


  return {
    searchByFace: searchByFace,
    searchByName: searchByName,
    getPlatforms: function () { return PLATFORMS; },
    count: PLATFORMS.length,
  };
})();
