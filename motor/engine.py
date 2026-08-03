from motor.models import (
    AllocationResult,
    Bucket,
    BucketAllocation,
    BucketStrategy,
)


def allocate(
    income_cents: int,
    buckets: list[Bucket],
    current_balances: dict[str, int],
) -> AllocationResult:
    """Reparte el ingreso del mes entre los buckets siguiendo la cascada de prioridad."""

    # Los buckets se procesan en orden de prioridad: 1 antes que 2, etc.
    buckets_ordenados = sorted(buckets, key=lambda b: b.priority)

    remaining = income_cents
    allocations: list[BucketAllocation] = []

    for bucket in buckets_ordenados:
        if bucket.strategy is BucketStrategy.FIXED:
            amount = min(bucket.fixed_amount_cents, remaining)
            allocations.append(BucketAllocation(bucket_id=bucket.id, amount_cents=amount))

        elif bucket.strategy is BucketStrategy.FILL_TO_TARGET:
            balance_actual = current_balances.get(bucket.id, 0)
            falta = bucket.target_cents - balance_actual
            amount = min(max(falta, 0), remaining)
            reached_target = (balance_actual + amount) >= bucket.target_cents
            allocations.append(
                BucketAllocation(
                    bucket_id=bucket.id, amount_cents=amount, reached_target=reached_target
                )
            )

        else:  # REMAINDER: se lleva todo lo que quede
            amount = remaining
            allocations.append(BucketAllocation(bucket_id=bucket.id, amount_cents=amount))

        remaining -= amount

    return AllocationResult(
        income_cents=income_cents,
        allocations=tuple(allocations),
        unallocated_cents=remaining,
    )
