/* =========================================================================
   Medical Business — صفحه تکی دوره (رندر پویا از data.js)
   ========================================================================= */
(function () {
  'use strict';

  if (!window.MB) return;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function fa(n) { return Number(n || 0).toLocaleString('fa-IR'); }

  function starsHTML(r) {
    var full = Math.round(r || 0), h = '<span class="st">';
    for (var i = 0; i < 5; i++) {
      h += i < full
        ? '<svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-17"></use></svg>'
        : '<svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-48"></use></svg>';
    }
    return h + '</span>';
  }

  function getEnr(courseId) {
    if (!window.MBAuth) return null;
    var u = MBAuth.getUser();
    if (!u) return null;
    for (var i = 0; i < u.courses.length; i++) {
      if (u.courses[i].courseId === courseId) return u.courses[i];
    }
    return null;
  }

  function isFav(courseId) {
    if (!window.MBAuth) return false;
    var u = MBAuth.getUser();
    return !!(u && (u.favs || []).indexOf(courseId) !== -1);
  }

  function parseParams() {
    var p = {};
    var qs = location.search.replace(/^\?/, '').split('&');
    qs.forEach(function (kv) {
      var parts = kv.split('=');
      if (parts[0]) p[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1] || '');
    });
    return p;
  }

  var params = parseParams();
  var course = MB.getCourse(params.c || 'mbm-101');
  var teacher = MB.teachers[course.teacher] || { name: course.teacher, role: 'مدرس دوره', bio: '', initials: 'م‌د' };

  /* ------------------------------------------------ ساختار صفحه ----- */
  function htmlPage(c) {
    var oldPct = c.oldPrice ? Math.round((1 - c.price / c.oldPrice) * 100) : 0;
    return '' +
      /* هدر دوره */
      '<section class="page-hero">' +
      '  <div class="page-bg" style="background-image:url(\'' + c.cover + '\');"></div>' +
      '  <div class="container">' +
      '    <div class="breadcrumb"><a href="index.html">خانه</a><span class="sep">/</span><a href="courses.html">دوره‌ها</a><span class="sep">/</span><span>' + c.title + '</span></div>' +
      '    <div class="cd-head-row">' +
      '      <div class="cd-head-text">' +
      '        <div class="cd-badges"><span class="badge badge-glass">' + c.catLabel + '</span><span class="badge badge-glass">سطح: ' + c.level + '</span>' + (oldPct ? '<span class="badge badge-glass hot">' + oldPct + '٪ تخفیف</span>' : '') + '</div>' +
      '        <h1>' + c.title + '</h1>' +
      '        <p>' + c.desc + '</p>' +
      '        <div class="cd-rate">' + starsHTML(c.rating) + '<b class="rate">' + fa(c.rating) + '<small> از ' + fa(c.ratingCount) + ' نظر</small></b>' +
      '        <span class="cd-teacher">مدرس: ' + MB.teacherLink(teacher.name) + '</span></div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="hero-panel">' +
      '      <div class="kpi"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-12"></use></svg><div><b>' + fa(c.lessons) + ' جلسه ویدیویی</b><small>کیفیت FullHD + جزوه</small></div></div>' +
      '      <div class="kpi"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-14"></use></svg><div><b>' + fa(c.minutes) + ' دقیقه</b><small>محتوای فشرده و کاربردی</small></div></div>' +
      '      <div class="kpi"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-15"></use></svg><div><b>' + fa(c.students) + ' دانشجو</b><small>از سراسر ایران</small></div></div>' +
      '      <div class="kpi"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-29"></use></svg><div><b>دسترسی مادام‌العمر</b><small>+ به‌روزرسانی رایگان</small></div></div>' +
      '    </div>' +
      '  </div>' +
      '</section>' +

      '<section class="section">' +
      '  <div class="container">' +
      '    <div class="course-layout" id="cdLayout">' +
      '      <div class="course-main">' +

      /* کاور */
      '        <div class="cover cd-cover"><img src="' + c.cover + '" alt="' + c.title + '">' +
      '          <div class="cover-play"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-49"></use></svg><span>پیش‌نمایش جلسه اول</span></div>' +
      '        </div>' +

      /* درباره دوره */
      '        <h2 class="cd-title">درباره این دوره</h2>' +
      c.story.map(function (p) { return '<p class="cd-para">' + p + '</p>'; }).join('') +

      /* دستاوردها */
      '        <h2 class="cd-title">در پایان دوره چه چیزی به دست می‌آورید؟</h2>' +
      '        <ul class="checklist cd-outcomes">' +
      c.outcomes.map(function (o) {
        return '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-16"></use></svg><div><p>' + o + '</p></div></li>';
      }).join('') +
      '        </ul>' +

      /* سرفصل‌ها */
      '        <h2 class="cd-title">سرفصل‌های دوره (' + fa(c.lessons) + ' جلسه)</h2>' +
      '        <ul class="curriculum cd-curriculum" id="cdCurriculum">' +
      c.curriculum.map(function (ls, i) {
        var lock = !ls.free;
        return '<li data-idx="' + i + '" data-lock="' + (lock ? 1 : 0) + '">' +
          '<span class="num">' + fa(i + 1) + '</span>' +
          '<span class="ls-title">' + ls.t + (ls.free ? '<span class="lesson-free">رایگان</span>' : '') + '</span>' +
          '<span class="dur">' + fa(ls.d) + ' دقیقه</span>' +
          (ls.free
            ? '<span class="ls-act"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-49"></use></svg></span>'
            : '<span class="ls-act locked"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-50"></use></svg></span>') +
          '</li>';
      }).join('') +
      '        </ul>' +

      /* مخاطبان */
      '        <h2 class="cd-title">این دوره برای چه کسانی مناسب است؟</h2>' +
      '        <div class="audience-grid">' +
      c.audience.map(function (a) {
        return '<div class="card aud-item"><span class="aud-ic"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-06"></use></svg></span><p>' + a + '</p></div>';
      }).join('') +
      '        </div>' +

      /* مدرس */
      '        <h2 class="cd-title">مدرس دوره</h2>' +
      '        <div class="card teacher-card">' +
      '          <span class="avatar teacher-avatar">' + (teacher.initials || 'م‌د') + '</span>' +
      '          <div class="teacher-info">' +
      '            <h3><a class="teacher-name" href="' + (teacher.url || MB.teacherSite) + '" target="_blank" rel="noopener">' + teacher.name + '</a></h3>' +
      '            <div class="teacher-role">' + teacher.role + '</div>' +
      '            <p>' + teacher.bio + '</p>' +
      '            <a class="more" href="about.html">آشنایی با مدرس دوره' +
      '              <svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-04"></use></svg></a>' +
      '          </div>' +
      '        </div>' +

      /* سوالات */
      '        <h2 class="cd-title">سوالات متداول این دوره</h2>' +
      '        <div class="faq">' +
      '          <div class="faq-item"><button class="faq-q">اگر بعد از خرید پشیمان شدم چه؟<span class="ic"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-19"></use></svg></span></button>' +
      '            <div class="faq-a"><p>تا ۷ روز پس از خرید، اگر کمتر از ۲ جلسه را مشاهده کرده باشید، مبلغ به‌صورت کامل بازگردانده می‌شود. کافی است از بخش تیکت‌ها درخواست دهید.</p></div></div>' +
      '          <div class="faq-item"><button class="faq-q">آیا این دوره برای تازه‌کارها مناسب است؟<span class="ic"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-19"></use></svg></span></button>' +
      '            <div class="faq-a"><p>بله. دوره سطح «' + c.level + '» دارد و حتی اگر هیچ آشنایی قبلی ندارید، جلسات ابتدایی شما را قدم‌به‌قدم جلو می‌برد.</p></div></div>' +
      '          <div class="faq-item"><button class="faq-q">چطور مدرک یا گواهی بگیرم؟<span class="ic"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-19"></use></svg></span></button>' +
      '            <div class="faq-a"><p>پس از مشاهده همه جلسات و ارسال پروژه پایانی، گواهی با کد رهگیری در پنل کاربری شما صادر می‌شود.</p></div></div>' +
      '        </div>' +
      '      </div>' +

      /* سایدبار خرید */
      '      <aside class="card side-card" id="cdAside"></aside>' +
      '    </div>' +

      /* دوره‌های مرتبط */
      relatedHTML(c) +
      '  </div>' +
      '</section>';
  }

  function relatedHTML(c) {
    var rel = MB.courses.filter(function (x) { return x.id !== c.id; }).slice(0, 3);
    return '<div class="mt-48">' +
      '<div class="section-head center" style="margin-bottom:30px;"><span class="eyebrow">پیشنهاد مدیکال بیزینس</span><h2 style="font-size:27px;">دوره‌های مرتبط</h2></div>' +
      '<div class="grid grid-3">' +
      rel.map(function (r) {
        return '<article class="card course-card"><div class="thumb"><img src="' + r.cover + '" alt="' + r.title + '">' +
          '<span class="badge badge-glass">' + r.catLabel + '</span><span class="badge badge-glass level">' + r.level + '</span></div>' +
          '<div class="body"><h3>' + r.title + '</h3><p class="desc">' + r.desc + '</p>' +
          '<div class="meta-row"><span><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-14"></use></svg>' + fa(r.minutes) + ' دقیقه</span></div>' +
          '<div class="foot"><div class="price">' + fa(r.price) + ' <small>تومان</small></div>' +
          '<a href="course.html?c=' + r.id + '" class="btn btn-primary btn-sm">مشاهده دوره</a></div></div></article>';
      }).join('') +
      '</div></div>';
  }

  /* ------------------------------------------------ سایدبار ---------- */
  function asideHTML(c, enr) {
    var oldPct = c.oldPrice ? Math.round((1 - c.price / c.oldPrice) * 100) : 0;
    if (enr) {
      var p = Math.min(enr.progress || 0, 100);
      return '<div class="price-block own-block">' +
        '<span class="own-ic"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-51"></use></svg></span>' +
        '<div class="own-title">شما این دوره را دارید</div>' +
        (enr.done
          ? '<span class="badge badge-green mt-8">دوره تکمیل شده — گواهی صادر شد</span>'
          : '<div class="own-prog"><div class="own-prog-top"><span>پیشرفت شما</span><b>' + fa(p) + '٪</b></div><div class="own-prog-bar"><i style="width:' + p + '%"></i></div></div>') +
        '</div>' +
        '<ul class="info-list">' +
        '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-14"></use></svg>مدت دوره: ' + fa(c.minutes) + ' دقیقه</li>' +
        '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-14"></use></svg>تاریخ ثبت‌نام: ' + enr.enrolledAt + '</li>' +
        '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-15"></use></svg>مدرس: ' + MB.teacherLink(c.teacher) + '</li>' +
        '</ul>' +
        '<div class="cta-wrap">' +
        (enr.done
          ? '<a href="dashboard.html?tab=courses" class="btn btn-primary btn-lg" style="width:100%;">مشاهده گواهی در پنل</a>'
          : '<button class="btn btn-primary btn-lg js-continue" style="width:100%;">' + (p ? 'ادامه یادگیری' : 'شروع دوره') + '</button>') +
        '<a href="dashboard.html?tab=courses" class="btn btn-secondary" style="width:100%; margin-top:10px;">رفتن به پنل کاربری</a>' +
        '</div>';
    }
    return '<div class="price-block">' +
      (c.oldPrice ? '<div class="old">' + fa(c.oldPrice) + ' تومان</div>' : '<div class="old muted-nl">&nbsp;</div>') +
      '<div class="big">' + fa(c.price) + ' <small style="font-size:14px; font-weight:500; color:var(--muted);">تومان</small></div>' +
      (oldPct ? '<span class="badge badge-green mt-8">' + oldPct + '٪ تخفیف ویژه</span>' : '<span class="badge badge-blue mt-8">پرداخت امن آنلاین</span>') +
      '</div>' +
      '<ul class="info-list">' +
      '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-12"></use></svg>' + fa(c.lessons) + ' جلسه آموزشی ویدیویی</li>' +
      '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-14"></use></svg>مدت دوره: ' + fa(c.minutes) + ' دقیقه</li>' +
      '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-15"></use></svg>مدرس: ' + MB.teacherLink(c.teacher) + '</li>' +
      '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-15"></use></svg>' + fa(c.students) + ' دانشجو در دوره</li>' +
      '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-14"></use></svg>سطح دوره: ' + c.level + '</li>' +
      '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-29"></use></svg>گواهی معتبر پایان دوره</li>' +
      '<li><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-52"></use></svg>دسترسی مادام‌العمر + به‌روزرسانی</li>' +
      '</ul>' +
      '<div class="cta-wrap">' +
      '<button class="btn btn-primary btn-lg js-enroll" data-course="' + c.id + '" style="width:100%;">' +
      '<svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-05"></use></svg>خرید و ثبت‌نام در دوره</button>' +
      '<button class="btn btn-secondary js-fav" style="width:100%; margin-top:10px;">' +
      (isFav(c.id) ? '♥ در علاقه‌مندی‌ها' : '♡ افزودن به علاقه‌مندی‌ها') + '</button>' +
      '<p class="side-note"><svg width="1em" height="1em"><use href="assets/icons/sprite.svg#ic-51"></use></svg>ضمانت بازگشت وجه تا ۷ روز پس از خرید</p>' +
      '</div>';
  }

  /* ------------------------------------------------ رویدادها --------- */
  function bindEvents(c) {
    var aside = $('#cdAside');
    function refreshAside() {
      if (!aside) return;
      var enr = getEnr(c.id);
      aside.innerHTML = asideHTML(c, enr);
      bindAsideActions(c, aside);
    }
    refreshAside();

    /* کلیک روی سرفصل‌ها */
    $$('#cdCurriculum li').forEach(function (li) {
      li.addEventListener('click', function () {
        var locked = li.getAttribute('data-lock') === '1';
        var enr = getEnr(c.id);
        if (locked && !enr) {
          var btn = aside && aside.querySelector('.js-enroll');
          if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (window.MBAuth) MBAuth.toast('برای دسترسی به همه جلسات، ابتدا دوره را تهیه کنید.', 'info');
          return;
        }
        if (window.MBAuth) MBAuth.toast('🎬 پخش جلسه — در نسخه نمایشی، پخش ویدیو شبیه‌سازی شده است.', 'info');
      });
    });

    /* کاور: پیش‌نمایش */
    var coverPlay = $('.cover-play');
    if (coverPlay) coverPlay.addEventListener('click', function () {
      if (window.MBAuth) MBAuth.toast('🎬 پخش پیش‌نمایش رایگان دوره', 'info');
    });

    /* تغییر وضعیت کاربر (ورود/خرید/خروج) */
    document.addEventListener('mb:user', refreshAside);
  }

  function bindAsideActions(c, aside) {
    var fav = aside.querySelector('.js-fav');
    if (fav) {
      fav.addEventListener('click', function () {
        var u = window.MBAuth && MBAuth.getUser();
        if (!u) {
          if (window.MBAuth) MBAuth.openAuth('register');
          return;
        }
        var favs = u.favs || [];
        var idx = favs.indexOf(c.id);
        if (idx === -1) favs.push(c.id);
        else favs.splice(idx, 1);
        u.favs = favs;
        MBAuth.saveUser(u);
        refreshFavBtn(fav, c);
        MBAuth.toast(idx === -1 ? 'به علاقه‌مندی‌های شما اضافه شد ♥' : 'از علاقه‌مندی‌ها حذف شد.', idx === -1 ? 'ok' : 'info');
      });
    }
    var cont = aside.querySelector('.js-continue');
    if (cont) {
      cont.addEventListener('click', function () {
        if (window.MBAuth) MBAuth.toast('🎬 ادامه یادگیری — در نسخه نمایشی، پخش ویدیو شبیه‌سازی شده است.', 'info');
      });
    }
    function refreshFavBtn(btn, cc) {
      btn.innerHTML = isFav(cc.id) ? '♥ در علاقه‌مندی‌ها' : '♡ افزودن به علاقه‌مندی‌ها';
    }
  }

  /* ------------------------------------------------ اجرا ------------- */
  var root = $('#courseRoot');
  if (!root) return;

  try { document.title = course.title + ' | مدیکال بیزینس'; } catch (e) { /* noop */ }

  root.innerHTML = htmlPage(course);
  bindEvents(course);

  // انیمیشن ورود محتوای هیرو
  root.querySelectorAll('.hero-panel, .breadcrumb, .cd-head-text').forEach(function (el) {
    el.classList.add('in');
  });
})();
