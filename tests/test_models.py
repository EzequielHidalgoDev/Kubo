import pytest

from motor.models import Bucket, BucketStrategy


def test_bucket_fixed_valido():
    # Un bucket FIXED con fixed_amount_cents relleno debe crearse sin problema.
    bucket = Bucket(
        id="gastos_fijos",
        name="Gastos fijos",
        strategy=BucketStrategy.FIXED,
        priority=1,
        fixed_amount_cents=150000,
    )
    assert bucket.fixed_amount_cents == 150000
    assert bucket.strategy is BucketStrategy.FIXED


def test_bucket_fill_to_target_valido():
    # Un bucket FILL_TO_TARGET con target_cents > 0 debe crearse sin problema.
    bucket = Bucket(
        id="colchon",
        name="Colchón de emergencia",
        strategy=BucketStrategy.FILL_TO_TARGET,
        priority=2,
        target_cents=400000,
    )
    assert bucket.target_cents == 400000
    assert bucket.strategy is BucketStrategy.FILL_TO_TARGET


def test_bucket_fixed_sin_importe_falla():
    # Si es FIXED pero no se indica fixed_amount_cents, debe fallar en __post_init__.
    with pytest.raises(ValueError):
        Bucket(
            id="gastos_fijos",
            name="Gastos fijos",
            strategy=BucketStrategy.FIXED,
            priority=1,
        )


def test_bucket_fill_to_target_sin_objetivo_falla():
    # Si es FILL_TO_TARGET pero target_cents es 0 (o None), debe fallar.
    with pytest.raises(ValueError):
        Bucket(
            id="colchon",
            name="Colchón de emergencia",
            strategy=BucketStrategy.FILL_TO_TARGET,
            priority=2,
            target_cents=0,
        )


def test_bucket_monthly_cap_en_fixed_falla():
    # monthly_cap_cents solo tiene sentido en FILL_TO_TARGET/DEBT.
    with pytest.raises(ValueError):
        Bucket(
            id="gastos_fijos",
            name="Gastos fijos",
            strategy=BucketStrategy.FIXED,
            priority=1,
            fixed_amount_cents=90000,
            monthly_cap_cents=30000,
        )


def test_bucket_monthly_cap_cero_falla():
    with pytest.raises(ValueError):
        Bucket(
            id="irpf",
            name="Reserva IRPF",
            strategy=BucketStrategy.FILL_TO_TARGET,
            priority=1,
            target_cents=150000,
            monthly_cap_cents=0,
        )


def test_bucket_monthly_cap_valido():
    bucket = Bucket(
        id="irpf",
        name="Reserva IRPF",
        strategy=BucketStrategy.FILL_TO_TARGET,
        priority=1,
        target_cents=150000,
        monthly_cap_cents=30000,
    )
    assert bucket.monthly_cap_cents == 30000
