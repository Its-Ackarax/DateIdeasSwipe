"""Extract app icons from assets/images/fondwell-logo-concepts.png."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "images" / "fondwell-logo-concepts.png"
OUT = ROOT / "assets" / "images"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Place the logo sheet at: {SRC}")

    img = Image.open(SRC).convert("RGBA")
    w, h = img.size

    # Bottom panel contains the 1024px app icon (left) and favicon (right).
    section_top = int(h * 0.62)
    section = img.crop((0, section_top, w, h))
    sw, sh = section.size

    icon_size = int(min(sw, sh) * 0.55)
    left = int(sw * 0.08)
    top = int(sh * 0.12)
    icon = section.crop((left, top, left + icon_size, top + icon_size))
    icon = icon.resize((1024, 1024), Image.Resampling.LANCZOS)

    for name, size in [
        ("icon.png", 1024),
        ("splash-icon.png", 1024),
        ("android-icon-foreground.png", 1024),
        ("favicon.png", 48),
    ]:
        icon.resize((size, size), Image.Resampling.LANCZOS).save(OUT / name, "PNG")

    Image.new("RGBA", (1024, 1024), (253, 164, 175, 255)).save(
        OUT / "android-icon-background.png", "PNG"
    )
    icon.convert("L").convert("RGBA").save(OUT / "android-icon-monochrome.png", "PNG")
    print("Exported Fondwell icons to assets/images/")
