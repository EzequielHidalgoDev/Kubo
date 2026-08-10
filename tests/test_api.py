from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.auth import get_current_user_id
from app.main import app, get_db
from app.models import LedgerEntryModel


def test_health(client):
    respuesta = client.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"status": "ok"}


def test_crear_bucket_con_saldo_inicial(client):
    respuesta = client.post(
        "/buckets",
        json={
            "id": "colchon",
            "name": "Colchón",
            "strategy": "FILL_TO_TARGET",
            "priority": 1,
            "target_cents": 400000,
            "initial_balance_cents": 400000,
        },
    )
    assert respuesta.status_code == 200
    assert respuesta.json()["balance_cents"] == 400000

    # Y que quede guardado de verdad, no solo en la respuesta.
    listado = client.get("/buckets").json()
    assert listado[0]["balance_cents"] == 400000


def test_allocate_con_ingreso_negativo_devuelve_422(client):
    respuesta = client.post("/allocate", json={"income_cents": -100})
    assert respuesta.status_code == 422


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


def test_ultimo_reparto_null_si_nunca_se_ha_repartido(client):
    respuesta = client.get("/allocate/ultimo")
    assert respuesta.status_code == 200
    assert respuesta.json()["realizado_en"] is None


def test_ultimo_reparto_devuelve_fecha_tras_repartir(client):
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
    client.post("/allocate", json={"income_cents": 90000})

    respuesta = client.get("/allocate/ultimo")
    assert respuesta.json()["realizado_en"] is not None


def test_editar_bucket_recalcula_el_reparto_de_este_mes(client):
    # Dos buckets FIXED a la misma prioridad: gastos_fijos y libre.
    client.post(
        "/buckets",
        json={
            "id": "gastos_fijos",
            "name": "Gastos fijos",
            "strategy": "FIXED",
            "priority": 1,
            "fixed_amount_cents": 60000,
        },
    )
    client.post(
        "/buckets",
        json={
            "id": "libre",
            "name": "Libre para gastar",
            "strategy": "FIXED",
            "priority": 1,
            "fixed_amount_cents": 60000,
        },
    )
    client.post("/allocate", json={"income_cents": 120000})

    libre_antes = next(
        b for b in client.get("/buckets").json() if b["id"] == "libre"
    )
    assert libre_antes["balance_cents"] == 60000

    # Bajamos "libre" a 30.000: el reparto de este mes ya hecho debe
    # actualizarse solo, sin tener que volver a pulsar "Repartir".
    client.put(
        "/buckets/libre",
        json={
            "name": "Libre para gastar",
            "strategy": "FIXED",
            "priority": 1,
            "fixed_amount_cents": 30000,
        },
    )

    libre_despues = next(
        b for b in client.get("/buckets").json() if b["id"] == "libre"
    )
    assert libre_despues["balance_cents"] == 30000


def test_historial_vacio_sin_repartos(client):
    respuesta = client.get("/historial")
    assert respuesta.status_code == 200
    assert respuesta.json() == []


def test_historial_devuelve_el_reparto_del_mes(client):
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
    client.post("/allocate", json={"income_cents": 90000})

    respuesta = client.get("/historial")
    assert respuesta.status_code == 200
    meses = respuesta.json()
    assert len(meses) == 1
    assert meses[0]["income_cents"] == 90000
    assert meses[0]["allocations"] == [
        {"bucket_id": "gastos_fijos", "bucket_name": "Gastos fijos", "amount_cents": 90000}
    ]


def test_bucket_fixed_no_acumula_saldo_de_meses_anteriores(client, db_session):
    # Gastos fijos es un importe recurrente, no algo que se va acumulando:
    # el saldo mostrado debe ser solo el de este mes.
    client.post(
        "/buckets",
        json={
            "id": "gastos_fijos",
            "name": "Gastos fijos",
            "strategy": "FIXED",
            "priority": 1,
            "fixed_amount_cents": 60000,
        },
    )
    client.post("/allocate", json={"income_cents": 60000})

    # Empujamos ese movimiento al mes pasado, simulando que ha pasado un mes.
    db_session.query(LedgerEntryModel).update(
        {LedgerEntryModel.created_at: datetime.now(timezone.utc) - timedelta(days=32)}
    )
    db_session.commit()

    bucket = client.get("/buckets").json()[0]
    assert bucket["balance_cents"] == 0


def test_retirar_de_colchon_resta_del_saldo(client):
    client.post(
        "/buckets",
        json={
            "id": "colchon",
            "name": "Colchón",
            "strategy": "FILL_TO_TARGET",
            "priority": 1,
            "target_cents": 400000,
            "initial_balance_cents": 400000,
        },
    )

    respuesta = client.post("/buckets/colchon/retirar", json={"amount_cents": 100000})
    assert respuesta.status_code == 200
    assert respuesta.json()["balance_cents"] == 300000


def test_retirar_mas_de_lo_que_hay_devuelve_400(client):
    client.post(
        "/buckets",
        json={
            "id": "colchon",
            "name": "Colchón",
            "strategy": "FILL_TO_TARGET",
            "priority": 1,
            "target_cents": 400000,
            "initial_balance_cents": 100000,
        },
    )

    respuesta = client.post("/buckets/colchon/retirar", json={"amount_cents": 200000})
    assert respuesta.status_code == 400


def test_retirar_de_bucket_fixed_devuelve_400(client):
    client.post(
        "/buckets",
        json={
            "id": "gastos_fijos",
            "name": "Gastos fijos",
            "strategy": "FIXED",
            "priority": 1,
            "fixed_amount_cents": 60000,
        },
    )

    respuesta = client.post("/buckets/gastos_fijos/retirar", json={"amount_cents": 1000})
    assert respuesta.status_code == 400


def test_crear_bucket_de_deuda_y_repartir(client):
    client.post(
        "/buckets",
        json={
            "id": "deuda",
            "name": "Tarjeta de crédito",
            "strategy": "DEBT",
            "priority": 1,
            "target_cents": 50000,
        },
    )
    respuesta = client.post("/allocate", json={"income_cents": 20000})
    assert respuesta.status_code == 200

    bucket = client.get("/buckets").json()[0]
    assert bucket["balance_cents"] == 20000  # lo pagado hasta ahora, se acumula


def test_retirar_de_bucket_de_deuda_devuelve_400(client):
    client.post(
        "/buckets",
        json={
            "id": "deuda",
            "name": "Tarjeta de crédito",
            "strategy": "DEBT",
            "priority": 1,
            "target_cents": 50000,
        },
    )
    client.post("/allocate", json={"income_cents": 20000})

    respuesta = client.post("/buckets/deuda/retirar", json={"amount_cents": 1000})
    assert respuesta.status_code == 400
