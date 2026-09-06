/* =========================================================================
   Medical Business — UI Mockup v3
   منوی موبایل، آکاردئون، شمارنده، انیمیشن‌های اسکرول،
   سیستم ورود/ثبت‌نام دمو (localStorage)، خرید و فیلترها
   ========================================================================= */
(function () {
  'use strict';

  var LS_USERS = 'mb_users_v1';
  var LS_SESSION = 'mb_session_v1';
  var LS_SEED = 'mb_seed_v1';

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  document.documentElement.classList.add('js');

  /* ------------------------------------------------ Toast ------------ */
  var toastBox = null;
  function ensureToastBox() {
    if (toastBox) return toastBox;
    toastBox = document.createElement('div');
    toastBox.className = 'toast-box';
    document.body.appendChild(toastBox);
    return toastBox;
  }
  function toast(msg, type, action) {
    var box = ensureToastBox();
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    var icon = type === 'err' ? '!' : type === 'info' ? 'i' : '✓';
    var html = '<span class="toast-ic">' + icon + '</span><div class="toast-msg">' + msg + '</div>';
    if (action) {
      html += '<button class="toast-act">' + action.label + '</button>';
    }
    t.innerHTML = html;
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('in'); });
    if (action) {
      t.querySelector('.toast-act').addEventListener('click', function () {
        dismiss();
        if (typeof action.fn === 'function') action.fn();
      });
    }
    function dismiss() {
      t.classList.remove('in');
      setTimeout(function () { t.remove(); }, 260);
    }
    setTimeout(dismiss, action ? 5200 : 3800);
    return t;
  }

  /* ------------------------------------------------ Header / scroll -- */
  var header = $('.site-header');
  if (header) {
    var progress = document.createElement('div');
    progress.className = 'scroll-progress';
    document.body.appendChild(progress);
    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle('scrolled', y > 10);
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- منوی موبایل ---------- */
  var toggle = $('.nav-toggle');
  var nav = $('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      var open = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); });
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
      }
    });
  }

  /* ------------------------------------------------ Reveal on scroll - */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var sections = $$('main .section, #courseRoot > section, body > section.hero, body > section.page-hero, body > section.stats, body > section.section, .cta-banner-wrap');
    var targets = [];
    sections.forEach(function (sec) {
      var kids = sec.querySelectorAll('.section-head, .card, .kpi, .faq, .filter-bar, .curriculum, .split, .course-layout, .stat, .hero-panel');
      kids.forEach(function (k) { targets.push(k); });
    });
    // حذف تکراری‌ها
    targets = targets.filter(function (el, i) { return targets.indexOf(el) === i; });
    targets.forEach(function (el) {
      if (el.closest('.hero') && !el.classList.contains('hero-card')) {
        // محتوای هیرو با انیمیشن ورود لود می‌شود، نه اسکرول
        if (el.classList.contains('hero-card') || el.classList.contains('float-chip')) return;
        return;
      }
      el.classList.add('rv');
      var g = el.closest('.grid');
      if (g) {
        var idx = Array.prototype.indexOf.call(g.children, el);
        el.style.transitionDelay = Math.min(idx * 70, 420) + 'ms';
      }
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------ FAQ accordion ---- */
  $$('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      $$('.faq-item.open').forEach(function (i) { i.classList.remove('open'); });
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ------------------------------------------------ شمارنده‌ها ------- */
  var counters = $$('[data-count]');
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var duration = 1300;
    var start = null;
    function step(now) {
      if (!start) start = now;
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target).toLocaleString('fa-IR');
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('fa-IR');
    }
    requestAnimationFrame(step);
  }
  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        animateCount(en.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ------------------------------------------------ فیلتر دوره‌ها ---- */
  function initFilters() {
    var bar = $('.js-filter');
    if (!bar) return;
    var grid = $(bar.getAttribute('data-target')) || bar.parentElement.querySelector('.grid');
    var chips = $$('.chip', bar);
    var search = bar.querySelector('[data-search]');
    function apply() {
      var f = (bar.querySelector('.chip.active') || chips[0]).getAttribute('data-filter');
      var q = search ? search.value.trim() : '';
      var items = grid ? $$(':scope > *', grid) : [];
      items.forEach(function (card) {
        var cat = card.getAttribute('data-cat') || '';
        var txt = (card.textContent || '').toLowerCase();
        var showCat = f === '*' || cat === f;
        var showTxt = !q || txt.indexOf(q.toLowerCase()) !== -1;
        var show = showCat && showTxt;
        card.classList.toggle('hide', !show);
        card.classList.toggle('pop-in', show);
      });
    }
    chips.forEach(function (ch) {
      ch.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        ch.classList.add('active');
        apply();
      });
    });
    if (search) search.addEventListener('input', apply);
  }

  /* ------------------------------------------------ فرم‌های ساده ----- */
  function initForms() {
    $$('.js-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = true;
        $$('[required]', form).forEach(function (inp) {
          if (!inp.value.trim()) { inp.classList.add('invalid'); ok = false; }
          else inp.classList.remove('invalid');
        });
        if (!ok) {
          toast('لطفاً فیلدهای خواسته‌شده را پر کنید.', 'err');
          return;
        }
        var done = form.getAttribute('data-done');
        var msg = form.getAttribute('data-msg') || 'پیام شما با موفقیت ارسال شد.';
        if (form.classList.contains('js-contact-form')) {
          form.innerHTML =
            '<div class="form-success"><span class="fs-ic">✓</span>' +
            '<h3>پیام شما ارسال شد</h3>' +
            '<p>کارشناسان ما حداکثر تا ۲۴ ساعت آینده با شما تماس می‌گیرند.</p>' +
            '<button class="btn btn-primary" type="button" onclick="this.closest(\'form\').outerHTML=\'\'">ارسال پیام جدید</button></div>';
        } else {
          form.reset();
          toast(msg, 'ok');
          if (done) {
            var btn = $(done);
            if (btn) { btn.classList.add('done'); btn.textContent = '✓ عضویت شما ثبت شد'; }
          }
        }
      });
    });
    // حذف حالت خطا هنگام تایپ
    $$('input, textarea, select').forEach(function (inp) {
      inp.addEventListener('input', function () { inp.classList.remove('invalid'); });
    });
  }

  /* =====================================================================
     AUTH — سیستم ورود/ثبت‌نام دمو (localStorage)
     ===================================================================== */
  var SEED_VERSION = '3';

  function seed() {
    if (localStorage.getItem(LS_SEED) === SEED_VERSION && localStorage.getItem(LS_USERS)) return;
    var users = [];
    function order(no, date, items, amount, status) {
      return { no: no, date: date, items: items, amount: amount, status: status };
    }
    users.push({
      username: 'admin',
      password: 'admin',
      name: 'مدیر آزمایشی',
      role: 'buyer',
      mobile: '09121000000',
      email: 'admin@medicalbusiness.ir',
      job: 'مدیر کلینیک تخصصی',
      city: 'تهران',
      bio: 'این اکانت تستی برای بررسی داشبورد کاربری ساخته شده است.',
      createdAt: '۱۴۰۳/۰۲/۱۵',
      courses: [
        { courseId: 'mkt-101', enrolledAt: '۱۴۰۵/۰۳/۱۰', progress: 64, lastSeen: 'جلسه ۶: بودجه‌بندی بازاریابی', done: false },
        { courseId: 'brd-201', enrolledAt: '۱۴۰۵/۰۳/۱۰', progress: 35, lastSeen: 'جلسه ۳: پرسونای برند', done: false },
        { courseId: 'ctn-102', enrolledAt: '۱۴۰۵/۰۴/۰۲', progress: 12, lastSeen: 'جلسه ۲: استراتژی محتوا', done: false },
        { courseId: 'fin-401', enrolledAt: '۱۴۰۴/۱۱/۲۰', progress: 100, lastSeen: 'تکمیل شده', done: true, finishedAt: '۱۴۰۵/۰۵/۳۰' }
      ],
      orders: [
        order('MB-1405-0184', '۱۴۰۵/۰۳/۱۰', [
          { title: 'دوره جامع مارکتینگ پزشکی', price: 1900000 },
          { title: 'تولید محتوا برای شبکه‌های اجتماعی', price: 1700000 }
        ], 3600000, 'paid'),
        order('MB-1405-0217', '۱۴۰۵/۰۴/۰۲', [
          { title: 'برندینگ کلینیک و مطب', price: 2400000 }
        ], 2400000, 'paid'),
        order('MB-1405-0341', '۱۴۰۵/۰۵/۲۸', [
          { title: 'تکنیک‌های فروش خدمات درمانی', price: 2200000 }
        ], 2200000, 'pending')
      ],
      favs: ['sal-301', 'vis-202'],
      tickets: [
        {
          id: 'TCK-1042', subject: 'درخواست فاکتور رسمی دوره‌ها',
          dept: 'مالی', status: 'open', created: '۱۴۰۵/۰۵/۳۰', updated: '۱۴۰۵/۰۶/۰۱',
          msgs: [
            { from: 'user', text: 'سلام، برای ارائه به واحد مالی مجموعه‌مان به فاکتور رسمی با شناسه ملی نیاز دارم.' },
            { from: 'admin', text: 'سلام و درود. فاکتور رسمی برای هر دو سفارش صادر و به ایمیل شما ارسال شد. لطفاً پوشه اسپم را هم چک کنید.' }
          ]
        },
        {
          id: 'TCK-0987', subject: 'گواهی پایان دوره قیمت‌گذاری',
          dept: 'آموزش', status: 'done', created: '۱۴۰۵/۰۴/۱۲', updated: '۱۴۰۵/۰۴/۱۵',
          msgs: [
            { from: 'user', text: 'دوره را کامل کردم؛ گواهی کی صادر می‌شود؟' },
            { from: 'admin', text: 'گواهی شما صادر شد و از همین صفحه قابل دانلود است. تبریک می‌گوییم!' }
          ]
        }
      ],
      notifications: [
        { t: 'دوره «برندینگ کلینیک و مطب» به‌روزرسانی شد؛ جلسات جدید را ببینید.', d: '۲ ساعت پیش', unread: true },
        { t: 'فاکتور MB-1405-0341 در انتظار پرداخت است.', d: 'دیروز', unread: true }
      ]
    });
    // کاربر عادی نمونه (برای تست ثبت‌نام‌شده‌ها می‌توانید از همین‌جا وارد شوید)
    users.push({
      username: 'sara',
      password: '123456',
      name: 'دکتر سارا کریمی',
      role: 'buyer',
      mobile: '09122112233',
      email: 'sara@example.com',
      job: 'پزشک عمومی',
      city: 'اصفهان',
      bio: '',
      createdAt: '۱۴۰۵/۰۵/۰۱',
      courses: [
        { courseId: 'vis-202', enrolledAt: '۱۴۰۵/۰۵/۰۴', progress: 48, lastSeen: 'جلسه ۵: همکاری با طراح', done: false },
        { courseId: 'sal-301', enrolledAt: '۱۴۰۵/۰۵/۰۴', progress: 8, lastSeen: 'جلسه ۲: گفتگوی اکتشافی', done: false }
      ],
      orders: [
        order('MB-1405-0288', '۱۴۰۵/۰۵/۰۴', [
          { title: 'هویت بصری برند درمانی', price: 2000000 },
          { title: 'تکنیک‌های فروش خدمات درمانی', price: 2200000 }
        ], 4200000, 'paid')
      ],
      favs: ['mkt-101'],
      tickets: [
        {
          id: 'TCK-1011', subject: 'دسترسی به جلسه‌های جدید برندینگ',
          dept: 'آموزش', status: 'open', created: '۱۴۰۵/۰۶/۰۳', updated: '۱۴۰۵/۰۶/۰۳',
          msgs: [
            { from: 'user', text: 'سلام، جلسات جدید دوره برندینگ را در پنل نمی‌بینم.' }
          ]
        }
      ],
      notifications: []
    });
    localStorage.setItem(LS_USERS, JSON.stringify(users));
    localStorage.setItem(LS_SEED, SEED_VERSION);
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(LS_USERS)) || []; }
    catch (e) { return []; }
  }
  function saveUsers(users) {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }
  function getSessionUser() {
    var uname = localStorage.getItem(LS_SESSION);
    if (!uname) return null;
    var list = getUsers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].username.toLowerCase() === uname.toLowerCase()) return list[i];
    }
    return null;
  }
  function setSessionUser(u) {
    if (u) localStorage.setItem(LS_SESSION, u.username);
    else localStorage.removeItem(LS_SESSION);
  }
  function updateUser(u) {
    var list = getUsers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].username === u.username) { list[i] = u; break; }
    }
    saveUsers(list);
  }
  function notifyUserChange() {
    try { document.dispatchEvent(new CustomEvent('mb:user')); } catch (e) { /* noop */ }
  }

  /* ---------- Markup مودال و ناحیه هدر ---------- */
  function authModalHTML() {
    return '' +
      '<div class="modal-overlay" id="authModal" hidden>' +
      '  <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
      '    <button class="modal-close" id="authClose" aria-label="بستن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '    <div class="auth-aside">' +
      '      <span class="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>' +
      '      <h3>پنل کاربری مدیکال بیزینس</h3>' +
      '      <p>دوره‌های خود را پیگیری کنید، پیشرفت‌تان را ببینید، فاکتور بگیرید و از پشتیبانی بپرسید.</p>' +
      '      <ul class="auth-points">' +
      '        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>دسترسی مادام‌العمر به دوره‌ها</li>' +
      '        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>پیگیری سفارش و فاکتور آنلاین</li>' +
      '        <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>گواهی پایان دوره</li>' +
      '      </ul>' +
      '      <div class="demo-hint">' +
      '        <b>یوزر تستی</b>' +
      '        <code>admin / admin</code>' +
      '        <button type="button" id="quickLogin">ورود سریع</button>' +
      '      </div>' +
      '    </div>' +
      '    <div class="auth-main">' +
      '      <div class="auth-tabs" role="tablist">' +
      '        <button type="button" class="atab active" id="tabLogin">ورود</button>' +
      '        <button type="button" class="atab" id="tabRegister">ثبت‌نام</button>' +
      '      </div>' +
      '      <div id="authBody"></div>' +
      '    </div>' +
      '  </div>' +
      '</div>';
  }

  function loginHTML() {
    return '' +
      '<div class="auth-form" id="authForm">' +
      '  <h2 id="authTitle">خوش برگشتید 👋</h2>' +
      '  <p class="auth-sub">برای ورود به پنل کاربری، اطلاعات خود را وارد کنید.</p>' +
      '  <div class="field">' +
      '    <label for="auUser">نام کاربری یا موبایل</label>' +
      '    <div class="input-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><input id="auUser" type="text" placeholder="مثلاً admin یا ۰۹۱۲xxxxxxx" autocomplete="username"></div>' +
      '  </div>' +
      '  <div class="field">' +
      '    <label for="auPass">رمز عبور</label>' +
      '    <div class="input-ic pass-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12s2.5-6 7-6 7 6 7 6-2.5 6-7 6-7-6-7-6z"/><circle cx="12" cy="12" r="2.5"/></svg><input id="auPass" type="password" placeholder="••••••" autocomplete="current-password"><button type="button" class="pass-eye" aria-label="نمایش رمز"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>' +
      '  </div>' +
      '  <div class="auth-err" id="auErr" hidden></div>' +
      '  <button type="submit" class="btn btn-primary btn-lg btn-block">ورود به پنل کاربری</button>' +
      '  <p class="auth-alt">حساب کاربری ندارید؟ <button type="button" class="linkish" data-goto="register">ثبت‌نام کنید</button></p>' +
      '</div>';
  }

  function registerHTML() {
    return '' +
      '<div class="auth-form" id="authForm">' +
      '  <h2 id="authTitle">ساخت حساب کاربری</h2>' +
      '  <p class="auth-sub">در چند ثانیه عضو شوید و دوره‌های خود را مدیریت کنید.</p>' +
      '  <div class="field">' +
      '    <label for="auName">نام و نام خانوادگی</label>' +
      '    <div class="input-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><input id="auName" type="text" placeholder="مثلاً مریم نادری"></div>' +
      '  </div>' +
      '  <div class="field">' +
      '    <label for="auUserR">نام کاربری (با آن وارد می‌شوید)</label>' +
      '    <div class="input-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><input id="auUserR" type="text" placeholder="مثلاً maria_2000" autocomplete="username"></div>' +
      '  </div>' +
      '  <div class="field">' +
      '    <label for="auMail">موبایل یا ایمیل</label>' +
      '    <div class="input-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg><input id="auMail" type="text" placeholder="۰۹۱۲xxxxxxx یا you@mail.com"></div>' +
      '  </div>' +
      '  <div class="grid grid-2" style="gap:14px;">' +
      '    <div class="field">' +
      '      <label for="auPassR">رمز عبور</label>' +
      '      <div class="input-ic pass-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="auPassR" type="password" placeholder="حداقل ۴ کاراکتر" autocomplete="new-password"><button type="button" class="pass-eye" aria-label="نمایش رمز"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div>' +
      '    </div>' +
      '    <div class="field">' +
      '      <label for="auPassR2">تکرار رمز عبور</label>' +
      '      <div class="input-ic pass-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><input id="auPassR2" type="password" placeholder="تکرار رمز" autocomplete="new-password"></div>' +
      '    </div>' +
      '  </div>' +
      '  <label class="agree"><input type="checkbox" id="auAgree"><span><a href="#" onclick="return false">قوانین و مقررات</a> و <a href="#" onclick="return false">حریم خصوصی</a> را می‌پذیرم.</span></label>' +
      '  <div class="auth-err" id="auErr" hidden></div>' +
      '  <button type="submit" class="btn btn-primary btn-lg btn-block">ساخت حساب و ورود</button>' +
      '  <p class="auth-alt">قبلاً ثبت‌نام کرده‌اید؟ <button type="button" class="linkish" data-goto="login">وارد شوید</button></p>' +
      '</div>';
  }

  var pendingEnroll = null;
  var modalEl = null;

  function openAuth(tab, note) {
    seed();
    if (!modalEl) modalEl = document.getElementById('authModal');
    if (!modalEl) {
      document.body.insertAdjacentHTML('beforeend', authModalHTML());
      modalEl = document.getElementById('authModal');
      bindAuthModal();
    }
    modalEl.hidden = false;
    requestAnimationFrame(function () {
      modalEl.classList.add('open');
      document.body.classList.add('no-scroll');
    });
    setAuthTab(tab || 'login');
    if (note) {
      setTimeout(function () {
        var f = modalEl.querySelector('#auUser') || modalEl.querySelector('#auUserR');
        if (f) f.focus();
      }, 350);
    }
  }

  function closeAuth() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { modalEl.hidden = true; }, 300);
  }

  function setAuthTab(tab) {
    if (!modalEl) return;
    var body = modalEl.querySelector('#authBody');
    var tL = modalEl.querySelector('#tabLogin');
    var tR = modalEl.querySelector('#tabRegister');
    if (tab === 'register') {
      tL.classList.remove('active'); tR.classList.add('active');
      body.innerHTML = registerHTML();
    } else {
      tL.classList.add('active'); tR.classList.remove('active');
      body.innerHTML = loginHTML();
    }
    bindPassEyes();
    var err = body.querySelector('#auErr');
    if (err) err.hidden = true;
    $$('[data-goto]', body).forEach(function (b) {
      b.addEventListener('click', function () { setAuthTab(b.getAttribute('data-goto')); });
    });
    var form = body.querySelector('#authForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (tab === 'register') doRegister(form); else doLogin(form);
      });
    }
  }

  function showAuthErr(msg) {
    var err = $('#auErr', modalEl);
    if (!err) return;
    err.textContent = msg;
    err.hidden = false;
    var form = $('#authForm', modalEl);
    if (form) {
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
    }
  }

  function bindPassEyes() {
    $$('.pass-eye', modalEl).forEach(function (eye) {
      eye.addEventListener('click', function () {
        var input = eye.parentElement.querySelector('input');
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        eye.classList.toggle('on', show);
      });
    });
  }

  function doLogin(form) {
    var u = $('#auUser', form).value.trim().toLowerCase();
    var p = $('#auPass', form).value;
    var list = getUsers();
    for (var i = 0; i < list.length; i++) {
      var us = list[i];
      if (us.username.toLowerCase() === u || (us.mobile && us.mobile === u)) {
        if (us.password === p) {
          setSessionUser(us);
          afterAuthSuccess('خوش برگشتید، ' + us.name.split(' ')[0] + ' عزیز');
          return;
        }
        showAuthErr('رمز عبور واردشده صحیح نیست.');
        return;
      }
    }
    showAuthErr('کاربری با این مشخصات پیدا نشد. اگر حساب ندارید ثبت‌نام کنید.');
  }

  function doRegister(form) {
    var name = $('#auName', form).value.trim();
    var username = $('#auUserR', form).value.trim().toLowerCase();
    var mail = $('#auMail', form).value.trim();
    var p1 = $('#auPassR', form).value;
    var p2 = $('#auPassR2', form).value;
    var agree = $('#auAgree', form).checked;
    if (name.length < 3) { showAuthErr('نام و نام خانوادگی را کامل وارد کنید.'); return; }
    if (!/^[a-z0-9_.\-]{3,}$/i.test(username)) { showAuthErr('نام کاربری باید حداقل ۳ حرف انگلیسی یا عدد باشد.'); return; }
    if (!/^09\d{9}$/.test(mail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      showAuthErr('شماره موبایل (۰۹...) یا ایمیل معتبر وارد کنید.'); return;
    }
    if (p1.length < 4) { showAuthErr('رمز عبور باید حداقل ۴ کاراکتر باشد.'); return; }
    if (p1 !== p2) { showAuthErr('تکرار رمز عبور یکسان نیست.'); return; }
    if (!agree) { showAuthErr('برای ثبت‌نام باید قوانین را بپذیرید.'); return; }
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].username.toLowerCase() === username) { showAuthErr('این نام کاربری قبلاً ثبت شده است.'); return; }
    }
    var u = {
      username: username,
      password: p1,
      name: name,
      role: 'buyer',
      mobile: /^09\d{9}$/.test(mail) ? mail : '',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? mail : '',
      job: '',
      city: '',
      bio: '',
      createdAt: new Date().toLocaleDateString('fa-IR'),
      courses: [],
      orders: [],
      favs: [],
      tickets: [],
      notifications: []
    };
    users.push(u);
    saveUsers(users);
    setSessionUser(u);
    afterAuthSuccess('حساب شما ساخته شد؛ خوش آمدید ' + name.split(' ')[0] + ' جان');
  }

  function afterAuthSuccess(msg) {
    closeAuth();
    renderAuthArea();
    toast(msg, 'ok', {
      label: 'رفتن به پنل کاربری',
      fn: function () { location.href = 'dashboard.html'; }
    });
    notifyUserChange();
    if (pendingEnroll) {
      var cid = pendingEnroll;
      pendingEnroll = null;
      setTimeout(function () { enrollCourse(cid); }, 600);
    }
  }

  function quickLogin() {
    var list = getUsers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].username === 'admin') {
        setSessionUser(list[i]);
        afterAuthSuccess('ورود با یوزر تستی انجام شد');
        return;
      }
    }
    seed();
    quickLogin();
  }

  function renderAuthArea() {
    var holder = $('#authArea');
    if (!holder) return;
    var u = getSessionUser();
    if (!u) {
      holder.innerHTML =
        '<button class="btn btn-ghost btn-sm js-auth-login">ورود</button>' +
        '<button class="btn btn-primary btn-sm js-auth-register">ثبت‌نام</button>';
      var bl = holder.querySelector('.js-auth-login');
      var br = holder.querySelector('.js-auth-register');
      bl.addEventListener('click', function () { openAuth('login', true); });
      br.addEventListener('click', function () { openAuth('register', true); });
      return;
    }
    var initials = (u.name || 'کاربر').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('');
    holder.innerHTML =
      '<a class="user-chip" href="dashboard.html" title="پنل کاربری">' +
      '  <span class="avatar avatar-xs">' + initials + '</span>' +
      '  <span class="uc-name">' + u.name.split(' ')[0] + '</span>' +
      '</a>' +
      '<button class="icon-btn js-logout" title="خروج از حساب"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg></button>';
    holder.querySelector('.js-logout').addEventListener('click', function () {
      setSessionUser(null);
      renderAuthArea();
      notifyUserChange();
      toast('با موفقیت خارج شدید.', 'info');
    });
  }

  function bindAuthModal() {
    $('#authClose').addEventListener('click', closeAuth);
    $('#quickLogin').addEventListener('click', quickLogin);
    $('#tabLogin').addEventListener('click', function () { setAuthTab('login'); });
    $('#tabRegister').addEventListener('click', function () { setAuthTab('register'); });
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeAuth();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl && !modalEl.hidden) closeAuth();
    });
  }

  /* درج دکمه‌های ورود/ثبت‌نام در هدر صفحات عادی */
  function initAuthUI() {
    seed();
    if (document.body.classList.contains('dashboard-body')) return;
    var actions = $('.header-actions');
    if (!actions) return;
    var area = document.createElement('div');
    area.className = 'auth-area';
    area.id = 'authArea';
    actions.insertBefore(area, actions.firstChild);
    renderAuthArea();
    // باز شدن مودال از لینک‌های صفحه (?auth=1 یا data-auth)
    if (/[?&]auth=(login|register)/.test(location.search)) {
      var tab = (location.search.match(/auth=(login|register)/) || [])[1] || 'login';
      // پاک‌کردن پارامتر از آدرس
      history.replaceState(null, '', location.pathname + location.hash);
      setTimeout(function () { openAuth(tab, true); }, 400);
    }
    $$('[data-auth]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openAuth(el.getAttribute('data-auth') || 'login', true);
      });
    });
  }

  /* ------------------------------------------------ خرید/ثبت‌نام دوره */
  function initEnroll() {
    $$('.js-enroll').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var id = btn.getAttribute('data-course') || 'mkt-101';
        var user = getSessionUser();
        if (!user) {
          pendingEnroll = id;
          openAuth('login', true);
          return;
        }
        enrollCourse(id);
      });
    });
  }

  function enrollCourse(courseId) {
    var course = window.MB && MB.getCourse ? MB.getCourse(courseId) : null;
    var title = course ? course.title : 'دوره';
    var user = getSessionUser();
    if (!user) return;
    var has = user.courses.some(function (c) { return c.courseId === courseId; });
    if (has) {
      toast('این دوره قبلاً در حساب شما ثبت شده است.', 'info', {
        label: 'مشاهده دوره‌های من',
        fn: function () { location.href = 'dashboard.html?tab=courses'; }
      });
      notifyUserChange();
      return;
    }
    if (course) {
      user.courses.push({
        courseId: courseId,
        enrolledAt: new Date().toLocaleDateString('fa-IR'),
        progress: 0,
        lastSeen: 'هنوز شروع نشده',
        done: false
      });
      user.orders.unshift({
        no: 'MB-1405-' + String(Math.floor(1000 + Math.random() * 9000)),
        date: new Date().toLocaleDateString('fa-IR'),
        items: [{ title: course.title, price: course.price }],
        amount: course.price,
        status: 'paid'
      });
      user.notifications.unshift({
        t: 'دوره «' + course.title + '» با موفقیت ثبت شد؛ از بخش دوره‌های من شروع کنید.',
        d: 'همین حالا', unread: true
      });
      updateUser(user);
      notifyUserChange();
      toast('دوره «' + title + '» به حساب شما اضافه شد 🎉', 'ok', {
        label: 'رفتن به پنل کاربری',
        fn: function () { location.href = 'dashboard.html?tab=courses'; }
      });
    }
  }

  /* ------------------------------------------------ لود نهایی ------- */
  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initFilters();
    initForms();
    initAuthUI();
    initEnroll();
  });

  // API عمومی (مصرف dashboard.js / course.js)
  window.MBAuth = {
    seed: seed,
    getUser: getSessionUser,
    getUsers: getUsers,
    saveUser: updateUser,
    openAuth: function (tab) { openAuth(tab || 'login', true); },
    loginAs: function (username, cb) {
      var list = getUsers();
      for (var i = 0; i < list.length; i++) {
        if (list[i].username === username) {
          setSessionUser(list[i]);
          if (cb) cb(list[i]);
          return list[i];
        }
      }
      return null;
    },
    logout: function () { setSessionUser(null); },
    toast: toast
  };
})();
