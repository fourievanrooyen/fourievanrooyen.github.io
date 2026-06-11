/* ============================================================
   UI — nav, scrollspy, project filters, modals, mission control
   ============================================================ */
(function () {
  'use strict';

  /* ---------- nav: scrolled state + reading progress ---------- */
  var nav = document.getElementById('navbar');
  var progress = document.getElementById('nav-progress');

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 24);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress && max > 0) {
      progress.style.width = (100 * window.scrollY / max).toFixed(2) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- scrollspy ---------- */
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  var spyTargets = spyLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && spyTargets.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        spyLinks.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    spyTargets.forEach(function (t) { spy.observe(t); });
  }

  /* ---------- mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      links.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- project filters ---------- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('.project-card');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      filterBtns.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      cards.forEach(function (c) {
        c.classList.toggle('hidden', f !== 'all' && c.dataset.category !== f);
      });
    });
  });

  /* ---------- modal: open/close, focus trap, esc ---------- */
  var overlay = document.getElementById('modal-overlay');
  var content = document.getElementById('modal-content');
  var lastFocus = null;

  window.openModal = function (templateId) {
    var tpl = document.getElementById(templateId);
    if (!tpl) return;
    lastFocus = document.activeElement;
    content.innerHTML = '';
    content.appendChild(tpl.content.cloneNode(true));
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    var closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) closeBtn.focus();
  };

  window.closeModal = function () {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (lastFocus) { lastFocus.focus(); lastFocus = null; }
  };

  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    // focus trap
    var focusables = overlay.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- mission control (visitor counter) ---------- */
  // CounterAPI V1 — public, works on static hosting (GitHub Pages).
  var COUNTER_API = 'https://api.counterapi.dev/v1/fourievanrooyen-portfolio/visitors';
  var SECRET_WORD = 'counter';
  var OWNER_KEY = 'portfolio_owner';
  var COUNTED_KEY = 'portfolio_unique_visitor_counted';

  var typedKeys = '';
  var counterVisible = false;
  var visitorCountElement = document.getElementById('visitor-count');
  var vcOverlay = document.getElementById('visitor-counter-overlay');

  function setCounterDisplay(value) {
    if (!visitorCountElement) return;
    visitorCountElement.textContent = Number.isFinite(value) ? value.toLocaleString() : '\u2014';
  }

  function extractCounterValue(payload) {
    if (typeof payload === 'number') return payload;
    if (!payload || typeof payload !== 'object') return NaN;
    var directKeys = ['count', 'value', 'data'];
    for (var i = 0; i < directKeys.length; i++) {
      var v = payload[directKeys[i]];
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    }
    var nestedKeys = ['result', 'counter'];
    for (var j = 0; j < nestedKeys.length; j++) {
      var nested = extractCounterValue(payload[nestedKeys[j]]);
      if (Number.isFinite(nested)) return nested;
    }
    return NaN;
  }

  function requestCounter(action) {
    var url = action ? COUNTER_API + '/' + action : COUNTER_API;
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('Counter request failed: ' + res.status);
      return res.json();
    }).then(extractCounterValue);
  }

  function isOwner() { return localStorage.getItem(OWNER_KEY) === 'true'; }
  function hasBeenCounted() { return localStorage.getItem(COUNTED_KEY) === 'true'; }

  function enableOwnerMode() {
    var wasOwner = isOwner();
    var hadBeenCounted = hasBeenCounted();
    localStorage.setItem(OWNER_KEY, 'true');
    localStorage.removeItem(COUNTED_KEY);
    if (!wasOwner && hadBeenCounted) {
      requestCounter('down').then(setCounterDisplay)
        .catch(function () { requestCounter().then(setCounterDisplay).catch(function () { setCounterDisplay(NaN); }); });
    } else {
      requestCounter().then(setCounterDisplay).catch(function () { setCounterDisplay(NaN); });
    }
  }

  (function initVisitorCounter() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('owner') === 'true' || window.location.hash === '#owner') {
      localStorage.setItem(OWNER_KEY, 'true');
    }
    var req = (isOwner() || hasBeenCounted())
      ? requestCounter()
      : requestCounter('up').then(function (c) { localStorage.setItem(COUNTED_KEY, 'true'); return c; });
    req.then(setCounterDisplay).catch(function (err) {
      console.error('Visitor counter failed:', err);
      setCounterDisplay(NaN);
    });
  })();

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    typedKeys = (typedKeys + e.key.toLowerCase()).slice(-SECRET_WORD.length);
    if (typedKeys === SECRET_WORD) {
      typedKeys = '';
      enableOwnerMode();
      toggleVisitorCounter();
    }
  });

  window.toggleVisitorCounter = function () {
    if (!vcOverlay) return;
    counterVisible = !counterVisible;
    vcOverlay.classList.toggle('active', counterVisible);
    document.body.style.overflow = counterVisible ? 'hidden' : '';
  };

  if (vcOverlay) {
    vcOverlay.addEventListener('click', function (e) {
      if (e.target === vcOverlay) toggleVisitorCounter();
    });
  }
})();
