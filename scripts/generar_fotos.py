#!/usr/bin/env python3
"""Genera recursos/foto_1.jpg y foto_2.jpg (2000×1500, ruido de color: pesan mucho) para probar «Comprimir»."""
from pathlib import Path
import random
from PIL import Image, ImageDraw

raiz = Path(__file__).resolve().parent.parent
random.seed(7)
# PNG con degradado: pdflatex la incrusta como Flate con predictor PNG (DecodeParms); «Comprimir» debe respetarla.
grad = Image.new('RGB', (400, 300))
px = grad.load()
for y in range(300):
    for x in range(400):
        px[x, y] = (int(255 * x / 399), int(255 * y / 299), 128)
# Ruido fino (±8): Flate comprime mal el ruido, así el JPEG gana y «Comprimir» recodifica de verdad esta imagen.
ruido = Image.effect_noise((400, 300), 8).convert('RGB')
grad = Image.blend(grad, ruido, 0.12)
grad.save(raiz / 'recursos' / 'grad.png', 'PNG')
# JPEG pequeño con orientación EXIF 6 (girado 90°): «Imágenes a PDF» debe enderezarlo.
exif_img = Image.new('RGB', (200, 100), (30, 160, 60))
ImageDraw.Draw(exif_img).rectangle((0, 0, 60, 99), fill=(240, 240, 40))
exif = Image.Exif()
exif[0x0112] = 6
exif_img.save(raiz / 'recursos' / 'foto_exif.jpg', 'JPEG', quality=85, exif=exif.tobytes())
for n, color in ((1, (200, 60, 60)), (2, (60, 90, 200))):
    img = Image.effect_noise((2000, 1500), 80).convert('RGB')
    capa = Image.new('RGB', img.size, color)
    img = Image.blend(img, capa, 0.35)
    d = ImageDraw.Draw(img)
    d.rectangle((200, 200, 1800, 1300), outline='black', width=12)
    d.text((240, 240), f'Foto {n}', fill='black')
    salida = raiz / 'recursos' / f'foto_{n}.jpg'
    img.save(salida, 'JPEG', quality=92)
    print(salida, salida.stat().st_size)
