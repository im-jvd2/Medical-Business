#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
tools/check_posts.py — چک استاتیک ۹ صفحه‌ی مقاله + بدنه‌های وردپرس (docs/10 §۷)

بررسی‌ها:
 ۱) دقیقاً یک <h1>          ۲) alt روی همه‌ی تصاویر        ۳) سلامت لینک و لنگر
 ۴) سه اسکیمای JSON-LD معتبر (Article / BreadcrumbList / FAQPage غیرخالی)
 ۵) نبود markdown خام       ۶) ۶ تا ۸ لینک داخلی بین‌مقاله‌ای
 ۷) نبود پرش در ترتیب تیترها  ۸) متاتگ‌های SEO/OG/Twitter
 ۹) برابری فهرست مطالب با H2   ۱۰) بدنه‌ی وردپرس با لینک /blog/{slug}

استفاده:  python3 tools/check_posts.py [--base-url URL]
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from urllib.parse import unquote, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_BASE_URL = "https://im-jvd2.github.io/Medical-Business"
PAGES = ["post.html"] + [f"post-{n:02d}.html" for n in range(2, 10)]

GREEN, RED, YELLOW, DIM, OFF = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def fa_num(n: int) -> str:
    return "".join("۰۱۲۳۴۵۶۷۸۹"[int(d)] for d in str(n))


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warns: list[str] = []
        self.rows: list[tuple] = []

    def err(self, page: str, msg: str) -> None:
        self.errors.append(f"{page}: {msg}")

    def warn(self, page: str, msg: str) -> None:
        self.warns.append(f"{page}: {msg}")

# ------------------------------------------------------------- ابزار کمکی
def read(path: str) -> str:
    with open(os.path.join(ROOT, path), encoding="utf-8") as fh:
        return fh.read()


def tags(src: str, name: str) -> list[str]:
    return re.findall(rf"<{name}\b[^>]*>", src, re.I)


def attr(tag: str, name: str) -> str | None:
    m = re.search(rf'{name}\s*=\s*"([^"]*)"', tag, re.I)
    return html.unescape(m.group(1)) if m else None


def strip_tags(src: str) -> str:
    src = re.sub(r"<script\b.*?</script>", " ", src, flags=re.S | re.I)
    src = re.sub(r"<style\b.*?</style>", " ", src, flags=re.S | re.I)
    return re.sub(r"<[^>]+>", " ", src)


def jsonld_blocks(src: str) -> list[object]:
    out = []
    for m in re.finditer(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', src, re.S | re.I
    ):
        try:
            out.append(json.loads(m.group(1).strip()))
        except json.JSONDecodeError as exc:
            out.append({"__invalid__": str(exc)})
    return out


def types_of(blocks: list[object]) -> set[str]:
    found: set[str] = set()
    for b in blocks:
        if isinstance(b, dict):
            if b.get("@graph"):
                for item in b["@graph"]:
                    if isinstance(item, dict) and item.get("@type"):
                        found.add(str(item["@type"]))
            elif b.get("@type"):
                found.add(str(b["@type"]))
    return found


def graph_items(blocks: list[object]) -> list[dict]:
    items = []
    for b in blocks:
        if not isinstance(b, dict):
            continue
        if b.get("@graph"):
            items += [i for i in b["@graph"] if isinstance(i, dict)]
        else:
            items.append(b)
    return items


# ------------------------------------------------------------- بررسی یک صفحه
def check_page(num: int, page: str, base: str, rep: Report) -> dict:
    src = read(page)
    stats: dict = {}

    # ۱) یک H1
    h1 = re.findall(r"<h1\b[^>]*>(.*?)</h1>", src, re.S | re.I)
    if len(h1) != 1:
        rep.err(page, f"تعداد H1 = {fa_num(len(h1))} (باید دقیقاً ۱ باشد)")
    stats["h1"] = len(h1)

    # ۲) alt تصاویر
    imgs = tags(src, "img")
    noalt = [i for i in imgs if not (attr(i, "alt") or "").strip()]
    if noalt:
        rep.err(page, f"{fa_num(len(noalt))} تصویر بدون alt")
    stats["img"] = len(imgs)

    # ۳) سلامت لینک و لنگر
    ids = set(re.findall(r'\bid="([^"]+)"', src))
    internal = 0
    missing_file: list[str] = []
    missing_anchor: list[str] = []
    for href in re.findall(r'\bhref="([^"]+)"', src):
        if href.startswith(("mailto:", "tel:", "javascript:")):
            continue
        if href == "#":
            rep.err(page, 'لینک خالی href="#"')
            continue
        parsed = urlparse(href)
        if parsed.scheme in ("http", "https"):
            continue
        internal += 1
        path, frag = parsed.path, parsed.fragment
        if not path:                      # لنگر داخل همین صفحه
            if frag and frag not in ids:
                missing_anchor.append("#" + frag)
            continue
        target = unquote(path.lstrip("./"))
        if target.startswith("blog/"):
            continue                      # لینک‌های وردپرسی در بدنه
        if not os.path.exists(os.path.join(ROOT, target)):
            missing_file.append(path)
            continue
        if frag:                          # لنگر در فایل دیگر
            try:
                other = read(target)
            except (OSError, UnicodeDecodeError):
                continue
            if f'id="{frag}"' not in other:
                missing_anchor.append(f"{path}#{frag}")
    if missing_file:
        rep.err(page, f"فایل مقصد یافت نشد: {', '.join(sorted(set(missing_file)))}")
    if missing_anchor:
        rep.err(page, f"لنگر یافت نشد: {', '.join(sorted(set(missing_anchor)))}")
    stats["internal"] = internal

    # ۴) اسکیمای JSON-LD
    blocks = jsonld_blocks(src)
    invalid = [b for b in blocks if isinstance(b, dict) and b.get("__invalid__")]
    if invalid:
        rep.err(page, f"JSON-LD نامعتبر: {invalid[0]['__invalid__']}")
    kinds = types_of(blocks)
    for need in ("Article", "BreadcrumbList", "FAQPage"):
        if need not in kinds:
            rep.err(page, f"اسکیمای {need} وجود ندارد")
    items = graph_items(blocks)
    faq = next((i for i in items if i.get("@type") == "FAQPage"), None)
    faq_n = 0
    if faq:
        ents = faq.get("mainEntity") or []
        faq_n = len(ents)
        if faq_n < 3:
            rep.err(page, f"FAQPage تنها {fa_num(faq_n)} پرسش دارد (کمینه ۳)")
        for e in ents:
            ans = (e.get("acceptedAnswer") or {}).get("text", "")
            if not str(ans).strip():
                rep.err(page, f"پاسخ خالی برای پرسش «{e.get('name', '')[:30]}»")
    art = next((i for i in items if i.get("@type") in ("Article", "BlogPosting")), None)
    if art:
        author = art.get("author") or {}
        if (author.get("name") or "").strip() == "":
            rep.err(page, "اسکیمای Article نویسنده ندارد")
        if not (art.get("publisher") or {}).get("name"):
            rep.err(page, "اسکیمای Article ناشر ندارد")
        for f in ("headline", "description", "datePublished", "image"):
            if not art.get(f):
                rep.err(page, f"اسکیمای Article فیلد {f} ندارد")
    bc = next((i for i in items if i.get("@type") == "BreadcrumbList"), None)
    if bc and len(bc.get("itemListElement") or []) != 3:
        rep.err(page, "BreadcrumbList باید ۳ سطح داشته باشد (خانه/وبلاگ/مقاله)")
    stats["faq"] = faq_n

    # برش بدنه‌ی مقاله (از #postBody تا پایان همان <article>)
    start = src.find('id="postBody"')
    if start < 0:
        rep.err(page, "عنصر #postBody در قالب نیست")
        return stats
    end = src.find("</article>", start)
    body = src[start:end if end > 0 else len(src)]

    # ۵) markdown خام (محتوای <pre> مستثنی است)
    text = strip_tags(re.sub(r"<pre\b.*?</pre>", " ", body, flags=re.S | re.I))
    raw: list[str] = []
    if re.search(r"\*\*[^*\n]{1,80}\*\*", text):
        raw.append("**بولد**")
    if re.search(r"\[[^\]\n]{1,80}\]\([^)\n]{1,120}\)", text):
        raw.append("[لینک]()")
    if re.search(r"(?<!`)\*\*|^#{2,4}\s|^[-*]\s", text, re.M):
        raw.append("تیتر/لیست خام")
    if "`" in text:
        raw.append("بک‌تیک")
    if raw:
        rep.err(page, f"markdown خام در بدنه: {', '.join(raw)}")

    # ۶) لینک داخلی بین‌مقاله‌ای (۶ تا ۸)
    body_no_cta = re.sub(
        r'<aside class="post-inline-cta.*?</aside>', " ", body, flags=re.S | re.I
    )
    hrefs = []
    for h in re.findall(r'\bhref="([^"]+)"', body_no_cta):
        if h.startswith(("http", "mailto:", "tel:", "javascript:", "#")):
            continue
        hrefs.append(h.split("#")[0])
    uniq = sorted(set(hrefs))
    if not 6 <= len(uniq) <= 8:
        rep.err(page, f"لینک داخلی بدنه = {fa_num(len(uniq))} (باید ۶ تا ۸ باشد)")
    cross = sorted({h for h in uniq if h.startswith("post") and h != page})
    if len(cross) < 3:
        rep.warn(page, f"تنها {fa_num(len(cross))} لینک به سایر مقالات")
    stats["cross"] = len(uniq)

    # ۷) ترتیب تیترها
    levels = [int(m.group(1)) for m in re.finditer(r"<h([1-6])\b", body, re.I)]
    jump = None
    for a, b in zip(levels, levels[1:]):
        if b > a + 1:
            jump = (a, b)
            break
    if jump:
        rep.err(page, f"پرش تیتر در بدنه: h{fa_num(jump[0])} → h{fa_num(jump[1])}")
    outside = (src[:start] + src[end:]) if end > 0 else src[:start]
    outside_no_footer = outside[: outside.find("<footer")] if "<footer" in outside else outside
    deep = re.findall(r"<h([4-6])\b", outside_no_footer, re.I)
    if deep:
        rep.err(page, f"تیتر h{'/h'.join(sorted(set(deep)))} در بخش‌های قالب (بیرون از فوتر)")
    foot_deep = len(re.findall(r"<h[4-6]\b", outside[outside.find("<footer"):], re.I)) if "<footer" in outside else 0
    if foot_deep:
        rep.warn(page, f"{fa_num(foot_deep)} تیتر h4 در فوتر مشترک سایت (از قبل موجود)")
    stats["h2"] = levels.count(2)

    # ۸) متاتگ‌ها
    head = src[: src.find("</head>")]
    checks = {
        "title": r"<title>[^<]{10,}</title>",
        "description": r'<meta name="description" content="[^"]{40,}"',
        "canonical": r'<link rel="canonical" href="[^"]+"',
        "robots": r'<meta name="robots" content="[^"]+"',
        "og:title": r'<meta property="og:title"',
        "og:description": r'<meta property="og:description"',
        "og:image": r'<meta property="og:image"',
        "og:type=article": r'<meta property="og:type" content="article"',
        "og:url": r'<meta property="og:url"',
        "twitter:card": r'<meta name="twitter:card"',
        "article:published_time": r'<meta property="article:published_time"',
    }
    for name, pat in checks.items():
        if not re.search(pat, head):
            rep.err(page, f"متاتگ {name} وجود ندارد")
    cano = re.search(r'<link rel="canonical" href="([^"]+)"', head)
    if cano and cano.group(1) != f"{base}/{page}":
        rep.err(page, f"canonical = {cano.group(1)} (انتظار: {base}/{page})")

    # ۹) فهرست مطالب == H2
    toc = re.search(r'<nav[^>]*id="tocBox"[^>]*>(.*?)</nav>', src, re.S)
    toc_n = len(re.findall(r"<li>", toc.group(1))) if toc else 0
    if toc_n != levels.count(2):
        rep.err(page, f"فهرست مطالب {fa_num(toc_n)} مورد دارد ولی {fa_num(levels.count(2))} تیتر H2")
    stats["toc"] = toc_n

    # عناصر تعاملی قالب
    for need in ("readingProgress", "tocBox", "copyLinkBtn", "commentForm", "toTop"):
        if f'id="{need}"' not in src:
            rep.err(page, f"عنصر #{need} در قالب نیست")
    comments = len(re.findall(r'class="comment-item"', src))
    if comments != 2:
        rep.err(page, f"تعداد دیدگاه نمونه = {fa_num(comments)} (باید ۲ باشد)")
    stats["comments"] = comments
    stats["words"] = len(text.split())
    return stats


# ------------------------------------------------------------- بدنه‌ی وردپرس
def check_wp(rep: Report) -> int:
    d = "content/blog/wp"
    if not os.path.isdir(os.path.join(ROOT, d)):
        rep.err(d, "پوشه‌ی بدنه‌های وردپرس وجود ندارد")
        return 0
    files = sorted(os.listdir(os.path.join(ROOT, d)))
    for f in files:
        if not f.endswith(".html"):
            continue
        src = read(os.path.join(d, f))
        text = strip_tags(src)
        if re.search(r"\*\*[^*\n]{1,80}\*\*", text) or re.search(r"\[[^\]\n]{1,80}\]\(", text):
            rep.err(f"{d}/{f}", "markdown خام")
        for href in re.findall(r'\bhref="([^"]+)"', src):
            if href.startswith(("#", "http", "mailto:", "tel:")):
                continue
            if not href.startswith("/") and ".html" in href:
                rep.err(f"{d}/{f}", f"لینک دموی باقی‌مانده: {href}")
        if not re.search(r'href="/blog/[^"]+"', src):
            rep.err(f"{d}/{f}", "هیچ لینک بین‌مقاله‌ای /blog/ ندارد")
        if "faq" not in src.lower():
            rep.warn(f"{d}/{f}", "کلاس faq در بدنه نیست")
    return len([f for f in files if f.endswith(".html")])


# ------------------------------------------------------------- لینک‌سازی سایت
def check_wiring(rep: Report) -> None:
    blog = read("blog.html")
    cards = re.findall(r'<article class="card blog-card[^"]*"[^>]*>.*?</article>', blog, re.S)
    if len(cards) != 9:
        rep.err("blog.html", f"تعداد کارت = {fa_num(len(cards))} (باید ۹ باشد)")
    targets: list[str] = []
    for c in cards:
        m = re.search(r'class="more"[^>]*', c)
        link = re.search(r'<a href="([^"]+)" class="more"', c)
        if not link:
            rep.err("blog.html", "کارتی بدون لینک «ادامه مطلب»")
            continue
        targets.append(link.group(1))
    if len(set(targets)) != 9:
        rep.err("blog.html", f"مقصد کارت‌ها تکراری است: {targets}")
    for t in targets:
        if not os.path.exists(os.path.join(ROOT, t)):
            rep.err("blog.html", f"مقصد کارت وجود ندارد: {t}")
    for page in ("blog.html", "index.html"):
        n = read(page).count('href="#"')
        if n:
            rep.err(page, f'{fa_num(n)} مورد href="#"')
    idx = read("index.html")
    home_targets = re.findall(
        r'<article class="card blog-card"[^>]*>.*?<a href="([^"]+)" class="more"', idx, re.S
    )
    if len(home_targets) != 3:
        rep.err("index.html", f"{fa_num(len(home_targets))} کارت مقاله (باید ۳ باشد)")
    for t in home_targets:
        if not t.startswith("post"):
            rep.err("index.html", f"کارت خانه به مقاله لینک نشده: {t}")


# ------------------------------------------------------------- main
def main() -> int:
    ap = argparse.ArgumentParser(description="چک استاتیک صفحات وبلاگ")
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL)
    args = ap.parse_args()

    rep = Report()
    print(f"BASE_URL = {args.base_url}\n")

    print(f"{'#':<5}{'صفحه':<26}{'H1':<5}{'H2':<5}{'TOC':<6}{'FAQ':<6}"
          f"{'لینک':<7}{'دیدگاه':<9}{'واژه':<7}نتیجه")
    print("─" * 84)
    for i, page in enumerate(PAGES, start=1):
        if not os.path.exists(os.path.join(ROOT, page)):
            rep.err(page, "فایل صفحه وجود ندارد")
            continue
        before = len(rep.errors)
        st = check_page(i, page, args.base_url.rstrip("/"), rep)
        state = f"{GREEN}✅ سالم{OFF}" if len(rep.errors) == before else f"{RED}❌ خطا{OFF}"
        print(f"{fa_num(i):<5}{page:<26}{fa_num(st['h1']):<5}{fa_num(st['h2']):<5}"
              f"{fa_num(st['toc']):<6}{fa_num(st['faq']):<6}{fa_num(st['cross']):<7}"
              f"{fa_num(st['comments']):<9}{fa_num(st['words']):<7}{state}")
    print("─" * 84)

    wp = check_wp(rep)
    print(f"بدنه‌ی وردپرس: {fa_num(wp)} فایل در content/blog/wp/")
    check_wiring(rep)

    for w in rep.warns:
        print(f"{YELLOW}⚠ {w}{OFF}")
    if rep.errors:
        print(f"\n{RED}✖ {fa_num(len(rep.errors))} خطا:{OFF}")
        for e in rep.errors:
            print(f"  {RED}•{OFF} {e}")
        return 1
    print(f"\n{GREEN}✔ همه‌ی بررسی‌های استاتیک پاس شد "
          f"(۹ صفحه + {fa_num(wp)} بدنه‌ی وردپرس + لینک‌سازی سایت){OFF}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
