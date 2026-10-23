// Pantalla de inicio: abrir, recientes y arrastrar y soltar.
const api = window.liberadopdf;
const mensaje = new URLSearchParams(location.search).get('mensaje');
const elMensaje = document.querySelector('.liberadopdf-mensaje');
if (mensaje) { elMensaje.textContent = mensaje; elMensaje.hidden = false; }

document.getElementById('abrir').addEventListener('click', async () => {
  const ruta = await api.abrirDialogo();
  if (ruta) api.abrirEnEstaVentana(ruta);
});

function separarRuta(ruta) {
  const i = Math.max(ruta.lastIndexOf('\\'), ruta.lastIndexOf('/'));
  return { nombre: ruta.slice(i + 1), carpeta: ruta.slice(0, i) };
}

const lista = document.getElementById('recientes');
const recientes = await api.recientes();
if (recientes.length === 0) {
  const li = document.createElement('li');
  li.className = 'vacio';
  li.textContent = 'Todavía no hay archivos recientes.';
  lista.append(li);
}
for (const r of recientes) {
  const { nombre, carpeta } = separarRuta(r.ruta);
  const li = document.createElement('li');
  const spanNombre = document.createElement('span'); spanNombre.className = 'nombre'; spanNombre.textContent = nombre;
  const spanCarpeta = document.createElement('span'); spanCarpeta.className = 'carpeta'; spanCarpeta.textContent = carpeta;
  const spanFecha = document.createElement('span'); spanFecha.className = 'fecha'; spanFecha.textContent = r.fecha ? new Date(r.fecha).toLocaleString('es') : '';
  li.append(spanNombre, spanCarpeta, spanFecha);
  li.title = r.ruta;
  li.addEventListener('click', (ev) => { if (ev.ctrlKey) api.abrirEnVentanaNueva(r.ruta); else api.abrirEnEstaVentana(r.ruta); });
  lista.append(li);
}

// Arrastrar y soltar en toda la ventana
const zona = document.getElementById('arrastre');
window.addEventListener('dragover', (ev) => { ev.preventDefault(); zona.classList.add('activa'); });
window.addEventListener('dragleave', () => zona.classList.remove('activa'));
window.addEventListener('drop', (ev) => {
  ev.preventDefault();
  zona.classList.remove('activa');
  const archivo = ev.dataTransfer?.files?.[0];
  if (!archivo) return;
  const ruta = api.rutaDeArchivo(archivo);
  if (/\.pdf$/i.test(ruta)) api.abrirEnEstaVentana(ruta);
  else { elMensaje.textContent = `No es un PDF: ${ruta}`; elMensaje.hidden = false; }
});
