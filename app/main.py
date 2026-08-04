from collections.abc import Generator

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user_id
from app.db import SessionLocal
from app.models import BucketModel, LedgerEntryModel
from app.schemas import (
    AllocateRequest,
    AllocationResultRead,
    BucketCreate,
    BucketRead,
)
from motor.engine import allocate
from motor.models import Bucket, BucketStrategy

# La instancia principal de FastAPI: el objeto que representa toda la API.
app = FastAPI(title="Kubo")


def get_db() -> Generator[Session, None, None]:
    """Abre una sesión de base de datos por petición y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_balances(db: Session, user_id: str) -> dict[str, int]:
    """Saldo actual de cada bucket del usuario: suma de sus movimientos."""
    filas = (
        db.query(LedgerEntryModel.bucket_id, func.sum(LedgerEntryModel.amount_cents))
        .filter(LedgerEntryModel.user_id == user_id)
        .group_by(LedgerEntryModel.bucket_id)
        .all()
    )
    return {bucket_id: total for bucket_id, total in filas}


def to_bucket_read(bucket: BucketModel, balances: dict[str, int]) -> BucketRead:
    return BucketRead(
        id=bucket.id,
        name=bucket.name,
        strategy=bucket.strategy,
        priority=bucket.priority,
        target_cents=bucket.target_cents,
        fixed_amount_cents=bucket.fixed_amount_cents,
        balance_cents=balances.get(bucket.id, 0),
    )


@app.get("/health")
def health() -> dict[str, str]:
    """Endpoint mínimo para comprobar que la API está viva. No requiere login."""
    return {"status": "ok"}


@app.post("/buckets", response_model=BucketRead)
def crear_bucket(
    bucket: BucketCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> BucketRead:
    # Reutilizamos la validación de motor.models.Bucket (misma regla que en
    # Fase 0: cada estrategia necesita su dato correspondiente). No guardamos
    # este objeto, solo lo usamos para que su __post_init__ valide por nosotros.
    try:
        Bucket(
            id=bucket.id,
            name=bucket.name,
            strategy=BucketStrategy(bucket.strategy),
            priority=bucket.priority,
            target_cents=bucket.target_cents,
            fixed_amount_cents=bucket.fixed_amount_cents,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    nuevo = BucketModel(user_id=user_id, **bucket.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return to_bucket_read(nuevo, balances={})  # bucket recién creado: saldo 0


@app.get("/buckets", response_model=list[BucketRead])
def listar_buckets(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[BucketRead]:
    buckets = (
        db.query(BucketModel)
        .filter(BucketModel.user_id == user_id)
        .order_by(BucketModel.priority)
        .all()
    )
    balances = get_balances(db, user_id)
    return [to_bucket_read(b, balances) for b in buckets]


@app.post("/allocate", response_model=AllocationResultRead)
def ejecutar_reparto(
    request: AllocateRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> AllocationResultRead:
    bucket_models = db.query(BucketModel).filter(BucketModel.user_id == user_id).all()

    # Traducimos BucketModel (de la base de datos) a Bucket (del motor puro),
    # que no sabe nada de SQLAlchemy ni de Postgres.
    buckets = [
        Bucket(
            id=b.id,
            name=b.name,
            strategy=BucketStrategy(b.strategy),
            priority=b.priority,
            target_cents=b.target_cents,
            fixed_amount_cents=b.fixed_amount_cents,
        )
        for b in bucket_models
    ]

    current_balances = get_balances(db, user_id)

    resultado = allocate(
        income_cents=request.income_cents,
        buckets=buckets,
        current_balances=current_balances,
    )

    # Guardamos el reparto como movimientos nuevos (append-only).
    for a in resultado.allocations:
        if a.amount_cents > 0:
            db.add(
                LedgerEntryModel(
                    user_id=user_id,
                    bucket_id=a.bucket_id,
                    amount_cents=a.amount_cents,
                    note="reparto automático",
                )
            )
    db.commit()

    return resultado
