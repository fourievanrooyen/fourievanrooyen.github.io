/* ============================================================
   SKY ENGINE — physically motivated deep-space background
   ------------------------------------------------------------
   - Distant spiral galaxy: two-arm log spiral, blackbody star
     color gradient (warm core -> hot blue tips), dust lane across
     the core, HII nebula blobs, soft-focus blur pass for a
     photographic (not dotted) look, slow idle rotation
   - Milky Way band: density gradient, cloud structure, dust lanes
   - Rendered planets: procedural noise textures (rocky/cratered,
     banded gas giant, ringed), directional terminator + limb
     darkening + specular glint, atmosphere rim light, occlusion-
     correct ring compositing (back arc -> body -> shadow -> front
     arc), slow surface libration. Position is recomputed directly
     from scrollY every frame — no CSS-transform indirection.
   - Star colors from blackbody temperature by spectral class
     (O/B/A/F/G/K/M, visible-sky weighted frequencies)
   - Apparent-magnitude distribution: many faint, few bright
   - Atmospheric scintillation (twinkle) on brighter stars only
   - Diffraction spikes on the brightest few stars
   - Meteors emanating from a radiant, additive-blended trails;
     click anywhere on the empty field to launch one on demand
   - Cursor-follow parallax (2.5D depth) on the star layers, plus
     a faint hand-held light that tracks the pointer
   - Scroll parallax across layers; honors prefers-reduced-motion
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var galaxyCanvas = document.getElementById('sky-galaxy');
  var farCanvas = document.getElementById('sky-far');
  var planetsCanvas = document.getElementById('sky-planets');
  var nearCanvas = document.getElementById('sky-near');
  var animCanvas = document.getElementById('sky-anim');
  if (!farCanvas || !nearCanvas || !animCanvas) return;

  var galaxyCtx = galaxyCanvas ? galaxyCanvas.getContext('2d') : null;
  var farCtx = farCanvas.getContext('2d');
  var planetsCtx = planetsCanvas ? planetsCanvas.getContext('2d') : null;
  var nearCtx = nearCanvas.getContext('2d');
  var animCtx = animCanvas.getContext('2d');

  var W = 0, H = 0;               // CSS px
  var OVERDRAW = 240;             // extra height for parallax travel
  var twinkleStars = [];          // animated subset
  var meteors = [];
  var nextMeteorAt = 0;
  var lastClickMeteor = 0;
  var running = true;
  var GALAXY = { x: 0, y: 0, r: 0 };
  var mouseNX = 0, mouseNY = 0;   // normalized -1..1, viewport-relative

  window.SKY = { stars: 0, meteors: 0 };

  /* ---------- shared directional light (sun off-screen, upper-left) ---------- */
  var LIGHT_ANGLE = -42 * Math.PI / 180;
  var LIGHT_X = Math.cos(LIGHT_ANGLE), LIGHT_Y = Math.sin(LIGHT_ANGLE);

  /* ---------- tiny deterministic value-noise (no external deps) ---------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeNoise2D(seed) {
    var size = 48;
    var rand = mulberry32(seed);
    var grid = new Float32Array(size * size);
    for (var i = 0; i < grid.length; i++) grid[i] = rand();
    function at(x, y) {
      var xi = ((x % size) + size) % size;
      var yi = ((y % size) + size) % size;
      return grid[yi * size + xi];
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    return function (x, y) {
      var xf = Math.floor(x), yf = Math.floor(y);
      var tx = smooth(x - xf), ty = smooth(y - yf);
      var v00 = at(xf, yf), v10 = at(xf + 1, yf), v01 = at(xf, yf + 1), v11 = at(xf + 1, yf + 1);
      var a = v00 + (v10 - v00) * tx, b = v01 + (v11 - v01) * tx;
      return a + (b - a) * ty;
    };
  }
  function fbm(noise, x, y, octaves) {
    var v = 0, amp = 0.5, freq = 1, norm = 0;
    for (var o = 0; o < octaves; o++) {
      v += noise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.52; freq *= 2.05;
    }
    return v / norm;
  }

  /* ---------- blackbody color (Tanner Helland approximation) ---------- */
  function kelvinToRGB(k) {
    var t = k / 100, r, g, b;
    if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; }
    else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); }
    if (t >= 66) b = 255;
    else if (t <= 19) b = 0;
    else b = 138.52 * Math.log(t - 10) - 305.04;
    return [
      Math.max(0, Math.min(255, Math.round(r))),
      Math.max(0, Math.min(255, Math.round(g))),
      Math.max(0, Math.min(255, Math.round(b)))
    ];
  }

  /* ---------- spectral class sampling (naked-eye weighted) ---------- */
  var SPECTRA = [
    { p: 0.004, tMin: 30000, tMax: 42000 }, // O — rare, blue
    { p: 0.060, tMin: 10000, tMax: 30000 }, // B
    { p: 0.120, tMin: 7500,  tMax: 10000 }, // A — white
    { p: 0.150, tMin: 6000,  tMax: 7500  }, // F
    { p: 0.150, tMin: 5200,  tMax: 6000  }, // G — sun-like
    { p: 0.280, tMin: 3700,  tMax: 5200  }, // K — orange
    { p: 0.236, tMin: 2400,  tMax: 3700  }  // M — red, dim
  ];
  function sampleTemp() {
    var u = Math.random(), acc = 0;
    for (var i = 0; i < SPECTRA.length; i++) {
      acc += SPECTRA[i].p;
      if (u <= acc) return SPECTRA[i].tMin + Math.random() * (SPECTRA[i].tMax - SPECTRA[i].tMin);
    }
    return 3000;
  }

  /* Apparent magnitude ~ many faint, few bright. m in [0.8, 6] */
  function sampleMag() { return 0.8 + 5.2 * Math.pow(Math.random(), 0.42); }
  function magToRadius(m) { return Math.max(0.35, 2.7 - 0.42 * m); }
  function magToAlpha(m)  { return Math.max(0.16, Math.min(1, 1.18 - 0.165 * m)); }

  function makeStar(x, y) {
    var m = sampleMag();
    var rgb = kelvinToRGB(sampleTemp());
    return { x: x, y: y, m: m, r: magToRadius(m), a: magToAlpha(m), rgb: rgb };
  }

  function drawStar(ctx, s, alphaScale) {
    var a = s.a * (alphaScale == null ? 1 : alphaScale);
    ctx.fillStyle = 'rgba(' + s.rgb[0] + ',' + s.rgb[1] + ',' + s.rgb[2] + ',' + a.toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 6.2832);
    ctx.fill();
    if (s.m < 2.6) { // soft halo on bright stars
      var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
      g.addColorStop(0, 'rgba(' + s.rgb[0] + ',' + s.rgb[1] + ',' + s.rgb[2] + ',' + (a * 0.22).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 5, 0, 6.2832);
      ctx.fill();
    }
  }

  function drawSpikes(ctx, s) { // 4-point diffraction spikes, brightest stars only
    var len = s.r * 9, w = Math.max(0.5, s.r * 0.22);
    var col = 'rgba(' + s.rgb[0] + ',' + s.rgb[1] + ',' + s.rgb[2] + ',';
    [[len, w], [w, len]].forEach(function (d) {
      var g = d[0] > d[1]
        ? ctx.createLinearGradient(s.x - d[0], s.y, s.x + d[0], s.y)
        : ctx.createLinearGradient(s.x, s.y - d[1], s.x, s.y + d[1]);
      g.addColorStop(0, col + '0)');
      g.addColorStop(0.5, col + (s.a * 0.5).toFixed(3) + ')');
      g.addColorStop(1, col + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(s.x - d[0], s.y - d[1], d[0] * 2, d[1] * 2);
    });
  }

  /* ---------- Milky Way band geometry ---------- */
  // Band axis: line through (0.62W, 0.34H) at ~-32 deg. Distance -> density.
  var band = { px: 0, py: 0, nx: 0, ny: 0, dx: 0, dy: 0, sigma: 1 };
  function setBand() {
    var th = -32 * Math.PI / 180;
    band.px = W * 0.62; band.py = (H + OVERDRAW) * 0.34;
    band.dx = Math.cos(th); band.dy = Math.sin(th);
    band.nx = -band.dy;     band.ny = band.dx;
    band.sigma = Math.max(120, H * 0.16);
  }
  function bandDist(x, y) { return (x - band.px) * band.nx + (y - band.py) * band.ny; }
  function bandWeight(x, y) {
    var d = bandDist(x, y) / band.sigma;
    return Math.exp(-d * d);
  }
  function pointOnBand(t, off) {
    return {
      x: band.px + band.dx * t + band.nx * off,
      y: band.py + band.dy * t + band.ny * off
    };
  }

  /* ---------- build static layers ---------- */
  function size(canvas) {
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round((H + OVERDRAW) * DPR);
    canvas.style.height = (H + OVERDRAW) + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return ctx;
  }
  function sizePlain(canvas) { // no OVERDRAW — planets are repositioned analytically, not translated
    if (!canvas) return null;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.height = H + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return ctx;
  }

  /* ---------- distant spiral galaxy ---------- */
  function buildGalaxy() {
    if (!galaxyCanvas) return;
    galaxyCtx = size(galaxyCanvas);
    var ctx = galaxyCtx, fullH = H + OVERDRAW;
    var area = W * fullH / (1280 * 800);

    GALAXY.x = W * 0.80;
    GALAXY.y = fullH * 0.15;
    GALAXY.r = Math.min(W, fullH) * 0.46;
    galaxyCanvas.style.transformOrigin = GALAXY.x + 'px ' + GALAXY.y + 'px';

    // Render at full resolution into an offscreen buffer first, then blur it
    // back onto the real canvas — turns a discrete dot-field into something
    // closer to a photographed galaxy's soft, layered glow.
    var off = document.createElement('canvas');
    off.width = galaxyCanvas.width; off.height = galaxyCanvas.height;
    var octx = off.getContext('2d');
    octx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var arms = 2, a = GALAXY.r * 0.045, b = 0.21, maxTheta = 3.1 * Math.PI;

    octx.save();
    octx.translate(GALAXY.x, GALAXY.y);
    octx.rotate(-24 * Math.PI / 180);
    octx.scale(1, 0.34);
    octx.globalCompositeOperation = 'lighter';

    // core bulge
    var coreR = GALAXY.r * 0.46;
    var core = octx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    core.addColorStop(0, 'rgba(255,244,222,0.55)');
    core.addColorStop(0.22, 'rgba(255,224,180,0.22)');
    core.addColorStop(0.55, 'rgba(240,195,150,0.08)');
    core.addColorStop(1, 'rgba(240,195,150,0)');
    octx.fillStyle = core;
    octx.beginPath(); octx.arc(0, 0, coreR, 0, 6.2832); octx.fill();

    // grand-design arms: soft glow ribbon (tapered) + resolved point stars
    for (var arm = 0; arm < arms; arm++) {
      var armOffset = arm * Math.PI;
      var ribbonSteps = Math.round(90 * Math.sqrt(area));
      for (var s = 0; s < ribbonSteps; s++) {
        var us = s / ribbonSteps, thetaS = us * maxTheta, rS = a * Math.exp(b * thetaS);
        if (rS > GALAXY.r) break;
        var angS = thetaS + armOffset;
        var xS = Math.cos(angS) * rS, yS = Math.sin(angS) * rS;
        var wS = 2.2 + (1 - us) * 7;
        var tKs = Math.max(3200, Math.min(13500, 4400 + us * 8200));
        var rgbS = kelvinToRGB(tKs);
        var alphaS = 0.05 * (1 - us * 0.6);
        var rg = octx.createRadialGradient(xS, yS, 0, xS, yS, wS);
        rg.addColorStop(0, 'rgba(' + rgbS[0] + ',' + rgbS[1] + ',' + rgbS[2] + ',' + alphaS.toFixed(3) + ')');
        rg.addColorStop(1, 'rgba(' + rgbS[0] + ',' + rgbS[1] + ',' + rgbS[2] + ',0)');
        octx.fillStyle = rg;
        octx.beginPath(); octx.arc(xS, yS, wS, 0, 6.2832); octx.fill();
      }
      var perArm = Math.round(520 * area);
      for (var i = 0; i < perArm; i++) {
        var u2 = Math.random(), theta2 = u2 * maxTheta, r2 = a * Math.exp(b * theta2);
        if (r2 > GALAXY.r) continue;
        var spread = (0.05 + u2 * 0.55) * r2 * (Math.random() - 0.5);
        var ang2 = theta2 + armOffset + (Math.random() - 0.5) * 0.15;
        var rr2 = r2 + spread;
        var x2 = Math.cos(ang2) * rr2, y2 = Math.sin(ang2) * rr2;
        var tK2 = Math.max(2600, Math.min(15000, 4200 + u2 * 9800 + (Math.random() - 0.5) * 1600));
        var rgb2 = kelvinToRGB(tK2);
        var alpha2 = (0.16 + 0.55 * (1 - u2)) * (0.4 + Math.random() * 0.6);
        var rad2 = 0.3 + (1 - u2) * 0.7 + Math.random() * 0.4;
        octx.fillStyle = 'rgba(' + rgb2[0] + ',' + rgb2[1] + ',' + rgb2[2] + ',' + alpha2.toFixed(3) + ')';
        octx.beginPath(); octx.arc(x2, y2, rad2, 0, 6.2832); octx.fill();
      }
    }

    // diffuse disk / halo field stars
    var field = Math.round(650 * area);
    for (var j = 0; j < field; j++) {
      var rj = Math.pow(Math.random(), 0.55) * GALAXY.r;
      var aj = Math.random() * 6.2832;
      var xj = Math.cos(aj) * rj, yj = Math.sin(aj) * rj;
      var rgbj = kelvinToRGB(sampleTemp());
      var alphaj = (0.04 + 0.08 * Math.random()) * (1 - rj / GALAXY.r);
      var sizej = 0.3 + Math.random() * 0.45;
      octx.fillStyle = 'rgba(' + rgbj[0] + ',' + rgbj[1] + ',' + rgbj[2] + ',' + alphaj.toFixed(3) + ')';
      octx.fillRect(xj, yj, sizej, sizej);
    }

    // HII regions (pink / violet star-forming clouds along the arms)
    var blobs = Math.round(9 * area) + 5;
    for (var k = 0; k < blobs; k++) {
      var armk = Math.floor(Math.random() * arms);
      var uk = 0.12 + Math.random() * 0.62;
      var thetak = uk * maxTheta, rk = a * Math.exp(b * thetak);
      if (rk > GALAXY.r) continue;
      var angk = thetak + armk * Math.PI;
      var xk = Math.cos(angk) * rk, yk = Math.sin(angk) * rk;
      var rad3 = 7 + Math.random() * 20;
      var hue = Math.random() < 0.5 ? '255,150,195' : '175,160,255';
      var g3 = octx.createRadialGradient(xk, yk, 0, xk, yk, rad3);
      g3.addColorStop(0, 'rgba(' + hue + ',0.07)');
      g3.addColorStop(1, 'rgba(' + hue + ',0)');
      octx.fillStyle = g3;
      octx.beginPath(); octx.arc(xk, yk, rad3, 0, 6.2832); octx.fill();
    }

    octx.globalCompositeOperation = 'source-over';

    // dust lane across the near side of the core — the signature silhouette
    // that reads as "spiral galaxy" rather than "blob of stars"
    octx.save();
    octx.beginPath(); octx.arc(0, 0, GALAXY.r, 0, 6.2832); octx.clip();
    var duk = octx.createLinearGradient(-coreR * 1.1, -coreR * 0.5, coreR * 1.3, coreR * 0.65);
    duk.addColorStop(0, 'rgba(4,5,10,0)');
    duk.addColorStop(0.45, 'rgba(4,5,10,0.30)');
    duk.addColorStop(0.62, 'rgba(4,5,10,0.16)');
    duk.addColorStop(1, 'rgba(4,5,10,0)');
    octx.fillStyle = duk;
    octx.fillRect(-GALAXY.r, -GALAXY.r * 0.6, GALAXY.r * 2, GALAXY.r * 1.2);
    octx.restore();

    octx.restore(); // undo translate/rotate/scale

    // soft-focus composite: blur the supersampled buffer onto the real canvas
    ctx.clearRect(0, 0, W, fullH);
    ctx.filter = 'blur(1.1px)';
    ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, W, fullH);
    ctx.filter = 'none';

    // re-seed a handful of crisp point-stars on top so the brightest cores
    // still read sharp against the soft glow (real astrophotography mixes both)
    ctx.save();
    ctx.translate(GALAXY.x, GALAXY.y); ctx.rotate(-24 * Math.PI / 180); ctx.scale(1, 0.34);
    ctx.globalCompositeOperation = 'lighter';
    var sharp = Math.round(70 * area);
    for (var m = 0; m < sharp; m++) {
      var um = Math.random() * 0.72, thetam = um * maxTheta;
      var rm = a * Math.exp(b * thetam) * (0.4 + Math.random() * 0.6);
      if (rm > GALAXY.r) continue;
      var angm = thetam + (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.2;
      var xm = Math.cos(angm) * rm, ym = Math.sin(angm) * rm;
      var tKm = Math.max(3000, Math.min(15000, 4500 + um * 9000));
      var rgbm = kelvinToRGB(tKm);
      ctx.fillStyle = 'rgba(' + rgbm[0] + ',' + rgbm[1] + ',' + rgbm[2] + ',0.55)';
      ctx.beginPath(); ctx.arc(xm, ym, 0.6 + Math.random() * 0.5, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  function buildFar() {
    farCtx = size(farCanvas);
    var ctx = farCtx, fullH = H + OVERDRAW;
    var area = W * fullH / (1280 * 800); // density scale

    // Milky Way cloud structure (soft luminous blobs along the band)
    ctx.globalCompositeOperation = 'lighter';
    var clouds = Math.round(30 * area) + 14;
    var span = Math.hypot(W, fullH);
    for (var i = 0; i < clouds; i++) {
      var t = (Math.random() - 0.5) * span * 1.2;
      var off = (Math.random() - 0.5) * band.sigma * 1.7;
      var p = pointOnBand(t, off);
      var r = 70 + Math.random() * 190;
      var a = 0.012 + Math.random() * 0.028 * Math.exp(-Math.abs(off) / band.sigma);
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, 'rgba(168,184,222,' + a.toFixed(4) + ')');
      g.addColorStop(1, 'rgba(168,184,222,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Unresolved background stars, concentrated toward the band
    var n = Math.round(2600 * area);
    var placed = 0, guard = n * 8;
    while (placed < n && guard-- > 0) {
      var x = Math.random() * W, y = Math.random() * fullH;
      var w = 0.18 + 0.82 * bandWeight(x, y); // field floor + band boost
      if (Math.random() > w) continue;
      var m = 4.2 + Math.random() * 2.2;      // all faint
      var rgb = kelvinToRGB(sampleTemp());
      ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (magToAlpha(m) * 0.8).toFixed(3) + ')';
      var r2 = 0.3 + Math.random() * 0.45;
      ctx.fillRect(x, y, r2, r2);
      placed++;
    }
    window.SKY.stars = placed;

    // Dust lanes: dark occluding wisps along the band core (the Great Rift)
    var lanes = Math.round(16 * area) + 8;
    for (var j = 0; j < lanes; j++) {
      var t2 = (Math.random() - 0.5) * span;
      var off2 = (Math.random() - 0.5) * band.sigma * 0.55;
      var p2 = pointOnBand(t2, off2);
      var rx = 60 + Math.random() * 160, ry = rx * (0.25 + Math.random() * 0.3);
      var rot = Math.atan2(band.dy, band.dx) + (Math.random() - 0.5) * 0.5;
      var a2 = 0.18 + Math.random() * 0.22;
      ctx.save();
      ctx.translate(p2.x, p2.y); ctx.rotate(rot); ctx.scale(1, ry / rx);
      var g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g2.addColorStop(0, 'rgba(3,5,10,' + a2.toFixed(3) + ')');
      g2.addColorStop(1, 'rgba(3,5,10,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }

  function buildNear() {
    nearCtx = size(nearCanvas);
    var ctx = nearCtx, fullH = H + OVERDRAW;
    var area = W * fullH / (1280 * 800);
    twinkleStars.length = 0;

    var n = Math.round(620 * area);
    var bright = [];
    for (var i = 0; i < n; i++) {
      var s = makeStar(Math.random() * W, Math.random() * fullH);
      if (!reduceMotion && s.m < 3.4 && twinkleStars.length < 150 * area && Math.random() < 0.5) {
        s.phase = Math.random() * 6.2832;
        s.speed = 0.6 + Math.random() * 2.6;   // scintillation rate
        s.amp = 0.22 + Math.random() * 0.34;   // scintillation depth
        twinkleStars.push(s);                  // drawn on anim layer instead
      } else {
        drawStar(ctx, s);
        if (s.m < 1.35) bright.push(s);
      }
    }
    bright.sort(function (a, b) { return a.m - b.m; })
      .slice(0, 12)
      .forEach(function (s) { drawSpikes(ctx, s); });

    window.SKY.stars += n;
    var readout = document.getElementById('sky-stars');
    if (readout) readout.textContent = window.SKY.stars.toLocaleString();
  }

  /* ============================================================
     PLANETS — procedurally textured, occlusion-correct, redrawn
     every frame at a position computed directly from scrollY
     ============================================================ */
  var PLANETS = [
    {
      id: 'rust', type: 'rocky', r: 52,
      px: 0.07, py: 0.62, scrollDepth: 0.16, mx: 22, my: 14,
      oscAmp: 9, oscMs: 52000, phase: 0.0,
      base: [176, 96, 52], rimColor: 'rgba(240,168,80,0.18)'
    },
    {
      id: 'slate', type: 'banded', r: 21,
      px: 0.91, py: 0.12, scrollDepth: 0.09, mx: 9, my: 6,
      oscAmp: 5, oscMs: 71000, phase: 1.7,
      base: [120, 150, 182], rimColor: 'rgba(160,196,232,0.22)'
    },
    {
      id: 'ringed', type: 'ringed', r: 38, ring: true,
      px: 0.70, py: 0.80, scrollDepth: 0.24, mx: 30, my: 19,
      oscAmp: 12, oscMs: 64000, phase: 3.1,
      base: [214, 182, 132], rimColor: 'rgba(232,206,150,0.18)'
    }
  ];
  var planetRuntime = [];

  function buildRockyTile(diam, base, seed) {
    var tileW = Math.round(diam * 1.7), tileH = diam;
    var c = document.createElement('canvas');
    c.width = tileW; c.height = tileH;
    var tctx = c.getContext('2d');
    var noise = makeNoise2D(seed);
    var img = tctx.createImageData(tileW, tileH);
    var d = img.data;
    for (var y = 0; y < tileH; y++) {
      for (var x = 0; x < tileW; x++) {
        var v = fbm(noise, x / diam * 3.2, y / diam * 3.2, 4);
        var shade = 0.5 + v * 0.85;
        var idx = (y * tileW + x) * 4;
        d[idx] = Math.min(255, base[0] * shade);
        d[idx + 1] = Math.min(255, base[1] * shade);
        d[idx + 2] = Math.min(255, base[2] * shade);
        d[idx + 3] = 255;
      }
    }
    tctx.putImageData(img, 0, 0);

    var craters = 14 + Math.floor(Math.random() * 10);
    for (var i = 0; i < craters; i++) {
      var cx = Math.random() * tileW, cy = Math.random() * tileH;
      var cr = 1.5 + Math.pow(Math.random(), 2.2) * diam * 0.1;
      var shadow = tctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      shadow.addColorStop(0, 'rgba(20,10,4,0.4)');
      shadow.addColorStop(0.7, 'rgba(20,10,4,0.18)');
      shadow.addColorStop(1, 'rgba(20,10,4,0)');
      tctx.fillStyle = shadow;
      tctx.beginPath(); tctx.arc(cx, cy, cr, 0, 6.2832); tctx.fill();
      var hx = cx - LIGHT_X * cr * 0.4, hy = cy - LIGHT_Y * cr * 0.4;
      var rim = tctx.createRadialGradient(hx, hy, 0, hx, hy, cr * 0.85);
      rim.addColorStop(0, 'rgba(255,225,195,0.30)');
      rim.addColorStop(0.6, 'rgba(255,225,195,0.08)');
      rim.addColorStop(1, 'rgba(255,225,195,0)');
      tctx.fillStyle = rim;
      tctx.beginPath(); tctx.arc(hx, hy, cr * 0.85, 0, 6.2832); tctx.fill();
    }
    return c;
  }

  function buildBandedTile(diam, base, seed, bandFreq) {
    var tileW = Math.round(diam * 1.7), tileH = diam;
    var c = document.createElement('canvas');
    c.width = tileW; c.height = tileH;
    var tctx = c.getContext('2d');
    var noiseA = makeNoise2D(seed);
    var noiseB = makeNoise2D(seed + 977);
    var img = tctx.createImageData(tileW, tileH);
    var d = img.data;
    for (var y = 0; y < tileH; y++) {
      var bandV = fbm(noiseA, 0.4, y / diam * bandFreq, 3);
      for (var x = 0; x < tileW; x++) {
        var turb = fbm(noiseB, x / diam * 2.4, y / diam * 2.4, 3);
        var v = bandV * 0.72 + turb * 0.28;
        var shade = 0.55 + v * 0.75;
        var idx = (y * tileW + x) * 4;
        d[idx] = Math.min(255, base[0] * shade);
        d[idx + 1] = Math.min(255, base[1] * shade);
        d[idx + 2] = Math.min(255, base[2] * shade);
        d[idx + 3] = 255;
      }
    }
    tctx.putImageData(img, 0, 0);
    return c;
  }

  function buildShadingSprite(diam) {
    var c = document.createElement('canvas');
    c.width = diam; c.height = diam;
    var sctx = c.getContext('2d');
    var R = diam / 2;
    sctx.beginPath(); sctx.arc(R, R, R, 0, 6.2832); sctx.clip();

    var limb = sctx.createRadialGradient(R, R, R * 0.15, R, R, R);
    limb.addColorStop(0, 'rgba(0,0,0,0)');
    limb.addColorStop(0.72, 'rgba(0,0,0,0.10)');
    limb.addColorStop(1, 'rgba(0,0,0,0.42)');
    sctx.fillStyle = limb;
    sctx.fillRect(0, 0, diam, diam);

    var term = sctx.createLinearGradient(
      R + LIGHT_X * R * 1.4, R + LIGHT_Y * R * 1.4,
      R - LIGHT_X * R * 1.4, R - LIGHT_Y * R * 1.4
    );
    term.addColorStop(0, 'rgba(0,0,0,0)');
    term.addColorStop(0.52, 'rgba(0,0,0,0.04)');
    term.addColorStop(0.76, 'rgba(3,5,12,0.58)');
    term.addColorStop(1, 'rgba(2,3,9,0.90)');
    sctx.fillStyle = term;
    sctx.fillRect(0, 0, diam, diam);

    return c;
  }

  function buildPlanetAssets() {
    planetRuntime = PLANETS.map(function (cfg, idx) {
      var tile = cfg.type === 'rocky'
        ? buildRockyTile(cfg.r * 2, cfg.base, 1000 + idx * 97)
        : buildBandedTile(cfg.r * 2, cfg.base, 1000 + idx * 97, cfg.type === 'ringed' ? 4.5 : 8);
      var shade = buildShadingSprite(cfg.r * 2);
      return { cfg: cfg, tile: tile, shade: shade };
    });
  }

  function drawIceCaps(ctx, cx, cy, R) {
    [-1, 1].forEach(function (sign) {
      var py = cy + sign * R * 0.82;
      var g = ctx.createRadialGradient(cx, py, 0, cx, py, R * 0.42);
      g.addColorStop(0, 'rgba(232,240,248,0.55)');
      g.addColorStop(0.6, 'rgba(232,240,248,0.18)');
      g.addColorStop(1, 'rgba(232,240,248,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, py, R * 0.42, 0, 6.2832); ctx.fill();
    });
  }

  function drawRingArc(ctx, cx, cy, R, startDeg, endDeg) {
    var ryRatio = 0.30;
    var s0 = startDeg * Math.PI / 180, s1 = endDeg * Math.PI / 180;
    var bands = [
      { r0: R * 1.30, r1: R * 1.58, a: 0.34 },
      { r0: R * 1.60, r1: R * 1.70, a: 0.10 }, // Cassini-style gap, fainter
      { r0: R * 1.72, r1: R * 2.05, a: 0.40 }
    ];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-16 * Math.PI / 180);
    for (var i = 0; i < bands.length; i++) {
      var bd = bands[i], rMid = (bd.r0 + bd.r1) / 2, lw = bd.r1 - bd.r0;
      ctx.strokeStyle = 'rgba(224,202,160,' + bd.a + ')';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(0, 0, rMid, rMid * ryRatio, 0, s0, s1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlanet(ctx, P, cx, cy, t) {
    var cfg = P.cfg, R = cfg.r;
    var osc = cfg.oscAmp * Math.sin((t / cfg.oscMs) * 6.2832 + cfg.phase);

    if (cfg.ring) drawRingArc(ctx, cx, cy, R, 165, 345); // far half — drawn first, behind the body

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();

    // slow surface libration: pan a window across a wider texture tile
    // (kept within safe bounds, so no wraparound/seam handling needed)
    var tileW = P.tile.width, tileH = P.tile.height;
    var maxOff = tileW - R * 2;
    var srcX = maxOff / 2 + osc;
    ctx.drawImage(P.tile, srcX, 0, R * 2, tileH, cx - R, cy - R, R * 2, R * 2);

    // terminator + limb darkening
    ctx.drawImage(P.shade, cx - R, cy - R, R * 2, R * 2);

    // ring shadow band cast across the globe
    if (cfg.ring) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-16 * Math.PI / 180);
      var rg = ctx.createLinearGradient(0, -R * 0.22, 0, R * 0.22);
      rg.addColorStop(0, 'rgba(10,8,4,0)');
      rg.addColorStop(0.45, 'rgba(10,8,4,0.32)');
      rg.addColorStop(0.55, 'rgba(10,8,4,0.32)');
      rg.addColorStop(1, 'rgba(10,8,4,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(-R, -R * 0.22, R * 2, R * 0.44);
      ctx.restore();
    }

    if (cfg.type === 'rocky') drawIceCaps(ctx, cx, cy, R);

    // specular glint, fixed relative to the shared light direction
    var spx = cx + LIGHT_X * R * 0.42, spy = cy + LIGHT_Y * R * 0.42;
    var spec = ctx.createRadialGradient(spx, spy, 0, spx, spy, R * 0.5);
    spec.addColorStop(0, 'rgba(255,255,255,0.22)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = spec;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore(); // undo the sphere clip

    // atmosphere rim light, bloomed just past the true edge
    var rim = ctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R * 1.22);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(0.7, cfg.rimColor);
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 6.2832); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    if (cfg.ring) drawRingArc(ctx, cx, cy, R, -15, 165); // near half — drawn last, in front
  }

  var planetFrameToggle = false;
  function renderPlanets(t, scrollY, mNX, mNY, force) {
    if (!planetsCtx) return;
    if (!force) {
      planetFrameToggle = !planetFrameToggle;
      if (!planetFrameToggle) return; // ~30fps is plenty for this slow a drift
    }
    planetsCtx.clearRect(0, 0, W, H);
    for (var i = 0; i < planetRuntime.length; i++) {
      var P = planetRuntime[i], cfg = P.cfg;
      var mx = hasHover ? mNX * cfg.mx : 0;
      var my = hasHover ? mNY * cfg.my : 0;
      var cx = cfg.px * W + mx;
      var cy = cfg.py * H - scrollY * cfg.scrollDepth + my;
      drawPlanet(planetsCtx, P, cx, cy, t);
    }
  }

  /* ---------- meteors ---------- */
  function spawnMeteor(now, originX, originY) {
    var rx, ry, ang, sp;
    if (originX != null) {
      // click-triggered: burst outward from the pointer in a random direction
      rx = originX; ry = originY;
      ang = Math.random() * 6.2832;
      sp = 700 + Math.random() * 500;
    } else {
      // ambient: radiant in the upper-right quadrant, tracks down-left
      rx = W * (0.65 + Math.random() * 0.4);
      ry = -40 + Math.random() * H * 0.18;
      ang = Math.PI * (0.62 + Math.random() * 0.22);
      sp = 850 + Math.random() * 650;
    }
    meteors.push({
      x: rx, y: ry,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      life: 0, maxLife: 0.7 + Math.random() * 0.5,
      len: sp * 0.13
    });
    window.SKY.meteors++;
    var el = document.getElementById('sky-meteors');
    if (el) el.textContent = window.SKY.meteors;
    if (originX == null) nextMeteorAt = now + 7000 + Math.random() * 14000;
  }

  function drawMeteors(dt) {
    for (var i = meteors.length - 1; i >= 0; i--) {
      var mt = meteors[i];
      mt.life += dt;
      mt.x += mt.vx * dt; mt.y += mt.vy * dt;
      if (mt.life > mt.maxLife || mt.x < -200 || mt.x > W + 200 || mt.y < -200 || mt.y > H + OVERDRAW + 200) { meteors.splice(i, 1); continue; }
      var fade = Math.sin(Math.min(1, mt.life / mt.maxLife) * Math.PI); // ramp in/out
      var nx = mt.vx / Math.hypot(mt.vx, mt.vy), ny = mt.vy / Math.hypot(mt.vx, mt.vy);
      var tx = mt.x - nx * mt.len, ty = mt.y - ny * mt.len;
      var g = animCtx.createLinearGradient(tx, ty, mt.x, mt.y);
      g.addColorStop(0, 'rgba(180,210,255,0)');
      g.addColorStop(1, 'rgba(235,245,255,' + (0.85 * fade).toFixed(3) + ')');
      animCtx.strokeStyle = g;
      animCtx.lineWidth = 1.6;
      animCtx.lineCap = 'round';
      animCtx.beginPath(); animCtx.moveTo(tx, ty); animCtx.lineTo(mt.x, mt.y); animCtx.stroke();
    }
  }

  /* ---------- animation loop ---------- */
  var lastT = 0;
  function frame(t) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (t - lastT) / 1000) || 0.016;
    lastT = t;

    animCtx.clearRect(0, 0, W, H + OVERDRAW);

    // scintillation: irregular two-sine flicker
    var ts = t / 1000;
    animCtx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < twinkleStars.length; i++) {
      var s = twinkleStars[i];
      var f = 1 - s.amp * 0.5 + s.amp * 0.5 *
        (0.6 * Math.sin(ts * s.speed + s.phase) + 0.4 * Math.sin(ts * s.speed * 2.7 + s.phase * 1.7));
      drawStar(animCtx, s, Math.max(0.15, f));
    }
    if (t > nextMeteorAt) spawnMeteor(t);
    drawMeteors(dt);
    animCtx.globalCompositeOperation = 'source-over';

    renderPlanets(t, window.scrollY || 0, mouseNX, mouseNY, false);

    // galaxy: continuous slow idle rotation about its own core, layered on
    // top of the same translate every other layer receives
    if (galaxyCanvas) {
      var rot = Math.sin(t / 480000) * 1.6; // imperceptibly slow oscillation
      galaxyCanvas.style.transform = galaxyBaseTransform() + ' rotate(' + rot.toFixed(3) + 'deg)';
    }
  }

  /* ---------- interactive parallax: scroll + cursor depth ---------- */
  var parallaxLayers = [
    { el: farCanvas, scroll: 0.035, mx: 6, my: 4 },
    { el: nearCanvas, scroll: 0.085, mx: 10, my: 7 },
    { el: animCanvas, scroll: 0.085, mx: 10, my: 7 }
  ];
  var ticking = false;

  function galaxyBaseTransform() {
    var y = window.scrollY || 0;
    var max = OVERDRAW - 16;
    var gsy = -Math.min(max, y * 0.015);
    var gmx = hasHover ? mouseNX * 4 : 0;
    var gmy = hasHover ? mouseNY * 3 : 0;
    return 'translate3d(' + gmx.toFixed(1) + 'px,' + (gsy + gmy).toFixed(1) + 'px,0)';
  }

  function applyParallax() {
    var y = window.scrollY || 0;
    var max = OVERDRAW - 16;
    for (var i = 0; i < parallaxLayers.length; i++) {
      var L = parallaxLayers[i];
      var scrollOff = -Math.min(max, y * L.scroll);
      var mx = hasHover ? mouseNX * L.mx : 0;
      var my = hasHover ? mouseNY * L.my : 0;
      L.el.style.transform = 'translate3d(' + mx.toFixed(1) + 'px,' + (scrollOff + my).toFixed(1) + 'px,0)';
    }
    if (galaxyCanvas && (reduceMotion || !running)) {
      galaxyCanvas.style.transform = galaxyBaseTransform();
    }
    if (reduceMotion) {
      renderPlanets(0, y, 0, 0, true); // static pose, but still scroll-linked
    }
    ticking = false;
  }

  function queueParallax() {
    if (!ticking) { ticking = true; requestAnimationFrame(applyParallax); }
  }

  var cursorGlow = document.getElementById('cursor-glow');
  function onPointerMove(e) {
    W = W || window.innerWidth; H = H || window.innerHeight;
    mouseNX = (e.clientX / W - 0.5) * 2;
    mouseNY = (e.clientY / H - 0.5) * 2;
    queueParallax();
    if (cursorGlow) {
      cursorGlow.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
      cursorGlow.classList.add('active');
    }
  }
  function hideGlow() { if (cursorGlow) cursorGlow.classList.remove('active'); }

  /* ---------- click anywhere on the empty field: launch a meteor ---------- */
  function isInteractiveTarget(el) {
    return !!el.closest('a, button, input, textarea, select, .modal-overlay.active, .visitor-counter-overlay.active, .main-nav');
  }
  document.addEventListener('click', function (e) {
    if (reduceMotion || !running) return;
    if (isInteractiveTarget(e.target)) return;
    var now = performance.now();
    if (now - lastClickMeteor < 450) return;
    lastClickMeteor = now;
    spawnMeteor(now, e.clientX, e.clientY);
  });

  /* ---------- lifecycle ---------- */
  function rebuild() {
    W = window.innerWidth;
    H = window.innerHeight;
    setBand();
    window.SKY.stars = 0;
    buildGalaxy();
    buildFar();
    buildNear();
    animCtx = size(animCanvas);
    planetsCtx = sizePlain(planetsCanvas);
    renderPlanets(reduceMotion ? 0 : performance.now(), window.scrollY || 0, mouseNX, mouseNY, true);
    if (reduceMotion) {
      // render twinkle subset once, statically
      twinkleStars.forEach(function (s) { drawStar(nearCtx, s); });
      twinkleStars.length = 0;
    }
    queueParallax();
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 200);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { running = false; }
    else if (!reduceMotion) { running = true; lastT = performance.now(); requestAnimationFrame(frame); }
  });

  buildPlanetAssets();
  rebuild();
  window.addEventListener('scroll', queueParallax, { passive: true });
  if (!reduceMotion) {
    if (hasHover) {
      document.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', hideGlow);
      window.addEventListener('blur', hideGlow);
    }
    nextMeteorAt = performance.now() + 4000 + Math.random() * 6000;
    requestAnimationFrame(frame);
  }
})();
