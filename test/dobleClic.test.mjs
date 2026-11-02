import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearClics } from '../src/comun/dobleClic.mjs';

// Reloj falso: programar/cancelar como setTimeout/clearTimeout y avanzar(ms) dispara lo vencido.
function reloj() {
  let ahora = 0; let siguienteId = 1; const tareas = new Map();
  return {
    programar: (fn, ms) => { const id = siguienteId++; tareas.set(id, { fn, en: ahora + ms }); return id; },
    cancelar: id => { tareas.delete(id); },
    avanzar(ms) {
      ahora += ms;
      for (const [id, t] of [...tareas].sort((a, b) => a[1].en - b[1].en)) if (t.en <= ahora) { tareas.delete(id); t.fn(); }
    },
  };
}
const preparar = () => {
  const r = reloj(); const eventos = [];
  const clics = crearClics({ esperaMs: 500, navegar: atras => eventos.push(atras ? 'anterior' : 'siguiente'), salir: () => eventos.push('salir'), programar: r.programar, cancelar: r.cancelar });
  return { r, eventos, clics };
};

test('un clic navega recién cuando pasa la espera del doble clic', () => {
  const { r, eventos, clics } = preparar();
  clics.presionar({ detalle: 1 });
  r.avanzar(499);
  assert.deepEqual(eventos, []);
  r.avanzar(1);
  assert.deepEqual(eventos, ['siguiente']);
});
test('Mayús + clic va a la anterior, también con espera', () => {
  const { r, eventos, clics } = preparar();
  clics.presionar({ detalle: 1, atras: true });
  r.avanzar(500);
  assert.deepEqual(eventos, ['anterior']);
});
test('doble clic: sale sin navegar', () => {
  const { r, eventos, clics } = preparar();
  clics.presionar({ detalle: 1 });
  r.avanzar(200);
  clics.presionar({ detalle: 2 });
  r.avanzar(2000);
  assert.deepEqual(eventos, ['salir']);
});
test('dos clics que el sistema no cuenta como doble (detalle 1): dos páginas, la primera al llegar el segundo', () => {
  const { r, eventos, clics } = preparar();
  clics.presionar({ detalle: 1 });
  r.avanzar(300);
  clics.presionar({ detalle: 1 });
  assert.deepEqual(eventos, ['siguiente']);
  r.avanzar(500);
  assert.deepEqual(eventos, ['siguiente', 'siguiente']);
});
test('un segundo clic después de la espera es otro clic, aunque el sistema diga doble', () => {
  const { r, eventos, clics } = preparar();
  clics.presionar({ detalle: 1 });
  r.avanzar(500);
  clics.presionar({ detalle: 2 });
  r.avanzar(500);
  assert.deepEqual(eventos, ['siguiente', 'siguiente']);
});
test('cancelar descarta el clic pendiente (por ejemplo, al salir con Esc)', () => {
  const { r, eventos, clics } = preparar();
  clics.presionar({ detalle: 1 });
  assert.equal(clics.pendiente, true);
  clics.cancelar();
  assert.equal(clics.pendiente, false);
  r.avanzar(1000);
  assert.deepEqual(eventos, []);
});
