from pydantic import BaseModel, ConfigDict


class BucketCreate(BaseModel):
    """Lo que la API espera recibir para crear un bucket."""

    id: str
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

    # Permite crear un BucketRead directamente a partir de un BucketModel
    # (objeto de SQLAlchemy), sin convertirlo a dict a mano.
    model_config = ConfigDict(from_attributes=True)


class AllocateRequest(BaseModel):
    """Lo que la API espera recibir para ejecutar un reparto."""

    income_cents: int


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
