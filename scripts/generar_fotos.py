#!/usr/bin/env python3
"""Genera recursos/foto_1.jpg y foto_2.jpg (2000×1500, ruido de color: pesan mucho) para probar «Comprimir»."""
from pathlib import Path
import random
from PIL import Image, ImageDraw

raiz = Path(__file__).resolve().parent.parent
random.seed(7)
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
