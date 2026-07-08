/* ============================================================
   SKY ENGINE — physically motivated deep-space background
   ------------------------------------------------------------
   - Distant spiral galaxy: log-spiral arms, blackbody star color
     gradient (warm core -> hot blue tips), HII nebula blobs,
     slow idle rotation
   - Milky Way band: density gradient, cloud structure, dust lanes
   - Star colors from blackbody temperature by spectral class
     (O/B/A/F/G/K/M, visible-sky weighted frequencies)
   - Apparent-magnitude distribution: many faint, few bright
   - Atmospheric scintillation (twinkle) on brighter stars only
   - Diffraction spikes on the brightest few stars
   - Meteors emanating from a radiant, additive-blended trails;
     click anywhere on the empty field to launch one on demand
   - Ambient planet field with independent slow drift
   - Cursor-follow parallax (2.5D depth) on every layer, plus a
     faint hand-held light that tracks the pointer
   - Scroll parallax across layers; honors prefers-reduced-motion
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var galaxyCanvas = document.getElementById('sky-galaxy');
  var farCanvas = document.getElementById('sky-far');
  var nearCanvas = document.getElementById('sky-near');
  var animCanvas = document.getElementById('sky-anim');
  if (!farCanvas || !nearCanvas || !animCanvas) return;

  var galaxyCtx = galaxyCanvas ? galaxyCanvas.getContext('2d') : null;
  var farCtx = farCanvas.getContext('2d');
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

  /* ---------- distant spiral galaxy ---------- */
  function buildGalaxy() {
    if (!galaxyCanvas) return;
    galaxyCtx = size(galaxyCanvas);
    var ctx = galaxyCtx, fullH = H + OVERDRAW;
    var area = W * fullH / (1280 * 800);

    GALAXY.x = W * 0.80;
    GALAXY.y = fullH * 0.15;
    GALAXY.r = Math.min(W, fullH) * 0.44;
    galaxyCanvas.style.transformOrigin = GALAXY.x + 'px ' + GALAXY.y + 'px';

    ctx.save();
    ctx.translate(GALAXY.x, GALAXY.y);
    ctx.rotate(-24 * Math.PI / 180);
    ctx.scale(1, 0.36);
    ctx.globalCompositeOperation = 'lighter';

    // core glow
    var coreR = GALAXY.r * 0.5;
    var coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    coreG.addColorStop(0, 'rgba(255, 238, 210, 0.16)');
    coreG.addColorStop(0.35, 'rgba(240, 200, 160, 0.06)');
    coreG.addColorStop(1, 'rgba(240, 200, 160, 0)');
    ctx.fillStyle = coreG;
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, 6.2832); ctx.fill();

    // log-spiral arms: core (cool orange) -> tip (hot blue-white)
    var arms = 3, a = GALAXY.r * 0.05, b = 0.185, maxTheta = 3.35 * Math.PI;
    var perArm = Math.round(420 * area);
    for (var arm = 0; arm < arms; arm++) {
      var armOffset = arm * (6.2832 / arms);
      for (var i = 0; i < perArm; i++) {
        var u = i / perArm;
        var theta = u * maxTheta;
        var r = a * Math.exp(b * theta);
        if (r > GALAXY.r) break;
        var spread = (0.06 + u * 0.5) * r * (Math.random() - 0.5) * 0.7;
        var ang = theta + armOffset + (Math.random() - 0.5) * 0.12;
        var rr = r + spread;
        var x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
        var tK = Math.max(2400, Math.min(15000, 4200 + u * 9500 + (Math.random() - 0.5) * 1400));
        var rgb = kelvinToRGB(tK);
        var alpha = (0.10 + 0.5 * (1 - u)) * (0.5 + Math.random() * 0.5) * Math.max(0.15, 1 - u * 0.6);
        var rad = 0.35 + (1 - u) * 0.9 + Math.random() * 0.5;
        ctx.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
      }
    }

    // faint bulge / disk field stars
    var field = Math.round(500 * area);
    for (var j = 0; j < field; j++) {
      var rj = Math.pow(Math.random(), 0.6) * GALAXY.r;
      var aj = Math.random() * 6.2832;
      var xj = Math.cos(aj) * rj, yj = Math.sin(aj) * rj;
      var rgbj = kelvinToRGB(sampleTemp());
      var alphaj = (0.05 + 0.10 * Math.random()) * (1 - rj / GALAXY.r);
      var sizej = 0.3 + Math.random() * 0.5;
      ctx.fillStyle = 'rgba(' + rgbj[0] + ',' + rgbj[1] + ',' + rgbj[2] + ',' + alphaj.toFixed(3) + ')';
      ctx.fillRect(xj, yj, sizej, sizej);
    }

    // HII nebula blobs along the arms (pink / violet star-forming regions)
    var blobs = Math.round(10 * area) + 4;
    for (var k = 0; k < blobs; k++) {
      var armk = Math.floor(Math.random() * arms);
      var uk = 0.15 + Math.random() * 0.6;
      var thetak = uk * maxTheta;
      var rk = a * Math.exp(b * thetak);
      if (rk > GALAXY.r) continue;
      var angk = thetak + armk * (6.2832 / arms);
      var xk = Math.cos(angk) * rk, yk = Math.sin(angk) * rk;
      var rad2 = 8 + Math.random() * 22;
      var hue = Math.random() < 0.5 ? '255,150,195' : '175,155,255';
      var g2 = ctx.createRadialGradient(xk, yk, 0, xk, yk, rad2);
      g2.addColorStop(0, 'rgba(' + hue + ',0.05)');
      g2.addColorStop(1, 'rgba(' + hue + ',0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(xk, yk, rad2, 0, 6.2832); ctx.fill();
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

    // galaxy: continuous slow idle rotation about its own core, layered on
    // top of the same translate every other layer receives
    if (galaxyCanvas) {
      var rot = Math.sin(t / 480000) * 1.6; // imperceptibly slow oscillation
      galaxyCanvas.style.transform = galaxyBaseTransform() + ' rotate(' + rot.toFixed(3) + 'deg)';
    }
  }

  /* ---------- interactive parallax: scroll + cursor depth ---------- */
  var mouseNX = 0, mouseNY = 0; // normalized -1..1, viewport-relative
  var parallaxLayers = [];
  var ticking = false;

  function buildParallaxLayers() {
    parallaxLayers = [
      { el: farCanvas, scroll: 0.035, mx: 6, my: 4, clamp: true },
      { el: nearCanvas, scroll: 0.085, mx: 10, my: 7, clamp: true },
      { el: animCanvas, scroll: 0.085, mx: 10, my: 7, clamp: true }
    ];
    var planetEls = document.querySelectorAll('.planet-layer');
    for (var i = 0; i < planetEls.length; i++) {
      var el = planetEls[i];
      parallaxLayers.push({
        el: el,
        scroll: parseFloat(el.dataset.scroll) || 0.05,
        mx: parseFloat(el.dataset.mx) || 10,
        my: parseFloat(el.dataset.my) || 6,
        clamp: false
      });
    }
  }

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
      var scrollOff = L.clamp ? -Math.min(max, y * L.scroll) : -(y * L.scroll);
      var mx = hasHover ? mouseNX * L.mx : 0;
      var my = hasHover ? mouseNY * L.my : 0;
      L.el.style.transform = 'translate3d(' + mx.toFixed(1) + 'px,' + (scrollOff + my).toFixed(1) + 'px,0)';
    }
    if (galaxyCanvas && (reduceMotion || !running)) {
      galaxyCanvas.style.transform = galaxyBaseTransform();
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

  buildParallaxLayers();
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
