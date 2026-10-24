// Archivos de prueba del humo (Linux y Windows): PDF con caracteres raros, notas, PNG, PDF cifrado/truncado/con
// object streams/optimizado, escaneado girado, HTML con iframe roto… Todo se genera en `salida` sin dependencias
// externas (PNG a mano, qpdf-wasm y pdf-lib en Node).
import path from 'node:path';
import zlib from 'node:zlib';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import pdfLib from 'pdf-lib';

export async function generarFixtures({ raiz, salida }) {
  const carpetaHumo = path.join(salida, 'humo');
  // Review Focus 1: ruta con espacios, ñ, # y %
  const pdfPrueba = path.join(salida, 'ñandú #2 100%.pdf');
  mkdirSync(salida, { recursive: true });
  rmSync(carpetaHumo, { recursive: true, force: true });
  copyFileSync(path.join(raiz, 'recursos', 'ejemplo_animado.pdf'), pdfPrueba);

  // Imágenes para «Imágenes a PDF»: PNG RGBA sin dependencias (filtro 0 por fila, zlib) y un .jpg falso.
  function png(ancho, alto, pixel) {
    const filas = Buffer.alloc((ancho * 4 + 1) * alto);
    for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) Buffer.from(pixel(x, y)).copy(filas, y * (ancho * 4 + 1) + 1 + x * 4);
    const trozo = (tipo, datos) => { const len = Buffer.alloc(4); len.writeUInt32BE(datos.length); const td = Buffer.concat([Buffer.from(tipo), datos]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td)); return Buffer.concat([len, td, crc]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), trozo('IHDR', ihdr), trozo('IDAT', zlib.deflateSync(filas)), trozo('IEND', Buffer.alloc(0))]);
  }
  const imagenA = path.join(salida, 'imagen_a.png'), imagenB = path.join(salida, 'imagen_b.png'), imagenFalsa = path.join(salida, 'falsa.jpg');
  writeFileSync(imagenA, png(80, 60, () => [220, 30, 30, 255]));
  writeFileSync(imagenB, png(60, 90, (x, y) => [30, 30, 220, x < 30 ? 255 : 90])); // mitad transparente
  writeFileSync(imagenFalsa, 'esto no es una imagen\n');
  // PDF cifrado (qpdf-wasm en Node: usuario «clave», propietario «dueño») y PDF truncado para «reparar».
  const cifradoPrueba = path.join(salida, 'cifrado.pdf');
  const truncadoPrueba = path.join(salida, 'truncado.pdf');
  {
    const crearQpdf = createRequire(import.meta.url)('@neslinesli93/qpdf-wasm');
    const avisos = [];
    const qpdf = await crearQpdf({ preRun: [(M) => M.FS.init(null, c => c === 10 && avisos.push('salida'), c => c === 10 && avisos.push('aviso'))] });
    const ejemplo = readFileSync(path.join(raiz, 'recursos', 'ejemplo_animado.pdf'));
    qpdf.FS.writeFile('in.pdf', ejemplo);
    const codigo = qpdf.callMain(['--encrypt', 'clave', 'dueño', '256', '--', 'in.pdf', 'out.pdf']);
    if (codigo !== 0) throw new Error(`qpdf no pudo cifrar el ejemplo (código ${codigo})`);
    writeFileSync(cifradoPrueba, Buffer.from(qpdf.FS.readFile('out.pdf')));
    writeFileSync(truncadoPrueba, ejemplo.subarray(0, ejemplo.length - 300));
  }
  const htmlPrueba = path.join(salida, 'prueba.html');
  // Un iframe que no carga (puerto cerrado) no debe invalidar la conversión de la página principal.
  writeFileSync(htmlPrueba, '<!doctype html><meta charset="utf-8"><title>Prueba</title><h1>Hola liberadoPDF</h1><p>Página de prueba del humo.</p><iframe src="http://127.0.0.1:1/" width="10" height="10"></iframe>\n');
  // Una PNG con nombre .jpg (debe aceptarse como PNG) y el JPEG con EXIF girado.
  const pngComoJpg = path.join(salida, 'png_como_jpg.jpg');
  writeFileSync(pngComoJpg, png(80, 60, () => [60, 200, 60, 255]));
  const fotoExif = path.join(raiz, 'recursos', 'foto_exif.jpg');
  // Ejemplo con CropBox (numerar debe caer dentro), escaneado girado 90° (OCR) y truncado con object streams (reparar).
  const recortadoPrueba = path.join(salida, 'recortado.pdf');
  const escaneadoGirado = path.join(salida, 'escaneado_girado.pdf');
  const truncadoObjstm = path.join(salida, 'truncado_objstm.pdf');
  const optimizadoPrueba = path.join(salida, 'optimizado.pdf');
  {
    const { PDFDocument, degrees } = pdfLib;
    const d1 = await PDFDocument.load(readFileSync(path.join(raiz, 'recursos', 'ejemplo_animado.pdf')), { updateMetadata: false });
    for (const p of d1.getPages()) p.setCropBox(60, 40, 300, 150);
    writeFileSync(recortadoPrueba, await d1.save());
    const d2 = await PDFDocument.load(readFileSync(path.join(raiz, 'recursos', 'ejemplo_escaneado_girado.pdf')), { updateMetadata: false });
    d2.getPage(0).setRotation(degrees(90)); // la imagen va tumbada: así se ve derecha, como un escaneo real
    writeFileSync(escaneadoGirado, await d2.save());
    const crearQpdf = createRequire(import.meta.url)('@neslinesli93/qpdf-wasm');
    const q = await crearQpdf({ preRun: [(M) => M.FS.init(null, () => {}, () => {})] });
    q.FS.writeFile('in.pdf', readFileSync(path.join(raiz, 'recursos', 'ejemplo_animado.pdf')));
    if (q.callMain(['--object-streams=generate', 'in.pdf', 'out.pdf']) !== 0) throw new Error('qpdf no pudo generar object streams');
    const conObjstm = Buffer.from(q.FS.readFile('out.pdf'));
    writeFileSync(truncadoObjstm, conObjstm.subarray(0, conObjstm.length - 300));
    // Sin imágenes y ya recomprimido por qpdf: «Comprimir» no puede reducirlo (caso «No se pudo reducir»).
    if (q.callMain(['--object-streams=generate', '--recompress-flate', '--compression-level=9', 'in.pdf', 'opt.pdf']) !== 0) throw new Error('qpdf no pudo optimizar');
    writeFileSync(optimizadoPrueba, Buffer.from(q.FS.readFile('opt.pdf')));
  }
  return { pdfPrueba, carpetaHumo, imagenA, imagenB, imagenFalsa, pngComoJpg, fotoExif, htmlPrueba, cifradoPrueba, truncadoPrueba, truncadoObjstm, optimizadoPrueba, recortadoPrueba, escaneadoGirado };
}

// Uso directo: node scripts/fixtures.mjs <carpeta de salida>  (lo usa humo_windows.sh)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const salida = path.resolve(process.argv[2] ?? path.join(raiz, 'test', 'salida'));
  const f = await generarFixtures({ raiz, salida });
  console.log(JSON.stringify(f));
}
