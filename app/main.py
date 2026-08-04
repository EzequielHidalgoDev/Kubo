from collections.abc import Generator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user_id
from app.db import SessionLocal
from app.models import BucketModel, LedgerEntryModel
from app.schemas import (
    AllocateRequest,
    AllocationResultRead,
    BucketCreate,
    BucketRead,
    BucketUpdate,
)
from motor.engine import allocate
from motor.models import Bucket, BucketStrategy

# La instancia principal de FastAPI: el objeto que representa toda la API.
app = FastAPI(title="Kubo")

# Permite que la app Expo (u otro cliente en el navegador) llame a esta API
# desde un origen distinto. En desarrollo lo dejamos abierto a todos los
# orígenes; en Fase 3 (CI/CD) conviene restringirlo al dominio real de la app.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    try:
        db.commit()
    except IntegrityError as error:
        # Salta si ya existe un bucket con este id para este usuario
        # (viola la clave primaria compuesta user_id + id).
        db.rollback()
        raise HTTPException(
            status_code=409, detail=f"Ya existe un bucket con id '{bucket.id}'"
        ) from error
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


def get_bucket_o_404(db: Session, user_id: str, bucket_id: str) -> BucketModel:
    bucket = (
        db.query(BucketModel)
        .filter(BucketModel.user_id == user_id, BucketModel.id == bucket_id)
        .first()
    )
    if bucket is None:
        raise HTTPException(status_code=404, detail="Bucket no encontrado")
    return bucket


@app.put("/buckets/{bucket_id}", response_model=BucketRead)
def editar_bucket(
    bucket_id: str,
    datos: BucketUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> BucketRead:
    bucket = get_bucket_o_404(db, user_id, bucket_id)

    # Misma validación que al crear: reutilizamos motor.models.Bucket.
    try:
        Bucket(
            id=bucket_id,
            name=datos.name,
            strategy=BucketStrategy(datos.strategy),
            priority=datos.priority,
            target_cents=datos.target_cents,
            fixed_amount_cents=datos.fixed_amount_cents,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    bucket.name = datos.name
    bucket.strategy = datos.strategy
    bucket.priority = datos.priority
    bucket.target_cents = datos.target_cents
    bucket.fixed_amount_cents = datos.fixed_amount_cents
    db.commit()
    db.refresh(bucket)

    balances = get_balances(db, user_id)
    return to_bucket_read(bucket, balances)


@app.delete("/buckets/{bucket_id}", status_code=204)
def borrar_bucket(
    bucket_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> None:
    bucket = get_bucket_o_404(db, user_id, bucket_id)

    tiene_historial = (
        db.query(LedgerEntryModel)
        .filter(LedgerEntryModel.user_id == user_id, LedgerEntryModel.bucket_id == bucket_id)
        .first()
        is not None
    )
    if tiene_historial:
        raise HTTPException(
            status_code=409,
            detail="No se puede borrar: el bucket tiene movimientos en el historial",
        )

    db.delete(bucket)
    db.commit()


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
