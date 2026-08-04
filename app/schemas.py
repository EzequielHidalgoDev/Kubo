from pydantic import BaseModel, ConfigDict, Field


class BucketCreate(BaseModel):
    """Lo que la API espera recibir para crear un bucket."""

    id: str
    name: str
    strategy: str
    priority: int
    target_cents: int | None = None
    fixed_amount_cents: int | None = None


class BucketUpdate(BaseModel):
    """Lo que la API espera recibir para editar un bucket existente.
    Sin 'id': el bucket a editar ya viene indicado en la URL."""

    name: str
    strategy: str
    priority: int
    target_cents: int | None = None
    fixed_amount_cents: int | None = None


class BucketRead(BaseModel):
    """Lo que la API devuelve al consultar un bucket."""

    id: str
    name: str
    strategy: str
    priority: int
    target_cents: int | None
    fixed_amount_cents: int | None
    balance_cents: int  # suma de ledger_entries para este bucket; no viene de BucketModel

    # Permite crear un BucketRead directamente a partir de un BucketModel
    # (objeto de SQLAlchemy), sin convertirlo a dict a mano.
    model_config = ConfigDict(from_attributes=True)


class AllocateRequest(BaseModel):
    """Lo que la API espera recibir para ejecutar un reparto."""

    # gt=0 -> Pydantic valida solo, sin código nuestro: rechaza automáticamente
    # con un 422 cualquier valor 0 o negativo.
    income_cents: int = Field(gt=0)


class BucketAllocationRead(BaseModel):
    """Un resultado individual dentro de un reparto."""

    bucket_id: str
    amount_cents: int
    reached_target: bool

    model_config = ConfigDict(from_attributes=True)


class AllocationResultRead(BaseModel):
    """El desglose completo devuelto tras ejecutar un reparto."""

    income_cents: int
    allocations: list[BucketAllocationRead]
    unallocated_cents: int
