from pathlib import Path
from PIL import Image

src = Path(r"C:\Users\ashah\Desktop\nexus-app\frontend\public\brand\equiti-wordmark.png")
im = Image.open(src).convert("RGBA")
pixels = im.load()
w, h = im.size

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if r > 220 and g > 220 and b > 220:
            pixels[x, y] = (0, 0, 0, 0)
        elif r < 40 and g < 40 and b < 40:
            pixels[x, y] = (0, 0, 0, 0)

min_x, min_y, max_x, max_y = w, h, 0, 0
found = False
for y in range(h):
    for x in range(w):
        if pixels[x, y][3] > 20:
            found = True
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

if not found:
    raise SystemExit("no opaque pixels")

pad = 6
min_x = max(0, min_x - pad)
min_y = max(0, min_y - pad)
max_x = min(w - 1, max_x + pad)
max_y = min(h - 1, max_y + pad)
crop = im.crop((min_x, min_y, max_x + 1, max_y + 1))

out_word = Path(r"C:\Users\ashah\Desktop\nexus-app\frontend\public\brand\equiti-wordmark.png")
out_logo = Path(r"C:\Users\ashah\Desktop\nexus-app\frontend\public\brand\equiti-logo.png")
crop.save(out_word)
crop.save(out_logo)
print(f"cropped {crop.size[0]}x{crop.size[1]} from {w}x{h} bbox=({min_x},{min_y})-({max_x},{max_y})")
