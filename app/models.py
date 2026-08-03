from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class BucketModel(Base):
    """Tabla 'buckets': la configuración de cada bucket del usuario."""

    __tablename__ = "buckets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    strategy: Mapped[str] = mapped_column(String, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    target_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fixed_amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)


class LedgerEntryModel(Base):
    """Tabla 'ledger_entries': histórico append-only de movimientos por bucket."""

    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bucket_id: Mapped[str] = mapped_column(String, ForeignKey("buckets.id"), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    # server_default=func.now() -> la fecha la pone Postgres al insertar, no Python.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    note: Mapped[str | None] = mapped_column(String, nullable=True)
