import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Carga las variables del fichero .env (ej. DATABASE_URL) al entorno del proceso.
load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

# El engine es el punto de conexión de SQLAlchemy con Postgres.
engine = create_engine(DATABASE_URL)

# SessionLocal crea "sesiones": conversaciones con la base de datos donde
# se agrupan las operaciones (leer, escribir) antes de confirmarlas con commit.
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """Clase base de la que heredan todos los modelos ORM (tablas)."""
