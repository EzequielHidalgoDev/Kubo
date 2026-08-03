def test_health(client):
    respuesta = client.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"status": "ok"}


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
