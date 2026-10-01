/* =========================================================================
   tools/check_console.mjs — اجرای اسکریپت‌های صفحات و شکار خطای کنسول
   ابزار: jsdom (بدون مرورگر؛ در این محیط CDN مرورگرها در دسترس نیست)
   اجرا:  node tools/check_console.mjs
   ========================================================================= */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://localhost:8000/';
const PAGES = ['post.html', ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => `post-${String(n).padStart(2, '0')}.html`),
               'blog.html', 'index.html'];
const SCRIPTS = ['assets/js/data.js', 'assets/js/main.js', 'assets/js/post.js'];

const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
let totalErrors = 0;

function polyfill(window) {
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this); }
    unobserve() {} disconnect() {} takeRecords() { return []; }
  };
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.scrollTo = () => {};
  window.Element.prototype.scrollTo = function () {};
  window.Element.prototype.scrollIntoView = function () {};
  window.HTMLElement.prototype.scrollTo = function () {};
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: async () => {} }, configurable: true,
  });
  window.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}

async function runPage(page) {
  const html = readFileSync(join(ROOT, page), 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  vc.on('warn', (...a) => errors.push('console.warn: ' + a.join(' ')));

  const dom = new JSDOM(html, {
    url: BASE + page,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const { window } = dom;
  polyfill(window);

  for (const rel of SCRIPTS) {
    const file = join(ROOT, rel);
    if (!existsSync(file)) continue;
    try {
      window.eval(readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(`${rel}: ${e.message}`);
    }
  }
  window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 120));

  // ---------- تعامل‌ها ----------
  const $ = (s) => window.document.querySelector(s);
  const checks = [];
  if (page.startsWith('post')) {
    const copy = $('#copyLinkBtn');
    if (copy) { copy.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }
    const form = $('#commentForm');
    if (form) {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));   // خالی
      const ta = form.querySelector('textarea[name="message"], textarea');
      const nm = form.querySelector('input[name="name"], input');
      if (nm) nm.value = 'تست';
      if (ta) ta.value = 'دیدگاه تستی برای بررسی صحت فرم.';
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));   // پر
      checks.push('فرم دیدگاه');
    }
    const top = $('#toTop');
    if (top) { top.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }
    window.dispatchEvent(new window.Event('scroll'));
    await new Promise((r) => setTimeout(r, 80));
    const prog = $('#readingProgress span');
    const tocActive = window.document.querySelectorAll('#tocBox a.active').length;
    checks.push(`لینک‌های فعال TOC=${fa(tocActive)}`, `transform پیشرفت=${prog ? prog.style.transform || 'scaleX(0)' : '—'}`);
  } else {
    window.dispatchEvent(new window.Event('scroll'));
  }

  await new Promise((r) => setTimeout(r, 120));
  const toasts = window.document.querySelectorAll('.toast').length;
  checks.push(`toast=${fa(toasts)}`);

  const state = errors.length ? `\x1b[31m❌ ${fa(errors.length)} خطا\x1b[0m` : '\x1b[32m✅ بدون خطا\x1b[0m';
  console.log(`${page.padEnd(16)} ${state}  ${checks.join(' · ')}`);
  errors.forEach((e) => console.log('    \x1b[31m•\x1b[0m ' + e.split('\n').slice(0, 3).join(' | ')));
  totalErrors += errors.length;
  window.close();
}

console.log('بررسی اجرای JS در ۹ صفحه‌ی مقاله + blog.html + index.html\n');
for (const p of PAGES) await runPage(p);
console.log('\n' + (totalErrors
  ? `\x1b[31m✖ مجموعاً ${fa(totalErrors)} خطای کنسول\x1b[0m`
  : '\x1b[32m✔ هیچ خطای کنسول در هیچ صفحه‌ای گزارش نشد\x1b[0m'));
process.exit(totalErrors ? 1 : 0);
