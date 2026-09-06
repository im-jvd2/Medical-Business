/* =========================================================================
   Medical Business — داشبورد کاربری خریدار (دمو مبتنی بر localStorage)
   ========================================================================= */
(function () {
  'use strict';

  var MB = window.MB || {};
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fa(n) { return Number(n || 0).toLocaleString('fa-IR'); }
  function todayFa() { return new Date().toLocaleDateString('fa-IR'); }
  function initials(name) {
    var parts = String(name || 'کاربر').trim().split(/\s+/);
    return parts.slice(0, 2).map(function (w) { return w[0]; }).join('') || 'ک';
  }
  function starsHTML(r) {
    var full = Math.round(r || 0);
    var h = '';
    for (var i = 0; i < 5; i++) {
      h += i < full
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>';
    }
    return '<span class="st">' + h + '</span>';
  }

  var I = {
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/></svg>',
    cert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="m9.5 14-1.5 8 4-2.5 4 2.5-1.5-8"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6M9 11h2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.6 8.6 0 0 1-3.6-.8L3 21l2-5.6a8.2 8.2 0 0 1-1-4A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/><path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>'
  };

  var state = { user: null, view: 'overview', ticket: null, coursesFilter: '' };

  function saveUser() { MBAuth.saveUser(state.user); }

  /* ---------------------------------------------------------------- */
  function courseOf(enr) {
    return MB.getCourse ? MB.getCourse(enr.courseId) : null;
  }
  function enroll(course, silent) {
    var user = state.user;
    var owns = user.courses.some(function (c) { return c.courseId === course.id; });
    if (owns) { MBAuth.toast('این دوره قبلاً در حساب شما ثبت شده است.', 'info'); return false; }
    user.courses.push({ courseId: course.id, enrolledAt: todayFa(), progress: 0, lastSeen: 'هنوز شروع نشده', done: false });
    user.orders.unshift({
      no: 'MB-1405-' + Math.floor(1000 + Math.random() * 9000),
      date: todayFa(),
      items: [{ title: course.title, price: course.price }],
      amount: course.price,
      status: 'paid'
    });
    user.notifications.unshift({ t: 'دوره «' + course.title + '» با موفقیت ثبت شد.', d: 'همین حالا', unread: true });
    saveUser();
    if (!silent) {
      MBAuth.toast('دوره «' + course.title + '» خریداری و فعال شد 🎉', 'ok', {
        label: 'رفتن به دوره‌های من',
        fn: function () { setView('courses'); }
      });
    }
    return true;
  }

  /* ----------------------------------------------------------------
     رندر هدر و سایدبار
     ---------------------------------------------------------------- */
  function renderShell() {
    var u = state.user;
    var avBtn = $('#dAvatarBtn');
    if (avBtn) { avBtn.textContent = initials(u.name); }
    var head = $('#avatarHead');
    if (head) {
      head.innerHTML = '<b>' + esc(u.name) + '</b><span>@' + esc(u.username) + (u.role === 'admin' ? ' · ادمین' : ' · کاربر خریدار') + '</span>';
    }
    var unread = (u.notifications || []).filter(function (n) { return n.unread; }).length;
    var dot = $('#bellDot');
    if (dot) dot.classList.toggle('on', unread > 0);
    renderBell();
    $('#cntCourses').textContent = fa(u.courses.length);
    $('#cntOrders').textContent = fa(u.orders.filter(function (o) { return o.status === 'pending'; }).length);
    $('#cntFavs').textContent = fa((u.favs || []).length);
    $('#cntTickets').textContent = fa(u.tickets.filter(function (t) { return t.status === 'open'; }).length);
  }

  function renderBell() {
    var list = $('#bellList');
    if (!list) return;
    var notifs = state.user.notifications || [];
    if (!notifs.length) {
      list.innerHTML = '<div class="d-notif"><p>اعلانی ندارید. فعالیت‌های جدید حساب شما اینجا نمایش داده می‌شود.</p></div>';
      return;
    }
    list.innerHTML = notifs.map(function (n, i) {
      return '<div class="d-notif' + (n.unread ? '' : ' read') + '"><span class="dot"></span><div><p>' + esc(n.t) + '</p><time>' + esc(n.d) + '</time></div></div>';
    }).join('');
  }

  /* ----------------------------------------------------------------
     نمای کلی
     ---------------------------------------------------------------- */
  function renderOverview() {
    var u = state.user;
    var active = u.courses.filter(function (c) { return !c.done; });
    var done = u.courses.filter(function (c) { return c.done; });
    var avg = u.courses.length
      ? Math.round(u.courses.reduce(function (s, c) { return s + (c.progress || 0); }, 0) / u.courses.length)
      : 0;
    var mins = u.courses.reduce(function (s, c) {
      var co = courseOf(c);
      return s + (co ? Math.round(co.minutes * (c.progress || 0) / 100) : 0);
    }, 0);

    var hoursTxt = (mins / 60) < 1
      ? fa(mins) + ' دقیقه'
      : fa((mins / 60).toFixed(1).replace(/\./g, '٫')) + ' ساعت';

    var cont = u.courses.filter(function (c) { return !c.done; })
      .sort(function (a, b) { return b.enrolledAt.localeCompare(a.enrolledAt); }).slice(0, 3);

    var hour = new Date().getHours();
    var greet = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'ظهر بخیر' : 'عصر بخیر';

    var html = '';
    /* خوش‌آمد */
    html += '<div class="welcome"><div class="w-row">' +
      '<span class="avatar-big">' + initials(u.name) + '</span>' +
      '<div><h1>' + greet + '، ' + esc(u.name.split(' ')[0]) + ' 👋</h1>' +
      '<p>' + esc(u.job || 'کاربر خریدار مدیکال بیزینس') + (u.city ? ' — ' + esc(u.city) : '') + '</p>' +
      '<div class="w-badges"><span class="w-badge">عضو از ' + esc(u.createdAt || '—') + '</span>' +
      (active.length ? '<span class="w-badge">' + fa(active.length) + ' دوره فعال</span>' : '') +
      (done.length ? '<span class="w-badge">🏅 ' + fa(done.length) + ' گواهی</span>' : '') +
      '</div></div></div>' +
      '<div class="w-cta">' +
      (active.length ? '<a class="btn btn-mint" href="#" data-goview="courses">ادامه یادگیری</a>' : '<a class="btn btn-mint" href="courses.html">خرید اولین دوره</a>') +
      '<a class="btn btn-glass" href="#" data-goview="orders">سفارش‌ها</a></div></div>';

    /* KPI */
    var kpis = [
      { ic: 'b1', icon: I.cap, num: fa(active.length), lbl: 'دوره فعال', foot: u.courses.length ? fa(u.courses.length) + ' دوره ثبت‌شده' : 'هنوز دوره‌ای ثبت نکرده‌اید', cls: 'good' },
      { ic: 'b2', icon: I.trend, num: '%' + fa(avg), lbl: 'میانگین پیشرفت', foot: done.length ? done.length + ' دوره کامل شده' : 'اولین قدم را بردارید', cls: 'good' },
      { ic: 'b3', icon: I.clock, num: hoursTxt, lbl: 'مطالعه تا امروز', foot: 'بر اساس پیشرفت دوره‌ها', cls: 'warn' },
      { ic: 'b4', icon: I.cert, num: fa(done.length), lbl: 'گواهی دریافتی', foot: 'قابل دانلود از دوره‌ها', cls: 'good' }
    ];
    html += '<div class="kpi-grid">' + kpis.map(function (k) {
      return '<div class="d-card kpi-card hoverable"><div class="k-ic ' + k.ic + '">' + k.icon + '</div>' +
        '<div><div class="k-num">' + k.num + '</div><div class="k-lbl">' + k.lbl + '</div>' +
        '<div class="k-foot ' + k.cls + '">' + k.foot + '</div></div></div>';
    }).join('') + '</div>';

    /* چارت + دونات */
    html += '<div class="dash-cols">';
    html += '<div class="d-card"><div class="d-card-head"><h3>فعالیت هفتگی شما</h3><span class="link-more muted" style="cursor:default;">ساعت یادگیری</span></div><div class="chart-bars" id="chartBars">' +
      [['شنبه', 2], ['یکشنبه', 4], ['دوشنبه', 3], ['سه‌شنبه', 6], ['چهارشنبه', 5], ['پنجشنبه', 7], ['جمعه', 1]].map(function (d, i) {
        return '<div class="cb"><div class="bar-wrap"><div class="bar' + (i === 5 ? ' hot' : '') + '" data-h="' + (d[1] / 7 * 100) + '"></div></div><small>' + d[0] + '</small></div>';
      }).join('') + '</div></div>';

    /* دونات دسته‌بندی */
    var catMap = {};
    u.courses.forEach(function (c) {
      var co = courseOf(c);
      if (!co) return;
      catMap[co.catLabel] = (catMap[co.catLabel] || 0) + 1;
    });
    var cats = Object.keys(catMap);
    var colors = { 'مارکتینگ': '#2E86DE', 'برندینگ': '#A78BFA', 'فروش': '#F59E0B', 'فروش و مدیریت': '#F59E0B', 'سایر': '#94A3B8' };
    var donutHTML, legendHTML;
    if (!cats.length) {
      donutHTML = '<div class="donut" style="background:conic-gradient(#E5EAF0 0 100%)"><div class="donut-txt"><b>۰</b><span>دوره</span></div></div>';
      legendHTML = '<li><i style="background:#E5EAF0"></i>هنوز دوره‌ای ندارید</li>';
    } else {
      var total = u.courses.length;
      var segs = [], acc = 0;
      var orderCats = ['مارکتینگ', 'برندینگ', 'فروش', 'فروش و مدیریت'];
      var sorted = orderCats.filter(function (k) { return catMap[k]; });
      sorted.forEach(function (k) {
        var pct = Math.round(catMap[k] / total * 100);
        segs.push(colors[k] + ' ' + acc + '% ' + (acc + pct) + '%');
        acc += pct;
      });
      donutHTML = '<div class="donut" style="background:conic-gradient(' + segs.join(', ') + ')"><div class="donut-txt"><b>' + fa(total) + '</b><span>دوره ثبت‌شده</span></div></div>';
      legendHTML = sorted.map(function (k) {
        var pct = Math.round(catMap[k] / total * 100);
        return '<li><i style="background:' + colors[k] + '"></i>' + k + ' <b>' + fa(catMap[k]) + '</b><span>(' + fa(pct) + '٪)</span></li>';
      }).join('');
    }
    html += '<div class="d-card"><div class="d-card-head"><h3>دوره‌ها بر اساس دسته</h3></div><div class="donut-wrap">' +
      donutHTML + '<ul class="donut-legend">' + legendHTML + '</ul></div></div></div>';

    /* ادامه یادگیری + سفارش‌ها */
    html += '<div class="dash-cols">';
    html += '<div class="d-card"><div class="d-card-head"><h3>ادامه یادگیری</h3><a class="link-more" href="#" data-goview="courses">همه دوره‌ها' + I.arrow + '</a></div>';
    if (!cont.length) {
      html += '<div class="empty-state" style="padding:26px 10px;"><div class="es-ic" style="width:64px;height:64px;border-radius:22px;">' + I.cap + '</div><h3>دوره فعالی ندارید</h3><p>از فروشگاه یک دوره بخرید تا همین‌جا پیگیری‌اش کنید.</p><a class="btn btn-primary" href="courses.html">مشاهده دوره‌ها</a></div>';
    } else {
      html += '<div class="continue-list">' + cont.map(function (c) {
        var co = courseOf(c);
        if (!co) return '';
        var p = Math.min(c.progress || 0, 100);
        return '<div class="cont-item"><div class="ci-thumb"><img src="' + co.cover + '" alt=""></div>' +
          '<div class="ci-mid"><b>' + esc(co.title) + '</b><small>' + esc(co.teacher) + ' · ' + esc(co.level) + '</small>' +
          '<div class="ci-prog-wrap"><div class="ci-prog"><i style="width:' + p + '%"></i></div><span class="ci-prog-num">' + fa(p) + '٪</span></div></div>' +
          '<a class="btn btn-primary btn-sm" href="course.html?c=' + co.id + '">' + (p ? 'ادامه' : 'شروع') + '</a></div>';
      }).join('') + '</div>';
    }
    html += '</div>';

    /* سفارش‌های اخیر */
    var recent = u.orders.slice(0, 3);
    html += '<div class="d-card"><div class="d-card-head"><h3>آخرین سفارش‌ها</h3><a class="link-more" href="#" data-goview="orders">همه فاکتورها' + I.arrow + '</a></div>';
    if (!recent.length) {
      html += '<p class="muted" style="font-size:14px;">هنوز سفارشی ثبت نکرده‌اید.</p>';
    } else {
      html += '<div class="tbl-wrap"><table class="d-tbl"><thead><tr><th>شماره فاکتور</th><th>تاریخ</th><th>اقلام</th><th>مبلغ</th><th>وضعیت</th></tr></thead><tbody>' +
        recent.map(function (o) {
          var stTxt = o.status === 'paid' ? 'پرداخت شده' : o.status === 'pending' ? 'در انتظار پرداخت' : 'لغو شده';
          return '<tr><td><span class="tbl-inv-no">' + o.no + '</span></td><td>' + esc(o.date) + '</td>' +
            '<td><div class="tbl-items">' + o.items.slice(0, 2).map(function (it) {
              return '<b>' + esc(it.title) + '</b>';
            }).join('') + '</div></td>' +
            '<td><b>' + fa(o.amount) + '</b> تومان</td>' +
            '<td><span class="pill ' + o.status + '">' + stTxt + '</span></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    html += '</div></div>';

    return html;
  }

  /* ----------------------------------------------------------------
     دوره‌های من
     ---------------------------------------------------------------- */
  function renderCourses() {
    var u = state.user;
    var q = state.coursesFilter.trim().toLowerCase();
    var html = '<div class="d-page-head"><div><h2>دوره‌های من</h2><p>پیشرفت و دسترسی دوره‌های خریداری‌شده را اینجا مدیریت کنید.</p></div>' +
      '<a class="btn btn-primary" href="courses.html">+ خرید دوره جدید</a></div>';
    if (!u.courses.length) {
      html += '<div class="d-card empty-state"><div class="es-ic">' + I.cap + '</div><h3>هنوز دوره‌ای نخریده‌اید</h3><p>دوره‌های تخصصی مدیکال بیزینس را ببینید و اولین قدم را بردارید.</p><a class="btn btn-primary" href="courses.html">مشاهده دوره‌ها</a></div>';
      return html;
    }
    var list = u.courses.filter(function (c) {
      if (!q) return true;
      var co = courseOf(c);
      return (co && (co.title + co.teacher + co.catLabel).toLowerCase().indexOf(q) !== -1);
    });
    html += '<div class="my-course-grid">' + list.map(function (c) {
      var co = courseOf(c);
      if (!co) return '';
      var p = Math.min(c.progress || 0, 100);
      var st, cls;
      if (c.done) { st = 'تکمیل شده'; cls = 'done'; }
      else if (p === 0) { st = 'به تازگی ثبت شد'; cls = 'new'; }
      else { st = 'در حال یادگیری'; cls = 'doing'; }
      return '<div class="mc-card"><div class="mc-cover"><img src="' + co.cover + '" alt="' + esc(co.title) + '"><span class="mc-state ' + cls + '">' + st + '</span></div>' +
        '<div class="mc-body"><h3>' + esc(co.title) + '</h3>' +
        '<span class="mc-teacher">' + I.user + esc(co.teacher) + ' · ' + esc(co.level) + '</span>' +
        '<div class="mc-progress"><div class="mp-top"><span>پیشرفت دوره</span><b>' + fa(p) + '٪</b></div><div class="mp"><i style="width:' + p + '%"></i></div></div>' +
        '<div class="mc-foot">' +
        (c.done
          ? '<button class="btn btn-primary btn-sm" data-cert="' + c.courseId + '">مشاهده گواهی</button>'
          : '<a class="btn btn-primary btn-sm" href="course.html?c=' + co.id + '">' + (p ? 'ادامه یادگیری' : 'شروع دوره') + '</a>') +
        '<a class="btn btn-ghost btn-sm" href="course.html?c=' + co.id + '">جزئیات</a>' +
        '</div></div></div>';
    }).join('') + '</div>';
    if (!list.length) {
      html += '<div class="d-card empty-state"><div class="es-ic">' + I.cap + '</div><h3>دوره‌ای مطابق جستجو پیدا نشد</h3><p>عبارت دیگری را امتحان کنید.</p></div>';
    }
    return html;
  }

  /* ----------------------------------------------------------------
     سفارش‌ها
     ---------------------------------------------------------------- */
  function renderOrders() {
    var u = state.user;
    var html = '<div class="d-page-head"><div><h2>سفارش‌ها و فاکتورها</h2><p>فاکتورها و وضعیت پرداخت سفارش‌های شما.</p></div></div>';
    if (!u.orders.length) {
      html += '<div class="d-card empty-state"><div class="es-ic">' + I.bag + '</div><h3>سفارشی ثبت نشده است</h3><p>هر دوره‌ای که بخرید، فاکتور آن اینجا قرار می‌گیرد.</p><a class="btn btn-primary" href="courses.html">رفتن به فروشگاه</a></div>';
      return html;
    }
    html += '<div class="tbl-wrap"><table class="d-tbl"><thead><tr><th>شماره فاکتور</th><th>تاریخ</th><th>اقلام</th><th>مبلغ (تومان)</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>';
    u.orders.forEach(function (o) {
      var stTxt = o.status === 'paid' ? 'پرداخت شده' : o.status === 'pending' ? 'در انتظار پرداخت' : 'لغو شده';
      html += '<tr><td><span class="tbl-inv-no">' + o.no + '</span></td><td>' + esc(o.date) + '</td>' +
        '<td><div class="tbl-items">' + o.items.map(function (it) {
          return '<span>' + esc(it.title) + ' <b>' + fa(it.price) + '</b> تومان</span>';
        }).join('') + '</div></td>' +
        '<td><b>' + fa(o.amount) + '</b></td>' +
        '<td><span class="pill ' + o.status + '">' + stTxt + '</span></td>' +
        '<td><div class="tbl-actions">' +
        '<button class="icon-btn" title="مشاهده فاکتور" data-inv="' + o.no + '">' + I.eye + '</button>' +
        (o.status === 'pending'
          ? '<button class="btn btn-soft btn-sm" data-pay="' + o.no + '">پرداخت (دمو)</button>'
          : '<button class="icon-btn" title="چاپ" data-print-inv="' + o.no + '">' + I.print + '</button>') +
        '</div></td></tr>';
    });
    html += '</tbody></table></div>' +
      '<p class="hint-line" style="margin-top:14px;">' + I.check + ' پرداخت‌ها در این نسخه‌ی دمو صرفاً شبیه‌سازی می‌شوند.</p>';
    return html;
  }

  /* فاکتور */
  function invoiceHTML(o) {
    var u = state.user;
    var itemsTxt = o.items.map(function (it) {
      return '<tr><td>' + esc(it.title) + '</td><td>۱</td><td>' + fa(it.price) + ' تومان</td></tr>';
    }).join('');
    var stTxt = o.status === 'paid' ? 'پرداخت شده' : 'در انتظار پرداخت';
    return '<div class="inv-head"><div class="inv-brand"><span class="logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>' +
      '<div><b>مدیکال بیزینس</b><span>مارکتینگ و فروش پزشکی · medicalbusiness.ir</span></div></div>' +
      '<div class="inv-title">فاکتور فروش<small>نسخه رسمی — قابل ارائه به واحد مالی</small></div></div>' +
      '<div class="inv-cols"><div class="ic"><label>شماره فاکتور</label><code>' + o.no + '</code></div>' +
      '<div class="ic"><label>تاریخ صدور</label><b>' + esc(o.date) + '</b></div>' +
      '<div class="ic"><label>خریدار</label><b>' + esc(u.name) + '</b></div>' +
      '<div class="ic"><label>شماره تماس / ایمیل</label><b>' + esc(u.mobile || '—') + ' · ' + esc(u.email || '—') + '</b></div></div>' +
      '<table class="inv-tbl"><thead><tr><th>شرح</th><th>تعداد</th><th>مبلغ</th></tr></thead><tbody>' + itemsTxt + '</tbody></table>' +
      '<div class="inv-total"><div class="row"><span>جمع کل</span><b>' + fa(o.items.reduce(function (s, it) { return s + it.price; }, 0)) + ' تومان</b></div>' +
      '<div class="row"><span>تخفیف</span><span>۰</span></div>' +
      '<div class="row"><span>مالیات</span><span>معاف (خدمات آموزشی)</span></div>' +
      '<div class="grand"><span>مبلغ نهایی</span><span>' + fa(o.amount) + ' تومان</span></div></div>' +
      '<div class="inv-foot"><span>' + I.check + ' <b class="inv-stamp" style="display:inline-flex;">' + stTxt + '</b></span>' +
      '<button class="btn btn-primary btn-sm" data-print-inv="' + o.no + '">' + I.print + ' چاپ فاکتور</button></div>';
  }

  /* ----------------------------------------------------------------
     علاقه‌مندی‌ها
     ---------------------------------------------------------------- */
  function renderFavs() {
    var u = state.user;
    var html = '<div class="d-page-head"><div><h2>علاقه‌مندی‌ها</h2><p>دوره‌هایی که نشان کرده‌اید تا بعداً ببینید.</p></div></div>';
    var favs = (u.favs || []).map(function (id) { return MB.getCourse(id); }).filter(Boolean);
    if (!favs.length) {
      html += '<div class="d-card empty-state"><div class="es-ic">' + I.heart + '</div><h3>لیست علاقه‌مندی خالی است</h3><p>روی آیکن قلب کنار هر دوره بزنید تا اینجا ذخیره شود.</p><a class="btn btn-primary" href="courses.html">مشاهده دوره‌ها</a></div>';
      return html;
    }
    html += '<div class="fav-grid">' + favs.map(function (co) {
      var owned = u.courses.some(function (c) { return c.courseId === co.id; });
      return '<div class="fav-card"><div class="fc-thumb"><img src="' + co.cover + '" alt=""></div>' +
        '<div class="fc-mid"><h3>' + esc(co.title) + '</h3><p>' + esc(co.teacher) + ' · ' + esc(co.level) + '</p>' +
        '<div class="fc-price">' + fa(co.price) + ' <small style="font-size:11px;color:var(--muted);">تومان</small></div></div>' +
        '<div class="fc-actions">' +
        (owned
          ? '<span class="pill done">در دوره‌های من</span>'
          : '<a class="btn btn-primary btn-sm" href="course.html?c=' + co.id + '">مشاهده و خرید</a>') +
        '<button class="btn btn-ghost btn-sm" data-rmfav="' + co.id + '">حذف</button>' +
        '</div></div>';
    }).join('') + '</div>';
    return html;
  }

  /* ----------------------------------------------------------------
     تیکت‌ها
     ---------------------------------------------------------------- */
  function renderTickets() {
    var u = state.user;
    var html = '<div class="d-page-head"><div><h2>تیکت‌های پشتیبانی</h2><p>پیگیری سوالات و درخواست‌های شما از تیم پشتیبانی.</p></div>' +
      '<button class="btn btn-primary" id="tkOpen">+ تیکت جدید</button></div>';
    if (!u.tickets.length) {
      html += '<div class="d-card empty-state"><div class="es-ic">' + I.chat + '</div><h3>تیکتی ثبت نکرده‌اید</h3><p>سوالی درباره دوره، فاکتور یا دسترسی دارید؟ برای ما بنویسید.</p></div>';
      return html;
    }
    html += '<div class="tk-layout"><div class="tk-list">' + u.tickets.map(function (t) {
      var stTxt = t.status === 'open' ? 'باز' : 'بسته شده';
      var last = t.msgs[t.msgs.length - 1];
      return '<button class="tk-item' + (state.ticket === t.id ? ' sel' : '') + '" data-tk="' + t.id + '">' +
        '<span class="tk-ic">' + I.chat + '</span>' +
        '<span class="tk-mid"><b>' + esc(t.subject) + '</b><small>' + esc(t.dept) + ' · آخرین پاسخ ' + esc(t.updated) + '</small></span>' +
        '<span class="tk-side"><span class="pill ' + t.status + '">' + stTxt + '</span>' +
        (last && last.from === 'admin' ? '<small style="color:var(--muted);font-size:11px;">پاسخ پشتیبانی دارد</small>' : '') +
        '</span></button>';
    }).join('') + '</div><div class="tk-thread" id="tkThread"></div></div>';
    return html;
  }

  function renderThread() {
    var wrap = $('#tkThread');
    if (!wrap) return;
    var u = state.user;
    var t = null;
    u.tickets.forEach(function (x) { if (x.id === state.ticket) t = x; });
    if (!t) {
      wrap.innerHTML = '<div class="tk-empty" style="margin:auto;"><div class="tk-empty-ic">' + I.chat + '</div><h3 style="font-size:16px;">تیکتی انتخاب نشده</h3><p>برای دیدن گفتگو و پاسخ‌ها، یک تیکت از فهرست انتخاب کنید.</p></div>';
      return;
    }
    var msgs = t.msgs.map(function (m) {
      return '<div class="msg ' + (m.from === 'user' ? 'me' : 'them') + '">' +
        '<span class="who">' + (m.from === 'user' ? 'شما' : 'پشتیبانی مدیکال بیزینس') + '</span>' + esc(m.text) + '</div>';
    }).join('');
    wrap.innerHTML = '<div class="tk-thread-head"><h3>' + esc(t.subject) + '</h3>' +
      '<div class="meta">' + esc(t.dept) + ' · ' + esc(t.id) + ' · ایجاد ' + esc(t.created) + '</div></div>' +
      '<div class="tk-msgs" id="tkMsgs">' + msgs + '</div>' +
      '<div class="tk-reply"><input type="text" id="tkReplyInput" placeholder="پاسخ خود را بنویسید..."' + (t.status !== 'open' ? ' disabled' : '') + '>' +
      '<button class="btn btn-primary btn-sm" id="tkReplySend"' + (t.status !== 'open' ? ' disabled' : '') + '>ارسال</button></div>';
    var box = $('#tkMsgs');
    if (box) box.scrollTop = box.scrollHeight;
    var input = $('#tkReplyInput');
    var send = $('#tkReplySend');
    function reply() {
      var txt = input.value.trim();
      if (!txt) return;
      t.msgs.push({ from: 'user', text: txt });
      t.updated = todayFa();
      saveUser();
      renderThread();
      // پاسخ شبیه‌سازی‌شده پشتیبانی
      setTimeout(function () {
        var t2 = null;
        state.user.tickets.forEach(function (x) { if (x.id === t.id) t2 = x; });
        if (!t2) return;
        t2.msgs.push({ from: 'admin', text: 'سلام، پیام شما ثبت شد. کارشناس مربوطه به‌زودی پاسخ کامل را در همین تیکت ارسال می‌کند. 🙏' });
        t2.updated = todayFa();
        saveUser();
        renderThread();
        MBAuth.toast('پاسخ جدید از پشتیبانی دریافت شد.', 'info');
      }, 1100);
    }
    send.addEventListener('click', reply);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') reply(); });
  }

  /* ----------------------------------------------------------------
     پروفایل
     ---------------------------------------------------------------- */
  function renderProfile() {
    var u = state.user;
    var html = '<div class="d-page-head"><div><h2>تنظیمات پروفایل</h2><p>اطلاعات حساب و مشخصات تماس خود را مدیریت کنید.</p></div></div>';
    html += '<div class="prof-grid">';
    html += '<div class="d-card prof-id"><div class="avatar-xl">' + initials(u.name) + '</div>' +
      '<h3>' + esc(u.name) + '</h3><span class="role-chip">کاربر خریدار</span>' +
      '<ul class="meta">' +
      '<li>' + I.user + '<span>نام کاربری: <b style="direction:ltr;display:inline-block;">' + esc(u.username) + '</b></span></li>' +
      '<li>' + I.clock + '<span>عضویت: ' + esc(u.createdAt || '—') + '</span></li>' +
      '<li>' + I.cap + '<span>' + fa(u.courses.length) + ' دوره ثبت‌شده</span></li>' +
      (u.tickets.length ? '<li>' + I.chat + '<span>' + fa(u.tickets.length) + ' تیکت پشتیبانی</span></li>' : '') +
      '</ul></div>';

    html += '<div>';
    html += '<div class="d-card prof-sec"><div class="d-card-head"><h3>اطلاعات شخصی</h3></div>' +
      '<form id="profForm" class="prof-grid-2">' +
      '<div class="field"><label for="pName">نام و نام خانوادگی</label><input id="pName" value="' + esc(u.name) + '"></div>' +
      '<div class="field"><label for="pJob">عنوان شغلی</label><input id="pJob" value="' + esc(u.job || '') + '" placeholder="مثلاً پزشک عمومی"></div>' +
      '<div class="field"><label for="pMobile">موبایل</label><input id="pMobile" value="' + esc(u.mobile || '') + '" placeholder="۰۹۱۲xxxxxxx"></div>' +
      '<div class="field"><label for="pMail">ایمیل</label><input id="pMail" value="' + esc(u.email || '') + '" placeholder="you@mail.com"></div>' +
      '<div class="field"><label for="pCity">شهر</label><input id="pCity" value="' + esc(u.city || '') + '" placeholder="مثلاً تهران"></div>' +
      '<div class="field"><label for="pUsername">نام کاربری (غیرقابل تغییر)</label><input id="pUsername" value="' + esc(u.username) + '" disabled></div>' +
      '<div class="field" style="grid-column:1/-1;"><label for="pBio">درباره من</label><textarea id="pBio" style="min-height:90px;" placeholder="چند خط درباره خودتان...">' + esc(u.bio || '') + '</textarea></div>' +
      '<div class="d-form-actions" style="grid-column:1/-1;"><button class="btn btn-primary" type="submit">ذخیره تغییرات</button></div>' +
      '</form></div>';

    html += '<div class="d-card prof-sec"><div class="d-card-head"><h3>تغییر رمز عبور</h3></div>' +
      '<form id="passForm" class="prof-grid-2">' +
      '<div class="field"><label for="pOld">رمز فعلی</label><input id="pOld" type="password" placeholder="••••••"></div>' +
      '<div class="field"><label for="pNew">رمز جدید</label><input id="pNew" type="password" placeholder="حداقل ۴ کاراکتر"></div>' +
      '<div class="field"><label for="pNew2">تکرار رمز جدید</label><input id="pNew2" type="password" placeholder="تکرار رمز"></div>' +
      '<div class="d-form-actions" style="align-self:end;"><button class="btn btn-secondary" type="submit">تغییر رمز</button></div>' +
      '</form><p class="hint-line">' + I.check + ' در نسخه دمو، رمز به صورت ساده در مرورگر ذخیره می‌شود.</p></div>';
    html += '</div></div>';
    return html;
  }

  /* ----------------------------------------------------------------
     گواهی
     ---------------------------------------------------------------- */
  function certModal(courseId) {
    var u = state.user;
    var enr = null;
    u.courses.forEach(function (c) { if (c.courseId === courseId) enr = c; });
    var co = MB.getCourse(courseId);
    if (!enr || !enr.done || !co) { MBAuth.toast('این دوره هنوز تکمیل نشده است.', 'info'); return; }
    var code = 'MB-' + u.username.toUpperCase() + '-' + String(enr.courseId.toUpperCase()).replace('-', '');
    openModal('certModal', '<div class="d-modal-head"><h3>گواهی پایان دوره</h3>' +
      '<button class="modal-close" data-close="certModal" aria-label="بستن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="cert-sheet" id="printArea"><div class="cert-orn"></div>' +
      '<div class="cert-body">' +
      '<span class="cert-logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>' +
      '<p class="cert-pre">آکادمی مدیکال بیزینس</p>' +
      '<h2 class="cert-title">گواهی پایان دوره</h2>' +
      '<p class="cert-mid">این گواهی به‌پاس تکمیل موفقیت‌آمیز دوره به نام زیر اعطا می‌شود:</p>' +
      '<div class="cert-name">' + esc(u.name) + '</div>' +
      '<div class="cert-course">«' + esc(co.title) + '»</div>' +
      '<div class="cert-meta"><span>تاریخ: ' + esc(enr.finishedAt || enr.enrolledAt) + '</span><span>مدت: ' + fa(co.minutes) + ' دقیقه</span></div>' +
      '<div class="cert-foot"><span class="cert-code">کد رهگیری: ' + code + '</span>' +
      '<span class="cert-sign">مدیر آکادمی مدیکال بیزینس<br><i>مریم نادری</i></span></div>' +
      '</div></div>' +
      '<div class="d-form-actions" style="justify-content:center;margin-top:16px;">' +
      '<button class="btn btn-primary" id="certPrint">' + I.print + ' چاپ گواهی</button></div>');
  }

  /* ----------------------------------------------------------------
     مودال‌ها
     ---------------------------------------------------------------- */
  function openModal(id, innerHTML) {
    var m = document.createElement('div');
    m.className = 'd-modal open';
    m.id = id;
    m.innerHTML = '<div class="d-modal-box">' + innerHTML + '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) {
      if (e.target === m) closeModal(id);
    });
    $$('[data-close]', m).forEach(function (b) {
      b.addEventListener('click', function () { closeModal(id); });
    });
    var pr = $('#certPrint', m);
    if (pr) pr.addEventListener('click', function () { printArea(m); });
    $$('[data-print-inv]', m).forEach(function (b) {
      b.addEventListener('click', function () { printArea(m); });
    });
    return m;
  }
  function closeModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('open');
    setTimeout(function () { m.remove(); }, 260);
  }
  function printArea(m) {
    document.body.classList.add('printing');
    var box = $('.d-modal-box', m);
    if (box) box.classList.add('print-area');
    setTimeout(function () { window.print(); }, 80);
    window.onafterprint = function () {
      document.body.classList.remove('printing');
      var box2 = $('.d-modal-box', m);
      if (box2) box2.classList.remove('print-area');
    };
  }

  /* ----------------------------------------------------------------
     رندر نما
     ---------------------------------------------------------------- */
  var renderers = {
    overview: renderOverview,
    courses: renderCourses,
    orders: renderOrders,
    favs: renderFavs,
    tickets: renderTickets,
    profile: renderProfile
  };

  function setView(name, keepHistory) {
    if (!renderers[name]) name = 'overview';
    state.view = name;
    $$('.d-item').forEach(function (it) {
      it.classList.toggle('active', it.getAttribute('data-view') === name);
    });
    $$('.view').forEach(function (v) { v.classList.remove('active'); });
    var box = $('#view-' + name);
    if (!box) return;
    box.innerHTML = renderers[name]();
    box.classList.add('active');
    if (!keepHistory) {
      try { history.replaceState(null, '', location.pathname + '?tab=' + name); } catch (e) { /* noop */ }
    }
    bindView(name);
    // اسکرول به بالا
    var c = $('#dContent');
    if (c && window.scrollY > 60) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindView(name) {
    if (name === 'overview') {
      var bars = $$('#chartBars .bar');
      bars.forEach(function (b, i) {
        setTimeout(function () { b.style.height = b.getAttribute('data-h') + '%'; }, 120 + i * 90);
      });
    }
    if (name === 'tickets') {
      var openBtn = $('#tkOpen');
      if (openBtn) openBtn.addEventListener('click', function () {
        var m = openModal('tkModal', '<div class="d-modal-head"><h3>تیکت جدید پشتیبانی</h3>' +
          '<button class="modal-close" data-close="tkModal" aria-label="بستن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
          '<form id="tkFormX">' +
          '<div class="field"><label for="tkSubjectX">موضوع</label><input id="tkSubjectX" required placeholder="مثلاً: مشکل در دسترسی به جلسه‌ها"></div>' +
          '<div class="field"><label for="tkDeptX">دپارتمان</label><select id="tkDeptX">' +
          '<option>آموزش و محتوای دوره‌ها</option><option>مالی و فاکتور</option><option>مشکل فنی در پنل</option><option>سایر موارد</option></select></div>' +
          '<div class="field"><label for="tkTextX">توضیح</label><textarea id="tkTextX" required style="min-height:110px;" placeholder="مشکل را دقیق توضیح دهید..."></textarea></div>' +
          '<div class="d-form-actions"><button type="button" class="btn btn-ghost" data-close="tkModal">انصراف</button>' +
          '<button type="submit" class="btn btn-primary">ارسال تیکت</button></div></form>');
        var form = $('#tkFormX', m);
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var subj = $('#tkSubjectX', m).value.trim();
          var dept = $('#tkDeptX', m).value;
          var txt = $('#tkTextX', m).value.trim();
          if (!subj || !txt) return;
          state.user.tickets.unshift({
            id: 'TCK-' + Math.floor(1000 + Math.random() * 9000),
            subject: subj, dept: dept, status: 'open',
            created: todayFa(), updated: todayFa(),
            msgs: [{ from: 'user', text: txt }]
          });
          saveUser();
          state.ticket = state.user.tickets[0].id;
          closeModal('tkModal');
          setView('tickets');
          MBAuth.toast('تیکت شما ثبت شد و در صف پاسخ‌گویی قرار گرفت.', 'ok');
        });
      });
      $$('.tk-item').forEach(function (it) {
        it.addEventListener('click', function () {
          state.ticket = it.getAttribute('data-tk');
          $$('.tk-item').forEach(function (x) { x.classList.remove('sel'); });
          it.classList.add('sel');
          renderThread();
        });
      });
      if (state.ticket) renderThread();
      else { var first = $('.tk-item'); if (first) first.click(); }
    }
    if (name === 'orders') {
      $$('[data-inv]').forEach(function (b) {
        b.addEventListener('click', function () {
          var o = findOrder(b.getAttribute('data-inv'));
          if (!o) return;
          openModal('invModal', invoiceHTML(o));
        });
      });
      $$('[data-pay]').forEach(function (b) {
        b.addEventListener('click', function () {
          var o = findOrder(b.getAttribute('data-pay'));
          if (!o) return;
          o.status = 'paid';
          saveUser();
          MBAuth.toast('پرداخت (دمو) با موفقیت انجام شد. فاکتور به‌روزرسانی شد.', 'ok');
          setView('orders');
        });
      });
      $$('[data-print-inv]').forEach(function (b) {
        b.addEventListener('click', function () {
          var o = findOrder(b.getAttribute('data-print-inv'));
          if (!o) return;
          openModal('invModal', invoiceHTML(o));
        });
      });
    }
    if (name === 'courses') {
      $$('[data-cert]').forEach(function (b) {
        b.addEventListener('click', function () { certModal(b.getAttribute('data-cert')); });
      });
    }
    if (name === 'favs') {
      $$('[data-rmfav]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-rmfav');
          state.user.favs = state.user.favs.filter(function (f) { return f !== id; });
          saveUser();
          MBAuth.toast('از علاقه‌مندی‌ها حذف شد.', 'info');
          setView('favs');
        });
      });
    }
    if (name === 'profile') bindProfile();
  }

  function findOrder(no) {
    var u = state.user;
    for (var i = 0; i < u.orders.length; i++) if (u.orders[i].no === no) return u.orders[i];
    return null;
  }

  function bindProfile() {
    var prof = $('#profForm');
    if (prof) {
      prof.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = $('#pName').value.trim();
        var mobile = $('#pMobile').value.trim();
        var mail = $('#pMail').value.trim();
        if (name.length < 3) { MBAuth.toast('نام را کامل وارد کنید.', 'err'); return; }
        if (mobile && !/^09\d{9}$/.test(mobile)) { MBAuth.toast('شماره موبایل معتبر نیست (۰۹...).', 'err'); return; }
        if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { MBAuth.toast('ایمیل معتبر نیست.', 'err'); return; }
        var u = state.user;
        u.name = name;
        u.job = $('#pJob').value.trim();
        u.mobile = mobile;
        u.email = mail;
        u.city = $('#pCity').value.trim();
        u.bio = $('#pBio').value.trim();
        saveUser();
        renderShell();
        MBAuth.toast('پروفایل شما با موفقیت به‌روزرسانی شد ✓', 'ok');
      });
    }
    var pf = $('#passForm');
    if (pf) {
      pf.addEventListener('submit', function (e) {
        e.preventDefault();
        var oldp = $('#pOld').value;
        var n1 = $('#pNew').value;
        var n2 = $('#pNew2').value;
        if (oldp !== state.user.password) { MBAuth.toast('رمز فعلی اشتباه است.', 'err'); return; }
        if (n1.length < 4) { MBAuth.toast('رمز جدید باید حداقل ۴ کاراکتر باشد.', 'err'); return; }
        if (n1 !== n2) { MBAuth.toast('تکرار رمز یکسان نیست.', 'err'); return; }
        state.user.password = n1;
        saveUser();
        pf.reset();
        MBAuth.toast('رمز عبور با موفقیت تغییر کرد ✓', 'ok');
      });
    }
  }

  /* ----------------------------------------------------------------
     رویدادهای سراسری
     ---------------------------------------------------------------- */
  function bindGlobal() {
    $$('.d-item[data-view]').forEach(function (it) {
      it.addEventListener('click', function (e) {
        e.preventDefault();
        setView(it.getAttribute('data-view'));
        closeSide();
      });
    });
    // دکمه‌های داخل نمای پویا با Event Delegation مدیریت می‌شوند
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('[data-goview]') : null;
      if (a) {
        e.preventDefault();
        setView(a.getAttribute('data-goview'));
      }
    });

    /* سایدبار موبایل */
    var burger = $('#dBurger');
    if (burger) burger.addEventListener('click', function () {
      $('#dSidebar').classList.add('open');
      $('#dSideback').classList.add('on');
    });
    var back = $('#dSideback');
    if (back) back.addEventListener('click', closeSide);
    function closeSide() {
      $('#dSidebar').classList.remove('open');
      $('#dSideback').classList.remove('on');
    }

    /* جستجو */
    var search = $('#dSearch');
    if (search) {
      search.addEventListener('input', function () {
        state.coursesFilter = search.value;
        if (state.view !== 'courses') setView('courses');
        else setView('courses', true);
      });
    }

    /* بل اعلان */
    var bell = $('#dBell');
    var bellPop = $('#bellPop');
    if (bell) bell.addEventListener('click', function (e) {
      e.stopPropagation();
      bellPop.hidden = !bellPop.hidden;
      if (!bellPop.hidden) {
        var any = state.user.notifications.some(function (n) { return n.unread; });
        if (any) {
          state.user.notifications.forEach(function (n) { n.unread = false; });
          saveUser();
          renderBell();
          $('#bellDot').classList.remove('on');
        }
      }
    });
    document.addEventListener('click', function (e) {
      if (bellPop && !bellPop.hidden && !e.target.closest('#dBellWrap')) bellPop.hidden = true;
      if (avatarPop && !avatarPop.hidden && !e.target.closest('#dAvatarWrap')) avatarPop.hidden = true;
    });

    /* منوی آواتار */
    var avatarBtn = $('#dAvatarBtn');
    var avatarPop = $('#avatarPop');
    if (avatarBtn) avatarBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      avatarPop.hidden = !avatarPop.hidden;
    });

    /* خروج */
    $$('#dLogoutTop, #dLogoutSide').forEach(function (b) {
      if (!b) return;
      b.addEventListener('click', function () {
        MBAuth.logout();
        location.href = 'index.html';
      });
    });
    var lgTop = $('#dLogoutTop');
    if (lgTop) lgTop.addEventListener('click', function () {
      MBAuth.logout();
      location.href = 'index.html';
    });

    /* فیلتر تیکت و انتخاب اول */
    var kb = function (e) {
      if (e.key === 'Escape') {
        $$('.d-modal').forEach(function (m) { closeModal(m.id); });
        if (bellPop) bellPop.hidden = true;
        if (avatarPop) avatarPop.hidden = true;
      }
    };
    document.addEventListener('keydown', kb);
  }

  /* ----------------------------------------------------------------
     شروع
     ---------------------------------------------------------------- */
  function boot() {
    if (!window.MBAuth) { location.href = 'index.html'; return; }
    var u = MBAuth.getUser();
    if (!u) { location.href = 'index.html?auth=login'; return; }
    state.user = u;
    var params = new URLSearchParams(location.search);
    var tab = params.get('tab') || 'overview';
    renderShell();
    bindGlobal();
    setView(tab);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
