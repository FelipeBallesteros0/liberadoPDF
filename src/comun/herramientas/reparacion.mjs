// Reparación de PDF con la xref perdida (archivo truncado o sin trailer): se localizan los objetos «N G obj» en los
// bytes, se escribe una tabla xref nueva y un trailer con /Root. Los objetos dentro de object streams no se listan
// (de ellos se ocupa pdf-lib en el paso siguiente). Lógica pura.
const decodificador = new TextDecoder('latin1');

export function objetosDe(bytes) {
  const texto = decodificador.decode(bytes);
  const objetos = new Map();
  const re = /(?:^|[\r\n])(\d+)[ \t]+(\d+)[ \t]+obj\b/g;
  let m;
  while ((m = re.exec(texto))) {
    const salto = /^[\r\n]/.test(m[0]) ? 1 : 0;
    objetos.set(Number(m[1]), { generacion: Number(m[2]), desplazamiento: m.index + salto });
  }
  return objetos;
}

export function numeroDeCatalogo(bytes) {
  const texto = decodificador.decode(bytes);
  let ultimo = null;
  const re = /(\d+)[ \t]+\d+[ \t]+obj\s*<<(?:(?!endobj)[\s\S])*?\/Type\s*\/Catalog\b/g;
  let m;
  while ((m = re.exec(texto))) ultimo = Number(m[1]);
  if (ultimo !== null) return ultimo;
  const raices = [...texto.matchAll(/\/Root\s+(\d+)\s+\d+\s+R/g)];
  return raices.length ? Number(raices[raices.length - 1][1]) : null;
}

function numeroDePagesRaiz(texto) {
  const re = /(\d+)[ \t]+\d+[ \t]+obj\s*<<((?:(?!endobj)[\s\S])*?)\/Type\s*\/Pages\b((?:(?!endobj)[\s\S])*?)>>/g;
  let m;
  while ((m = re.exec(texto))) {
    if (!/\/Parent\b/.test(m[2] + m[3])) return Number(m[1]);
  }
  return null;
}

export function reconstruirXref(bytes) {
  const objetos = objetosDe(bytes);
  if (objetos.size === 0) return null;
  const texto = decodificador.decode(bytes);
  let raiz = numeroDeCatalogo(bytes);
  let cuerpoExtra = '';
  let base = bytes.length;
  if (raiz === null || !objetos.has(raiz)) {
    const pages = numeroDePagesRaiz(texto);
    if (pages === null) return null;
    raiz = Math.max(...objetos.keys()) + 1;
    cuerpoExtra = `\n${raiz} 0 obj\n<< /Type /Catalog /Pages ${pages} 0 R >>\nendobj\n`;
    objetos.set(raiz, { generacion: 0, desplazamiento: base + 1 });
  }
  const maximo = Math.max(...objetos.keys());
  const pad = (n, ancho) => String(n).padStart(ancho, '0');
  let xref = `xref\n0 ${maximo + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= maximo; i++) {
    const o = objetos.get(i);
    xref += o ? `${pad(o.desplazamiento, 10)} ${pad(o.generacion, 5)} n \n` : '0000000000 65535 f \n';
  }
  const prefijo = cuerpoExtra + (texto.endsWith('\n') || texto.endsWith('\r') ? '' : '\n');
  const desplazamientoXref = base + prefijo.length;
  const cola = `${prefijo}${xref}trailer\n<< /Root ${raiz} 0 R /Size ${maximo + 1} >>\nstartxref\n${desplazamientoXref}\n%%EOF\n`;
  const salida = new Uint8Array(bytes.length + cola.length);
  salida.set(bytes, 0);
  for (let i = 0; i < cola.length; i++) salida[bytes.length + i] = cola.charCodeAt(i) & 0xff;
  return salida;
}
