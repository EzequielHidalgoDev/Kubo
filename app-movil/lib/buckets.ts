import { Bucket } from './api';

// Cuando hay deuda, el colchón se guarda en dos buckets (mínimo y resto)
// para poder darle prioridad a la deuda entre medias, pero para el
// usuario sigue siendo "un" colchón: se fusionan en uno solo para mostrar,
// sumando saldo y objetivo. Se usa tanto en Inicio como en Historial, para
// que los dos sitios cuenten la misma historia.
export function fusionarColchon(buckets: Bucket[]): Bucket[] {
  const minimo = buckets.find((b) => b.id === 'colchon_minimo');
  const resto = buckets.find((b) => b.id === 'colchon_resto');
  if (!minimo || !resto) return buckets;

  const fusionado: Bucket = {
    id: 'colchon',
    name: 'Colchón de emergencia',
    strategy: 'FILL_TO_TARGET',
    priority: minimo.priority,
    target_cents: (minimo.target_cents ?? 0) + (resto.target_cents ?? 0),
    fixed_amount_cents: null,
    // El colchón mínimo/resto no llevan tope mensual propio hoy; la tarjeta
    // fusionada no representa a un bucket real de todos modos.
    monthly_cap_cents: null,
    balance_cents: minimo.balance_cents + resto.balance_cents,
  };

  return [fusionado, ...buckets.filter((b) => b.id !== 'colchon_minimo' && b.id !== 'colchon_resto')];
}
