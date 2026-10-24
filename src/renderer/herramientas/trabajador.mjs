// Web Worker de las herramientas: pdf-lib y qpdf corren aquí para no bloquear el visor.
import { ajustarEnPagina, tamanoDePagina } from '../comun/herramientas/imagenes.mjs';
import { reconstruirXref } from '../comun/herramientas/reparacion.mjs';
import { tamanoDeFuente, textoWinAnsi } from '../comun/herramientas/ocr.mjs';
import { cajaVisible } from '../comun/herramientas/caja.mjs';
import { despredecir } from '../comun/herramientas/prediccion.mjs';
import { expandirObjectStreams } from '../comun/herramientas/reparacion.mjs';
import { textoDeNumero, posicionDeTexto, mosaicoDeMarca, colorHex, origenCentrado, aCoordenadasSinRotar, tamanoVisual } from '../comun/herramientas/estampar.mjs';
// Protocolo: { id, operacion, argumentos } → mensajes { id, progreso } y al final { id, resultado } | { id, error } | { id, cancelado }.
let pdfLib = null;
let qpdfModulo = null;
let sesionImagenes = null; // { id, doc, objetos } de la última listarImagenes (una sola a la vez)
let contadorSesiones = 0;
const cancelados = new Set();

async function cargarPdfLib() {
  pdfLib ??= await import('/lib/pdf-lib/pdf-lib.esm.min.js');
  return pdfLib;
}

// qpdf.js es CommonJS (module.exports = Module): se evalúa con una función envoltorio.
async function cargarQpdf() {
  if (qpdfModulo) return qpdfModulo;
  const fuente = await (await fetch('/lib/qpdf/qpdf.js')).text();
  const modulo = {};
  new Function('module', 'exports', fuente)(modulo, {});
  qpdfModulo = modulo.exports;
  return qpdfModulo;
}

// Ejecuta qpdf con archivos en su sistema de archivos virtual: entradas { nombre: bytes }; devuelve la salida y los avisos.
// La compilación de qpdf-wasm descarta `print`/`printErr`: la salida se captura con FS.init por carácter en preRun.
export async function qpdf(args, { entradas = {}, salida = 'salida.pdf' } = {}) {
  const crear = await cargarQpdf();
  const mensajes = [];
  let linea = [];
  const sumidero = (c) => { if (c === null || c === 10) { if (linea.length) mensajes.push(new TextDecoder().decode(new Uint8Array(linea))); linea = []; } else linea.push(c); };
  const modulo = await crear({
    locateFile: () => '/lib/qpdf/qpdf.wasm',
    noInitialRun: true,
    preRun: [(M) => M.FS.init(null, sumidero, sumidero)],
  });
  for (const [nombre, bytes] of Object.entries(entradas)) modulo.FS.writeFile(nombre, bytes);
  let codigo = 0;
  try { codigo = modulo.callMain(args); } catch (e) { codigo = typeof e === 'number' ? e : (e?.status ?? 1); if (!(typeof e === 'number' || e?.status !== undefined)) mensajes.push(String(e?.message ?? e)); }
  sumidero(null);
  let bytes = null;
  try { bytes = modulo.FS.readFile(salida); } catch { bytes = null; }
  return { codigo, bytes, avisos: mensajes };
}

const cancelado = (id) => cancelados.has(id);
const progreso = (id, hecho, total, texto) => postMessage({ id, progreso: { hecho, total, texto } });

// Flate (zlib) con la API del navegador, para los object streams de «Reparar».
async function inflar(bytes) {
  const ds = new DecompressionStream('deflate');
  const escritor = ds.writable.getWriter();
  escritor.write(bytes).catch(() => {});
  escritor.close().catch(() => {});
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

// Zona visible de la página (CropBox ∩ MediaBox): numerar, marca de agua y OCR se colocan respecto a ella.
function cajaDePagina(pagina) {
  const crop = pagina.node.CropBox?.();
  return cajaVisible({ mediaBox: pagina.getMediaBox(), cropBox: crop ? pagina.getCropBox() : undefined });
}

// Carga un PDF para editarlo; un documento cifrado se rechaza con el error 'cifrado' (el diálogo lo traduce).
async function cargarDocumento(bytes) {
  const { PDFDocument } = await cargarPdfLib();
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (doc.isEncrypted) throw new Error('cifrado');
  return doc;
}

const operaciones = {
  async eco({ texto }) { return texto; },
  async unir({ documentos }, { progreso, cancelado }) {
    const { PDFDocument } = await cargarPdfLib();
    const salida = await PDFDocument.create();
    for (const [i, bytes] of documentos.entries()) {
      if (cancelado()) return null;
      progreso(i, documentos.length, `Uniendo ${i + 1} de ${documentos.length}…`);
      const doc = await cargarDocumento(bytes);
      const paginas = await salida.copyPages(doc, doc.getPageIndices());
      for (const p of paginas) salida.addPage(p);
    }
    return await salida.save();
  },
  // grupos: listas de páginas 1-based; un PDF por grupo.
  async dividir({ bytes, grupos }, { progreso, cancelado }) {
    const { PDFDocument } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    const partes = [];
    for (const [i, grupo] of grupos.entries()) {
      if (cancelado()) return null;
      progreso(i, grupos.length, `Parte ${i + 1} de ${grupos.length}…`);
      const parte = await PDFDocument.create();
      const paginas = await parte.copyPages(doc, grupo.map(n => n - 1));
      for (const p of paginas) parte.addPage(p);
      partes.push(await parte.save());
    }
    return partes;
  },
  // plan: [{ origen: página 1-based | null (en blanco), rotacion }]. Cada página repetida se copia aparte
  // (copyPages reutiliza el mismo objeto para un índice repetido en una misma llamada).
  async organizar({ bytes, plan }, { progreso, cancelado }) {
    const { PDFDocument, degrees } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    const salida = await PDFDocument.create();
    const { width, height } = doc.getPage(0).getSize();
    const unicos = [...new Set(plan.filter(p => p.origen !== null).map(p => p.origen - 1))];
    const copias = new Map((await salida.copyPages(doc, unicos)).map((pagina, i) => [unicos[i], [pagina]]));
    for (const [i, p] of plan.entries()) {
      if (cancelado()) return null;
      progreso(i, plan.length);
      let pagina;
      if (p.origen === null) pagina = salida.addPage([width, height]);
      else {
        const lista = copias.get(p.origen - 1);
        pagina = lista.length ? lista.pop() : (await salida.copyPages(doc, [p.origen - 1]))[0];
        salida.addPage(pagina);
      }
      if (p.rotacion) pagina.setRotation(degrees((pagina.getRotation().angle + p.rotacion) % 360));
    }
    return await salida.save();
  },
  async numerar({ bytes, paginas, formato, posicion, tamano, inicio }, { progreso }) {
    const { StandardFonts, rgb, degrees } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    const fuente = await doc.embedFont(StandardFonts.Helvetica);
    const todas = doc.getPages();
    const total = todas.length + (inicio - 1);
    for (const [i, n] of paginas.entries()) {
      progreso(i, paginas.length);
      const pagina = todas[n - 1];
      if (!pagina) continue;
      const texto = textoDeNumero(formato, n + inicio - 1, total);
      const caja = cajaDePagina(pagina);
      const rotacion = pagina.getRotation().angle;
      const visual = tamanoVisual({ anchoPagina: caja.ancho, altoPagina: caja.alto, rotacion });
      let anchoTexto;
      try { anchoTexto = fuente.widthOfTextAtSize(texto, tamano); } catch { throw new Error('El texto tiene caracteres que la fuente Helvetica no admite'); }
      const altoTexto = fuente.heightAtSize(tamano, { descender: false });
      const { x: vx, y: vy } = posicionDeTexto({ posicion, anchoPagina: visual.ancho, altoPagina: visual.alto, anchoTexto, altoTexto });
      const p = aCoordenadasSinRotar({ vx, vy, rotacion, anchoPagina: caja.ancho, altoPagina: caja.alto });
      pagina.drawText(texto, { x: caja.x + p.x, y: caja.y + p.y, size: tamano, font: fuente, color: rgb(0, 0, 0), rotate: degrees(rotacion) });
    }
    return await doc.save();
  },
  async marcaDeAgua({ bytes, paginas, texto, imagen, tipoImagen, tamano, color, opacidad, angulo, mosaico, escala }, { progreso }) {
    const { StandardFonts, rgb, degrees } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    const fuente = texto ? await doc.embedFont(StandardFonts.HelveticaBold) : null;
    const grafico = imagen ? (tipoImagen === 'image/jpeg' ? await doc.embedJpg(imagen) : await doc.embedPng(imagen)) : null;
    const { r, g, b } = colorHex(color);
    const todas = doc.getPages();
    for (const [i, n] of paginas.entries()) {
      progreso(i, paginas.length);
      const pagina = todas[n - 1];
      if (!pagina) continue;
      const caja = cajaDePagina(pagina);
      const rotacion = pagina.getRotation().angle;
      const visual = tamanoVisual({ anchoPagina: caja.ancho, altoPagina: caja.alto, rotacion });
      let ancho, alto;
      if (fuente) {
        try { ancho = fuente.widthOfTextAtSize(texto, tamano); } catch { throw new Error('El texto tiene caracteres que la fuente Helvetica no admite'); }
        alto = fuente.heightAtSize(tamano, { descender: false });
      } else {
        ancho = visual.ancho * escala;
        alto = ancho * (grafico.height / grafico.width);
      }
      const centros = mosaico ? mosaicoDeMarca({ anchoPagina: visual.ancho, altoPagina: visual.alto, anchoTexto: ancho, altoTexto: alto }) : [{ x: visual.ancho / 2, y: visual.alto / 2 }];
      for (const c of centros) {
        const origenVisual = origenCentrado({ cx: c.x, cy: c.y, ancho, alto, angulo });
        const p = aCoordenadasSinRotar({ vx: origenVisual.x, vy: origenVisual.y, rotacion, anchoPagina: caja.ancho, altoPagina: caja.alto });
        const x = caja.x + p.x, y = caja.y + p.y;
        const rotate = degrees(angulo + rotacion);
        if (fuente) pagina.drawText(texto, { x, y, size: tamano, font: fuente, color: rgb(r, g, b), opacity: opacidad, rotate });
        else pagina.drawImage(grafico, { x, y, width: ancho, height: alto, opacity: opacidad, rotate });
      }
    }
    return await doc.save();
  },
  async recortar({ bytes, paginas, caja }, { progreso }) {
    const doc = await cargarDocumento(bytes);
    const todas = doc.getPages();
    for (const [i, n] of paginas.entries()) {
      progreso(i, paginas.length);
      todas[n - 1]?.setCropBox(caja.x, caja.y, caja.ancho, caja.alto);
    }
    return await doc.save();
  },
  async leerMetadatos({ bytes }) {
    const doc = await cargarDocumento(bytes);
    return { titulo: doc.getTitle() ?? '', autor: doc.getAuthor() ?? '', asunto: doc.getSubject() ?? '', palabrasClave: doc.getKeywords() ?? '', creador: doc.getCreator() ?? '' };
  },
  async metadatos({ bytes, titulo, autor, asunto, palabrasClave, creador }) {
    const doc = await cargarDocumento(bytes);
    doc.setTitle(titulo ?? '');
    doc.setAuthor(autor ?? '');
    doc.setSubject(asunto ?? '');
    doc.setKeywords(String(palabrasClave ?? '').split(/\s*[,;]\s*/).map(s => s.trim()).filter(Boolean));
    doc.setCreator(creador ?? '');
    doc.setModificationDate(new Date());
    return await doc.save();
  },
  async aplanar({ bytes, formularios, quitarAnotaciones }, { progreso }) {
    const { PDFName } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    let camposAplanados = 0, anotacionesQuitadas = 0;
    if (formularios && doc.catalog.has(PDFName.of('AcroForm'))) {
      const form = doc.getForm();
      camposAplanados = form.getFields().length;
      try { form.flatten(); } catch (e) { throw new Error(`No se pudieron aplanar los formularios: ${e.message}`); }
    }
    const paginas = doc.getPages();
    for (const [i, pagina] of paginas.entries()) {
      progreso(i, paginas.length);
      if (!quitarAnotaciones) continue;
      const annots = pagina.node.Annots();
      if (annots) { anotacionesQuitadas += annots.size(); pagina.node.delete(PDFName.of('Annots')); }
    }
    return { bytes: await doc.save(), camposAplanados, anotacionesQuitadas };
  },
  // imagenes: [{ bytes, tipo: 'image/png' | 'image/jpeg' }]; una página por imagen, encajada con margen.
  async deImagenes({ imagenes, tamano, orientacion, margen }, { progreso, cancelado }) {
    const { PDFDocument } = await cargarPdfLib();
    const doc = await PDFDocument.create();
    let omitidas = 0;
    for (const [i, img] of imagenes.entries()) {
      if (cancelado()) return null;
      progreso(i, imagenes.length, `Imagen ${i + 1} de ${imagenes.length}…`);
      let incrustada;
      try { incrustada = img.tipo === 'image/jpeg' ? await doc.embedJpg(img.bytes) : await doc.embedPng(img.bytes); } catch { omitidas++; continue; }
      const medidas = { ancho: incrustada.width, alto: incrustada.height };
      const [anchoPagina, altoPagina] = tamanoDePagina(tamano, orientacion, medidas);
      const pagina = doc.addPage([anchoPagina, altoPagina]);
      const caja = ajustarEnPagina({ anchoImagen: medidas.ancho, altoImagen: medidas.alto, anchoPagina, altoPagina, margen: tamano === 'imagen' ? 0 : margen });
      pagina.drawImage(incrustada, { x: caja.x, y: caja.y, width: caja.ancho, height: caja.alto });
    }
    if (doc.getPageCount() === 0) throw new Error('Ninguna imagen se pudo incrustar');
    return { bytes: await doc.save(), paginas: doc.getPageCount(), omitidas };
  },
  // paginas: [{ numero, palabras: [{ texto, x, y, ancho, alto }] }] → texto invisible (opacidad 0) sobre cada palabra.
  // paginas: [{ numero, rotacion, palabras: [{ texto, x, y, ancho, alto }] }] (x, y ya en coordenadas del PDF).
  // Modo de texto invisible (3 Tr) como hacen los OCR de verdad: ni un ExtGState por palabra ni dependencia de la transparencia.
  async ocrEscribir({ bytes, paginas }, { progreso, cancelado }) {
    const { StandardFonts, rgb, degrees, pushGraphicsState, popGraphicsState, setTextRenderingMode, TextRenderingMode } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    const fuente = await doc.embedFont(StandardFonts.Helvetica);
    const todas = doc.getPages();
    let escritas = 0;
    for (const [i, p] of paginas.entries()) {
      if (cancelado()) return null;
      progreso(i, paginas.length);
      const pagina = todas[p.numero - 1];
      if (!pagina || !p.palabras.length) continue;
      pagina.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.Invisible));
      for (const w of p.palabras) {
        const texto = textoWinAnsi(w.texto);
        const size = tamanoDeFuente(w.ancho, fuente.widthOfTextAtSize(texto, 1));
        pagina.drawText(texto, { x: w.x, y: w.y, size, font: fuente, color: rgb(0, 0, 0), rotate: degrees(p.rotacion ?? 0) });
        escritas++;
      }
      pagina.pushOperators(popGraphicsState());
    }
    if (!escritas) throw new Error('No se reconoció ninguna palabra');
    return await doc.save();
  },
  // --- comprimir ---
  // Imágenes del documento: JPEG con sus bytes tal cual; Flate ya decodificado a muestras. Las que son o tienen
  // máscara se marcan para no tocarlas (recodificarlas como JPEG RGB rompería la transparencia).
  // Solo metadatos (los bytes se piden de uno en uno con obtenerImagen, dentro de la misma sesión).
  async listarImagenes({ bytes }) {
    const { PDFRawStream, PDFName, PDFRef, PDFDict, PDFArray, PDFNumber } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    const nombre = v => (v instanceof PDFName ? v.decodeText() : v instanceof PDFArray && v.get(0) instanceof PDFName ? v.get(0).decodeText() : String(v ?? ''));
    const numero = (dict, clave, defecto) => { const v = dict?.get(PDFName.of(clave)); return v instanceof PDFNumber ? v.asNumber() : defecto; };
    const objetos = new Map();
    const mascaras = new Set();
    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFRawStream) || obj.dict.get(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
      for (const clave of ['SMask', 'Mask']) { const m = obj.dict.get(PDFName.of(clave)); if (m instanceof PDFRef) mascaras.add(m.toString()); }
      objetos.set(ref.toString(), { ref, obj });
    }
    const imagenes = [];
    for (const { ref, obj } of objetos.values()) {
      const d = obj.dict;
      const filtro = nombre(d.get(PDFName.of('Filter')));
      let parms = doc.context.lookup(d.get(PDFName.of('DecodeParms')));
      if (parms instanceof PDFArray) parms = doc.context.lookup(parms.get(0));
      if (!(parms instanceof PDFDict)) parms = null;
      const info = {
        objeto: ref.objectNumber, generacion: ref.generationNumber, filtro,
        ancho: numero(d, 'Width', 0), alto: numero(d, 'Height', 0), bitsPorComponente: numero(d, 'BitsPerComponent', 0), espacioColor: nombre(d.get(PDFName.of('ColorSpace'))),
        tieneMascara: mascaras.has(ref.toString()) || d.has(PDFName.of('SMask')) || d.has(PDFName.of('Mask')) || d.has(PDFName.of('Decode')),
        longitudComprimida: obj.contents.length,
        predictor: numero(parms, 'Predictor', 1), colores: numero(parms, 'Colors', 1), columnas: numero(parms, 'Columns', 1), bitsPredictor: numero(parms, 'BitsPerComponent', 8),
      };
      imagenes.push(info);
      objetos.get(ref.toString()).info = info;
    }
    sesionImagenes = { id: ++contadorSesiones, doc, objetos };
    return { sesion: sesionImagenes.id, imagenes };
  },
  // Bytes de una imagen: JPEG tal cual; Flate decodificado y sin predictor (si no se puede deshacer, error y se salta).
  async obtenerImagen({ sesion, objeto, generacion }) {
    const { PDFRef, decodePDFRawStream } = await cargarPdfLib();
    if (!sesionImagenes || sesionImagenes.id !== sesion) throw new Error('La lista de imágenes caducó: vuelve a ejecutar la herramienta');
    const entrada = sesionImagenes.objetos.get(PDFRef.of(objeto, generacion).toString());
    if (!entrada) throw new Error('Imagen desconocida');
    const { obj, info: { filtro, predictor, colores, columnas, bitsPredictor } } = entrada;
    if (filtro === 'DCTDecode') return { bytes: new Uint8Array(obj.contents) };
    if (filtro !== 'FlateDecode') throw new Error('Filtro no admitido');
    let datos = decodePDFRawStream(obj).decode();
    if (predictor >= 2) {
      datos = despredecir({ datos, predictor, colores, bitsPorComponente: bitsPredictor, columnas });
      if (!datos) throw new Error('Predictor que no se pudo deshacer');
    }
    return { bytes: datos };
  },
  // reemplazos: [{ objeto, generacion, jpeg, ancho, alto }] → el stream pasa a ser un JPEG RGB; luego qpdf recomprime.
  async reemplazarImagenes({ bytes, reemplazos }, { progreso }) {
    const { PDFRawStream, PDFRef } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    const { PDFName, PDFRawStream: _PRS } = await cargarPdfLib();
    const DE_CODIFICACION = new Set(['Type', 'Subtype', 'Width', 'Height', 'ColorSpace', 'BitsPerComponent', 'Filter', 'DecodeParms', 'Length', 'SMask', 'Mask', 'Decode', 'Interpolate']);
    for (const r of reemplazos) {
      const ref = PDFRef.of(r.objeto, r.generacion);
      const dict = doc.context.obj({ Type: 'XObject', Subtype: 'Image', Width: r.ancho, Height: r.alto, ColorSpace: 'DeviceRGB', BitsPerComponent: 8, Filter: 'DCTDecode', Length: r.jpeg.length });
      const original = doc.context.lookup(ref);
      if (original instanceof PDFRawStream) for (const [clave, valor] of original.dict.entries()) { if (!DE_CODIFICACION.has(clave.decodeText())) dict.set(clave, valor); } // /OC, /Intent, /Metadata…
      doc.context.assign(ref, PDFRawStream.of(dict, r.jpeg));
    }
    progreso(0, 1, 'Recomprimiendo con qpdf…');
    const intermedio = await doc.save({ useObjectStreams: true });
    const q = await qpdf(['--object-streams=generate', '--recompress-flate', '--compression-level=9', 'entrada.pdf', 'salida.pdf'], { entradas: { 'entrada.pdf': intermedio } });
    const salida = q.codigo === 0 && q.bytes?.length ? q.bytes : intermedio; // si qpdf se queja, vale lo de pdf-lib
    return { bytes: salida, avisos: q.avisos };
  },
  // --- qpdf ---
  async proteger({ bytes, usuario, propietario, imprimir, copiar, modificar }, { progreso }) {
    progreso(0, 1, 'Cifrando…');
    const r = await qpdf(['--encrypt', usuario ?? '', propietario, '256', `--print=${imprimir ? 'full' : 'none'}`, `--extract=${copiar ? 'y' : 'n'}`, `--modify=${modificar ? 'all' : 'none'}`, '--', 'entrada.pdf', 'salida.pdf'], { entradas: { 'entrada.pdf': bytes } });
    if (r.codigo !== 0 || !r.bytes) throw new Error(`qpdf no pudo cifrar: ${r.avisos.join(' ') || `código ${r.codigo}`}`);
    return { bytes: r.bytes, avisos: r.avisos };
  },
  async desbloquear({ bytes, contrasena }, { progreso }) {
    progreso(0, 1, 'Descifrando…');
    const r = await qpdf([`--password=${contrasena ?? ''}`, '--decrypt', 'entrada.pdf', 'salida.pdf'], { entradas: { 'entrada.pdf': bytes } });
    if (r.codigo !== 0 || !r.bytes) {
      if (r.avisos.some(a => /invalid password/i.test(a))) throw new Error('Contraseña incorrecta');
      throw new Error(`qpdf no pudo descifrar: ${r.avisos.join(' ') || `código ${r.codigo}`}`);
    }
    return { bytes: r.bytes, avisos: r.avisos };
  },
  // 1) qpdf reescribe el archivo; 2) si falla (qpdf-wasm no reconstruye la xref por sí mismo), se reconstruye la
  // xref en JS y se vuelve a pasar por qpdf; 3) si aún falla, pdf-lib con tolerancia (lee también object streams).
  async reparar({ bytes }, { progreso }) {
    progreso(0, 3, 'Reescribiendo con qpdf…');
    const avisos = [];
    const r1 = await qpdf(['--warning-exit-0', 'entrada.pdf', 'salida.pdf'], { entradas: { 'entrada.pdf': bytes } });
    if (r1.codigo === 0 && r1.bytes?.length) return { bytes: r1.bytes, avisos: r1.avisos, motor: 'qpdf' };
    avisos.push(...r1.avisos);
    // Un PDF cifrado no se puede reparar a ciegas (saldría basura): primero hay que desbloquearlo.
    if (r1.avisos.some(a => /invalid password|encrypted/i.test(a)) || /\/Encrypt\s+\d+\s+\d+\s+R/.test(new TextDecoder('latin1').decode(bytes.subarray(Math.max(0, bytes.length - 65536))))) throw new Error('cifrado');
    progreso(1, 3, 'Reconstruyendo la tabla de objetos…');
    let expandido = bytes;
    try { expandido = await expandirObjectStreams(bytes, inflar); } catch { expandido = bytes; }
    const reconstruido = reconstruirXref(expandido);
    if (reconstruido) {
      const r2 = await qpdf(['--warning-exit-0', 'entrada.pdf', 'salida.pdf'], { entradas: { 'entrada.pdf': reconstruido } });
      if (r2.codigo === 0 && r2.bytes?.length) return { bytes: r2.bytes, avisos: [...avisos, ...r2.avisos], motor: 'xref reconstruida + qpdf' };
      avisos.push(...r2.avisos);
    }
    progreso(2, 3, 'Intentando con pdf-lib…');
    const { PDFDocument } = await cargarPdfLib();
    for (const candidato of [reconstruido, expandido, bytes].filter(Boolean)) {
      try {
        const doc = await PDFDocument.load(candidato, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
        if (doc.getPageCount() > 0) return { bytes: await doc.save(), avisos, motor: 'pdf-lib' };
      } catch { /* siguiente candidato */ }
    }
    throw new Error(`No se pudo reparar: ${avisos.join(' ') || 'el archivo no tiene objetos reconocibles'}`);
  },
  async rotar({ bytes, paginas, grados }, { progreso }) {
    const { degrees } = await cargarPdfLib();
    const doc = await cargarDocumento(bytes);
    const todas = doc.getPages();
    for (const [i, n] of paginas.entries()) {
      progreso(i, paginas.length);
      const pagina = todas[n - 1];
      if (pagina) pagina.setRotation(degrees((pagina.getRotation().angle + grados) % 360));
    }
    return await doc.save();
  },
  async cargar({ bytes }) {
    const { PDFDocument } = await cargarPdfLib();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    return { paginas: doc.getPageCount(), cifrado: doc.isEncrypted };
  },
  // Comprueba que qpdf (wasm) arranca dentro del worker: devuelve la primera línea de `qpdf --version`.
  async qpdfVersion() {
    const { avisos } = await qpdf(['--version']);
    return avisos[0] ?? '';
  },
};

// Las tareas siguientes añaden operaciones aquí (unir, dividir, …) con `registrar`.
export function registrar(nombre, fn) { operaciones[nombre] = fn; }

self.onmessage = async (evento) => {
  const { id, operacion, argumentos, cancelar } = evento.data;
  if (cancelar) { cancelados.add(id); return; }
  const fn = operaciones[operacion];
  if (!fn) { postMessage({ id, error: `Operación desconocida: ${operacion}` }); return; }
  try {
    const resultado = await fn(argumentos ?? {}, { progreso: (h, t, texto) => progreso(id, h, t, texto), cancelado: () => cancelado(id), qpdf, cargarPdfLib });
    if (cancelado(id)) postMessage({ id, cancelado: true }); else postMessage({ id, resultado }, resultado?.transferir ?? []);
  } catch (e) {
    postMessage({ id, error: String(e?.message ?? e) });
  } finally {
    cancelados.delete(id);
  }
};
