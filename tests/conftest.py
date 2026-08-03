import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.main import app, get_db

# Base de datos separada de la de desarrollo, solo para tests.
TEST_DATABASE_URL = "postgresql+psycopg://kubo:kubo@localhost:5432/kubo_test"

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def crear_tablas():
    # Se ejecuta una vez para toda la sesión de tests: crea las tablas al
    # principio y las borra al final, sin usar Alembic (aquí no hace falta
    # llevar histórico de migraciones, solo que las tablas existan).
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session():
    # Cada test corre dentro de su propia transacción, que se deshace al
    # final (rollback): así ningún test deja datos que afecten a los demás.
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    # Sustituimos get_db (que normalmente usa la base de datos real) por
    # una versión que usa la sesión de test envuelta en transacción.
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
