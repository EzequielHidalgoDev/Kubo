from fastapi.testclient import TestClient

from app.auth import get_current_user_id
from app.main import app, get_db


def test_health(client):
    respuesta = client.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"status": "ok"}


def test_sin_token_devuelve_401(db_session):
    # El fixture "client" ya viene con el usuario simulado; aquí lo evitamos
    # a propósito para comprobar qué pasa SIN autenticación.
    app.dependency_overrides[get_db] = lambda: db_session
    cliente_sin_auth = TestClient(app)

    respuesta = cliente_sin_auth.get("/buckets")

    assert respuesta.status_code == 401
    app.dependency_overrides.clear()


def test_buckets_aislados_entre_usuarios(db_session):
    app.dependency_overrides[get_db] = lambda: db_session

    app.dependency_overrides[get_current_user_id] = lambda: "usuario_a"
    TestClient(app).post(
        "/buckets",
        json={
            "id": "colchon",
            "name": "Colchón de A",
            "strategy": "FILL_TO_TARGET",
            "priority": 1,
            "target_cents": 100000,
        },
    )

    app.dependency_overrides[get_current_user_id] = lambda: "usuario_b"
    respuesta_b = TestClient(app).get("/buckets")

    assert respuesta_b.json() == []  # usuario_b no ve los buckets de usuario_a
    app.dependency_overrides.clear()


def test_crear_bucket_fixed_sin_importe_devuelve_400(client):
    respuesta = client.post(
        "/buckets",
        json={
            "id": "malo",
            "name": "Bucket malo",
            "strategy": "FIXED",
            "priority": 9,
        },
    )
    assert respuesta.status_code == 400
    assert "fixed_amount_cents" in respuesta.json()["detail"]


def test_crear_bucket_con_id_repetido_devuelve_409(client):
    datos = {
        "id": "gastos_fijos",
        "name": "Gastos fijos",
        "strategy": "FIXED",
        "priority": 1,
        "fixed_amount_cents": 90000,
    }
    assert client.post("/buckets", json=datos).status_code == 200

    respuesta_repetida = client.post("/buckets", json=datos)
    assert respuesta_repetida.status_code == 409


def test_cors_permite_origenes_externos(client):
    respuesta = client.get("/health", headers={"Origin": "http://localhost:19000"})
    assert respuesta.headers["access-control-allow-origin"] == "*"


def test_crear_y_listar_bucket(client):
    respuesta_crear = client.post(
        "/buckets",
        json={
            "id": "gastos_fijos",
            "name": "Gastos fijos",
            "strategy": "FIXED",
            "priority": 1,
            "fixed_amount_cents": 90000,
        },
    )
    assert respuesta_crear.status_code == 200
    assert respuesta_crear.json()["id"] == "gastos_fijos"

    respuesta_listar = client.get("/buckets")
    assert respuesta_listar.status_code == 200
    ids = [b["id"] for b in respuesta_listar.json()]
    assert ids == ["gastos_fijos"]


def test_editar_bucket(client):
    client.post(
        "/buckets",
        json={
            "id": "colchon",
            "name": "Colchón",
            "strategy": "FILL_TO_TARGET",
            "priority": 3,
            "target_cents": 400000,
        },
    )

    respuesta = client.put(
        "/buckets/colchon",
        json={
            "name": "Colchón de emergencia",
            "strategy": "FILL_TO_TARGET",
            "priority": 2,
            "target_cents": 500000,
        },
    )

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["name"] == "Colchón de emergencia"
    assert datos["priority"] == 2
    assert datos["target_cents"] == 500000


def test_editar_bucket_inexistente_devuelve_404(client):
    respuesta = client.put(
        "/buckets/no_existe",
        json={"name": "X", "strategy": "FIXED", "priority": 1, "fixed_amount_cents": 100},
    )
    assert respuesta.status_code == 404


def test_borrar_bucket_sin_historial(client):
    client.post(
        "/buckets",
        json={
            "id": "mudanza",
            "name": "Mudanza",
            "strategy": "FILL_TO_TARGET",
            "priority": 2,
            "target_cents": 80000,
        },
    )

    respuesta = client.delete("/buckets/mudanza")
    assert respuesta.status_code == 204

    ids = [b["id"] for b in client.get("/buckets").json()]
    assert "mudanza" not in ids


def test_borrar_bucket_con_historial_devuelve_409(client):
    client.post(
        "/buckets",
        json={
            "id": "colchon",
            "name": "Colchón",
            "strategy": "FILL_TO_TARGET",
            "priority": 1,
            "target_cents": 400000,
        },
    )
    client.post("/allocate", json={"income_cents": 100000})  # genera historial

    respuesta = client.delete("/buckets/colchon")
    assert respuesta.status_code == 409


def test_allocate_reparte_y_guarda_en_ledger(client):
    client.post(
        "/buckets",
        json={
            "id": "gastos_fijos",
            "name": "Gastos fijos",
            "strategy": "FIXED",
            "priority": 1,
            "fixed_amount_cents": 90000,
        },
    )
    client.post(
        "/buckets",
        json={
            "id": "colchon",
            "name": "Colchón",
            "strategy": "FILL_TO_TARGET",
            "priority": 2,
            "target_cents": 400000,
        },
    )

    respuesta = client.post("/allocate", json={"income_cents": 180000})
    assert respuesta.status_code == 200

    datos = respuesta.json()
    por_bucket = {a["bucket_id"]: a["amount_cents"] for a in datos["allocations"]}
    assert por_bucket["gastos_fijos"] == 90000
    assert por_bucket["colchon"] == 90000
    assert datos["unallocated_cents"] == 0


def test_allocate_recuerda_saldo_previo_del_colchon(client):
    # Dos repartos seguidos: el segundo debe partir del saldo que dejó el primero.
    client.post(
        "/buckets",
        json={
            "id": "colchon",
            "name": "Colchón",
            "strategy": "FILL_TO_TARGET",
            "priority": 1,
            "target_cents": 100000,
        },
    )

    client.post("/allocate", json={"income_cents": 40000})  # colchón: 40.000
    respuesta_2 = client.post("/allocate", json={"income_cents": 40000})  # +40.000

    datos = respuesta_2.json()
    colchon = next(a for a in datos["allocations"] if a["bucket_id"] == "colchon")
    assert colchon["amount_cents"] == 40000  # sigue habiendo hueco
    assert colchon["reached_target"] is False  # 80.000 de 100.000, aún no llega
