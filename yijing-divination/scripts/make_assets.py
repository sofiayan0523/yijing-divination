#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate social-preview (og.png) + favicons — 老黃曆 / 木刻線裝書 風格.
對齊前端 styles.css 調色盤與設計語言：紙是亮的、墨是黑的；文武邊雙框、
方角爻條（零圓角）、楷體標題（LXGW WenKai TC）、明體內文（Noto Serif TC）、朱砂方印。
字體：~/.local/share/fonts/yj/{LXGWWenKaiTC-Medium.ttf,NotoSerifCJKtc-Regular.otf}
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
KAI = os.path.expanduser("~/.local/share/fonts/yj/LXGWWenKaiTC-Medium.ttf")
SERIF = os.path.expanduser("~/.local/share/fonts/yj/NotoSerifCJKtc-Regular.otf")

# styles.css :root 調色盤
INK = (43, 33, 24)        # --ink
INK2 = (71, 56, 38)       # --ink-2
PAPER = (239, 228, 203)   # --paper
BONE = (248, 240, 221)    # --bone
MUTED = (138, 122, 94)    # --muted
LINE = (122, 103, 71)     # --line
FRAME = (58, 45, 29)      # --frame
CINNABAR = (177, 58, 35)  # --cinnabar
JADE = (86, 113, 75)      # --jade
DESK = (217, 199, 163)    # --desk
SHADOW = (180, 160, 124)  # 案面上的硬偏移影


def grain(d, x0, y0, x1, y1):
    """淡紙紋：每 7px 一條極淡橫線。"""
    c = tuple(int(PAPER[i] * 0.96 + LINE[i] * 0.04) for i in range(3))
    y = y0
    while y < y1:
        d.line([(x0, y), (x1, y)], fill=c, width=1)
        y += 7


def hexagram(d, cx, top, bar_w, bar_h, gap, lines, moving_idx=None):
    """lines bottom->top (1=陽 0=陰)。方角爻條；動爻畫朱圈「動」由呼叫端補。"""
    for vi, li in enumerate(reversed(range(6))):
        y = top + vi * (bar_h + gap)
        c = CINNABAR if (moving_idx is not None and li == moving_idx) else INK
        if lines[li] == 1:
            d.rectangle([cx - bar_w // 2, y, cx + bar_w // 2, y + bar_h], fill=c)
        else:
            seg = int(bar_w * 0.42)
            d.rectangle([cx - bar_w // 2, y, cx - bar_w // 2 + seg, y + bar_h], fill=c)
            d.rectangle([cx + bar_w // 2 - seg, y, cx + bar_w // 2, y + bar_h], fill=c)
    return top + 6 * bar_h + 5 * gap


def seal(d, x, y, size, font_path=KAI):
    """朱砂方印：端正方形，紙色「易」。"""
    d.rectangle([x, y, x + size, y + size], fill=CINNABAR)
    f = ImageFont.truetype(font_path, int(size * 0.62))
    d.text((x + size / 2, y + size / 2 + size * 0.02), "易", font=f, fill=PAPER, anchor="mm")


def make_og():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), DESK)
    d = ImageDraw.Draw(img)

    # 書頁：硬偏移影 + 紙
    px0, py0, px1, py1 = 52, 42, 1148, 588
    d.rectangle([px0 + 12, py0 + 14, px1 + 12, py1 + 14], fill=SHADOW)
    d.rectangle([px0, py0, px1, py1], fill=PAPER)
    grain(d, px0, py0, px1, py1)
    # 文武邊雙框（外粗內細）
    d.rectangle([px0 + 14, py0 + 14, px1 - 14, py1 - 14], outline=FRAME, width=5)
    d.rectangle([px0 + 27, py0 + 27, px1 - 27, py1 - 27], outline=FRAME, width=2)

    kai_big = ImageFont.truetype(KAI, 168)
    kai_title = ImageFont.truetype(KAI, 84)
    serif_body = ImageFont.truetype(SERIF, 33)
    serif_small = ImageFont.truetype(SERIF, 26)

    PAD = 128
    # 標題：易（大楷）＋ 易經卜卦
    d.text((PAD, 230), "易", font=kai_big, fill=INK, anchor="lm")
    d.text((PAD + 210, 238), "易經卜卦", font=kai_title, fill=INK, anchor="lm")
    # 朱砂短界線（方角）
    d.rectangle([PAD, 332, PAD + 96, 338], fill=CINNABAR)
    # 內文（明體）
    d.text((PAD, 386), "輸入問題、選一個字、定一個地點", font=serif_body, fill=INK2, anchor="lm")
    d.text((PAD, 438), "依康熙筆畫與時辰起卦，得主卦與之卦", font=serif_body, fill=INK2, anchor="lm")
    d.text((PAD, 492), "參倪海廈・王思迅之解　·　梳理問題，照見本心", font=serif_small, fill=MUTED, anchor="lm")
    # 網址
    d.text((PAD, 548), "sofiayan0523.github.io/yijing-divination", font=serif_small, fill=JADE, anchor="lm")

    # 右側卦象（地天泰，動第三爻朱色）
    hx_cx, hx_top = 968, 158
    bot = hexagram(d, hx_cx, hx_top, 176, 26, 20, [1, 1, 1, 0, 0, 0], moving_idx=2)
    kai_label = ImageFont.truetype(KAI, 30)
    d.text((hx_cx, bot + 36), "地 天 泰", font=kai_label, fill=INK2, anchor="mm")

    # 朱印（右下，端正）
    seal(d, 1048, 488, 56)

    img.save(os.path.join(OUT, "og.png"), "PNG")
    print("OK og.png")


def make_favicon_png(size):
    """朱砂方印 icon：方角，紙色「易」。"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, size - 1, size - 1], fill=CINNABAR + (255,))
    inset = max(1, round(size * 0.09))
    d.rectangle([inset, inset, size - 1 - inset, size - 1 - inset],
                outline=PAPER + (255,), width=max(1, size // 32))
    f = ImageFont.truetype(KAI, int(size * 0.58))
    d.text((size / 2, size / 2 + size * 0.02), "易", font=f, fill=PAPER + (255,), anchor="mm")
    img.save(os.path.join(OUT, "icon-%d.png" % size), "PNG")
    print("OK icon-%d.png" % size)


def make_maskable_png(size):
    """maskable icon：全出血朱砂底，內容縮在中央安全區（內 60%），
    Android 圓形/圓角遮罩裁切後印章仍完整。"""
    img = Image.new("RGBA", (size, size), CINNABAR + (255,))
    d = ImageDraw.Draw(img)
    box = size * 0.30  # 內容外框：中央 40%~... 內框畫在 30% 內縮處
    d.rectangle([box, box, size - box, size - box],
                outline=PAPER + (255,), width=max(2, size // 96))
    f = ImageFont.truetype(KAI, int(size * 0.30))
    d.text((size / 2, size / 2 + size * 0.01), "易", font=f, fill=PAPER + (255,), anchor="mm")
    img.save(os.path.join(OUT, "icon-maskable-%d.png" % size), "PNG")
    print("OK icon-maskable-%d.png" % size)


def make_favicon_svg():
    """朱砂方印（方角）＋ 三爻幾何紋（字級太小時比文字可辨）。"""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#b13a23"/>
  <rect x="2.5" y="2.5" width="27" height="27" fill="none" stroke="#efe4cb" stroke-width="1.2"/>
  <g fill="#efe4cb">
    <rect x="8" y="9"  width="16" height="3"/>
    <rect x="8" y="14.5" width="6.4" height="3"/>
    <rect x="17.6" y="14.5" width="6.4" height="3"/>
    <rect x="8" y="20" width="16" height="3"/>
  </g>
</svg>
'''
    open(os.path.join(OUT, "favicon.svg"), "w", encoding="utf-8").write(svg)
    print("OK favicon.svg")


if __name__ == "__main__":
    make_og()
    make_favicon_png(180)
    make_favicon_png(32)
    make_favicon_png(192)
    make_favicon_png(512)
    make_maskable_png(192)
    make_maskable_png(512)
    make_favicon_svg()
