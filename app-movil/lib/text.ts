// Convierte "Colchón de emergencia" en "colchon_de_emergencia": quita
// acentos, pasa a minúsculas y sustituye espacios/símbolos por "_".
// Así el usuario solo escribe un nombre normal, nunca un id técnico.
export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // marcas de acento tras normalizar
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// "agosto 2026" -> "Agosto 2026". Se usa para dejar claro que el reparto
// es una acción del mes en curso, no algo que se repite sin más.
export function mesActual(): string {
  return capitalizarMes(new Date());
}

// "1 de septiembre". Para avisar de cuándo se podrá repartir de nuevo.
export function primerDiaProximoMes(): string {
  const hoy = new Date();
  const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const texto = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(proximoMes);
  return `1 de ${texto}`;
}

// (2026, 8) -> "Agosto 2026". Para las filas del historial.
export function nombreMes(year: number, month: number): string {
  return capitalizarMes(new Date(year, month - 1, 1));
}

// true si la fecha dada cae dentro del mes y año actuales.
export function esDelMesActual(fecha: Date): boolean {
  const hoy = new Date();
  return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth();
}

function capitalizarMes(fecha: Date): string {
  const texto = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
