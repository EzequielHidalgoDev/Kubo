import { NuevoBucket } from './api';

// Fórmula de arranque para quien no sabe por dónde empezar. El objetivo de
// Kubo es organizar el 100% del ingreso, no dejar un sobrante sin catalogar.
// Gastos fijos y Libre para gastar comparten prioridad 1: ambos son FIXED
// y van garantizados cada mes, pase lo que pase con el colchón, la deuda o
// la inversión.
//
// Si NO hay deuda, es simple: Colchón de emergencia = 4 meses de gastos
// fijos (prioridad 2), Inversión se lleva el resto (prioridad 3, REMAINDER).
//
// Si SÍ hay deuda, el orden financiero correcto cambia: un colchón mínimo
// de 1 mes va primero (para no quedarte sin nada ante un imprevisto
// mientras pagas), luego la deuda entera (casi ninguna inversión rinde más
// que el interés de una deuda), y solo después se completa el resto del
// colchón y se invierte. Por eso el colchón se parte en dos prioridades
// (mínimo y resto) con la deuda en medio.
//
// El orden del array es solo el orden en que se muestran los buckets; la
// prioridad real de reparto es el campo "priority" de cada uno.
export function calcularSugerencia(
  gastosFijosCents: number,
  libreCents: number,
  colchonYaAhorradoCents: number = 0,
  deudaCents: number = 0
): NuevoBucket[] {
  const gastosFijos: NuevoBucket = {
    id: 'gastos_fijos',
    name: 'Gastos fijos',
    strategy: 'FIXED',
    priority: 1,
    fixed_amount_cents: gastosFijosCents,
  };
  const libre: NuevoBucket = {
    id: 'libre',
    name: 'Libre para gastar',
    strategy: 'FIXED',
    priority: 1,
    fixed_amount_cents: libreCents,
  };

  if (deudaCents <= 0) {
    return [
      gastosFijos,
      {
        id: 'colchon',
        name: 'Colchón de emergencia',
        strategy: 'FILL_TO_TARGET',
        priority: 2,
        target_cents: gastosFijosCents * 4,
        initial_balance_cents: colchonYaAhorradoCents,
      },
      { id: 'inversion', name: 'Inversión', strategy: 'REMAINDER', priority: 3 },
      libre,
    ];
  }

  const colchonMinimoObjetivo = gastosFijosCents; // 1 mes, mientras se paga la deuda
  const colchonMinimoInicial = Math.min(colchonYaAhorradoCents, colchonMinimoObjetivo);
  const colchonRestoInicial = Math.max(colchonYaAhorradoCents - colchonMinimoObjetivo, 0);

  return [
    gastosFijos,
    {
      id: 'colchon_minimo',
      name: 'Colchón mínimo',
      strategy: 'FILL_TO_TARGET',
      priority: 2,
      target_cents: colchonMinimoObjetivo,
      initial_balance_cents: colchonMinimoInicial,
    },
    {
      id: 'deuda',
      name: 'Deuda',
      strategy: 'DEBT',
      priority: 3,
      target_cents: deudaCents,
    },
    {
      id: 'colchon_resto',
      name: 'Colchón (resto)',
      strategy: 'FILL_TO_TARGET',
      priority: 4,
      target_cents: gastosFijosCents * 3, // hasta completar 4 meses en total
      initial_balance_cents: colchonRestoInicial,
    },
    { id: 'inversion', name: 'Inversión', strategy: 'REMAINDER', priority: 5 },
    libre,
  ];
}
