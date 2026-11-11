# -*- coding: utf-8 -*-
"""顺凯达电梯 · 业务范围横幅 生成脚本（v1 迭代用）"""
import numpy as np
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageFilter, ImageEnhance

W, H = 2400, 960
SRC = r"E:\SKD用\官网插图\电梯图\电梯.png"
FB = r"C:\Windows\Fonts\Noto Sans SC Bold (TrueType).otf"
FR = r"C:\Windows\Fonts\Noto Sans SC (TrueType).otf"

NAVY = (5, 11, 38)
PRIMARY = (27, 42, 135)
ORANGE = (242, 106, 33)

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


def put(canvas, layer, cx, cy, shadow=True, s_alpha=110, s_off=4, s_blur=10):
    w, h = layer.size
    x = int(cx - w / 2)
    y = int(cy - h / 2)
    if shadow:
        sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        sh.putalpha(layer.getchannel("A").point(lambda v: int(v * s_alpha / 255)))
        sh = sh.filter(ImageFilter.GaussianBlur(s_blur))
        canvas.alpha_composite(sh, (x, y + s_off))
    canvas.alpha_composite(layer, (x, y))


def grad_v(h, stops):
    """stops: [(y0, a0), (y1, a1) ...] 归一化坐标，线性插值出 h 行 alpha(0-255)"""
    ys = np.arange(h) / max(h - 1, 1)
    return np.interp(ys, [s[0] for s in stops], [s[1] for s in stops]).astype(np.uint8)


def main(out_full, out_clean):
    base = Image.open(SRC).convert("RGB")
    base = cover(base, W, H, focus=0.335)

    gray = base.convert("L")
    duo = ImageOps.colorize(gray, black=(6, 12, 42), white=(150, 181, 235), mid=(22, 34, 104), midpoint=110)
    duo = Image.blend(duo, base, 0.12)
    duo = ImageEnhance.Brightness(duo).enhance(0.95)
    duo = duo.convert("RGBA")

    # 顶部/底部渐深，中段留亮
    a = grad_v(H, [(0, 168), (0.22, 96), (0.52, 76), (0.80, 132), (1, 190)])
    scrim = Image.new("RGBA", (W, H), NAVY)
    scrim.putalpha(Image.fromarray(np.repeat(a[:, None], W, axis=1), "L"))
    duo.alpha_composite(scrim)

    # 文字区椭圆柔光压暗
    yy, xx = np.mgrid[0:H, 0:W]
    ell = np.clip(1 - (((xx - W / 2) / (W * 0.46)) ** 2 + ((yy - H * 0.47) / (H * 0.44)) ** 2), 0, 1) ** 1.4
    ev = Image.fromarray((ell * 112).astype(np.uint8), "L")
    es = Image.new("RGBA", (W, H), (4, 8, 30))
    es.putalpha(ev)
    duo.alpha_composite(es)

    # 左右两侧压边：左侧落地窗是画面最亮处，右侧呼梯面板是硬边亮块，
    # 都会抢标题。用两侧高斯衰减把它们推回背景。
    xg = (0.42 * np.exp(-((xx) / (0.075 * W)) ** 2)
          + 0.42 * np.exp(-(((W - xx)) / (0.075 * W)) ** 2))
    eg = Image.new("RGBA", (W, H), (4, 9, 32))
    eg.putalpha(Image.fromarray(np.clip(xg, 0, 0.45) .__mul__(255).astype(np.uint8), "L"))
    duo.alpha_composite(eg)

    # 四周暗角
    rad = Image.radial_gradient("L").resize((int(W * 1.45), int(H * 1.45)), Image.BILINEAR)
    rad = rad.crop(((rad.width - W) // 2, (rad.height - H) // 2, (rad.width - W) // 2 + W, (rad.height - H) // 2 + H))
    vig = Image.new("RGBA", (W, H), (3, 7, 26))
    vig.putalpha(rad.point(lambda v: int(v * 0.55)))
    duo.alpha_composite(vig)

    clean = duo.copy()

    # ---------- 文字 ----------
    canvas = duo.copy()
    f_tag = ImageFont.truetype(FR, 33)
    f_head = ImageFont.truetype(FB, 98)
    f_eng = ImageFont.truetype(FR, 28)
    f_name = ImageFont.truetype(FB, 42)

    # 三条短句 + 圆点
    tag_layers = [text_layer(t, f_tag, (255, 255, 255, 236), tracking=3) for t in TAGS]
    dot_gap, dot_size = 22, 13
    widths = [dot_size + 14 + l.width for l in tag_layers]
    gap = 66
    total = sum(widths) + gap * (len(widths) - 1)
    x = W / 2 - total / 2
    cy_tag = 238
    for l in tag_layers:
        d = ImageDraw.Draw(canvas)
        cx = x + dot_size / 2
        d.ellipse([cx - dot_size / 2, cy_tag - dot_size / 2, cx + dot_size / 2, cy_tag + dot_size / 2],
                  outline=(255, 255, 255, 210), width=2)
        d.ellipse([cx - 3, cy_tag - 3, cx + 3, cy_tag + 3], fill=(255, 255, 255, 235))
        put(canvas, l, x + dot_size + 14 + l.width / 2, cy_tag, shadow=True, s_alpha=90, s_blur=8)
        x += l.width + dot_size + 14 + gap

    head = text_layer(HEAD, f_head, (255, 255, 255, 255), tracking=7)
    put(canvas, head, W / 2, 392, s_alpha=120, s_off=5, s_blur=14)

    eng = text_layer(ENG, f_eng, (255, 255, 255, 200), tracking=7)
    put(canvas, eng, W / 2, 514, shadow=False)

    # 品牌橙条 + 公司名
    bar_w, bar_h = int(f_name.getlength(NAME) + 4 * (len(NAME) - 1) + 148), 90
    bar = Image.new("RGBA", (bar_w, bar_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    bd.rounded_rectangle([0, 0, bar_w - 1, bar_h - 1], radius=2, fill=ORANGE + (255,))
    canvas.alpha_composite(bar, (int(W / 2 - bar_w / 2), 630))
    nm = text_layer(NAME, f_name, (255, 255, 255, 255), tracking=4)
    put(canvas, nm, W / 2, 630 + bar_h / 2, shadow=False)

    canvas.convert("RGB").save(out_full, quality=93, subsampling=1, optimize=True)
    clean.convert("RGB").save(out_clean, quality=92, subsampling=1, optimize=True)
    print("saved", out_full, canvas.size)


if __name__ == "__main__":
    main(r"E:\E-work-\.tmp\banner\final.jpg", r"E:\E-work-\.tmp\banner\final_clean.jpg")
