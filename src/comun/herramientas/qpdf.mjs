// Argumentos de qpdf para cifrar y descifrar. Forma con nombre (--user-password=…): un argumento que empiece por «@»
// sería para qpdf un archivo de argumentos, y las contraseñas van siempre detrás de «=». Lógica pura.
export function argumentosDeCifrado({ usuario = '', propietario, imprimir, copiar, modificar }) {
  return ['--encrypt', `--user-password=${usuario}`, `--owner-password=${propietario}`, '--bits=256', `--print=${imprimir ? 'full' : 'none'}`, `--extract=${copiar ? 'y' : 'n'}`, `--modify=${modificar ? 'all' : 'none'}`, '--', 'entrada.pdf', 'salida.pdf'];
}

export function argumentosDeDescifrado(contrasena = '') {
  return [`--password=${contrasena}`, '--decrypt', 'entrada.pdf', 'salida.pdf'];
}
