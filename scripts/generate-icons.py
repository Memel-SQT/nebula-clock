"""Render the Nebula Clock mark at arbitrary sizes.

Family cues kept from the Nebula desktop app: the #1A1A2E rounded card at
r=24/100 and the #4C6EF5 -> #A855F7 diagonal gradient. What makes it this
product is a clock face - a closed ring with two hands.

An earlier attempt used an open ring with a bar rising through the gap at
the top. That is the universal power symbol, and it read as one, so the ring
is closed and the hands are set away from the vertical.
"""

import math
import os
import struct
from PIL import Image, ImageDraw

# Where to write. Defaults to a scratch folder next to this script.
OUT = os.environ.get("OUT", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons-out"))
CARD = (0x1A, 0x1A, 0x2E, 255)
C0 = (0x4C, 0x6E, 0xF5)   # Nebula blue
C1 = (0xA8, 0x55, 0xF7)   # Nebula violet-bright
SS = 8                     # supersample factor

# Geometry in the 0..100 viewBox, shared with the SVG so the two never drift.
RING_R = 32.0
RING_W = 8.0
HAND_W = 7.5
MINUTE_LEN = 17.5          # to 12 o'clock
HOUR_LEN = 12.5
HOUR_ANGLE = 30.0          # degrees from 3 o'clock, clockwise -> 4 o'clock


def gradient(w, h):
    """Diagonal top-left to bottom-right, matching the SVG linearGradient."""
    g = Image.new("RGB", (w, h))
    px = g.load()
    denom = max(w - 1, 1) + max(h - 1, 1)
    for y in range(h):
        for x in range(w):
            t = (x + y) / denom
            px[x, y] = tuple(round(C0[i] + (C1[i] - C0[i]) * t) for i in range(3))
    return g


def render(size):
    s = size * SS
    u = s / 100.0
    px = lambda v: v * u

    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # Rounded Nebula card.
    card_mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(card_mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=round(px(24)), fill=255)
    img.paste(Image.new("RGBA", (s, s), CARD), (0, 0), card_mask)

    # Everything above the card is painted through one shared gradient, so the
    # ring and the hand read as a single stroke of colour.
    mark = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(mark)

    outer = RING_R + RING_W / 2
    d.ellipse(
        [px(50 - outer), px(50 - outer), px(50 + outer), px(50 + outer)],
        fill=255,
    )
    inner = RING_R - RING_W / 2
    d.ellipse(
        [px(50 - inner), px(50 - inner), px(50 + inner), px(50 + inner)],
        fill=0,
    )

    # Two hands with round caps, drawn as a thick line plus end discs.
    cap = px(HAND_W / 2)
    for length, angle in ((MINUTE_LEN, -90.0), (HOUR_LEN, HOUR_ANGLE)):
        tx = px(50 + length * math.cos(math.radians(angle)))
        ty = px(50 + length * math.sin(math.radians(angle)))
        d.line([px(50), px(50), tx, ty], fill=255, width=round(px(HAND_W)))
        for cx, cy in ((px(50), px(50)), (tx, ty)):
            d.ellipse([cx - cap, cy - cap, cx + cap, cy + cap], fill=255)

    img.paste(gradient(s, s), (0, 0), mark)
    return img.resize((size, size), Image.LANCZOS)


def icns(entries, path):
    """Minimal ICNS container: 'icns' + length, then typed PNG chunks."""
    types = {16: b"icp4", 32: b"icp5", 64: b"icp6", 128: b"ic07",
             256: b"ic08", 512: b"ic09", 1024: b"ic10"}
    body = b""
    for size, data in entries:
        if size in types:
            body += types[size] + struct.pack(">I", len(data) + 8) + data
    with open(path, "wb") as f:
        f.write(b"icns" + struct.pack(">I", len(body) + 8) + body)


os.makedirs(f"{OUT}/png", exist_ok=True)
sizes = [16, 32, 48, 64, 128, 192, 256, 512, 1024]
images = {n: render(n) for n in sizes}
for n, im in images.items():
    im.save(f"{OUT}/png/icon-{n}.png")

images[256].save(
    f"{OUT}/icon.ico",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
icns([(n, open(f"{OUT}/png/icon-{n}.png", "rb").read()) for n in (16, 32, 64, 128, 256, 512, 1024)],
     f"{OUT}/icon.icns")

# Maskable PWA icons: the mark inset on an opaque card, inside the safe zone.
for n in (192, 512):
    base = Image.new("RGBA", (n, n), CARD)
    inner = render(round(n * 0.72))
    off = (n - inner.width) // 2
    base.paste(inner, (off, off), inner)
    base.save(f"{OUT}/png/maskable-{n}.png")

print("logo rendered")
print(f"wrote {OUT}")
print("Copy into apps/desktop/build, apps/desktop/resources, apps/web/public and docs/brand.")
