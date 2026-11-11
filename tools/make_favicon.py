#!/usr/bin/env python3
"""从 assets/logo-mark.png 生成站点图标。

产物：
  favicon.ico           16/32/48/64 四档（PNG 负载，浏览器与 Windows 均识别）
  favicon-32.png        现代浏览器按 link[rel=icon] 取用
  apple-touch-icon.png  180×180 不透明（iOS 自己加圆角，透明会被填黑）

设计：白色圆角方块 + 商标 SKD 本体，保证在深色/浅色标签栏里都不糊。
"""
from PIL import Image, ImageDraw

SRC = "assets/logo-mark.png"
TILE = (255, 255, 255, 255)
RADIUS_RATIO = 0.19          # 圆角半径 / 画布边长
MARK_WIDTH_RATIO = 0.80      # 商标宽度 / 画布边长


def tile(size: int, rounded: bool = True) -> Image.Image:
    """白底方块 + 居中的商标，返回 RGBA。"""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    if rounded:
        r = int(size * RADIUS_RATIO)
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=TILE)
    else:
        draw.rectangle([0, 0, size, size], fill=TILE)

    mark = Image.open(SRC).convert("RGBA")
    # 裁掉四周透明留白，否则商标在方块里会显得偏小
    bbox = mark.split()[3].getbbox()
    if bbox:
        mark = mark.crop(bbox)

    target_w = size * MARK_WIDTH_RATIO
    scale = target_w / mark.width
    mark = mark.resize(
        (max(1, round(mark.width * scale)), max(1, round(mark.height * scale))),
        Image.LANCZOS,
    )
    canvas.alpha_composite(
        mark, ((size - mark.width) // 2, (size - mark.height) // 2)
    )
    return canvas


def write_ico(path: str, sizes=(16, 32, 48, 64)) -> None:
    """手写 ICO 容器：每个尺寸都由矢量源重新渲染，避免逐级缩放导致发虚。"""
    import struct

    pngs = []
    for s in sizes:
        buf = __import__("io").BytesIO()
        tile(s).save(buf, format="PNG", optimize=True)
        pngs.append((s, buf.getvalue()))

    header = struct.pack("<HHH", 0, 1, len(pngs))
    offset = 6 + 16 * len(pngs)
    entries, blobs = b"", b""
    for s, data in pngs:
        entries += struct.pack(
            "<BBBBHHII", s if s < 256 else 0, s if s < 256 else 0, 0, 0, 1, 32,
            len(data), offset,
        )
        blobs += data
        offset += len(data)
    with open(path, "wb") as f:
        f.write(header + entries + blobs)


if __name__ == "__main__":
    write_ico("favicon.ico")
    tile(32).save("favicon-32.png", optimize=True)
    # iOS 不吃透明，换实底且不加圆角（系统自己裁）
    tile(180, rounded=False).convert("RGB").save("apple-touch-icon.png", optimize=True)
    print("已生成 favicon.ico / favicon-32.png / apple-touch-icon.png")
