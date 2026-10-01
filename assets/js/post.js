/* =========================================================================
   Medical Business — post.js
   تعاملات اختصاصی قالب نوشته‌ی تکی (v2):
   نوار پیشرفت مطالعه · هایلایت خودکار فهرست مطالب · اشتراک‌گذاری/کپی لینک ·
   فرم دیدگاه · بازگشت به بالا
   بدون هیچ کتابخانه‌ی خارجی.
   ========================================================================= */
(function () {
  'use strict';

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  function notify(msg, type) {
    if (window.MBAuth && typeof window.MBAuth.toast === 'function') {
      window.MBAuth.toast(msg, type || 'ok');
    } else {
      var box = $('#toastBox');
      if (!box) { box = document.createElement('div'); box.className = 'toast-box'; document.body.appendChild(box); }
      var t = document.createElement('div');
      t.className = 'toast ' + (type || 'ok');
      t.innerHTML = '<span class="toast-ic">' + (type === 'err' ? '!' : '✓') + '</span><div class="toast-msg">' + msg + '</div>';
      box.appendChild(t);
      requestAnimationFrame(function () { t.classList.add('in'); });
      setTimeout(function () { t.classList.remove('in'); setTimeout(function () { t.remove(); }, 260); }, 3400);
    }
  }

  /* ---------------------------------------------- ۱) نوار پیشرفت مطالعه */
  function initReadingProgress() {
    var bar = $('#readingProgress');
    var body = $('#postBody');
    if (!bar || !body) return;
    var fill = bar.querySelector('span') || bar;

    function update() {
      var rect = body.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var total = rect.height - vh * 0.5;
      if (total <= 0) { fill.style.transform = 'scaleX(0)'; return; }
      var passed = Math.min(Math.max(vh * 0.5 - rect.top, 0), total);
      fill.style.transform = 'scaleX(' + (passed / total).toFixed(4) + ')';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------------------------------- ۲) هایلایت خودکار فهرست مطالب */
  function initTocSpy() {
    var links = $$('#tocBox a');
    if (!links.length) return;
    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute('href');
      if (id && id.charAt(0) === '#') map[id.slice(1)] = a;
    });
    var ids = Object.keys(map);
    var headings = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!headings.length) return;

    function setActive(id) {
      links.forEach(function (a) { a.classList.remove('active'); });
      if (map[id]) {
        map[id].classList.add('active');
        var box = $('#tocBox');
        if (box && box.scrollHeight > box.clientHeight) {
          var link = map[id];
          box.scrollTo ? box.scrollTo({ top: link.offsetTop - box.clientHeight / 2, behavior: 'smooth' }) : null;
        }
      }
    }

    function onScroll() {
      var line = (window.innerHeight || 600) * 0.3;
      var current = headings[0].id;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top <= line) current = headings[i].id;
      }
      setActive(current);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* --------------------------------------------- ۳) کپی لینک / اشتراک‌گذاری */
  function initShare() {
    var btn = $('#copyLinkBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url') || window.location.href;
      var done = function () { notify('لینک مقاله کپی شد.', 'ok'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = url;
          ta.setAttribute('readonly', '');
          ta.style.position = 'absolute';
          ta.style.insetInlineStart = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          ta.remove();
          if (ok) done(); else notify('کپی لینک ممکن نشد؛ آدرس را از نوار مرورگر بردارید.', 'err');
        } catch (e) {
          notify('کپی لینک ممکن نشد؛ آدرس را از نوار مرورگر بردارید.', 'err');
        }
      }
    });
  }

  /* ---------------------------------------------------- ۴) فرم دیدگاه */
  function initCommentForm() {
    var form = $('#commentForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $$('[required]', form).forEach(function (inp) {
        if (!inp.value.trim()) { inp.classList.add('invalid'); ok = false; }
        else inp.classList.remove('invalid');
      });
      var email = form.querySelector('input[name="email"]');
      if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.classList.add('invalid'); ok = false;
      }
      if (!ok) { notify('لطفاً فیلدهای خواسته‌شده را درست پر کنید.', 'err'); return; }
      form.reset();
      notify('دیدگاه شما ثبت شد و پس از تأیید مدیر منتشر می‌شود.', 'ok');
    });
    $$('input, textarea', form).forEach(function (inp) {
      inp.addEventListener('input', function () { inp.classList.remove('invalid'); });
    });
  }

  /* -------------------------------------------------- ۵) بازگشت به بالا */
  function initToTop() {
    var btn = $('#toTop');
    if (!btn) return;
    function toggle() {
      var y = window.scrollY || document.documentElement.scrollTop;
      btn.classList.toggle('show', y > 600);
    }
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
  }

  /* ------------------------------------ ۶) اسکرول نرم برای لنگرهای داخلی */
  function initSmoothAnchors() {
    $$('#postBody a[href^="#"], #tocBox a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        var headerH = (document.querySelector('.site-header') || {}).offsetHeight || 80;
        var top = el.getBoundingClientRect().top + (window.scrollY || 0) - headerH - 14;
        window.scrollTo({ top: top, behavior: 'smooth' });
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initReadingProgress();
    initTocSpy();
    initShare();
    initCommentForm();
    initToTop();
    initSmoothAnchors();
  });
})();
