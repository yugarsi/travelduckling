"""One-shot helper: turn the raw logo export into the two web assets.

Reads assets/images/logo-full.png (cream background, duck above the wordmark) and writes:
  assets/images/logo-lockup.png - whole lockup, background knocked out
  assets/images/logo-duck.png   - just the duck + dashed trail + pin
  assets/images/logo-mark.png   - the duck on its own, for small placements

Run with the .venv-img interpreter: .venv-img/bin/python tools/prepare-logo.py
"""

import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "images", "logo-full.png")

# How far a pixel may stray from the sampled background colour and still be
# treated as background. Tight enough to keep the white goggle/eye glints.
TOLERANCE = 26


def background_colour(img):
    """Average the four corners - the export has a flat cream field."""
    w, h = img.size
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    samples = [img.getpixel(p) for p in corners]
    return tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))


def knock_out(img, bg):
    """Alpha-zero every pixel within TOLERANCE of bg, feathering the edge."""
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dist = max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2]))
            if dist <= TOLERANCE:
                # Ramp alpha across the tolerance band so edges stay smooth
                # instead of turning into a hard 1px staircase. Anything that
                # lands near-zero is snapped to zero, otherwise a film of
                # alpha=1 survives across the whole field and defeats getbbox.
                faded = int(a * (dist / TOLERANCE) ** 2)
                px[x, y] = (r, g, b, faded if faded > 6 else 0)
    return img


def content_rows(img):
    """Row indices that hold any meaningful ink."""
    alpha = img.getchannel("A")
    w, h = img.size
    rows = []
    for y in range(h):
        if max(alpha.crop((0, y, w, y + 1)).getdata()) > 24:
            rows.append(y)
    return rows


def widest_gap(rows):
    """Largest run of empty rows - the gutter between duck and wordmark."""
    best = (0, None)
    for prev, nxt in zip(rows, rows[1:]):
        if nxt - prev > best[0]:
            best = (nxt - prev, (prev, nxt))
    return best[1]


def isolate_largest_blob(img):
    """Keep only the biggest connected opaque region, cropped to it.

    The duck (body, goggles and backpack all touch) is one large blob; the
    trail dashes and the map pin are separate small ones. Masking to the blob
    rather than to its bounding box drops the dashes that would otherwise
    sit inside the duck's corners.
    """
    alpha = img.getchannel("A").load()
    w, h = img.size
    seen = bytearray(w * h)
    best = (0, None)

    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or alpha[sx, sy] <= 24:
                continue
            stack, blob = [(sx, sy)], []
            seen[sy * w + sx] = 1
            while stack:
                x, y = stack.pop()
                blob.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                        if alpha[nx, ny] > 24:
                            seen[ny * w + nx] = 1
                            stack.append((nx, ny))
            if len(blob) > best[0]:
                best = (len(blob), blob)

    blob = best[1]
    if not blob:
        raise SystemExit("no opaque pixels to isolate")

    keep = Image.new("L", (w, h), 0)
    keep_px = keep.load()
    for x, y in blob:
        keep_px[x, y] = 255

    out = img.copy()
    out.putalpha(Image.composite(img.getchannel("A"), Image.new("L", (w, h), 0), keep))
    return out.crop(out.getbbox())


def main():
    img = Image.open(SRC).convert("RGBA")
    bg = background_colour(img)
    print("background sampled as", bg)

    img = knock_out(img, bg)

    lockup = img.crop(img.getbbox())
    lockup.save(os.path.join(ROOT, "assets", "images", "logo-lockup.png"))
    print("assets/images/logo-lockup.png", lockup.size)

    rows = content_rows(img)
    gap = widest_gap(rows)
    if gap is None:
        raise SystemExit("could not find the gutter above the wordmark")
    print("gutter rows", gap)

    duck = img.crop((0, 0, img.size[0], gap[0] + 1))
    duck = duck.crop(duck.getbbox())
    duck.save(os.path.join(ROOT, "assets", "images", "logo-duck.png"))
    print("assets/images/logo-duck.png", duck.size)

    mark = isolate_largest_blob(duck)
    mark.save(os.path.join(ROOT, "assets", "images", "logo-mark.png"))
    print("assets/images/logo-mark.png", mark.size)


if __name__ == "__main__":
    main()
