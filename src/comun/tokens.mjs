// Tokens imprevisibles para servir archivos por el protocolo: la misma ruta recibe el mismo token y el registro se
// acota (los más antiguos sin usar se olvidan). `generar` se inyecta para poder probarlo sin crypto.
export function crearRegistroDeTokens({ maximo = 500, generar = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('') } = {}) {
  const porToken = new Map(); // token → ruta (orden de inserción = antigüedad)
  const porRuta = new Map();
  const registrar = (ruta) => {
    const previo = porRuta.get(ruta);
    if (previo) { porToken.delete(previo); porToken.set(previo, ruta); return previo; } // renovar antigüedad
    let token;
    do { token = generar(); } while (porToken.has(token));
    porToken.set(token, ruta);
    porRuta.set(ruta, token);
    while (porToken.size > maximo) { const [viejo, rutaVieja] = porToken.entries().next().value; porToken.delete(viejo); porRuta.delete(rutaVieja); }
    return token;
  };
  // Consultar un token lo renueva: el documento abierto (que se consulta al leerlo) no se expulsa por registrar otros.
  const rutaDe = (token) => { const ruta = porToken.get(token); if (ruta !== undefined) { porToken.delete(token); porToken.set(token, ruta); } return ruta; };
  return { registrar, rutaDe, tamano: () => porToken.size };
}
