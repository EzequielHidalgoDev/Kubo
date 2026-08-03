from collections.abc import Generator

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import BucketModel
from app.schemas import BucketCreate, BucketRead

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
