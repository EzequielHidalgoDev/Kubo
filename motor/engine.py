from itertools import groupby

from motor.models import (
    AllocationResult,
    Bucket,
    BucketAllocation,
    BucketStrategy,
)


def _demanda(bucket: Bucket, current_balances: dict[str, int], remaining: int) -> int:
    """Cuánto querría recibir este bucket, sin límite de lo disponible todavía."""
    if bucket.strategy is BucketStrategy.FIXED:
        return bucket.fixed_amount_cents
    if bucket.strategy in (BucketStrategy.FILL_TO_TARGET, BucketStrategy.DEBT):
        # Para DEBT, current_balances guarda cuánto se ha pagado ya: la
        # demanda es el resto hasta saldarla, igual que un ahorro hasta
        # su objetivo.
        balance_actual = current_balances.get(bucket.id, 0)
        return max(bucket.target_cents - balance_actual, 0)
    return remaining  # REMAINDER: se lleva todo lo que quede


def _reparto_proporcional(demandas: list[int], disponible: int) -> list[int]:
    """Reparte 'disponible' entre varias demandas, proporcionalmente, sin
    perder ni un céntimo por redondeo (método del resto mayor: primero se
    da la parte entera a cada uno, y los céntimos que sobran por redondeo
    se dan uno a uno a quien más parte fraccional tenía)."""
    total_demanda = sum(demandas)
    if total_demanda == 0:
        return [0] * len(demandas)

    partes_enteras = [(d * disponible) // total_demanda for d in demandas]
    restantes = disponible - sum(partes_enteras)

    fracciones = sorted(
        range(len(demandas)),
        key=lambda i: (d := demandas[i] * disponible) - (d // total_demanda) * total_demanda,
        reverse=True,
    )
    for i in range(restantes):
        partes_enteras[fracciones[i]] += 1

    return partes_enteras


def allocate(
    income_cents: int,
    buckets: list[Bucket],
    current_balances: dict[str, int],
) -> AllocationResult:
    """Reparte el ingreso del mes entre los buckets por prioridad.

    Los buckets con prioridad distinta se reparten en cascada estricta
    (primero se llena del todo la prioridad 1, luego la 2...). Los buckets
    que **comparten la misma prioridad** se reparten en paralelo entre
    ellos, proporcionalmente a lo que necesita cada uno — así se puede
    modelar, por ejemplo, "colchón mínimo antes que nada, y el resto del
    colchón a la vez que la inversión" usando dos prioridades.
    """
    buckets_ordenados = sorted(buckets, key=lambda b: b.priority)
    remaining = income_cents
    allocations: list[BucketAllocation] = []

    for _prioridad, grupo_iter in groupby(buckets_ordenados, key=lambda b: b.priority):
        grupo = list(grupo_iter)
        demandas = [_demanda(b, current_balances, remaining) for b in grupo]
        total_demanda = sum(demandas)

        if total_demanda <= remaining:
            montos = demandas
        else:
            montos = _reparto_proporcional(demandas, remaining)

        for bucket, amount in zip(grupo, montos):
            if bucket.strategy in (BucketStrategy.FILL_TO_TARGET, BucketStrategy.DEBT):
                balance_actual = current_balances.get(bucket.id, 0)
                reached_target = (balance_actual + amount) >= bucket.target_cents
            else:
                reached_target = False
            allocations.append(
                BucketAllocation(
                    bucket_id=bucket.id, amount_cents=amount, reached_target=reached_target
                )
            )
            remaining -= amount

    return AllocationResult(
        income_cents=income_cents,
        allocations=tuple(allocations),
        unallocated_cents=remaining,
    )
