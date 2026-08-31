from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BucketCreate(BaseModel):
    """Lo que la API espera recibir para crear un bucket."""

    id: str
    name: str
    strategy: str
    priority: int
    target_cents: int | None = None
    fixed_amount_cents: int | None = None
    # Solo aplica a FILL_TO_TARGET/DEBT: cuánto puede recibir como mucho en
    # un mes, aunque le falte más para el objetivo (ver motor/models.py).
    monthly_cap_cents: int | None = None
    # Dinero que ya tenías ahorrado antes de usar Kubo, para que el bucket
    # no arranque en 0€ si en la vida real ya tenía algo dentro.
    initial_balance_cents: int | None = None


class BucketUpdate(BaseModel):
    """Lo que la API espera recibir para editar un bucket existente.
    Sin 'id': el bucket a editar ya viene indicado en la URL."""

    name: str
    strategy: str
    priority: int
    target_cents: int | None = None
    fixed_amount_cents: int | None = None
    monthly_cap_cents: int | None = None


class BucketRead(BaseModel):
    """Lo que la API devuelve al consultar un bucket."""

    id: str
    name: str
    strategy: str
    priority: int
    target_cents: int | None
    fixed_amount_cents: int | None
    monthly_cap_cents: int | None
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


class UltimoRepartoRead(BaseModel):
    """Cuándo fue el último reparto automático, para saber si ya se hizo
    el de este mes y bloquear el formulario hasta el mes siguiente."""

    realizado_en: datetime | None


class HistorialAsignacionRead(BaseModel):
    """Cuánto se llevó un bucket concreto en el reparto de un mes."""

    bucket_id: str
    bucket_name: str
    amount_cents: int


class HistorialMesRead(BaseModel):
    """El reparto completo de un mes: ingreso total y desglose por bucket."""

    year: int
    month: int
    income_cents: int
    allocations: list[HistorialAsignacionRead]


class RetiroCreate(BaseModel):
    """Lo que la API espera recibir para registrar un gasto desde un bucket
    de ahorro (colchón, inversión): resta del saldo acumulado."""

    amount_cents: int = Field(gt=0)
    note: str | None = None
