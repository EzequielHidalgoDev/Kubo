from sqlalchemy import Integer, String
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
