const formateador = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

// La API siempre trabaja en céntimos enteros (ver motor/); esto es lo
// único que convierte a euros, y solo para mostrarlo en pantalla.
export function formatearCentimos(centimos: number): string {
  return formateador.format(centimos / 100);
}

// Convierte lo que el usuario escribe (acepta "1800", "1800,50" o "1800.50")
// a céntimos enteros, que es lo único que la API entiende.
export function parseEurosACentimos(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!normalizado) return null;
  const euros = Number(normalizado);
  if (Number.isNaN(euros)) return null;
  return Math.round(euros * 100);
}
