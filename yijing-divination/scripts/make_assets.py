#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate social-preview (og.png) + favicons, on-brand 水墨 ink theme."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
CJK_BOLD = os.path.expanduser("~/.local/share/fonts/noto-cjk/NotoSansCJKtc-Bold.otf")
CJK_REG = os.path.expanduser("~/.local/share/fonts/noto-cjk/NotoSansCJKtc-Regular.otf")

INK = (21, 17, 13)
INK2 = (14, 11, 8)
CREAM = (245, 236, 217)
DIM = (191, 176, 148)
CINNABAR = (196, 69, 43)
CINNABAR_BR = (224, 97, 62)
JADE = (134, 160, 126)


def vgrad(w, h, top, bot):
    img = Image.new("RGB", (w, h), top)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return img


def draw_hexagram(d, cx, top, bar_w, bar_h, gap, lines, color, moving_idx=None):
    """lines bottom->top (1=yang solid, 0=yin broken). Draw top->down visually."""
    for vi, li in enumerate(reversed(range(6))):
        y = top + vi * (bar_h + gap)
        c = CINNABAR_BR if (moving_idx is not None and li == moving_idx) else color
        if lines[li] == 1:
            d.rounded_rectangle([cx - bar_w // 2, y, cx + bar_w // 2, y + bar_h], radius=bar_h // 2, fill=c)
        else:
            seg = int(bar_w * 0.42)
            d.rounded_rectangle([cx - bar_w // 2, y, cx - bar_w // 2 + seg, y + bar_h], radius=bar_h // 2, fill=c)
            d.rounded_rectangle([cx + bar_w // 2 - seg, y, cx + bar_w // 2, y + bar_h], radius=bar_h // 2, fill=c)


def make_og():
    W, H = 1200, 630
    img = vgrad(W, H, (24, 18, 13), (12, 9, 6))
    d = ImageDraw.Draw(img)
    # faint cinnabar glow top-right
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W - 360, -240, W + 200, 320], fill=(70, 22, 14))
    img = Image.blend(img, Image.composite(glow, img, glow.convert("L").point(lambda x: min(x, 90))), 0.0)
    d = ImageDraw.Draw(img)

    title = ImageFont.truetype(CJK_BOLD, 132)
    sub = ImageFont.truetype(CJK_REG, 36)
    small = ImageFont.truetype(CJK_REG, 27)
    url = ImageFont.truetype(CJK_REG, 26)

    PAD = 84
    # 卦象 decoration (地天泰) on the right
    draw_hexagram(d, W - 200, 150, 150, 26, 20, [1, 1, 1, 0, 0, 0], (236, 224, 200), moving_idx=2)

    # title 易 · 易經卜卦
    d.text((PAD, 150), "易", font=ImageFont.truetype(CJK_BOLD, 150), fill=CREAM)
    d.text((PAD + 188, 168), "易經卜卦", font=ImageFont.truetype(CJK_BOLD, 92), fill=CREAM)
    # cinnabar rule
    d.rounded_rectangle([PAD, 332, PAD + 96, 340], radius=4, fill=CINNABAR_BR)
    # subtitle
    d.text((PAD, 372), "輸入問題、選一個字、定一個地點", font=sub, fill=DIM)
    d.text((PAD, 424), "依康熙筆畫與時辰起卦，得主卦與之卦", font=sub, fill=DIM)
    d.text((PAD, 484), "參倪海廈・王思迅之解　·　梳理問題，照見本心", font=small, fill=(150, 138, 112))
    # url pill
    d.text((PAD, 552), "sofiayan0523.github.io/yijing-divination", font=url, fill=JADE)

    img.save(os.path.join(OUT, "og.png"), "PNG")
    print("OK og.png")


def make_favicon_png(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = max(3, size // 6)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=CINNABAR)
    # mini 乾-over-坤 style 3-bar motif (geometric, font-free)
    pad = size * 0.22
    bw = size - 2 * pad
    bh = max(2, size * 0.10)
    gap = (size - 2 * pad - 3 * bh) / 2
    pat = [1, 0, 1]  # solid / broken / solid
    for i, p in enumerate(pat):
        y = pad + i * (bh + gap)
        if p == 1:
            d.rounded_rectangle([pad, y, pad + bw, y + bh], radius=bh / 2, fill=CREAM)
        else:
            seg = bw * 0.40
            d.rounded_rectangle([pad, y, pad + seg, y + bh], radius=bh / 2, fill=CREAM)
            d.rounded_rectangle([pad + bw - seg, y, pad + bw, y + bh], radius=bh / 2, fill=CREAM)
    img.save(os.path.join(OUT, "icon-%d.png" % size), "PNG")
    print("OK icon-%d.png" % size)


def make_favicon_svg():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#c4452b"/>
  <g fill="#f5ecd9">
    <rect x="7" y="8"  width="18" height="3.4" rx="1.7"/>
    <rect x="7" y="14.3" width="7"  height="3.4" rx="1.7"/>
    <rect x="18" y="14.3" width="7"  height="3.4" rx="1.7"/>
    <rect x="7" y="20.6" width="18" height="3.4" rx="1.7"/>
  </g>
</svg>
'''
    open(os.path.join(OUT, "favicon.svg"), "w", encoding="utf-8").write(svg)
    print("OK favicon.svg")


if __name__ == "__main__":
    make_og()
    make_favicon_png(180)
    make_favicon_png(32)
    make_favicon_svg()
