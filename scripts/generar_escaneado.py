#!/usr/bin/env python3
"""Genera recursos/escaneado.jpg: una «página escaneada» con texto grande para probar el OCR (sin capa de texto)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

raiz = Path(__file__).resolve().parent.parent
salida = raiz / 'recursos' / 'escaneado.jpg'
img = Image.new('RGB', (1600, 700), 'white')
d = ImageDraw.Draw(img)
fuente = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 120)
d.text((120, 70), 'HOLA MUNDO', fill='black', font=fuente)
d.text((120, 230), 'LIBERADO PDF', fill='black', font=fuente)
fuente2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 64)
d.text((120, 450), 'Texto escaneado sin capa de texto.', fill=(40, 40, 40), font=fuente2)
img.save(salida, 'JPEG', quality=90)
print(salida, img.size)
# Versión tumbada (como sale de un escáner apaisado): con /Rotate 90 en el PDF se ve derecha.
tumbada = img.rotate(90, expand=True)
tumbada.save(raiz / 'recursos' / 'escaneado_tumbado.jpg', 'JPEG', quality=90)
print(raiz / 'recursos' / 'escaneado_tumbado.jpg', tumbada.size)
