#!/usr/bin/env python3
"""Genera recursos/icono.png (512x512) y recursos/icono.ico: página con esquina doblada y un «play» blanco."""
from pathlib import Path
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
AZUL = (0, 119, 182, 255)
BLANCO = (255, 255, 255, 255)
GRIS = (210, 226, 236, 255)


def dibujar(tamano: int) -> Image.Image:
    im = Image.new("RGBA", (tamano, tamano), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = tamano / 512
    radio = int(96 * u)
    d.rounded_rectangle([0, 0, tamano - 1, tamano - 1], radius=radio, fill=AZUL)
    # página
    x0, y0, x1, y1 = 136 * u, 88 * u, 376 * u, 424 * u
    doblez = 72 * u
    d.polygon([(x0, y0), (x1 - doblez, y0), (x1, y0 + doblez), (x1, y1), (x0, y1)], fill=BLANCO)
    d.polygon([(x1 - doblez, y0), (x1 - doblez, y0 + doblez), (x1, y0 + doblez)], fill=GRIS)
    # play
    cx, cy, r = 256 * u, 268 * u, 68 * u
    d.polygon([(cx - r * 0.75, cy - r), (cx - r * 0.75, cy + r), (cx + r, cy)], fill=AZUL)
    return im


def main() -> None:
    recursos = RAIZ / "recursos"
    grande = dibujar(512)
    grande.save(recursos / "icono.png")
    tamanos = [16, 32, 48, 64, 128, 256]
    imagenes = [dibujar(t) for t in tamanos]
    imagenes[-1].save(recursos / "icono.ico", format="ICO", sizes=[(t, t) for t in tamanos], append_images=imagenes[:-1])
    print("icono.png e icono.ico generados en", recursos)


if __name__ == "__main__":
    main()
