/* ============================================================
   SKY ENGINE — physically motivated night sky
   ------------------------------------------------------------
   - Star colors from blackbody temperature by spectral class
     (O/B/A/F/G/K/M, visible-sky weighted frequencies)
   - Apparent-magnitude distribution: many faint, few bright
   - Milky Way band: density gradient, cloud structure, dust lanes
   - Atmospheric scintillation (twinkle) on brighter stars only
   - Diffraction spikes on the brightest few stars
   - Meteors emanating from a radiant, additive-blended trails
   - Two-layer scroll parallax; honors prefers-reduced-motion
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var farCanvas = document.getElementById('sky-far');
  var nearCanvas = document.getElementById('sky-near');
  var animCanvas = document.getElementById('sky-anim');
  if (!farCanvas || !nearCanvas || !animCanvas) return;

  var farCtx = farCanvas.getContext('2d');
  var nearCtx = nearCanvas.getContext('2d');
  var animCtx = animCanvas.getContext('2d');

  var W = 0, H = 0;               // CSS px
  var OVERDRAW = 240;             // extra height for parallax travel
  var twinkleStars = [];          // animated subset
  var meteors = [];
  var nextMeteorAt = 0;
  var running = true;

  window.SKY = { stars: 0, meteors: 0 };

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
      var r = 0.3 + Math.random() * 0.45;
      ctx.fillRect(x, y, r, r);
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

  /* ---------- meteors ---------- */
  function spawnMeteor(now) {
    // Radiant in the upper-right quadrant; tracks point away from it.
    var rx = W * (0.65 + Math.random() * 0.4), ry = -40 + Math.random() * H * 0.18;
    var ang = Math.PI * (0.62 + Math.random() * 0.22); // down-left
    var sp = 850 + Math.random() * 650;
    meteors.push({
      x: rx, y: ry,
      vx: Math.cos(ang) * sp, vy: -Math.sin(ang) * sp * -1,
      life: 0, maxLife: 0.7 + Math.random() * 0.5,
      len: sp * 0.13
    });
    window.SKY.meteors++;
    var el = document.getElementById('sky-meteors');
    if (el) el.textContent = window.SKY.meteors;
    nextMeteorAt = now + 7000 + Math.random() * 14000;
  }

  function drawMeteors(dt) {
    for (var i = meteors.length - 1; i >= 0; i--) {
      var mt = meteors[i];
      mt.life += dt;
      mt.x += mt.vx * dt; mt.y += mt.vy * dt;
      if (mt.life > mt.maxLife || mt.x < -200 || mt.y > H + OVERDRAW + 200) { meteors.splice(i, 1); continue; }
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
  }

  /* ---------- parallax ---------- */
  var ticking = false;
  function parallax() {
    var y = window.scrollY || 0;
    var max = OVERDRAW - 16;
    farCanvas.style.transform  = 'translateY(' + (-Math.min(max, y * 0.035)) + 'px)';
    var nearOff = -Math.min(max, y * 0.085);
    nearCanvas.style.transform = 'translateY(' + nearOff + 'px)';
    animCanvas.style.transform = 'translateY(' + nearOff + 'px)';
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(parallax); }
  }

  /* ---------- lifecycle ---------- */
  function rebuild() {
    W = window.innerWidth;
    H = window.innerHeight;
    setBand();
    window.SKY.stars = 0;
    buildFar();
    buildNear();
    animCtx = size(animCanvas);
    if (reduceMotion) {
      // render twinkle subset once, statically
      twinkleStars.forEach(function (s) { drawStar(nearCtx, s); });
      twinkleStars.length = 0;
    }
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

  rebuild();
  if (!reduceMotion) {
    window.addEventListener('scroll', onScroll, { passive: true });
    nextMeteorAt = performance.now() + 4000 + Math.random() * 6000;
    requestAnimationFrame(frame);
  }
})();
