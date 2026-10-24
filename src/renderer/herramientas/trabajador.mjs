// Web Worker de las herramientas: pdf-lib y qpdf corren aquí para no bloquear el visor.
// Protocolo: { id, operacion, argumentos } → mensajes { id, progreso } y al final { id, resultado } | { id, error } | { id, cancelado }.
let pdfLib = null;
let qpdfModulo = null;
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
