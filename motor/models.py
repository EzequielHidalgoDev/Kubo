from dataclasses import dataclass, field
from enum import Enum


class BucketStrategy(str, Enum):
    """Las 4 formas en que un bucket puede recibir dinero en la cascada."""

    FIXED = "FIXED"  # importe fijo cada mes (ej. gastos fijos)
    FILL_TO_TARGET = "FILL_TO_TARGET"  # rellena hasta un objetivo (ej. colchón)
    REMAINDER = "REMAINDER"  # se lleva todo lo que sobre (ej. inversión)
    DEBT = "DEBT"  # rellena hasta saldar una deuda (igual que FILL_TO_TARGET,
    # pero el "objetivo" es lo que debes, no lo que quieres ahorrar)


@dataclass(frozen=True)
class Bucket:
    """Definición de un cubo (regla), inmutable: no cambia mientras corre el programa."""

    id: str
    name: str
    strategy: BucketStrategy
    priority: int  # orden en la cascada: 1 se reparte antes que 2
    target_cents: int | None = None  # solo aplica si strategy es FILL_TO_TARGET
    fixed_amount_cents: int | None = None  # solo aplica si strategy es FIXED
    # Solo aplica a FILL_TO_TARGET/DEBT: cuánto puede pedir como mucho EN UN
    # MES, aunque le falte más para llegar al objetivo. Sin esto, un bucket
    # con un objetivo grande y prioridad alta puede llevarse de golpe todo
    # el ingreso disponible ese mes (ej. "ahorrar 1.500€ para el IRPF" se
    # comería el sueldo entero del primer mes en vez de repartirse en
    # varios). None significa "sin tope", pide todo lo que le falte.
    monthly_cap_cents: int | None = None

    def __post_init__(self) -> None:
        # Validamos que cada estrategia tenga el dato que necesita para funcionar.
        if self.strategy is BucketStrategy.FIXED and self.fixed_amount_cents is None:
            raise ValueError(f"Bucket '{self.id}': FIXED requiere fixed_amount_cents")
        if self.strategy in (BucketStrategy.FILL_TO_TARGET, BucketStrategy.DEBT) and (
            self.target_cents is None or self.target_cents <= 0
        ):
            raise ValueError(
                f"Bucket '{self.id}': {self.strategy.value} requiere target_cents > 0"
            )
        if self.monthly_cap_cents is not None:
            if self.strategy not in (BucketStrategy.FILL_TO_TARGET, BucketStrategy.DEBT):
                raise ValueError(
                    f"Bucket '{self.id}': monthly_cap_cents solo aplica a "
                    "FILL_TO_TARGET o DEBT"
                )
            if self.monthly_cap_cents <= 0:
                raise ValueError(f"Bucket '{self.id}': monthly_cap_cents debe ser > 0")


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
