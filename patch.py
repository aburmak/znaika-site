# -*- coding: utf-8 -*-
"""Массовая правка всех страниц сайта «Знайка» по подтверждённому списку."""
import io, re, os

BASE = r"C:\Users\aleks\OneDrive\Рабочий стол\Znaika"
FILES = ["index.html", "postuplenie.html", "zayavlenie.html", "dokumenty.html", "o-shkole.html", "kontakty.html"]

SOC_MAX = "https://max.ru/join/XyVIoUnYHi9OJ1vmBVHh2q10oTYsGBMdVuTzmY9SPu8"
SOC_TG = "https://t.me/school_znaika"

# Новый единый блок соцсетей/соцкопирайта вставляется в footer-quick/футер
SOC_HTML = (
    '<div class="footer-social">'
    '<a href="' + SOC_MAX + '" target="_blank" rel="noopener" title="Мы в MAX" aria-label="Мы в MAX">MAX</a>'
    '<a href="' + SOC_TG + '" target="_blank" rel="noopener" title="Telegram" aria-label="Telegram">Telegram</a>'
    '</div>'
)

def load(p):
    return io.open(os.path.join(BASE, p), "r", encoding="utf-8").read()

def save(p, s):
    io.open(os.path.join(BASE, p), "w", encoding="utf-8", newline="").write(s)

report = []

def do(p, s, label, parts, must=1):
    n = 0
    for old, new in parts:
        c = s.count(old)
        if c:
            s = s.replace(old, new)
            n += c
    report.append((p, label, n, ("OK" if (must == 0 or n >= must) else "CHECK")))
    return s

for p in FILES:
    s = load(p)
    res = []
    res.append(do(p, s, "det sad: удалить карточку(step-card/price-row/таблицы) + упоминания", []))

# --- плейсхолдер: реальные правки ниже ---
save("patch_report.txt", "\n".join(" | ".join(map(str, r)) for r in report) or "EMPTY")
print("done", len(report))
