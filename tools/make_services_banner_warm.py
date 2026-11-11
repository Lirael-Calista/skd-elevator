# -*- coding: utf-8 -*-
"""顺凯达电梯 · 业务范围横幅 v5（在业务图3/warm_v3 基础上做三处定点修改）
1. 短句：字号 33 -> 36，字色加深到深宝蓝，并加一层极淡白光晕脱离背景
2. 英文：暖灰 -> 深蓝灰
3. 公司名条：底色换商标橙 #F26A21，白字
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 2400, 1090
SRC = r"E:\SKD用\官网插图\电梯1.png"
FB = r"C:\Windows\Fonts\Noto Sans SC Bold (TrueType).otf"
FR = r"C:\Windows\Fonts\Noto Sans SC (TrueType).otf"

INK = (18, 34, 96)         # 主标题：深宝蓝
INK_2 = (22, 42, 112)      # 短句：原 (36,62,140) 加深
INK_3 = (38, 48, 92)      # 英文：原暖灰 (104,104,118) 加深为深蓝灰
ORANGE = (234, 90, 0)      # 商标橙 #EA5A00（从 logo-mark.png 逐像素采样）

TAGS = ["持证经营", "全链条服务", "7×24 应急响应"]
HEAD = "电梯销售、安装、改造、维修保养"
ENG = "ELEVATOR SALES · INSTALLATION · MODERNIZATION · MAINTENANCE"
NAME = "深圳市顺凯达电梯有限公司"


def cover(im, w, h, focus=0.5):
    s = max(w / im.width, h / im.height)
    im2 = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (im2.width - w) // 2
    y = int((im2.height - h) * focus)
    return im2.crop((x, y, x + w, y + h))


def softlight(b, s):
    d = np.where(b <= 0.25, ((16 * b - 12) * b + 4) * b, np.sqrt(np.clip(b, 0, 1)))
    return np.where(s <= 0.5, b - (1 - 2 * s) * b * (1 - b), b + (2 * s - 1) * (d - b))


def text_layer(text, font, fill, tracking=0, pad=60):
    widths = [font.getlength(c) for c in text]
    total = sum(widths) + tracking * (len(text) - 1)
    ink = font.getbbox(text)
    tw = int(np.ceil(total)) + pad * 2
    th = (ink[3] - ink[1]) + pad * 2
    layer = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x = pad
    base = pad + ink[3]
    for c, cw in zip(text, widths):
        d.text((x, base), c, font=font, fill=fill, anchor="ls")
        x += cw + tracking
    return layer.crop(layer.getbbox())


def put(canvas, layer, cx, cy, glow=None, g_alpha=0, g_off=3, g_blur=12):
    w, h = layer.size
    x = int(cx - w / 2)
    y = int(cy - h / 2)
    if glow and g_alpha:
        gl = Image.new("RGBA", layer.size, glow)
        gl.putalpha(layer.getchannel("A").point(lambda v: int(v * g_alpha / 255)))
        gl = gl.filter(ImageFilter.GaussianBlur(g_blur))
        canvas.alpha_composite(gl, (x, y + g_off))
    canvas.alpha_composite(layer, (x, y))


def main(out_full, out_clean):
    base = cover(Image.open(SRC).convert("RGB"), W, H, focus=0.30)
    a = np.asarray(base).astype(np.float32) / 255.0

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    # ① 提暗部 + 微对比
    a = np.clip((a - 0.5) * 1.05 + 0.5, 0, 1)
    a = a * 0.94 + 0.055

    # ② 推暖：通道偏移 + 饱和度 + 奶油柔光
    a = a * np.array([1.045, 0.985, 0.905], dtype=np.float32)
    mx = a.max(axis=2, keepdims=True)
    a = np.clip(mx + (a - mx) * 1.12, 0, 1)
    a = softlight(a, np.array([1.0, 0.945, 0.875], dtype=np.float32))

    # ③ 顶部浅橙顶光
    m_warm = np.clip(1 - np.sqrt(((xx - W * 0.52) / (W * 0.62)) ** 2 + ((yy + H * 0.10) / (H * 0.78)) ** 2), 0, 1) ** 1.3
    a = a * (1 - (m_warm * 0.40)[..., None]) + (m_warm * 0.40)[..., None] * np.array([1.0, 0.855, 0.70], dtype=np.float32)

    # ④ 左下天光 + 地面反光偏浅蓝
    m_cool = np.clip(1 - np.sqrt(((xx - W * 0.06) / (W * 0.62)) ** 2 + ((yy - H * 1.02) / (H * 0.95)) ** 2), 0, 1) ** 1.2
    m_cool = np.clip(m_cool + np.clip((yy / H - 0.72) / 0.28, 0, 1) * 0.55, 0, 1)
    a = a * (1 - (m_cool * 0.26)[..., None]) + (m_cool * 0.26)[..., None] * np.array([0.76, 0.87, 1.0], dtype=np.float32)

    # ⑤ 文字区微提暖白
    ell = np.clip(1 - (((xx - W / 2) / (W * 0.52)) ** 2 + ((yy - H * 0.46) / (H * 0.46)) ** 2), 0, 1) ** 1.6
    a = a + (1 - a) * (ell[..., None] * 0.20 * np.array([1.0, 0.99, 0.96], dtype=np.float32))

    # ⑥ 边缘极淡提亮
    rad = Image.radial_gradient("L").resize((int(W * 1.5), int(H * 1.5)), Image.BILINEAR)
    rad = rad.crop(((rad.width - W) // 2, (rad.height - H) // 2,
                    (rad.width - W) // 2 + W, (rad.height - H) // 2 + H))
    rv = np.asarray(rad).astype(np.float32) / 255.0
    a = a + (1 - a) * (rv[..., None] * 0.14 * np.array([1.0, 0.98, 0.95], dtype=np.float32))

    duo = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), "RGB").convert("RGBA")
    clean = duo.copy()
    canvas = duo.copy()

    f_tag = ImageFont.truetype(FB, 38)
    f_head = ImageFont.truetype(FB, 98)
    f_eng = ImageFont.truetype(FR, 30)
    f_name = ImageFont.truetype(FB, 42)

    tag_layers = [text_layer(t, f_tag, INK_2 + (255,), tracking=2) for t in TAGS]
    dot, gap = 14, 64
    widths = [dot + 14 + l.width for l in tag_layers]
    total = sum(widths) + gap * (len(widths) - 1)
    x = W / 2 - total / 2
    cy_tag = 272
    d = ImageDraw.Draw(canvas)
    for l in tag_layers:
        cx = x + dot / 2
        cy_d = cy_tag + 3   # 字形视觉中心比排版框中心低 3px，圆点跟着下移
        d.ellipse([cx - dot / 2, cy_d - dot / 2, cx + dot / 2, cy_d + dot / 2],
                  outline=ORANGE + (245,), width=3)
        d.ellipse([cx - 3.5, cy_d - 3.5, cx + 3.5, cy_d + 3.5], fill=ORANGE + (255,))
        put(canvas, l, x + dot + 14 + l.width / 2, cy_tag,
            glow=(255, 253, 248), g_alpha=90, g_off=0, g_blur=8)
        x += l.width + dot + 14 + gap

    put(canvas, text_layer(HEAD, f_head, INK + (255,), tracking=7), W / 2, 448,
        glow=(255, 252, 246), g_alpha=110, g_blur=13)
    put(canvas, text_layer(ENG, f_eng, INK_3 + (255,), tracking=5), W / 2, 588)

    # ── 公司名橙色方框：按要求整块去掉（连框带里面的白字）──
    # 只去掉这一层，上面三行文字（短句 / 主标题 / 英文）与底图、调色一律不动。
    # 之所以连白字一起去掉：白字原本是靠橙底托着才成立的（白 vs 暖白底约 1.5:1，
    # 去掉框就彻底看不见了），留着等于在图上留一块读不出来的白影。

    canvas.convert("RGB").save(out_full, quality=91, subsampling=1, optimize=True)
    clean.convert("RGB").save(out_clean, quality=92, subsampling=1, optimize=True)
    print("saved", out_full)


if __name__ == "__main__":
    main(r"E:\E-work-\.tmp\banner\v7.jpg", r"E:\E-work-\.tmp\banner\v7_clean.jpg")
