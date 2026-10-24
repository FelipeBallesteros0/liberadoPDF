// Ruta de un video externo referenciado por el PDF (solo en el main: usa node:path). Lógica pura.
import path from 'node:path';

// Un video externo solo puede estar en la carpeta del PDF o en una subcarpeta; nada absoluto ni con «..».
export function rutaDeVideoPermitida(carpetaPdf, relativa, plataforma = process.platform) {
  const p = plataforma === 'win32' ? path.win32 : path.posix;
  const rel = String(relativa ?? '').trim();
  if (!rel || p.isAbsolute(rel) || /^[a-z]:/i.test(rel) || rel.startsWith('\\\\') || rel.startsWith('/')) return null;
  const normalizada = p.normalize(rel.replace(/[\\/]/g, p.sep));
  if (normalizada.split(p.sep).includes('..')) return null;
  return p.join(carpetaPdf, normalizada);
}

