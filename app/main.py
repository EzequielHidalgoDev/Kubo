from collections.abc import Generator
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user_id
from app.db import SessionLocal
from app.models import BucketModel, LedgerEntryModel, MonthlyIncomeModel
from app.schemas import (
    AllocateRequest,
    AllocationResultRead,
    BucketCreate,
    BucketRead,
    BucketUpdate,
    HistorialAsignacionRead,
    HistorialMesRead,
    RetiroCreate,
    UltimoRepartoRead,
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
    """Saldo de cada bucket del usuario desde siempre: tiene sentido para
    Colchón e Inversión, que van acumulando mes a mes."""
    filas = (
        db.query(LedgerEntryModel.bucket_id, func.sum(LedgerEntryModel.amount_cents))
        .filter(LedgerEntryModel.user_id == user_id)
        .group_by(LedgerEntryModel.bucket_id)
        .all()
    )
    return {bucket_id: total for bucket_id, total in filas}


def get_balances_mes_actual(db: Session, user_id: str) -> dict[str, int]:
    """Saldo de cada bucket solo de este mes. Gastos fijos y Libre para
    gastar no se acumulan mes a mes (cada mes te toca un importe nuevo),
    así que mostrar el total desde siempre sería engañoso."""
    hoy = datetime.now(timezone.utc)
    inicio_mes = datetime(hoy.year, hoy.month, 1, tzinfo=timezone.utc)
    filas = (
        db.query(LedgerEntryModel.bucket_id, func.sum(LedgerEntryModel.amount_cents))
        .filter(LedgerEntryModel.user_id == user_id, LedgerEntryModel.created_at >= inicio_mes)
        .group_by(LedgerEntryModel.bucket_id)
        .all()
    )
    return {bucket_id: total for bucket_id, total in filas}


def to_bucket_read(
    bucket: BucketModel, balances: dict[str, int], balances_mes: dict[str, int]
) -> BucketRead:
    # FIXED (gastos fijos, libre para gastar) muestra solo este mes; el
    # resto (colchón, inversión) muestra el acumulado de siempre.
    saldo = balances_mes if bucket.strategy == "FIXED" else balances
    return BucketRead(
        id=bucket.id,
        name=bucket.name,
        strategy=bucket.strategy,
        priority=bucket.priority,
        target_cents=bucket.target_cents,
        fixed_amount_cents=bucket.fixed_amount_cents,
        balance_cents=saldo.get(bucket.id, 0),
    )


def get_buckets_motor(db: Session, user_id: str) -> list[Bucket]:
    """Traduce los BucketModel (SQLAlchemy) a Bucket (motor puro, sin
    saber nada de Postgres) para poder pasárselos a allocate()."""
    bucket_models = db.query(BucketModel).filter(BucketModel.user_id == user_id).all()
    return [
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


def guardar_reparto(db: Session, user_id: str, income_cents: int) -> AllocationResultRead:
    """Calcula el reparto con los buckets tal y como están ahora mismo y lo
    guarda como movimientos nuevos en el ledger."""
    buckets = get_buckets_motor(db, user_id)
    current_balances = get_balances(db, user_id)

    resultado = allocate(
        income_cents=income_cents,
        buckets=buckets,
        current_balances=current_balances,
    )

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


def recalcular_reparto_del_mes(db: Session, user_id: str) -> None:
    """Si el usuario ya repartió su ingreso este mes, borra ese reparto y lo
    vuelve a calcular con los buckets tal y como están ahora. Así, editar,
    crear o borrar un bucket se refleja al momento en el reparto ya hecho,
    en vez de esperar al mes que viene."""
    hoy = datetime.now(timezone.utc)
    ingreso_mes = (
        db.query(MonthlyIncomeModel)
        .filter(
            MonthlyIncomeModel.user_id == user_id,
            MonthlyIncomeModel.year == hoy.year,
            MonthlyIncomeModel.month == hoy.month,
        )
        .first()
    )
    if ingreso_mes is None:
        return  # este mes todavía no se ha repartido nada, no hay qué recalcular

    inicio_mes = datetime(hoy.year, hoy.month, 1, tzinfo=timezone.utc)
    db.query(LedgerEntryModel).filter(
        LedgerEntryModel.user_id == user_id,
        LedgerEntryModel.note == "reparto automático",
        LedgerEntryModel.created_at >= inicio_mes,
    ).delete()
    db.commit()

    guardar_reparto(db, user_id, ingreso_mes.income_cents)


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

    datos_bucket = bucket.model_dump(exclude={"initial_balance_cents"})
    nuevo = BucketModel(user_id=user_id, **datos_bucket)
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

    saldo_inicial = 0
    if bucket.initial_balance_cents and bucket.initial_balance_cents > 0:
        saldo_inicial = bucket.initial_balance_cents
        db.add(
            LedgerEntryModel(
                user_id=user_id,
                bucket_id=nuevo.id,
                amount_cents=saldo_inicial,
                note="saldo inicial",
            )
        )
        db.commit()

    recalcular_reparto_del_mes(db, user_id)
    return to_bucket_read(nuevo, get_balances(db, user_id), get_balances_mes_actual(db, user_id))


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
    balances_mes = get_balances_mes_actual(db, user_id)
    return [to_bucket_read(b, balances, balances_mes) for b in buckets]


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

    recalcular_reparto_del_mes(db, user_id)
    return to_bucket_read(bucket, get_balances(db, user_id), get_balances_mes_actual(db, user_id))


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
    recalcular_reparto_del_mes(db, user_id)


@app.post("/buckets/{bucket_id}/retirar", response_model=BucketRead)
def retirar_de_bucket(
    bucket_id: str,
    datos: RetiroCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> BucketRead:
    """Registra un gasto real desde un bucket de ahorro (colchón, inversión).
    Solo tiene sentido en buckets que acumulan saldo propio: Gastos fijos y
    Libre para gastar son un importe recurrente (no hay saldo del que
    "retirar"), y Deuda es dinero que ya salió hacia el acreedor, no dinero
    que tengas tú guardado."""
    bucket = get_bucket_o_404(db, user_id, bucket_id)

    if bucket.strategy in ("FIXED", "DEBT"):
        raise HTTPException(
            status_code=400,
            detail="Este bucket no tiene saldo del que retirar",
        )

    saldo_actual = get_balances(db, user_id).get(bucket_id, 0)
    if datos.amount_cents > saldo_actual:
        raise HTTPException(
            status_code=400,
            detail="No puedes retirar más de lo que hay en el bucket",
        )

    db.add(
        LedgerEntryModel(
            user_id=user_id,
            bucket_id=bucket_id,
            amount_cents=-datos.amount_cents,
            note=datos.note or "retiro",
        )
    )
    db.commit()

    return to_bucket_read(bucket, get_balances(db, user_id), get_balances_mes_actual(db, user_id))


@app.post("/allocate", response_model=AllocationResultRead)
def ejecutar_reparto(
    request: AllocateRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> AllocationResultRead:
    resultado = guardar_reparto(db, user_id, request.income_cents)

    # Guardamos qué ingreso se repartió este mes, para poder recalcular el
    # reparto si el usuario edita un bucket más adelante (ver
    # recalcular_reparto_del_mes). Si ya había uno este mes, se actualiza.
    hoy = datetime.now(timezone.utc)
    ingreso_mes = (
        db.query(MonthlyIncomeModel)
        .filter(
            MonthlyIncomeModel.user_id == user_id,
            MonthlyIncomeModel.year == hoy.year,
            MonthlyIncomeModel.month == hoy.month,
        )
        .first()
    )
    if ingreso_mes is None:
        db.add(
            MonthlyIncomeModel(
                user_id=user_id, year=hoy.year, month=hoy.month, income_cents=request.income_cents
            )
        )
    else:
        ingreso_mes.income_cents = request.income_cents
    db.commit()

    return resultado


@app.get("/allocate/ultimo", response_model=UltimoRepartoRead)
def ultimo_reparto(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> UltimoRepartoRead:
    """Fecha del reparto automático más reciente, para que la app sepa si
    ya se hizo el de este mes (y bloquee el formulario hasta el siguiente)."""
    realizado_en = (
        db.query(func.max(LedgerEntryModel.created_at))
        .filter(
            LedgerEntryModel.user_id == user_id,
            LedgerEntryModel.note == "reparto automático",
        )
        .scalar()
    )
    return UltimoRepartoRead(realizado_en=realizado_en)


@app.get("/historial", response_model=list[HistorialMesRead])
def historial(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
) -> list[HistorialMesRead]:
    """Un resumen por mes de los repartos ya hechos: ingreso total y cuánto
    se llevó cada bucket, del más reciente al más antiguo."""
    meses = (
        db.query(MonthlyIncomeModel)
        .filter(MonthlyIncomeModel.user_id == user_id)
        .order_by(MonthlyIncomeModel.year.desc(), MonthlyIncomeModel.month.desc())
        .all()
    )
    nombres_bucket = {
        b.id: b.name
        for b in db.query(BucketModel).filter(BucketModel.user_id == user_id).all()
    }

    resultado = []
    for mes in meses:
        inicio = datetime(mes.year, mes.month, 1, tzinfo=timezone.utc)
        siguiente_mes = mes.month + 1 if mes.month < 12 else 1
        siguiente_año = mes.year if mes.month < 12 else mes.year + 1
        fin = datetime(siguiente_año, siguiente_mes, 1, tzinfo=timezone.utc)

        filas = (
            db.query(LedgerEntryModel.bucket_id, func.sum(LedgerEntryModel.amount_cents))
            .filter(
                LedgerEntryModel.user_id == user_id,
                LedgerEntryModel.note == "reparto automático",
                LedgerEntryModel.created_at >= inicio,
                LedgerEntryModel.created_at < fin,
            )
            .group_by(LedgerEntryModel.bucket_id)
            .all()
        )
        resultado.append(
            HistorialMesRead(
                year=mes.year,
                month=mes.month,
                income_cents=mes.income_cents,
                allocations=[
                    HistorialAsignacionRead(
                        bucket_id=bucket_id,
                        bucket_name=nombres_bucket.get(bucket_id, bucket_id),
                        amount_cents=total,
                    )
                    for bucket_id, total in filas
                ],
            )
        )
    return resultado
