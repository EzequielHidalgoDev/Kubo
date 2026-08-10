
from datetime import datetime

from sqlalchemy import DateTime, ForeignKeyConstraint, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class BucketModel(Base):
    """Tabla 'buckets': la configuración de cada bucket de cada usuario."""

    __tablename__ = "buckets"

    # Clave primaria compuesta (user_id, id): así dos usuarios distintos
    # pueden tener cada uno un bucket con id="colchon" sin chocar entre sí.
    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    strategy: Mapped[str] = mapped_column(String, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    target_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fixed_amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)


class LedgerEntryModel(Base):
    """Tabla 'ledger_entries': histórico append-only de movimientos por bucket."""

    __tablename__ = "ledger_entries"
    __table_args__ = (
        # La clave foránea también es compuesta, para apuntar al bucket
        # correcto del usuario correcto (no basta con el id del bucket).
        ForeignKeyConstraint(
            ["user_id", "bucket_id"], ["buckets.user_id", "buckets.id"]
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    bucket_id: Mapped[str] = mapped_column(String, nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    # server_default=func.now() -> la fecha la pone Postgres al insertar, no Python.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    note: Mapped[str | None] = mapped_column(String, nullable=True)


class MonthlyIncomeModel(Base):
    """Tabla 'monthly_incomes': el ingreso que el usuario repartió cada mes.

    Se guarda aparte de ledger_entries porque el reparto en sí es solo el
    resultado (cuánto tocó a cada bucket); esto es el dato de entrada que
    lo generó, para poder recalcular el reparto de este mes si el usuario
    edita un bucket después de haber repartido."""

    __tablename__ = "monthly_incomes"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    month: Mapped[int] = mapped_column(Integer, primary_key=True)
    income_cents: Mapped[int] = mapped_column(Integer, nullable=False)
