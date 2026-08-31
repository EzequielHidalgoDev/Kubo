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


def test_misma_prioridad_con_dinero_de_sobra_cubre_las_dos_demandas():
    # Dos buckets con la misma prioridad: si hay dinero para las dos
    # demandas completas, cada uno recibe exactamente lo que necesita
    # (no hace falta prorratear).
    a = Bucket(id="a", name="A", strategy=BucketStrategy.FIXED, priority=1, fixed_amount_cents=1000)
    b = Bucket(id="b", name="B", strategy=BucketStrategy.FIXED, priority=1, fixed_amount_cents=2000)

    resultado = allocate(income_cents=10000, buckets=[a, b], current_balances={})

    por_bucket = {x.bucket_id: x.amount_cents for x in resultado.allocations}
    assert por_bucket["a"] == 1000
    assert por_bucket["b"] == 2000
    assert resultado.unallocated_cents == 7000


def test_misma_prioridad_sin_dinero_suficiente_se_reparte_proporcional():
    # Dos buckets FIXED con la misma prioridad piden 1000 y 3000 (4000 en
    # total), pero solo hay 2000 disponibles: se reparten a la mitad cada
    # uno (proporcional a lo que pedía cada uno), no uno detrás del otro.
    a = Bucket(id="a", name="A", strategy=BucketStrategy.FIXED, priority=1, fixed_amount_cents=1000)
    b = Bucket(id="b", name="B", strategy=BucketStrategy.FIXED, priority=1, fixed_amount_cents=3000)

    resultado = allocate(income_cents=2000, buckets=[a, b], current_balances={})

    por_bucket = {x.bucket_id: x.amount_cents for x in resultado.allocations}
    assert por_bucket["a"] == 500  # 1/4 de la demanda total -> 1/4 de los 2000
    assert por_bucket["b"] == 1500  # 3/4 de la demanda total -> 3/4 de los 2000
    assert por_bucket["a"] + por_bucket["b"] == 2000  # no se pierde ni un céntimo
    assert resultado.unallocated_cents == 0


def test_colchon_minimo_estricto_y_luego_paralelo_con_inversion():
    # El caso real: colchón mínimo (prioridad 2, solo) va antes que nada;
    # una vez cubierto, el resto del colchón e inversión (prioridad 3,
    # compartida) se reparten a la vez.
    gastos_fijos = Bucket(
        id="gastos_fijos", name="Gastos fijos", strategy=BucketStrategy.FIXED,
        priority=1, fixed_amount_cents=64500,  # 645€
    )
    colchon_minimo = Bucket(
        id="colchon_minimo", name="Colchón mínimo", strategy=BucketStrategy.FILL_TO_TARGET,
        priority=2, target_cents=64500,  # 1 mes de gastos fijos
    )
    colchon_resto = Bucket(
        id="colchon_resto", name="Colchón (resto)", strategy=BucketStrategy.FILL_TO_TARGET,
        priority=3, target_cents=193500,  # hasta 3 meses más (total 4 meses)
    )
    inversion = Bucket(
        id="inversion", name="Inversión", strategy=BucketStrategy.FIXED,
        priority=3, fixed_amount_cents=25000,  # 250€
    )
    buckets = [gastos_fijos, colchon_minimo, colchon_resto, inversion]

    # Ingreso de 1.900€, colchón mínimo todavía vacío.
    resultado = allocate(income_cents=190000, buckets=buckets, current_balances={})
    por_bucket = {x.bucket_id: x.amount_cents for x in resultado.allocations}

    assert por_bucket["gastos_fijos"] == 64500
    assert por_bucket["colchon_minimo"] == 64500  # se llena entero, prioridad propia
    # Sobrante tras gastos fijos + colchón mínimo: 190000-64500-64500 = 61000,
    # repartido en paralelo entre colchon_resto (pide 193500) e inversion (pide 25000).
    assert por_bucket["colchon_resto"] + por_bucket["inversion"] == 61000
    assert por_bucket["inversion"] > 0  # inversión ya recibe algo este mismo mes
    assert resultado.unallocated_cents == 0


def test_deuda_se_comporta_como_fill_to_target():
    # DEBT pide lo mismo que FILL_TO_TARGET: el resto hasta el objetivo
    # (aquí, el objetivo es el total de la deuda, no un ahorro).
    deuda = Bucket(
        id="deuda", name="Tarjeta de crédito", strategy=BucketStrategy.DEBT,
        priority=1, target_cents=100000,  # debes 1.000€ en total
    )
    resultado = allocate(income_cents=30000, buckets=[deuda], current_balances={"deuda": 40000})

    deuda_allocation = resultado.allocations[0]
    assert deuda_allocation.amount_cents == 30000  # todo lo disponible, aún queda deuda
    assert deuda_allocation.reached_target is False  # 70.000 de 100.000, aún no salda


def test_deuda_saldada_marca_reached_target():
    deuda = Bucket(
        id="deuda", name="Tarjeta de crédito", strategy=BucketStrategy.DEBT,
        priority=1, target_cents=100000,
    )
    resultado = allocate(income_cents=30000, buckets=[deuda], current_balances={"deuda": 90000})

    deuda_allocation = resultado.allocations[0]
    assert deuda_allocation.amount_cents == 10000  # solo lo que faltaba para saldarla
    assert deuda_allocation.reached_target is True


def test_deuda_antes_que_resto_del_colchon_y_que_inversion():
    # El orden financiero correcto: colchón mínimo -> deuda -> resto del
    # colchón -> inversión. La deuda de interés alto va antes de invertir.
    colchon_minimo = Bucket(
        id="colchon_minimo", name="Colchón mínimo", strategy=BucketStrategy.FILL_TO_TARGET,
        priority=1, target_cents=60000,
    )
    deuda = Bucket(
        id="deuda", name="Deuda", strategy=BucketStrategy.DEBT,
        priority=2, target_cents=50000,
    )
    colchon_resto = Bucket(
        id="colchon_resto", name="Colchón (resto)", strategy=BucketStrategy.FILL_TO_TARGET,
        priority=3, target_cents=180000,
    )
    inversion = Bucket(
        id="inversion", name="Inversión", strategy=BucketStrategy.REMAINDER, priority=4,
    )
    buckets = [colchon_minimo, deuda, colchon_resto, inversion]

    # Colchón mínimo ya está lleno: el dinero debe ir entero a la deuda
    # antes de tocar el resto del colchón o la inversión.
    resultado = allocate(
        income_cents=30000, buckets=buckets, current_balances={"colchon_minimo": 60000}
    )
    por_bucket = {x.bucket_id: x.amount_cents for x in resultado.allocations}

    assert por_bucket["deuda"] == 30000
    assert por_bucket["colchon_resto"] == 0
    assert por_bucket["inversion"] == 0


def test_monthly_cap_limita_lo_que_pide_un_bucket_aunque_haya_de_sobra():
    # Caso real: reserva de 1.500€ para el IRPF, tope de 300€/mes para no
    # comerse el sueldo entero de golpe aunque el ingreso dé para más.
    irpf = Bucket(
        id="irpf", name="Reserva IRPF", strategy=BucketStrategy.FILL_TO_TARGET,
        priority=1, target_cents=150000, monthly_cap_cents=30000,
    )
    inversion = Bucket(
        id="inversion", name="Inversión", strategy=BucketStrategy.REMAINDER, priority=2,
    )

    # Ingreso de sobra para cubrir los 1.500€ enteros este mismo mes, pero
    # el tope lo frena en 300€.
    resultado = allocate(income_cents=250000, buckets=[irpf, inversion], current_balances={})
    por_bucket = {x.bucket_id: x.amount_cents for x in resultado.allocations}

    assert por_bucket["irpf"] == 30000  # el tope, no los 150000 que le faltarían
    assert por_bucket["inversion"] == 220000  # el resto pasa al siguiente bucket
    assert resultado.unallocated_cents == 0


def test_monthly_cap_no_limita_si_ya_falta_menos_que_el_tope():
    # A 30€ de completar el objetivo: aunque el tope sea de 300€, no pide
    # más de lo que realmente le falta.
    irpf = Bucket(
        id="irpf", name="Reserva IRPF", strategy=BucketStrategy.FILL_TO_TARGET,
        priority=1, target_cents=150000, monthly_cap_cents=30000,
    )
    resultado = allocate(
        income_cents=100000, buckets=[irpf], current_balances={"irpf": 147000}
    )

    irpf_allocation = resultado.allocations[0]
    assert irpf_allocation.amount_cents == 3000  # solo lo que faltaba
    assert irpf_allocation.reached_target is True
