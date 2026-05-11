/**
 * Lankkurullakioski — dynamic theme from hero image (canvas palette extraction)
 * Place your image at assets/hero.jpg (or .png / .webp / .jpeg) or hero.jpg in site root.
 */
(function () {
  "use strict";

  var HERO_URLS = [
    "./assets/hero.jpg",
    "./assets/hero.jpeg",
    "./assets/hero.png",
    "./assets/hero.webp",
    "assets/hero.jpg",
    "assets/hero.jpeg",
    "assets/hero.png",
    "assets/hero.webp",
    "hero.jpg",
    "hero.jpeg",
    "hero.png",
    "hero.webp",
  ];
  /* Ei stock-kuvaa: jos assets/hero.* puuttuu, näytetään tumma gradientti + oletuspaletti */
  var FALLBACK_HERO_IMAGE =
    "linear-gradient(165deg, #0a1528 0%, #152238 42%, #0a0f1a 100%)";

  var root = document.documentElement;
  var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resolveHref(path) {
    if (!path || path.indexOf("linear-gradient") === 0) return path;
    try {
      return new URL(path, window.location.href).href;
    } catch (e) {
      return path;
    }
  }

  function syncHeroVisual(heroUrl) {
    var heroBg = document.getElementById("hero-bg");
    var heroPhoto = document.getElementById("hero-photo");
    if (!heroBg) return;

    if (!heroUrl || heroUrl.indexOf("linear-gradient") === 0) {
      heroBg.classList.add("hero__bg--gradient");
      if (heroUrl) root.style.setProperty("--hero-bg-image", heroUrl);
      if (heroPhoto) {
        heroPhoto.classList.remove("is-visible");
        heroPhoto.removeAttribute("src");
      }
      return;
    }

    heroBg.classList.remove("hero__bg--gradient");
    if (!heroPhoto) return;

    var href = resolveHref(heroUrl);
    heroPhoto.onload = function () {
      heroPhoto.classList.add("is-visible");
    };
    heroPhoto.onerror = function () {
      heroPhoto.classList.remove("is-visible");
    };
    heroPhoto.src = href;
    if (heroPhoto.complete && heroPhoto.naturalWidth > 0) {
      heroPhoto.classList.add("is-visible");
    }
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function srgbToLinear(c) {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(r, g, b) {
    var R = srgbToLinear(r);
    var G = srgbToLinear(g);
    var B = srgbToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;
    var d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        default:
          h = ((r - g) / d + 4) / 6;
      }
    }
    return { h: h * 360, s: s, l: l };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var rp = 0,
      gp = 0,
      bp = 0;
    if (h < 60) {
      rp = c;
      gp = x;
    } else if (h < 120) {
      rp = x;
      gp = c;
    } else if (h < 180) {
      gp = c;
      bp = x;
    } else if (h < 240) {
      gp = x;
      bp = c;
    } else if (h < 300) {
      rp = x;
      bp = c;
    } else {
      rp = c;
      bp = x;
    }
    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255),
    };
  }

  function mixRgb(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  function rgbCss(c) {
    return "rgb(" + c.r + "," + c.g + "," + c.b + ")";
  }

  function rgbaCss(c, a) {
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
  }

  function saturationRgb(r, g, b) {
    var max = Math.max(r, g, b) / 255;
    var min = Math.min(r, g, b) / 255;
    if (max === 0) return 0;
    return (max - min) / max;
  }

  function extractPalette(imageData, width, height) {
    var data = imageData.data;
    var sumR = 0,
      sumG = 0,
      sumB = 0;
    var count = 0;
    var bestSat = -1;
    var best = { r: 255, g: 179, b: 71 };
    var stride = 16;

    for (var i = 0; i < data.length; i += stride) {
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      var a = data[i + 3];
      if (a < 25) continue;
      count++;
      sumR += r;
      sumG += g;
      sumB += b;
      var lum = relativeLuminance(r, g, b);
      var sat = saturationRgb(r, g, b);
      if (lum > 0.06 && lum < 0.95 && sat > bestSat) {
        bestSat = sat;
        best = { r: r, g: g, b: b };
      }
    }

    if (count < 1) count = 1;
    var avg = {
      r: Math.round(sumR / count),
      g: Math.round(sumG / count),
      b: Math.round(sumB / count),
    };

    if (bestSat < 0.12) {
      var hslA = rgbToHsl(avg.r, avg.g, avg.b);
      best = hslToRgb(38, clamp(hslA.s + 0.35, 0.55, 0.95), clamp(hslA.l + 0.12, 0.42, 0.62));
    }

    var avgLum = relativeLuminance(avg.r, avg.g, avg.b);
    var isDark = avgLum < 0.42;

    var hslAccent = rgbToHsl(best.r, best.g, best.b);
    if (isDark && hslAccent.h > 200 && hslAccent.h < 300) {
      best = mixRgb(best, hslToRgb(36, 0.9, 0.58), 0.55);
    }

    return { avg: avg, accent: best, avgLum: avgLum, isDark: isDark };
  }

  function pickTextOnBg(isDarkTheme) {
    if (isDarkTheme) return { r: 245, g: 243, b: 235 };
    return { r: 24, g: 20, b: 30 };
  }

  function mutedFrom(text, bg, darkTheme) {
    return mixRgb(text, bg, darkTheme ? 0.42 : 0.4);
  }

  function applyThemeFromPalette(p, heroUrl) {
    var avg = p.avg;
    var acc = p.accent;
    var isDark = p.isDark;

    root.classList.remove("theme-dark", "theme-light");
    root.classList.add(isDark ? "theme-dark" : "theme-light");

    var black = { r: 0, g: 0, b: 0 };
    var white = { r: 255, g: 255, b: 255 };

    var bgDeep, bgElev, bgCard, bgCardHover;
    if (isDark) {
      bgDeep = mixRgb(avg, black, 0.78);
      bgElev = mixRgb(avg, black, 0.68);
      bgCard = mixRgb(avg, black, 0.55);
      bgCardHover = mixRgb(avg, black, 0.48);
    } else {
      bgDeep = mixRgb(avg, white, 0.72);
      bgElev = mixRgb(avg, white, 0.55);
      bgCard = mixRgb(avg, white, 0.38);
      bgCardHover = mixRgb(avg, white, 0.28);
    }

    var text = pickTextOnBg(isDark);
    var textMuted = mutedFrom(text, bgDeep, isDark);

    var accHsl = rgbToHsl(acc.r, acc.g, acc.b);
    var accentRgb = hslToRgb(accHsl.h, clamp(accHsl.s, 0.55, 1), clamp(accHsl.l, isDark ? 0.48 : 0.38, 0.62));
    var accentDeep = hslToRgb(accHsl.h, clamp(accHsl.s + 0.05, 0.5, 1), isDark ? 0.32 : 0.28);

    var borderA = isDark ? 0.08 : 0.12;
    var border = rgbaCss(text, borderA);

    var oTop;
    var oMid;
    var oBot = rgbCss(bgDeep);
    if (isDark) {
      var overlayStrength = clamp(0.35 + (1 - p.avgLum) * 0.35, 0.4, 0.82);
      oTop = rgbaCss(bgDeep, overlayStrength * 0.55);
      oMid = rgbaCss(bgDeep, overlayStrength * 0.88);
    } else {
      var scrim = clamp(0.28 + p.avgLum * 0.22, 0.32, 0.58);
      oTop = rgbaCss(white, scrim * 0.75);
      oMid = rgbaCss(white, scrim);
    }

    if (!heroUrl) {
      root.style.setProperty("--hero-bg-image", FALLBACK_HERO_IMAGE);
    } else if (heroUrl.indexOf("linear-gradient") === 0) {
      root.style.setProperty("--hero-bg-image", heroUrl);
    } else {
      root.style.setProperty("--hero-bg-image", "none");
    }

    root.style.setProperty("--bg-deep", rgbCss(bgDeep));
    root.style.setProperty("--bg-elevated", rgbCss(bgElev));
    root.style.setProperty("--bg-card", rgbCss(bgCard));
    root.style.setProperty("--bg-card-hover", rgbCss(bgCardHover));
    root.style.setProperty("--bg-gradient-mid", rgbCss(mixRgb(bgDeep, bgElev, 0.5)));
    root.style.setProperty("--text", rgbCss(text));
    root.style.setProperty("--text-muted", rgbCss(textMuted));
    root.style.setProperty("--accent", rgbCss(accentRgb));
    root.style.setProperty("--accent-deep", rgbCss(accentDeep));
    root.style.setProperty("--accent-soft", rgbaCss(accentRgb, isDark ? 0.18 : 0.22));
    root.style.setProperty("--accent-glow", rgbaCss(accentRgb, isDark ? 0.42 : 0.35));
    root.style.setProperty("--border-subtle", border);
    root.style.setProperty("--shadow-umbra", rgbaCss(black, isDark ? 0.5 : 0.12));
    root.style.setProperty("--hero-overlay-top", oTop);
    root.style.setProperty("--hero-overlay-mid", oMid);
    root.style.setProperty("--hero-overlay-bottom", oBot);
    root.style.setProperty("--header-bg", rgbaCss(bgDeep, isDark ? 0.82 : 0.88));
    root.style.setProperty("--nav-mobile-bg", rgbaCss(bgDeep, isDark ? 0.96 : 0.97));
    root.style.setProperty("--menu-cats-bg", rgbaCss(bgDeep, isDark ? 0.88 : 0.9));
    root.style.setProperty("--accent-rgb", accentRgb.r + " " + accentRgb.g + " " + accentRgb.b);
    root.style.setProperty("--accent-border-22", rgbaCss(accentRgb, 0.22));
    root.style.setProperty("--accent-border-28", rgbaCss(accentRgb, 0.28));
    root.style.setProperty("--accent-border-35", rgbaCss(accentRgb, 0.35));
    root.style.setProperty("--accent-border-55", rgbaCss(accentRgb, 0.55));
    root.style.setProperty("--accent-border-85", rgbaCss(accentRgb, 0.85));
    root.style.setProperty("--accent-fill-06", rgbaCss(accentRgb, 0.06));
    root.style.setProperty("--accent-fill-08", rgbaCss(accentRgb, 0.08));
    root.style.setProperty("--accent-fill-12", rgbaCss(accentRgb, 0.12));
    root.style.setProperty("--accent-fill-28", rgbaCss(accentRgb, 0.28));
    root.style.setProperty("--accent-fill-35", rgbaCss(accentRgb, 0.35));
    root.style.setProperty("--accent-fill-55", rgbaCss(accentRgb, 0.55));
    root.style.setProperty("--accent-glow-12", rgbaCss(accentRgb, 0.12));
    root.style.setProperty("--white-fill-04", rgbaCss(white, isDark ? 0.04 : 0.06));
    root.style.setProperty("--white-fill-05", rgbaCss(white, isDark ? 0.05 : 0.08));
    root.style.setProperty("--white-fill-09", rgbaCss(white, isDark ? 0.09 : 0.12));
    root.style.setProperty("--nav-hover-bg", rgbaCss(white, isDark ? 0.05 : 0.08));

    var houseBorder = mixRgb(hslToRgb(40, 1, 0.55), accentRgb, 0.25);
    root.style.setProperty("--badge-house-text", rgbCss(mixRgb({ r: 30, g: 22, b: 10 }, black, 0.12)));
    root.style.setProperty("--badge-house-border", rgbCss(houseBorder));
    root.style.setProperty("--badge-house-shadow", rgbaCss(accentRgb, 0.32));

    var spicyCore = mixRgb({ r: 220, g: 60, b: 60 }, accentRgb, 0.1);
    root.style.setProperty("--badge-spicy-text", "#fecaca");
    root.style.setProperty("--badge-spicy-border", rgbaCss({ r: 252, g: 165, b: 165 }, 0.55));
    root.style.setProperty("--badge-spicy-shadow", rgbaCss(spicyCore, 0.38));

    root.style.setProperty("--heat-tint", rgbaCss(spicyCore, isDark ? 0.08 : 0.12));
    root.style.setProperty("--heat-border", rgbaCss(spicyCore, isDark ? 0.4 : 0.35));
    root.style.setProperty("--featured-tint", rgbaCss(accentRgb, isDark ? 0.08 : 0.12));
    root.style.setProperty("--featured-border", rgbaCss(accentRgb, isDark ? 0.32 : 0.28));

    var btnTextLum = relativeLuminance(accentRgb.r, accentRgb.g, accentRgb.b);
    root.style.setProperty(
      "--btn-text",
      btnTextLum > 0.55 ? rgbCss({ r: 28, g: 22, b: 18 }) : "#fff"
    );

    syncHeroVisual(heroUrl);
  }

  var KIOSK_STATIC = {
    avg: { r: 18, g: 28, b: 48 },
    accent: { r: 255, g: 179, b: 71 },
    avgLum: 0.08,
    isDark: true,
  };

  function applyFallbackTheme() {
    applyThemeFromPalette(KIOSK_STATIC, FALLBACK_HERO_IMAGE);
  }

  function loadImage(url, cb) {
    var img = new Image();
    var resolved = resolveHref(url);
    if (/^https?:\/\//i.test(resolved)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = function () {
      cb(img);
    };
    img.onerror = function () {
      cb(null);
    };
    img.src = resolved;
  }

  function processImage(img, url) {
    var w = 80;
    var h = Math.max(48, Math.round((img.naturalHeight / img.naturalWidth) * w)) || 80;
    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      applyThemeFromPalette(KIOSK_STATIC, url);
      return;
    }
    try {
      ctx.drawImage(img, 0, 0, w, h);
      var imageData = ctx.getImageData(0, 0, w, h);
      var pal = extractPalette(imageData, w, h);
      applyThemeFromPalette(pal, url);
    } catch (err) {
      /* Canvas voi epäonnistua (esim. CORS) — säilytetään silti kuva, vain väriteema oletukseen */
      applyThemeFromPalette(KIOSK_STATIC, url);
    }
  }

  function tryNext(urls, index) {
    if (index >= urls.length) {
      applyFallbackTheme();
      return;
    }
    loadImage(urls[index], function (img) {
      if (img && img.naturalWidth > 0) processImage(img, urls[index]);
      else tryNext(urls, index + 1);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      tryNext(HERO_URLS, 0);
    });
  } else {
    tryNext(HERO_URLS, 0);
  }
})();
