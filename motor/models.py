from dataclasses import dataclass, field
from enum import Enum


class BucketStrategy(str, Enum):
    """Las 3 formas en que un bucket puede recibir dinero en la cascada."""

    FIXED = "FIXED"  # importe fijo cada mes (ej. gastos fijos)
    FILL_TO_TARGET = "FILL_TO_TARGET"  # rellena hasta un objetivo (ej. colchón)
    REMAINDER = "REMAINDER"  # se lleva todo lo que sobre (ej. inversión)


@dataclass(frozen=True)
class Bucket:
    """Definición de un cubo (regla), inmutable: no cambia mientras corre el programa."""

    id: str
    name: str
    strategy: BucketStrategy
    priority: int  # orden en la cascada: 1 se reparte antes que 2
    target_cents: int | None = None  # solo aplica si strategy es FILL_TO_TARGET
    fixed_amount_cents: int | None = None  # solo aplica si strategy es FIXED

    def __post_init__(self) -> None:
        # Validamos que cada estrategia tenga el dato que necesita para funcionar.
        if self.strategy is BucketStrategy.FIXED and self.fixed_amount_cents is None:
            raise ValueError(f"Bucket '{self.id}': FIXED requiere fixed_amount_cents")
        if self.strategy is BucketStrategy.FILL_TO_TARGET and (
            self.target_cents is None or self.target_cents <= 0
        ):
            raise ValueError(
                f"Bucket '{self.id}': FILL_TO_TARGET requiere target_cents > 0"
            )


@dataclass(frozen=True)
class BucketAllocation:
    """Resultado de repartir dinero a UN bucket concreto en un mes concreto."""

    bucket_id: str
    amount_cents: int
    reached_target: bool = False  # solo tiene sentido para FILL_TO_TARGET


@dataclass(frozen=True)
class AllocationResult:
    """Resumen completo del reparto de un ingreso mensual entre todos los buckets."""

    income_cents: int
    # tuple en vez de list: para que el resultado sea totalmente inmutable
    allocations: tuple[BucketAllocation, ...] = field(default_factory=tuple)
    unallocated_cents: int = 0  # debería ser siempre 0; si no, hay un error de cálculo
