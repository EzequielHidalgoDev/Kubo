from collections.abc import Generator

from fastapi import Depends, FastAPI
from sqlalchemy import func
from sqlalchemy.orm import Session

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


@app.get("/health")
def health() -> dict[str, str]:
    """Endpoint mínimo para comprobar que la API está viva."""
    return {"status": "ok"}


@app.post("/buckets", response_model=BucketRead)
def crear_bucket(bucket: BucketCreate, db: Session = Depends(get_db)) -> BucketModel:
    nuevo = BucketModel(**bucket.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@app.get("/buckets", response_model=list[BucketRead])
def listar_buckets(db: Session = Depends(get_db)) -> list[BucketModel]:
    return db.query(BucketModel).order_by(BucketModel.priority).all()


@app.post("/allocate", response_model=AllocationResultRead)
def ejecutar_reparto(
    request: AllocateRequest, db: Session = Depends(get_db)
) -> AllocationResultRead:
    bucket_models = db.query(BucketModel).all()

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

    # Saldo actual de cada bucket = suma de todos sus movimientos hasta ahora.
    filas_saldo = (
        db.query(LedgerEntryModel.bucket_id, func.sum(LedgerEntryModel.amount_cents))
        .group_by(LedgerEntryModel.bucket_id)
        .all()
    )
    current_balances = {bucket_id: total for bucket_id, total in filas_saldo}

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
                    bucket_id=a.bucket_id,
                    amount_cents=a.amount_cents,
                    note="reparto automático",
                )
            )
    db.commit()

    return resultado
