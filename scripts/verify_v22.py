#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""verify_v22.py — приёмка релиза v22 (пресеты-EN + hardening).

Части:
  A. Статика single-file (dist-single/index.html)
  B. PWA-билд (dist/)
  C. Рантайм (Playwright): EN-дефолт, пресет в EN, 7 вкладок без кириллицы,
     погреб/экспорт, standalone-экспорт с CSP, RU-санити.
Каждая проверка печатает OK/FAIL; итог — ALL OK или список провалов.
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SINGLE = ROOT / "dist-single" / "index.html"
DIST = ROOT / "dist"
OUT = ROOT / "scripts" / "_out"

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, info: str = "") -> None:
    results.append((name, ok, info))
    print(f"{'OK ' if ok else 'FAIL'} | {name}" + (f" | {info}" if info and not ok else ""))


CYR = re.compile(r"[\u0400-\u04FF]")

# ── A. Статика single-file ────────────────────────────────────────────────
html = SINGLE.read_text(encoding="utf-8")

check("A1 single-file существует и >1МБ", SINGLE.exists() and SINGLE.stat().st_size > 1_000_000, f"size={SINGLE.stat().st_size if SINGLE.exists() else 0}")
check("A2 CSP приложения (default-src 'self')", "default-src 'self'" in html)
check("A3 referrer no-referrer", 'content="no-referrer"' in html)
check("A4 CSP шаблона экспорта (default-src 'none')", "default-src 'none'" in html)
check("A5 charset utf-8", 'charset="UTF-8"' in html or "charset=utf-8" in html)
ext = re.findall(r'(?:src|href)="(https?://[^"]+)"', html)
check("A6 нет внешних src/href", len(ext) == 0, f"найдено: {ext[:3]}")
check("A7 маркер v22 localizePreset (Brut Champagne в EN_MAP)", "Brut Champagne" in html)
check("A8 маркер hex-белого списка (safeHex-regex)", "#[0-9a-fA-F]{3,8}" in html)
check("A9 маркер фото-лимита 30МБ", "30 * 1024 * 1024" in html or "лимит 30 МБ" in html)

# ── B. PWA-билд ───────────────────────────────────────────────────────────
manifest_path = DIST / "manifest.webmanifest"
check("B1 manifest.webmanifest существует", manifest_path.exists())
if manifest_path.exists():
    mf = json.loads(manifest_path.read_text(encoding="utf-8"))
    icons = mf.get("icons", [])
    check("B2 3 иконки в манифесте", len(icons) == 3, f"icons={len(icons)}")
dist_index = (DIST / "index.html").read_text(encoding="utf-8")
check("B3 CSP и в PWA-билде", "default-src 'self'" in dist_index)
check("B4 sw.js существует", (DIST / "sw.js").exists())

# ── C. Рантайм ────────────────────────────────────────────────────────────
from playwright.sync_api import sync_playwright  # noqa: E402

PORT = 8123
server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT)],
    cwd=str(SINGLE.parent),
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
time.sleep(1.0)

OUT.mkdir(parents=True, exist_ok=True)
page_errors: list[str] = []
console_errors: list[str] = []


def scan_cyrillic(page) -> str:
    """Весь видимый текст + SVG-текст; возвращает фрагменты с кириллицей."""
    parts = [page.evaluate("document.body.innerText")]
    svg_text = page.evaluate("Array.from(document.querySelectorAll('svg text')).map(t => t.textContent).join(' ')")
    parts.append(svg_text or "")
    joined = "\n".join(parts)
    hits = sorted({m.group(0) for m in CYR.finditer(joined)})
    return ", ".join(hits[:12])


try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.goto(f"http://localhost:{PORT}/", wait_until="networkidle")
        page.wait_for_timeout(700)

        check("C1 страница загрузилась", "Tasting Companion" in page.title())
        check("C2 EN — язык по умолчанию", page.evaluate("document.documentElement.lang") == "en")
        check("C3 0 page errors при старте", len(page_errors) == 0, "; ".join(page_errors[:2]))

        # Pro-режим: [aria-label='Tasting mode'] кнопки WSET | Sommelier Pro
        page.locator('[aria-label="Tasting mode"] button').nth(1).click()
        page.wait_for_timeout(300)

        # Пресеты: открыть модалку
        page.locator("button", has_text="Presets").first.click()
        page.wait_for_timeout(300)
        modal_txt = page.evaluate("document.body.innerText")
        check("C4 модалка пресетов EN: 'Brut Champagne'", "Brut Champagne" in modal_txt)
        check("C5 модалка пресетов без кириллицы", not CYR.search(modal_txt), scan_cyrillic(page))

        # Применить первый пресет
        page.get_by_text("Brut Champagne").first.click()
        page.wait_for_timeout(500)
        toast = page.evaluate("document.body.innerText")
        check("C6 тост EN: '…preset is applied'", "preset is applied" in toast and "Brut Champagne" in toast)
        check("C7 тост без кириллицы", not CYR.search(toast), scan_cyrillic(page))

        # Шаг 2 визарда: инпуты country/region/grapes
        page.locator('[aria-label="Passport steps"] button').nth(1).click()
        page.wait_for_timeout(300)
        country = page.locator('input[placeholder="e.g. Italy"]').input_value()
        region = page.locator('input[placeholder="e.g. Piedmont"]').input_value()
        grapes = page.locator('input[placeholder="e.g. Nebbiolo"]').input_value()
        check("C8 country='France'", country == "France", f"got={country!r}")
        check("C9 region='Champagne'", region == "Champagne", f"got={region!r}")
        check("C10 grapes EN", grapes == "Pinot Noir, Chardonnay, Meunier", f"got={grapes!r}")

        # Все 7 вкладок в EN — кириллицы нет
        tabs = ["Passport", "Appearance", "Nose", "Palate", "Conclusion", "Associations", "Summary"]
        cyr_tabs: list[str] = []
        for t_ in tabs:
            page.locator("button", has_text=t_).first.click()
            page.wait_for_timeout(250)
            hits = scan_cyrillic(page)
            if hits:
                cyr_tabs.append(f"{t_}: {hits}")
        check("C11 EN: 7 вкладок без кириллицы", len(cyr_tabs) == 0, " | ".join(cyr_tabs))

        page.locator("button", has_text="Passport").first.click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(OUT / "v22-passport-en.png"))

        # Погреб (модалка) в EN
        page.locator('[aria-label="Cellar"]').click()
        page.wait_for_timeout(400)
        hits = scan_cyrillic(page)
        check("C12 погреб EN без кириллицы", not hits, hits)
        page.keyboard.press("Escape")
        page.wait_for_timeout(350)

        # Экспорт: standalone HTML с CSP
        page.locator('[aria-label="Export"]').click()
        page.wait_for_timeout(400)
        page.locator("button", has_text="Standalone HTML").first.click()
        page.wait_for_timeout(300)
        with page.expect_download() as dl:
            page.locator("button", has_text="Download the HTML report").first.click()
        download = dl.value
        exp_path = OUT / download.suggested_filename
        download.save_as(str(exp_path))
        exp_html = exp_path.read_text(encoding="utf-8")
        check("C13 экспорт скачан (.html)", exp_path.suffix == ".html")
        check("C14 экспорт: CSP default-src 'none'", "default-src 'none'" in exp_html)
        check("C15 экспорт: referrer no-referrer", 'content="no-referrer"' in exp_html)
        check("C16 экспорт: нет <script", "<script" not in exp_html)
        check("C17 экспорт EN без кириллицы", not CYR.search(exp_html))

        # RU-санити
        page.keyboard.press("Escape")
        page.locator('[aria-label="Interface language"] button', has_text="RU").click()
        page.wait_for_timeout(400)
        ru_txt = page.evaluate("document.body.innerText")
        check("C18 RU-режим жив ('Паспорт вина')", "Паспорт вина" in ru_txt)

        check("C19 0 page errors за сессию", len(page_errors) == 0, "; ".join(page_errors[:3]))
        check("C20 0 console errors за сессию", len(console_errors) == 0, "; ".join(console_errors[:3]))

        browser.close()
finally:
    server.terminate()

failed = [n for n, ok, _ in results if not ok]
print("=" * 60)
print(f"ИТОГО: {len(results) - len(failed)}/{len(results)} OK")
if failed:
    print("ПРОВАЛЫ:", failed)
    sys.exit(1)
print("ALL OK")
