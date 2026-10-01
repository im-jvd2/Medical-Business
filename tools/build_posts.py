#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_posts.py — موتور تولید صفحات وبلاگ «مدیکال بیزینس» (قالب تکی v2)

ورودی : content/blog/0*.md  (متن نهایی + بلوک متادیتا در سربرگ هر فایل)
خروجی:
  ۱) صفحات دمو  →  post.html (مقاله ۱) و post-02.html … post-09.html
  ۲) بدنه‌ی خالص وردپرس  →  content/blog/wp/{slug}.html   (لینک‌ها به شکل /blog/{slug})

قاعده‌ی حیاتی رندر: همه‌ی متن — از جمله پاراگراف‌ها — از پردازش inline
(بولد / لینک / کد) عبور می‌کند؛ در خروجی هیچ markdown خامی (** یا []()) باقی نمی‌ماند.

کاربرد:
    python3 tools/build_posts.py                          # با BASE_URL پیش‌فرض
    python3 tools/build_posts.py --base-url https://example.com
    python3 tools/build_posts.py --check                  # فقط گزارش، بدون نوشتن فایل
"""

from __future__ import annotations

import argparse
import html
import io
import os
import re
import sys
from datetime import date, timedelta

# ──────────────────────────────────────────────────────────────────────────────
# ثابت‌های پروژه
# ──────────────────────────────────────────────────────────────────────────────

DEFAULT_BASE_URL = "https://im-jvd2.github.io/Medical-Business"

SITE_NAME = "مدیکال بیزینس"
SITE_NAME_FA_EN = "مدیکال بیزینس | Medical Business"
SITE_TAGLINE = "از تخصص طبابت تا اوج تجارت؛ سیستم‌سازی و رشد سودآور کلینیک‌ها و مطب‌ها"
AUTHOR_NAME = "مهدی شاهنظری"
AUTHOR_ROLE = "مدرس و مشاور بیزینس پزشکی"
AUTHOR_SITE = "https://mahdishahnazari.com"
AUTHOR_BIO = (
    "بنیان‌گذار مدیکال بیزینس؛ مدرس و مشاور سیستم‌سازی، رشد فروش و مارکتینگ ۳۶۰ درجه برای "
    "پزشکان، دندانپزشکان و صاحبان کلینیک. تمرکز او بر تبدیل مطب‌های سنتی به کسب‌وکارهای "
    "مقیاس‌پذیر و سودآور است — بدون جنگ تخفیف."
)
PHONE = "09002991020"
PUBLISHER_LOGO = "https://im-jvd2.github.io/Medical-Business/assets/images/IMG_20241010_105332_838.png"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT, "content", "blog")
WP_DIR = os.path.join(CONTENT_DIR, "wp")

ZW = "\u200c"          # نیم‌فاصله
FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

# ──────────────────────────────────────────────────────────────────────────────
# داده‌ی هر ۹ مقاله (تاریخ/زمان مطالعه/CTA/دیدگاه‌ها/مقالات مرتبط)
# ──────────────────────────────────────────────────────────────────────────────

def fa(n: int) -> str:
    """تبدیل عدد به رقم فارسی."""
    return "".join(FA_DIGITS[int(d)] if d.isdigit() else d for d in str(n))


def money(n: int) -> str:
    """۸۹۰۰۰۰۰ → ۸,۹۰۰,۰۰۰ (با رقم فارسی و جداکننده‌ی لاتین مطابق سبک دمو)."""
    return fa(f"{n:,}")


# تاریخ‌های شمسی (دمو) طبق نگاشت کارفرما + معادل میلادی محاسبه‌شده
COURSES = {
    "mbm-101": {"title": "مسترکلاس جامع MBM", "price": 8900000, "old": 12900000,
                "img": "assets/images/hero-course.jpg"},
    "aes-201": {"title": "دستگاه پول‌ساز کلینیک‌های زیبایی و دندانپزشکی", "price": 4900000,
                "old": 6900000, "img": "assets/images/hero-course.jpg"},
    "rcp-301": {"title": "اسکریپت طلایی پذیرش", "price": 1900000, "old": None,
                "img": "assets/images/hero-course.jpg"},
    "sop-401": {"title": "سیستم‌سازی و رهایی پزشک از مطب", "price": 3900000, "old": None,
                "img": "assets/images/hero-course.jpg"},
    "brd-501": {"title": "پرسونال برندینگ اثرگذار پزشکان", "price": 3400000, "old": 4400000,
                "img": "assets/images/hero-course.jpg"},
}

SERVICES = {
    "website": {"title": "طراحی سایت کلینیک، سئو-محور",
                "img": "assets/images/thumb-marketing.jpg"},
    "audit": {"title": "جلسه‌ی عارضه‌یابی رایگان کلینیک",
              "img": "assets/images/hero-landing.jpg"},
    "campaign": {"title": "کمپین وفادارسازی و جذب بیمار",
                 "img": "assets/images/thumb-marketing.jpg"},
}

# نگاشت CTA (طبق دستور کارفرما + §۴ docs/10)
CTA = {
    1: {"kind": "course", "id": "brd-501",
        "eyebrow": "دوره‌ی مرتبط با این مقاله",
        "desc": "مسیر ۹۰ روزه‌ی ساخت برند شخصی پزشک — از پیام برند و بایو اینستاگرام تا اتوریتی و اتاق ویزیت — با تمرین عملی و بازخورد.",
        "btn": "مشاهده‌ی دوره",
        "side_desc": "از پیام برند تا اتوریتی؛ نقشه‌ی ۹۰ روزه با تمرین عملی و بازخورد.",
        "banner_title": "برند شخصی‌تان را در ۹۰ روز بسازید",
        "banner_text": "اگر می‌خواهید این نقشه‌راه را با راهنمایی گام‌به‌گام، تمرین عملی و بازخورد اجرا کنید، این دوره دقیقاً برای همین ساخته شده است."},
    2: {"kind": "service", "id": "website",
        "eyebrow": "خدمت مرتبط با این مقاله",
        "desc": "سایتی که از پایه برای سئوی محلی ساخته می‌شود: صفحات خدمت، صفحه‌ی شهر، سرعت موبایل و ساختار محتوای جذب بیمار.",
        "btn": "دریافت پیشنهاد طراحی سایت",
        "side_desc": "ساخت سایت سئو-محور + آموزش مدیریت محتوا؛ همراه با مشاوره‌ی رایگان.",
        "banner_title": "کلینیک شما باید در سه نتیجه‌ی اول باشد",
        "banner_text": "۴۴ درصد از کلیک‌های محلی سهم Local Pack است. اگر سایتتان برای جستجوی محلی ساخته نشده، هر ماه بیمار از دست می‌دهید — بی‌سروصدا."},
    3: {"kind": "course", "id": "mbm-101",
        "eyebrow": "دوره‌ی مرتبط با این مقاله",
        "desc": "جلسه‌ی اختصاصی «مدل‌های قیمت‌گذاری پرستیژی» + نقشه‌ی رشد درآمد، همراه با تمرین‌های عددی روی تعرفه‌های خودتان.",
        "btn": "مشاهده‌ی مسترکلاس",
        "side_desc": "قیمت‌گذاری پرستیژی + سیستم‌سازی؛ پرچمدار دوره‌های مدیکال بیزینس.",
        "banner_title": "تعرفه‌ها را با منطق اصلاح کنید، نه با ترس",
        "banner_text": "در مسترکلاس جامع MBM، مدل‌های قیمت‌گذاری پرستیژی را با تمرین عددی روی سبد خدمات خودتان پیاده می‌کنید."},
    4: {"kind": "course", "id": "aes-201",
        "eyebrow": "دوره‌ی مرتبط با این مقاله",
        "desc": "سیستم جذب بیمار هدفمند بدون جنگ تخفیف: قیف اعتمادسازی، تقویم محتوای Pulsage و کمپین بازگشت بیمار با قالب‌های آماده.",
        "btn": "مشاهده‌ی دوره",
        "side_desc": "جذب بی‌وقفه‌ی بیمار بدون تخفیف؛ مخصوص کلینیک‌های زیبایی و دندانپزشکی.",
        "banner_title": "تایم‌های خالی را بدون تخفیف پر کنید",
        "banner_text": "قالب‌های آماده‌ی کمپین بازگشت بیمار، اسکریپت دایرکت و تقویم محتوای Pulsage — همه در یک دوره‌ی عملی."},
    5: {"kind": "service", "id": "audit",
        "eyebrow": "خدمت مرتبط با این مقاله",
        "desc": "در یک جلسه، نشتی‌های درآمدی کلینیک شما را اندازه می‌گیریم: نرخ اشغال تقویم، نرخ تبدیل تماس، نوبت‌های بی‌پیگیری و حاشیه‌ی هر خدمت.",
        "btn": "رزرو جلسه‌ی رایگان",
        "side_desc": "عارضه‌یابی ۳۶۰ درجه + نقشه‌ی راه کتبی رشد درآمد. رایگان.",
        "banner_title": "بزرگ‌ترین نشتی کلینیک شما کدام است؟",
        "banner_text": "در جلسه‌ی عارضه‌یابی رایگان، با عدد و سند مشخص می‌کنیم کدام یک از این پنج اشتباه بیشترین پول را از جیب شما برمی‌دارد."},
    6: {"kind": "course", "id": "rcp-301",
        "eyebrow": "دوره‌ی مرتبط با این مقاله",
        "desc": "اسکریپت‌های آماده‌ی پاسخ تلفنی، تمرین نقش‌آفرینی و سیستم ارزیابی تیم پذیرش؛ برای تبدیل تماس استعلام به نوبت قطعی.",
        "btn": "مشاهده‌ی دوره",
        "side_desc": "تبدیل تماس به نوبت قطعی؛ مناسب منشی و تیم پذیرش کلینیک.",
        "banner_title": "پذیرش شما، درِ ورود درآمد است",
        "banner_text": "اسکریپت طلایی پذیرش، همان چیزی است که بین «اطلاع می‌دهم» و «نوبت قطعی» تفاوت می‌گذارد."},
    7: {"kind": "service", "id": "campaign",
        "eyebrow": "خدمت مرتبط با این مقاله",
        "desc": "طراحی تقویم محتوای کم‌ریسک و کمپین جذب بیمار در چارچوب ضوابط تبلیغات درمانی، همراه با بازبینی محتوا پیش از انتشار.",
        "btn": "درخواست طراحی کمپین",
        "side_desc": "کمپین جذب بیمار در چارچوب ضوابط؛ با بازبینی محتوا پیش از انتشار.",
        "banner_title": "بازاریابی مجاز، سیستم‌ساز و بدون ریسک پرونده",
        "banner_text": "کمپین وفادارسازی و جذب بیمار را طوری طراحی می‌کنیم که هم بیمار بیاورد، هم در چارچوب ضوابط تبلیغات درمانی بماند."},
    8: {"kind": "course", "id": "rcp-301",
        "eyebrow": "دوره‌ی مرتبط با این مقاله",
        "desc": "تشخیص تیپ DISC در دو دقیقه‌ی اول تماس + اسکریپت اختصاصی هر تیپ؛ با تمرین نقش‌آفرینی و بازبینی تماس‌های واقعی.",
        "btn": "مشاهده‌ی دوره",
        "side_desc": "اسکریپت اختصاصی هر چهار تیپ DISC + تمرین نقش‌آفرینی هفتگی.",
        "banner_title": "از «قیمتش چنده؟» تا نوبت قطعی",
        "banner_text": "تیم پذیرش شما یاد می‌گیرد در همان دو دقیقه‌ی اول، تیپ بیمار را تشخیص دهد و با زبان خودش پاسخ دهد."},
    9: {"kind": "course", "id": "brd-501",
        "eyebrow": "دوره‌ی مرتبط با این مقاله",
        "desc": "از نوشتن داستان برند تا اجرای آن در سایت، اینستاگرام و اتاق انتظار؛ با قالب‌های آماده و بازخورد گام‌به‌گام.",
        "btn": "مشاهده‌ی دوره",
        "side_desc": "ساخت پیام برند و روایت کلینیک؛ از متن تا اجرا در همه‌ی نقاط تماس.",
        "banner_title": "روایت کلینیک‌تان را حرفه‌ای بنویسید",
        "banner_text": "قالب سه‌پرده‌ای، تمرین نوشتن و بازخورد گام‌به‌گام — تا داستانتان در سایت، اینستاگرام و اتاق انتظار یکسان تکرار شود."},
}

# مقالات مرتبط (ماتریس §۵ docs/10 + یک مورد هم‌خانواده)
RELATED = {1: [9, 7, 4], 2: [4, 7, 6], 3: [8, 5, 6], 4: [2, 6, 7], 5: [6, 3, 8],
           6: [8, 5, 3], 7: [1, 4, 2], 8: [6, 3, 5], 9: [1, 4, 7]}

# دو دیدگاه نمونه‌ی اختصاصی برای هر مقاله
COMMENTS = {
    1: [("دکتر مریم رحیمی", "دندانپزشک — اصفهان", "۱۷ شهریور ۱۴۰۵",
         "بخش «پیام برند» برای من گره‌گشا بود. سال‌ها پست می‌گذاشتم بدون آن‌که بدانم دقیقاً چه جمله‌ای را می‌خواهم تکرار کنم. سه جمله‌ی اول را نوشتم و همان هفته بایو را عوض کردم؛ دایرکت‌های «برای این مورد خاص چه می‌کنید؟» جای «قیمتتون چنده؟» را گرفت."),
        ("سعید کاظمی", "مدیر کلینیک پوست و لیزر — کرج", "۲۰ شهریور ۱۴۰۵",
         "نکته‌ی اتاق ویزیت را جدی نگرفته بودم تا اینکه تیم پذیرش را با پیام برند هماهنگ کردیم. تفاوت از همان تماس اول حس می‌شود. جدول ۹۰ روزه را روی دیوار اتاق مدیریت چسبانده‌ایم.")],
    2: [("دکتر امیر شریفی", "دندانپزشک — تهران", "۱۰ شهریور ۱۴۰۵",
         "همین که فهمیدم ۴۴ درصد کلیک‌های محلی سهم سه کارت Local Pack است، کل نگاهم عوض شد. پروفایل گوگل را کامل کردیم و برای هر خدمت صفحه‌ی جدا ساختیم؛ ورودی «درد لثه بعد از عصب‌کشی» از صفر به اولین منبع تماس ما رسید."),
        ("نگار موسوی", "مدیر داخلی کلینیک — مشهد", "۱۳ شهریور ۱۴۰۵",
         "چک‌لیست نهایی را پرینت گرفتیم و هر هفته یک مورد را تیک می‌زنیم. بخش NAP و یکسان‌سازی اطلاعات، همان چیزی بود که هیچ‌کس به ما نگفته بود.")],
    3: [("دکتر سمیرا نوری", "متخصص پوست و مو — شیراز", "۳ شهریور ۱۴۰۵",
         "سطح‌بندی سه‌گانه را اجرا کردیم. جالب این‌جاست که بیماران بیشتر سطح ترجیحی را انتخاب می‌کنند، نه پایه را. دیگر مکالمه‌ی «گرونه» تقریباً تمام شده چون گزینه‌ها با نیاز خودشان مقایسه می‌شوند."),
        ("حسین رستمی", "مدیر مالی کلینیک دندانپزشکی — اصفهان", "۶ شهریور ۱۴۰۵",
         "محاسبه‌ی هزینه‌ی تمام‌شده‌ی هر خدمت را شروع کردیم و متوجه شدیم دو خدمت عملاً زیان‌ده بودند. بخش «اعتراض قیمت در پذیرش» را هم با تیم مرور کردیم؛ پاسخ‌ها الان یکدست است.")],
    4: [("دکتر فرزاد امینی", "دندانپزشک زیبایی — تهران", "۲۷ مرداد ۱۴۰۵",
         "دقیقاً همان کاری را کردیم که مقاله می‌گوید نشود نکنیم: بلاگر گرفتیم و CAC حساب کردیم. عدد وحشتناک بود. حالا بودجه را به کمپین بازگشت بیمار منتقل کردیم و نتیجه‌اش در ماه اول بهتر بود."),
        ("الهام صادقی", "مسئول مارکتینگ کلینیک — اهواز", "۳۰ مرداد ۱۴۰۵",
         "برنامه‌ی ۳۰ روزه را هفته‌به‌هفته اجرا کردیم. بخش «برچسب منبع در پرونده» ساده‌ترین و مفیدترین پیشنهاد بود؛ الان می‌دانیم واقعاً بیمار از کجا می‌آید.")],
    5: [("دکتر محمدرضا توکلی", "جراح لثه — تبریز", "۲۰ مرداد ۱۴۰۵",
         "از خودارزیابی پنج سؤالی شروع کردم؛ سه «بله» گرفتم. عدد ۵ تا ۷ درصد درآمد که به نوبت‌های بی‌مراجعه می‌رود، برای ما عدد بزرگی شد. سیستم پیگیری نوبت را راه انداختیم."),
        ("مریم اکبری", "مدیر کلینیک چندتخصصی — کرج", "۲۴ مرداد ۱۴۰۵",
         "SOP پنج فرایند حیاتی را نوشتیم؛ دو صفحه شد. اولین بار است که مرخصی هم‌زمان دو نفر، کلینیک را به‌هم نمی‌ریزد. داشبورد ماهانه هم بحث‌های تیم را از «به‌نظرم» به «طبق داده» برد.")],
    6: [("دکتر نیلوفر قاسمی", "پزشک عمومی — رشت", "۱۲ مرداد ۱۴۰۵",
         "تمرین پانزده دقیقه‌ای میز پذیرش را در مصاحبه‌ی آخر اجرا کردم و همان‌جا فهمیدم کدام داوطلب واقعاً مناسب است. رزومه‌ها چیزی نگفته بودند که این تمرین گفت."),
        ("رضا مرادیان", "سرپرست پذیرش کلینیک — قم", "۱۶ مرداد ۱۴۰۵",
         "چک‌لیست آن‌بردینگ سی‌روزه را عیناً پیاده کردیم. نیروی جدید این‌بار در روز دهم مستقل کار می‌کرد، نه ماه دوم. اسکریپت تلفنی هم نرخ پاسخ‌دهی ما را محسوس بالا برد.")],
    7: [("دکتر آرش دهقان", "متخصص ارتودنسی — تهران", "۴ مرداد ۱۴۰۵",
         "این‌که مسئولیت تبلیغ بدون مجوز هم متوجه ناشر است و هم متقاضی، برای من تازگی داشت. همان هفته از نظام پزشکی شهرمان استعلام گرفتیم و محتوای تبلیغاتی را تا صدور مجوز متوقف کردیم."),
        ("شیوا بهرامی", "ادمین صفحه‌ی کلینیک — اصفهان", "۸ مرداد ۱۴۰۵",
         "چک‌لیست هشت موردی را قبل از هر انتشار مرور می‌کنم. دو پست را بازنویسی کردم که اگر منتشر می‌شدند قطعاً دردسرساز بودند. بخش «اگر اخطار گرفتیم» هم خیلی کاربردی نوشته شده بود.")],
    8: [("دکتر شیرین ملکوتی", "متخصص زنان و زایمان — اصفهان", "۲۹ تیر ۱۴۰۵",
         "بیمار تیپ C را تا قبل از این «سخت‌گیر» می‌دیدیم؛ حالا می‌فهمیم فقط دنبال مستندات است. همان «کاغذ سفید» که مقاله پیشنهاد می‌دهد، نرخ نوبت‌گیری ما را در این گروه بالا برد."),
        ("پیمان نیکو", "مسئول نوبت‌دهی کلینیک — یزد", "۲ مرداد ۱۴۰۵",
         "بازی «تیپ مخفی» را با تیم اجرا کردیم. هفته‌ی اول بیشتر حدس می‌زدیم؛ هفته‌ی سوم تشخیص‌ها دقیق شده بود. نمونه‌ی مکالمه‌ی مقاله را عیناً تمرین کردیم.")],
    9: [("دکتر کیانوش فرهادی", "جراح پلاستیک — تهران", "۲۲ تیر ۱۴۰۵",
         "روایت «ما-محور» را در متن درباره‌ی ما پیدا کردم؛ پر از «ما با ۱۵ سال تجربه». بازنویسی‌اش کردم و برای اولین بار بیماران در جلسه‌ی مشاوره به همان جمله اشاره می‌کنند."),
        ("زهرا اسلامی", "مدیر ارتباط با بیمار — مشهد", "۲۶ تیر ۱۴۰۵",
         "پنج سؤال تمرین عملی را با تیم پاسخ دادیم و از دلش هم شعار جدید درآمد، هم متن اتاق انتظار. همان‌طور که مقاله گفت: اول داستان، بعد شعار.")],
}

# تصویر شاخص و alt توصیفی فارسی
IMAGES = {
    1: ("assets/images/blog/01-personal-branding.jpg",
        "مشاور برند مدیکال بیزینس در حال ارائه‌ی نقشه‌راه ۹۰ روزه‌ی برندسازی شخصی به پزشک"),
    2: ("assets/images/blog/02-local-seo.jpg",
        "نمایش نتایج جستجوی محلی گوگل و پروفایل کسب‌وکار یک کلینیک دندانپزشکی روی گوشی موبایل"),
    3: ("assets/images/blog/03-pricing.jpg",
        "بررسی جدول تعرفه‌گذاری خدمات درمانی و سطح‌بندی قیمت در دفتر مدیریت کلینیک"),
    4: ("assets/images/blog/04-no-influencer-ads.jpg",
        "طراحی قیف جذب بیمار و تقویم محتوای کلینیک بدون وابستگی به تبلیغات بلاگری"),
    5: ("assets/images/blog/05-management-mistakes.jpg",
        "تحلیل داشبورد شاخص‌های عملکردی کلینیک برای یافتن نشتی‌های درآمدی"),
    6: ("assets/images/blog/06-receptionist-training.jpg",
        "آموزش تیم پذیرش کلینیک و تمرین اسکریپت پاسخ تلفنی در میز پذیرش"),
    7: ("assets/images/blog/07-ads-regulations.jpg",
        "بازبینی چک‌لیست تبلیغات مجاز پزشکی پیش از انتشار محتوا در اینستاگرام"),
    8: ("assets/images/blog/08-disc-typology.jpg",
        "تیم پذیرش کلینیک در حال تمرین تیپ‌شناسی بیماران با مدل DISC"),
    9: ("assets/images/blog/09-brand-story.jpg",
        "نوشتن داستان برند کلینیک با قالب سه‌پرده‌ای مشکل، راهنما و تحول"),
}

# ──────────────────────────────────────────────────────────────────────────────
# تبدیل تاریخ شمسی → میلادی (بدون وابستگی خارجی)
# ──────────────────────────────────────────────────────────────────────────────

def jalali_to_gregorian(jy: int, jm: int, jd: int) -> date:
    """الگوریتم استاندارد تبدیل جلالی به میلادی."""
    jy += 1595
    days = -355668 + (365 * jy) + ((jy // 33) * 8) + (((jy % 33) + 3) // 4) + jd
    if jm < 7:
        days += (jm - 1) * 31
    else:
        days += ((jm - 7) * 30) + 186
    gy = 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365
    leap = (gy % 4 == 0 and gy % 100 != 0) or (gy % 400 == 0)
    mdays = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    gm = 0
    while gm < 12 and days >= mdays[gm]:
        days -= mdays[gm]
        gm += 1
    return date(gy, gm + 1, days + 1)


# تاریخ‌های دمو طبق نگاشت کارفرما (تیر تا شهریور ۱۴۰۵)
DATES = {
    1: (1405, 6, 15, 8),   # ۱۵ شهریور ۱۴۰۵ — ۸ دقیقه
    2: (1405, 6, 8, 7),
    3: (1405, 6, 1, 7),
    4: (1405, 5, 25, 7),
    5: (1405, 5, 18, 8),
    6: (1405, 5, 10, 7),
    7: (1405, 5, 2, 6),
    8: (1405, 4, 27, 7),
    9: (1405, 4, 20, 6),
}

MONTHS_FA = {1: "فروردین", 2: "اردیبهشت", 3: "خرداد", 4: "تیر", 5: "مرداد", 6: "شهریور",
             7: "مهر", 8: "آبان", 9: "آذر", 10: "دی", 11: "بهمن", 12: "اسفند"}

# ──────────────────────────────────────────────────────────────────────────────
# پارسر مارک‌داون
# ──────────────────────────────────────────────────────────────────────────────

RE_BOLD = re.compile(r"\*\*(.+?)\*\*", re.S)
RE_CODE = re.compile(r"`([^`]+?)`")
RE_LINK = re.compile(r"\[([^\]]+?)\]\(([^)\s]+?)\)")


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def inline(text: str, mode: str = "demo", slug_map: dict | None = None) -> str:
    """پردازش inline برای **همه‌ی متن** (پاراگراف، تیتر، سلول جدول، لیست، کپشن).

    ترتیب: escape → کد درون‌خطی → لینک → بولد. هیچ markdown خامی باقی نمی‌ماند.
    """
    parts: list[str] = []
    buf = text
    # محافظت از کدهای درون‌خطی در برابر پردازش‌های بعدی
    tokens: list[str] = []

    def stash(html_chunk: str) -> str:
        tokens.append(html_chunk)
        return "\x00%d\x00" % (len(tokens) - 1)

    def code_sub(m: re.Match) -> str:
        return stash("<code>%s</code>" % esc(m.group(1)))

    buf = RE_CODE.sub(code_sub, buf)
    out = esc(buf)

    def link_sub(m: re.Match) -> str:
        label, url = m.group(1), m.group(2)
        url = rewrite_link(url, mode, slug_map)
        external = url.startswith("http")
        attrs = ' target="_blank" rel="noopener"' if external else ""
        return '<a href="%s"%s>%s</a>' % (esc(url), attrs, label)

    out = RE_LINK.sub(link_sub, out)
    out = RE_BOLD.sub(r"<strong>\1</strong>", out)
    # بازگرداندن کدهای محافظت‌شده
    def unstash(m: re.Match) -> str:
        return tokens[int(m.group(1))]
    out = re.sub(r"\x00(\d+)\x00", unstash, out)
    # بازگرداندن بولد داخل کدِ stash‌شده (کد خام می‌ماند — درست است)
    del parts
    return out


def rewrite_link(url: str, mode: str, slug_map: dict | None) -> str:
    """لینک‌های داخلی: دمو → فایل محلی؛ وردپرس → مسیر نهایی /blog/{slug}."""
    if mode == "wp":
        return url
    if url.startswith("/blog/"):
        slug = url[len("/blog/"):]
        return (slug_map or {}).get(slug, "blog.html")
    if url.startswith("/courses/"):
        return "course.html?c=" + url[len("/courses/"):]
    if url.startswith("/services"):
        return "services.html" + url[len("/services"):]
    if url.startswith("/"):
        return url.lstrip("/")
    return url


class Block:
    def __init__(self, kind: str, **kw):
        self.kind = kind
        self.__dict__.update(kw)

    def __repr__(self):
        return "<Block %s>" % self.kind


def parse_markdown(md: str) -> list[Block]:
    """تبدیل مارک‌داون بدنه به فهرست بلوک‌ها (بدون رندر)."""
    lines = md.split("\n")
    blocks: list[Block] = []
    i = 0
    n = len(lines)
    while i < n:
        raw = lines[i]
        line = raw.rstrip()

        # بلوک کد
        if line.strip().startswith("```"):
            i += 1
            buf = []
            while i < n and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            blocks.append(Block("code", text="\n".join(buf)))
            continue

        # خط جداکننده
        if line.strip() == "---":
            i += 1
            continue

        # تیترها
        m = re.match(r"^(#{2,4})\s+(.*)$", line)
        if m:
            level = len(m.group(1))
            blocks.append(Block("heading", level=level, text=m.group(2).strip()))
            i += 1
            continue

        # بلوک نقل‌قول (چندخطی)
        if line.lstrip().startswith(">"):
            buf = []
            while i < n and lines[i].lstrip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]).rstrip())
                i += 1
            blocks.append(Block("quote", lines=[b for b in buf]))
            continue

        # جدول
        if line.lstrip().startswith("|") and i + 1 < n and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i + 1]):
            header = [c.strip() for c in line.strip().strip("|").split("|")]
            i += 2
            rows = []
            while i < n and lines[i].lstrip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            blocks.append(Block("table", header=header, rows=rows))
            continue

        # لیست بی‌ترتیب / چک‌باکس
        if re.match(r"^\s*[-*]\s+", line):
            items = []
            while i < n and re.match(r"^\s*[-*]\s+", lines[i]):
                body = re.sub(r"^\s*[-*]\s+", "", lines[i].rstrip())
                checked = None
                mc = re.match(r"^\[( |x|X)\]\s*(.*)$", body)
                if mc:
                    checked = mc.group(1).lower() == "x"
                    body = mc.group(2)
                items.append((body, checked))
                i += 1
            blocks.append(Block("ul", items=items))
            continue

        # لیست مرتب
        if re.match(r"^\s*\d+\.\s+", line):
            items = []
            while i < n and re.match(r"^\s*\d+\.\s+", lines[i]):
                items.append(re.sub(r"^\s*\d+\.\s+", "", lines[i].rstrip()))
                i += 1
            blocks.append(Block("ol", items=items))
            continue

        # خط خالی
        if not line.strip():
            i += 1
            continue

        # پاراگراف (تا خط خالی)
        buf = [line.strip()]
        i += 1
        while i < n and lines[i].strip() and not re.match(
                r"^\s*(#{2,4}\s|[-*]\s|\d+\.\s|>|```|\|)", lines[i]) and lines[i].strip() != "---":
            buf.append(lines[i].strip())
            i += 1
        blocks.append(Block("p", text=" ".join(buf)))

    return blocks


def parse_source(path: str) -> dict:
    """خواندن فایل md: عنوان، متادیتا، بدنه."""
    with io.open(path, encoding="utf-8") as fh:
        src = fh.read()
    lines = src.split("\n")

    title = re.sub(r"^#\s*مقاله\s*[۰-۹0-9]+\s*—\s*", "", lines[0].strip())
    num = int(re.match(r"^#\s*مقاله\s*([۰-۹0-9]+)", lines[0].strip())
              .group(1).translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")))

    meta: dict[str, str] = {}
    body_start = 0
    for idx, ln in enumerate(lines[1:], start=1):
        s = ln.strip()
        m = re.match(r"^>\s*-\s*([^:：]+)[:：]\s*(.*)$", s)
        if m:
            meta[m.group(1).strip()] = m.group(2).strip()
        if s == "---" and meta:
            body_start = idx + 1
            break
    body_md = "\n".join(lines[body_start:])

    slug = meta.get("اسلاگ", "").strip("`").strip()
    if slug.startswith("/blog/"):
        slug = slug[len("/blog/"):]

    kw = meta.get("کلیدواژه اصلی", "")
    main_kw, sub_kw = "", ""
    if "|" in kw:
        main_kw, sub_kw = kw.split("|", 1)
    tags = [t.strip() for t in [main_kw.replace("اصلی:", "").strip()] if t]
    tags += [t.strip() for t in re.split(r"[،,]", sub_kw.replace("فرعی:", "")) if t.strip()]

    cat = meta.get("دسته", "").split("|")[0].strip()

    return {
        "num": num, "title": title, "meta": meta, "body_md": body_md,
        "slug": slug, "tags": tags[:5], "category": cat,
        "meta_title": meta.get("متاتایتل", title),
        "meta_desc": meta.get("متادسکریپشن", ""),
        "blocks": parse_markdown(body_md),
    }


# ──────────────────────────────────────────────────────────────────────────────
# رندر بدنه
# ──────────────────────────────────────────────────────────────────────────────

CAT_CLASS = {"برندینگ": "branding", "مارکتینگ": "marketing", "فروش": "sales", "مدیریت": "mgmt"}


def render_body(post: dict, mode: str, slug_map: dict, cta_html: str = "",
                cta_after: int | None = None) -> tuple[str, list[tuple[str, str]], list[dict]]:
    """رندر بدنه؛ خروجی: (html، فهرست مطالب H2، آیتم‌های FAQPage)."""
    out: list[str] = []
    toc: list[tuple[str, str]] = []          # (id, عنوان)
    faq: list[dict] = []
    h2_count = 0
    blocks = post["blocks"]
    body_word_idx = 0
    total_p = sum(1 for b in blocks if b.kind == "p")
    p_seen = 0
    inserted_cta = cta_after is None

    def flush_faq(cur_q, cur_a):
        if cur_q and cur_a:
            faq.append({"q": cur_q, "a": " ".join(cur_a)})

    cur_q, cur_a = None, []
    for b in blocks:
        # بستن سؤال FAQ پیشین هنگام رسیدن به بلوک جدید
        if b.kind != "p" or cur_q is None:
            if cur_q is not None:
                flush_faq(cur_q, cur_a)
                cur_q, cur_a = None, []

        if b.kind == "heading":
            if b.level == 2:
                h2_count += 1
                hid = "sec-%d" % h2_count
                text = b.text
                toc.append((hid, text))
                out.append('          <h2 id="%s"><span class="h2-num">%s</span>%s</h2>'
                           % (hid, fa(h2_count), inline(text, mode, slug_map)))
            else:
                text = b.text
                cls = ""
                if text.endswith("؟"):
                    cur_q = text
                    cls = ' class="faq-q"'
                out.append('          <h%d%s>%s</h%d>'
                           % (b.level, cls, inline(text, mode, slug_map), b.level))
            continue

        if b.kind == "p":
            p_seen += 1
            if cur_q is not None:
                cur_a.append(inline(b.text, mode, slug_map))
                out.append('          <p>%s</p>' % inline(b.text, mode, slug_map))
            else:
                cls = ' class="lead"' if (body_word_idx == 0 and h2_count == 0) else ""
                body_word_idx += 1
                out.append('          <p%s>%s</p>' % (cls, inline(b.text, mode, slug_map)))
            # CTA میانی بعد از ~نیمی از پاراگراف‌ها
            if not inserted_cta and p_seen >= cta_after:
                out.append(cta_html)
                inserted_cta = True
            continue

        if b.kind == "ul":
            out.append("          <ul>")
            for text, checked in b.items:
                if checked is None:
                    out.append("            <li>%s</li>" % inline(text, mode, slug_map))
                else:
                    mark = "✓" if checked else ""
                    out.append('            <li class="li-check"><span class="chk" aria-hidden="true">%s</span>%s</li>'
                               % (mark, inline(text, mode, slug_map)))
            out.append("          </ul>")
            continue

        if b.kind == "ol":
            out.append("          <ol>")
            for text in b.items:
                out.append("            <li>%s</li>" % inline(text, mode, slug_map))
            out.append("          </ol>")
            continue

        if b.kind == "table":
            out.append('          <div class="table-wrap"><table>')
            out.append("            <thead><tr>%s</tr></thead>"
                       % "".join("<th>%s</th>" % inline(c, mode, slug_map) for c in b.header))
            out.append("            <tbody>")
            for r in b.rows:
                out.append("              <tr>%s</tr>"
                           % "".join("<td>%s</td>" % inline(c, mode, slug_map) for c in r))
            out.append("            </tbody>")
            out.append("          </table></div>")
            continue

        if b.kind == "quote":
            body_html = "<br>".join(inline(x, mode, slug_map) for x in b.lines if x.strip())
            cls = "example" if "مثال" in b.lines[0] else ("disclaimer" if "سلب مسئولیت" in b.lines[0] else "")
            if "نکته" in b.lines[0] and cls == "":
                cls = "note"
            out.append('          <blockquote class="bq %s">%s</blockquote>' % (cls, body_html))
            continue

        if b.kind == "code":
            out.append('          <pre class="code-block"><code>%s</code></pre>' % esc(b.text))
            continue

    flush_faq(cur_q, cur_a)
    if not inserted_cta and cta_html:
        out.append(cta_html)
    return "\n".join(out), toc, faq


# ──────────────────────────────────────────────────────────────────────────────
# قالب‌های کمکی (CTA / کارت مقاله / دیدگاه)
# ──────────────────────────────────────────────────────────────────────────────

def cta_targets(num: int, mode: str) -> tuple[str, str, str, str, str]:
    """→ (href_mid, href_banner, cta_title, image, price_html)"""
    c = CTA[num]
    if c["kind"] == "course":
        course = COURSES[c["id"]]
        href = ("course.html?c=%s" % c["id"]) if mode == "demo" else ("/courses/%s" % c["id"])
        img = course["img"]
        price = '<span class="pic-price">%s%s تومان</span>' % (
            ("<del>%s</del> " % money(course["old"])) if course["old"] else "",
            money(course["price"]))
        return href, href, course["title"], img, price
    svc = SERVICES[c["id"]]
    href = ("services.html#%s" % c["id"]) if mode == "demo" else ("/services#%s" % c["id"])
    return href, href, svc["title"], svc["img"], '<span class="pic-price">مشاوره‌ی رایگان</span>'


def mid_cta_html(num: int, mode: str) -> str:
    c = CTA[num]
    href, _, title, img, price = cta_targets(num, mode)
    alt = img.split("/")[-1]
    return (
        '\n          <aside class="post-inline-cta">\n'
        '            <img src="%s" alt="پیشنهاد مرتبط: %s" loading="lazy">\n'
        '            <div>\n'
        '              <span class="pic-eyebrow">%s</span>\n'
        '              <p class="pic-title">%s</p>\n'
        '              <p>%s</p>\n'
        '              <div class="pic-foot">\n'
        '                %s\n'
        '                <a class="btn btn-primary" href="%s">%s'
        '<svg width="1em" height="1em"><use href="#ic-04"></use></svg></a>\n'
        '              </div>\n'
        '            </div>\n'
        '          </aside>\n'
    ) % (img, esc(title), c["eyebrow"], esc(title), c["desc"], price, href, c["btn"])


def related_card(num: int, mode: str, slug_map: dict) -> str:
    p = POSTS_BY_NUM[num]
    img, _alt = IMAGES[num]
    d = DATES[num]
    date_fa = "%s %s %s" % (fa(d[2]), MONTHS_FA[d[1]], fa(d[0]))
    href = ("post.html" if num == 1 else "post-%02d.html" % num) if mode == "demo" \
        else "/blog/%s" % p["slug"]
    cat_cls = CAT_CLASS.get(p["category"], "marketing")
    return (
        '        <article class="card blog-card">\n'
        '          <div class="thumb"><img src="%s" alt="%s" loading="lazy"></div>\n'
        '          <div class="body">\n'
        '            <div class="blog-topline"><span class="tag tag-%s">%s</span>'
        '<span class="date"><svg width="1em" height="1em"><use href="#ic-18"></use></svg>%s</span></div>\n'
        '            <h3>%s</h3>\n'
        '            <a href="%s" class="more">ادامه مطلب'
        '<svg width="1em" height="1em"><use href="#ic-04"></use></svg></a>\n'
        '          </div>\n'
        '        </article>'
    ) % (img, esc(p["title"]), cat_cls, esc(p["category"]), date_fa, esc(p["title"]), href)


def comment_html(name: str, role: str, cdate: str, text: str) -> str:
    initials = "".join(w[0] for w in name.split()[:2])
    return (
        '        <li class="comment-item">\n'
        '          <span class="avatar" aria-hidden="true">%s</span>\n'
        '          <div>\n'
        '            <div class="c-head"><b>%s</b><span class="c-role">%s</span>'
        '<span class="c-date"><svg width="1em" height="1em"><use href="#ic-14"></use></svg>%s</span></div>\n'
        '            <p>%s</p>\n'
        '          </div>\n'
        '        </li>'
    ) % (esc(initials), esc(name), esc(role), esc(cdate), esc(text))


# ──────────────────────────────────────────────────────────────────────────────
# اسکیمای JSON-LD
# ──────────────────────────────────────────────────────────────────────────────

def json_ld(obj: dict) -> str:
    import json
    return '<script type="application/ld+json">%s</script>' % json.dumps(obj, ensure_ascii=False)


def schema_html(post: dict, base: str, page_url: str, img_url: str, iso: str,
                toc: list, faq: list) -> str:
    author = {"@type": "Person", "name": AUTHOR_NAME, "url": AUTHOR_SITE,
              "jobTitle": AUTHOR_ROLE}
    publisher = {"@type": "Organization", "name": SITE_NAME_FA_EN, "url": base,
                 "logo": {"@type": "ImageObject", "url": PUBLISHER_LOGO}}
    article = {
        "@context": "https://schema.org", "@type": "Article",
        "headline": post["meta_title"], "description": post["meta_desc"],
        "image": [img_url], "datePublished": iso, "dateModified": iso,
        "inLanguage": "fa-IR", "mainEntityOfPage": {"@type": "WebPage", "@id": page_url},
        "author": author, "publisher": publisher,
        "articleSection": post["category"], "keywords": "، ".join(post["tags"]),
        "wordCount": count_words(post),
    }
    crumb = {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "خانه", "item": base + "/"},
            {"@type": "ListItem", "position": 2, "name": "وبلاگ", "item": base + "/blog.html"},
            {"@type": "ListItem", "position": 3, "name": post["title"], "item": page_url},
        ],
    }
    chunks = [json_ld(article), json_ld(crumb)]
    if faq:
        chunks.append(json_ld({
            "@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": re.sub(r"<[^>]+>", "", f["q"]),
                            "acceptedAnswer": {"@type": "Answer",
                                               "text": re.sub(r"<[^>]+>", "", f["a"])}}
                           for f in faq],
        }))
    return "\n".join("  " + c for c in chunks)


def count_words(post: dict) -> int:
    return len(re.findall(r"\S+", post["body_md"]))


# ──────────────────────────────────────────────────────────────────────────────
# استخراج سربرگ/هدر/فوتر مشترک از blog.html
# ──────────────────────────────────────────────────────────────────────────────

def load_chrome() -> tuple[str, str, str]:
    with io.open(os.path.join(ROOT, "blog.html"), encoding="utf-8") as fh:
        src = fh.read()
    sprite = re.search(r'^<svg xmlns="http://www\.w3\.org/2000/svg".*</svg>$', src, re.M)
    header = re.search(r'^  <header class="site-header">.*?^  </header>', src, re.S | re.M)
    footer = re.search(r'^  <footer class="site-footer">.*?^  </footer>', src, re.S | re.M)
    if not (sprite and header and footer):
        raise SystemExit("خطا: نتوانستم هدر/فوتر مشترک را از blog.html استخراج کنم.")
    return sprite.group(0), header.group(0), footer.group(0)


# ──────────────────────────────────────────────────────────────────────────────
# قالب صفحه (v2)
# ──────────────────────────────────────────────────────────────────────────────

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{meta_title} | وبلاگ {site_name}</title>
  <meta name="description" content="{meta_desc}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="author" content="{author}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="{site_name_full}">
  <meta property="og:locale" content="fa_IR">
  <meta property="og:title" content="{meta_title}">
  <meta property="og:description" content="{meta_desc}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:alt" content="{og_image_alt}">
  <meta property="article:published_time" content="{iso}">
  <meta property="article:modified_time" content="{iso}">
  <meta property="article:section" content="{category}">
  <meta property="article:author" content="{author}">
{og_tags}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{meta_title}">
  <meta name="twitter:description" content="{meta_desc}">
  <meta name="twitter:image" content="{og_image}">
  <meta name="theme-color" content="#0E2A4F">
  <script>document.documentElement.classList.add('js');</script>
  <link rel="stylesheet" href="assets/css/style.css">
{schema}
</head>
<body class="post-page">
{sprite}
<div class="reading-progress" id="readingProgress" aria-hidden="true"><span></span></div>

{header}

  <!-- ۱) هیرو مقاله -->
  <section class="post-hero">
    <div class="container">
      <nav class="breadcrumb" aria-label="مسیر صفحه"><a href="index.html">خانه</a><span class="sep">/</span><a href="blog.html">وبلاگ</a><span class="sep">/</span><a href="blog.html?cat={cat_slug}">{category}</a></nav>
      <span class="tag tag-{cat_cls}">{category}</span>
      <h1 class="post-title">{title}</h1>
      <div class="post-meta">
        <span class="who">
          <span class="avatar" aria-hidden="true">م‌ش</span>
          <span><b><a href="{author_site}" target="_blank" rel="noopener">{author}</a></b><small>{author_role}</small></span>
        </span>
        <span class="meta-sep"></span>
        <span><svg width="1em" height="1em"><use href="#ic-18"></use></svg> {date_fa}</span>
        <span class="meta-sep"></span>
        <span><svg width="1em" height="1em"><use href="#ic-14"></use></svg> {minutes} دقیقه مطالعه</span>
      </div>
      <figure class="post-cover">
        <img src="{image}" alt="{image_alt}" width="1200" height="675">
      </figure>
    </div>
  </section>

  <!-- ۲) بدنه: ستون اصلی + ستون کناری چسبان -->
  <section class="section post-body-section">
    <div class="container">
      <div class="post-layout">

        <article class="post-content" id="postBody">
{body}
        </article>

        <aside class="post-side">
          <nav class="toc-box" id="tocBox" aria-label="فهرست مطالب">
            <p class="toc-title"><svg width="1em" height="1em"><use href="#ic-39"></use></svg> فهرست مطالب</p>
            <ol>
{toc_items}
            </ol>
          </nav>
          <div class="cta-side" id="ctaSide">
            <span class="cs-eyebrow">{side_eyebrow}</span>
            <p class="cs-title">{side_title}</p>
            <p>{side_desc}</p>
            {side_price}
            <a class="btn btn-white" href="{side_href}">{side_btn}<svg width="1em" height="1em"><use href="#ic-04"></use></svg></a>
          </div>
        </aside>

      </div>
    </div>
  </section>

  <!-- ۳) برچسب‌ها + اشتراک‌گذاری -->
  <section class="section post-tags-section">
    <div class="container">
      <div class="post-tags-box">
        <div class="pt-tags">
          <span class="pt-label"><svg width="1em" height="1em"><use href="#ic-43"></use></svg> برچسب‌ها:</span>
{tag_items}
        </div>
        <div class="pt-share">
          <span class="pt-label">اشتراک‌گذاری:</span>
          <button type="button" class="share-btn" id="copyLinkBtn" data-url="{canonical}">
            <svg width="1em" height="1em"><use href="#ic-65"></use></svg> کپی لینک
          </button>
          <a class="share-btn" href="https://t.me/share/url?url={share_url}&amp;text={share_text}" target="_blank" rel="noopener">
            <svg width="1em" height="1em"><use href="#ic-22"></use></svg> تلگرام
          </a>
          <a class="share-btn" href="https://wa.me/?text={share_text}%20{share_url}" target="_blank" rel="noopener">
            <svg width="1em" height="1em"><use href="#ic-23"></use></svg> واتساپ
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- ۴) باکس نویسنده -->
  <section class="section post-author-section">
    <div class="container">
      <div class="author-box">
        <span class="avatar" aria-hidden="true">م‌ش</span>
        <div class="ab-body">
          <h3><a href="{author_site}" target="_blank" rel="noopener">{author}</a></h3>
          <span class="ab-role">{author_role}</span>
          <p>{author_bio}</p>
          <a class="ab-link" href="{author_site}" target="_blank" rel="noopener">{author_site_domain}
            <svg width="1em" height="1em"><use href="#ic-65"></use></svg></a>
        </div>
      </div>
    </div>
  </section>

  <!-- ۵) ناوبری قبلی/بعدی -->
  <section class="section post-nav-section">
    <div class="container">
      <div class="post-nav">
{nav_prev}{nav_next}
      </div>
    </div>
  </section>

  <!-- ۶) مقالات مرتبط -->
  <section class="section section-soft">
    <div class="container">
      <div class="section-head center">
        <span class="eyebrow">ادامه‌ی مطالعه</span>
        <h2>مقالات مرتبط</h2>
        <p>سه مقاله‌ی هم‌مسیر که خواندنشان این مطلب را کامل می‌کند.</p>
      </div>
      <div class="related-grid">
{related_cards}
      </div>
    </div>
  </section>

  <!-- ۷) CTA پایانی -->
  <section class="section post-cta-section">
    <div class="container">
      <div class="cta-banner navy">
        <div>
          <h2>{banner_title}</h2>
          <p>{banner_text}</p>
        </div>
        <a class="btn btn-white btn-lg" href="{banner_href}">{banner_btn}<svg width="1em" height="1em"><use href="#ic-04"></use></svg></a>
      </div>
    </div>
  </section>

  <!-- ۸) دیدگاه‌ها (فعال با نظارت — docs/10 §۸ مورد ۶) -->
  <section class="section post-comments-section">
    <div class="container">
      <div class="comments-box">
        <h3 class="cb-title"><svg width="1em" height="1em"><use href="#ic-chat"></use></svg> دیدگاه‌ها
          <span class="cb-count">{comment_count} دیدگاه</span></h3>
        <ul class="comment-list">
{comments}
        </ul>
        <form class="comment-form" id="commentForm" novalidate>
          <p class="cf-title">دیدگاه خود را بنویسید</p>
          <div class="cf-row">
            <input type="text" name="name" placeholder="نام و نام خانوادگی" required>
            <input type="email" name="email" placeholder="ایمیل (منتشر نمی‌شود)" required>
          </div>
          <textarea name="body" placeholder="تجربه یا سؤال خود را درباره‌ی این مقاله بنویسید…" required></textarea>
          <div class="cf-foot">
            <button type="submit" class="btn btn-primary">ثبت دیدگاه</button>
            <span class="cf-note">دیدگاه‌ها پس از تأیید مدیر منتشر می‌شوند.</span>
          </div>
        </form>
      </div>
    </div>
  </section>

  <!-- ۹) خبرنامه (CTA پایانی — docs/10 §۸ مورد ۸) -->
  <section class="section section-soft">
    <div class="container">
      <div class="newsletter">
        <div class="nl-inner">
          <div>
            <span class="eyebrow" style="color:#AEE0FF; margin-bottom:10px;">هیچ مقاله‌ای را از دست ندهید</span>
            <h2>عضویت در خبرنامه هفتگی</h2>
            <p>هر جمعه یک مقاله‌ی کاربردی درباره‌ی رشد کسب‌وکارهای حوزه‌ی سلامت؛ بدون تبلیغ، بدون اسپم.</p>
          </div>
          <div>
            <form class="nl-form js-form" data-msg="عضویت شما در خبرنامه ثبت شد.">
              <input type="email" required placeholder="ایمیل یا شماره موبایل شما" aria-label="ایمیل">
              <button class="btn btn-white" type="submit">عضویت رایگان</button>
            </form>
            <p class="nl-tip"><svg width="1em" height="1em"><use href="#ic-20"></use></svg>ارسال حداکثر یک ایمیل در هفته؛ بدون اسپم.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

{footer}

<button class="to-top" id="toTop" aria-label="بازگشت به بالا"><svg width="1em" height="1em"><use href="#ic-19"></use></svg></button>
<div class="toast-box" id="toastBox" aria-live="polite"></div>

<script src="assets/js/data.js"></script>
<script src="assets/js/main.js"></script>
<script src="assets/js/post.js"></script>
</body>
</html>
"""

WP_HEADER = """<!-- {title}
     بدنه‌ی آماده‌ی وردپرس — تولیدشده با tools/build_posts.py
     لینک‌های داخلی به شکل مسیر نهایی وردپرس (/blog/{{slug}}) هستند.
     عنوان پست: {title}
     اسلاگ: /blog/{slug}
     متاتایتل: {meta_title}
     متادسکریپشن: {meta_desc}
     دسته: {category} | تاریخ انتشار: {date_fa} | زمان مطالعه: {minutes} دقیقه
     تصویر شاخص: {image} -->
"""


# ──────────────────────────────────────────────────────────────────────────────
# ساخت صفحه
# ──────────────────────────────────────────────────────────────────────────────

POSTS: list[dict] = []
POSTS_BY_NUM: dict[int, dict] = {}


def nav_link(num: int, mode: str, slug_map: dict, side: str) -> str:
    p = POSTS_BY_NUM[num]
    href = ("post.html" if num == 1 else "post-%02d.html" % num) if mode == "demo" \
        else "/blog/%s" % p["slug"]
    label = "مقاله‌ی قبلی" if side == "prev" else "مقاله‌ی بعدی"
    hint = "قدیمی‌تر" if side == "prev" else "جدیدتر"
    return (
        '        <a class="pn-card %s" href="%s">\n'
        '          <span class="pn-label">%s <small>(%s)</small></span>\n'
        '          <span class="pn-title">%s</span>\n'
        '        </a>'
    ) % (side, href, label, hint, esc(p["title"]))


def build_page(post: dict, base: str, sprite: str, header: str, footer: str,
               slug_map: dict) -> tuple[str, str, list, list]:
    num = post["num"]
    jy, jm, jd, minutes = DATES[num]
    g = jalali_to_gregorian(jy, jm, jd)
    iso = g.isoformat() + "T08:00:00+03:30"
    date_fa = "%s %s %s" % (fa(jd), MONTHS_FA[jm], fa(jy))
    img, img_alt = IMAGES[num]
    filename = "post.html" if num == 1 else "post-%02d.html" % num
    canonical = base.rstrip("/") + "/" + filename
    img_url = base.rstrip("/") + "/" + img

    # رندر بدنه با CTA میانی
    body_html, toc, faq = render_body(post, "demo", slug_map,
                                      mid_cta_html(num, "demo"),
                                      cta_after=max(3, total_paragraphs(post) // 2))

    toc_items = "\n".join(
        '              <li><a href="#%s">%s</a></li>' % (hid, esc(t)) for hid, t in toc)

    c = CTA[num]
    href_mid, href_banner, cta_title, cta_img, price_html = cta_targets(num, "demo")

    tags_html = "\n".join(
        '          <a class="tag-chip" href="blog.html">%s</a>' % esc(t) for t in post["tags"])

    related_html = "\n".join(related_card(n, "demo", slug_map) for n in RELATED[num])

    comments_html = "\n".join(comment_html(*cm) for cm in COMMENTS[num])

    prev_num = num + 1 if num + 1 in POSTS_BY_NUM else None   # قدیمی‌تر
    next_num = num - 1 if num - 1 in POSTS_BY_NUM else None   # جدیدتر
    nav_prev = nav_link(prev_num, "demo", slug_map, "prev") if prev_num else \
        '        <span class="pn-card disabled"><span class="pn-label">مقاله‌ی قبلی</span>' \
        '<span class="pn-title">این اولین مقاله‌ی منتشرشده است</span></span>'
    nav_next = nav_link(next_num, "demo", slug_map, "next") if next_num else \
        '        <span class="pn-card disabled"><span class="pn-label">مقاله‌ی بعدی</span>' \
        '<span class="pn-title">این تازه‌ترین مقاله‌ی وبلاگ است</span></span>'

    schema = schema_html(post, base.rstrip("/"), canonical, img_url, iso, toc, faq)

    og_tags = "\n".join('  <meta property="article:tag" content="%s">' % esc(t)
                        for t in post["tags"])

    share_text = esc(post["meta_title"])

    page = PAGE_TEMPLATE.format(
        site_name=SITE_NAME, site_name_full=SITE_NAME_FA_EN,
        meta_title=esc(post["meta_title"]), meta_desc=esc(post["meta_desc"]),
        author=esc(AUTHOR_NAME), author_role=esc(AUTHOR_ROLE), author_bio=esc(AUTHOR_BIO),
        author_site=AUTHOR_SITE, author_site_domain=AUTHOR_SITE.replace("https://", ""),
        canonical=canonical, iso=iso, category=esc(post["category"]),
        cat_slug={"برندینگ": "branding", "مارکتینگ": "marketing",
                  "فروش": "sales", "مدیریت": "mgmt"}[post["category"]],
        cat_cls=CAT_CLASS[post["category"]],
        og_image=img_url, og_image_alt=esc(img_alt), og_tags=og_tags,
        schema=schema, sprite=sprite, header=header, footer=footer,
        title=esc(post["title"]), date_fa=date_fa, minutes=fa(minutes),
        image=img, image_alt=esc(img_alt),
        body=body_html, toc_items=toc_items,
        side_eyebrow=esc(c["eyebrow"]), side_title=esc(cta_title),
        side_desc=esc(c["side_desc"]), side_price=price_html, side_href=href_mid,
        side_btn=esc(c["btn"]),
        tag_items=tags_html, share_url=canonical, share_text=share_text,
        nav_prev=nav_prev, nav_next=nav_next, related_cards=related_html,
        banner_title=esc(c["banner_title"]), banner_text=esc(c["banner_text"]),
        banner_href=href_banner, banner_btn=esc(c["btn"]),
        comments=comments_html, comment_count=fa(len(COMMENTS[num])),
    )

    # بدنه‌ی خالص وردپرس
    wp_body, _toc2, _faq2 = render_body(post, "wp", slug_map, "", None)
    wp = WP_HEADER.format(title=post["title"], slug=post["slug"],
                          meta_title=post["meta_title"], meta_desc=post["meta_desc"],
                          category=post["category"], date_fa=date_fa,
                          minutes=fa(minutes), image=img)
    wp += wp_body.replace("          ", "") + "\n"
    return page, wp, toc, faq


def total_paragraphs(post: dict) -> int:
    return sum(1 for b in post["blocks"] if b.kind == "p")


# ──────────────────────────────────────────────────────────────────────────────
# main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description="تولید صفحات وبلاگ (قالب تکی v2)")
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL,
                    help="دامنه‌ی پایه برای canonical و og:url")
    ap.add_argument("--check", action="store_true", help="فقط گزارش؛ بدون نوشتن فایل")
    args = ap.parse_args()
    base = args.base_url.rstrip("/")

    global POSTS, POSTS_BY_NUM
    paths = sorted(p for p in os.listdir(CONTENT_DIR)
                   if re.match(r"^\d{2}-.*\.md$", p))
    for p in paths:
        post = parse_source(os.path.join(CONTENT_DIR, p))
        post["file"] = p
        POSTS.append(post)
        POSTS_BY_NUM[post["num"]] = post
    if len(POSTS) != 9:
        raise SystemExit("خطا: انتظار ۹ مقاله داشتم، %d فایل پیدا شد." % len(POSTS))

    slug_map = {p["slug"]: ("post.html" if p["num"] == 1 else "post-%02d.html" % p["num"])
                for p in POSTS}
    sprite, header, footer = load_chrome()

    if not args.check:
        os.makedirs(WP_DIR, exist_ok=True)

    print("BASE_URL = %s\n" % base)
    print("%-4s %-30s %-22s %-8s %-6s %s" % ("#", "صفحه", "بدنه‌ی وردپرس", "H2", "FAQ", "واژه"))
    problems = []
    for post in POSTS:
        page, wp, toc, faq = build_page(post, base, sprite, header, footer, slug_map)
        filename = "post.html" if post["num"] == 1 else "post-%02d.html" % post["num"]
        wp_name = post["slug"] + ".html"
        if not args.check:
            with io.open(os.path.join(ROOT, filename), "w", encoding="utf-8") as fh:
                fh.write(page)
            with io.open(os.path.join(WP_DIR, wp_name), "w", encoding="utf-8") as fh:
                fh.write(wp)
        # کنترل‌های سریع حین تولید
        for token in ("**", "](", "[["):
            if token in re.sub(r"<script type=\"application/ld\+json\">.*?</script>", "",
                               page, flags=re.S):
                problems.append("%s: markdown خام (%s) در صفحه" % (filename, token))
        if not faq:
            problems.append("%s: اسکیمای FAQPage خالی است" % filename)
        if page.count("<h1") != 1:
            problems.append("%s: تعداد H1 = %d" % (filename, page.count("<h1")))
        print("%-4s %-30s %-22s %-8s %-6s %s"
              % (fa(post["num"]), filename, wp_name, fa(len(toc)), fa(len(faq)),
                 fa(count_words(post))))

    if problems:
        print("\n❌ مشکلات:")
        for x in problems:
            print("   -", x)
        return 1
    print("\n✅ %d صفحه + %d بدنه‌ی وردپرس %s"
          % (len(POSTS), len(POSTS), "بررسی شد (--check)" if args.check else "نوشته شد"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
