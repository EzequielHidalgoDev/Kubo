from motor.engine import allocate
from motor.models import Bucket, BucketStrategy

# Los mismos 4 buckets de Kubo, reutilizados en varios tests.
GASTOS_FIJOS = Bucket(
    id="gastos_fijos",
    name="Gastos fijos",
    strategy=BucketStrategy.FIXED,
    priority=1,
    fixed_amount_cents=90000,  # 900€
)
COLCHON = Bucket(
    id="colchon",
    name="Colchón de emergencia",
    strategy=BucketStrategy.FILL_TO_TARGET,
    priority=2,
    target_cents=400000,  # 4.000€
)
IMPREVISTOS = Bucket(
    id="imprevistos",
    name="Fondo de imprevistos",
    strategy=BucketStrategy.FILL_TO_TARGET,
    priority=3,
    target_cents=120000,  # 1.200€
)
INVERSION = Bucket(
    id="inversion",
    name="Inversión",
    strategy=BucketStrategy.REMAINDER,
    priority=4,
)

BUCKETS = [GASTOS_FIJOS, COLCHON, IMPREVISTOS, INVERSION]


def test_reparto_normal_con_todos_los_buckets_vacios():
    # Ingreso de 1.800€, todos los buckets parten de 0.
    resultado = allocate(income_cents=180000, buckets=BUCKETS, current_balances={})

    por_bucket = {a.bucket_id: a.amount_cents for a in resultado.allocations}
    assert por_bucket["gastos_fijos"] == 90000  # se cubre entero el fijo
    assert por_bucket["colchon"] == 90000  # lo que queda tras gastos fijos
    assert por_bucket["imprevistos"] == 0  # ya no queda nada
    assert por_bucket["inversion"] == 0
    assert resultado.unallocated_cents == 0


def test_colchon_ya_lleno_pasa_al_siguiente_bucket():
    # El colchón ya tiene su objetivo cubierto, así que no recibe nada extra.
    resultado = allocate(
        income_cents=180000,
        buckets=BUCKETS,
        current_balances={"colchon": 400000},
    )

    por_bucket = {a.bucket_id: a.amount_cents for a in resultado.allocations}
    assert por_bucket["colchon"] == 0
    assert por_bucket["imprevistos"] == 90000  # el sobrante va a imprevistos
    assert resultado.unallocated_cents == 0


def test_ingreso_insuficiente_para_gastos_fijos():
    # Ingreso menor que los gastos fijos: se reparte lo que hay, sin errores.
    resultado = allocate(income_cents=50000, buckets=BUCKETS, current_balances={})

    por_bucket = {a.bucket_id: a.amount_cents for a in resultado.allocations}
    assert por_bucket["gastos_fijos"] == 50000  # todo lo disponible
    assert por_bucket["colchon"] == 0
    assert por_bucket["imprevistos"] == 0
    assert por_bucket["inversion"] == 0
    assert resultado.unallocated_cents == 0


def test_reached_target_true_cuando_se_completa_el_objetivo():
    # Con 3.900€ ya en el colchón, faltan solo 100€ para el objetivo de 4.000€.
    resultado = allocate(
        income_cents=180000,
        buckets=BUCKETS,
        current_balances={"colchon": 390000},
    )

    colchon_allocation = next(
        a for a in resultado.allocations if a.bucket_id == "colchon"
    )
    assert colchon_allocation.amount_cents == 10000  # solo lo que faltaba
    assert colchon_allocation.reached_target is True


def test_reached_target_false_si_no_llega_al_objetivo():
    # Ingreso bajo: el colchón recibe algo pero no llega a completarse.
    resultado = allocate(
        income_cents=90000,  # justo lo de gastos fijos, nada más
        buckets=BUCKETS,
        current_balances={},
    )

    colchon_allocation = next(
        a for a in resultado.allocations if a.bucket_id == "colchon"
    )
    assert colchon_allocation.amount_cents == 0
    assert colchon_allocation.reached_target is False
