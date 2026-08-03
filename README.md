# Kubo

App de gestión financiera personal automatizada. En vez de categorizar gastos a posteriori (tipo Fintonic), Kubo reparte el ingreso mensual entre "buckets" (cubos) siguiendo una cascada de prioridad fija.

## Cascada de reparto

1. **Gastos fijos** (Revolut + domiciliados) — importe fijo cada mes.
2. **Colchón de emergencia** — objetivo 4.000€.
3. **Fondo de imprevistos** — objetivo ~1.200€.
4. **Inversión** — se lleva el resto.

**Límite legal:** Kubo solo calcula cifras de reparto. Nunca recomienda activos/productos concretos ni asume rentabilidades de inversión — eso es asesoramiento financiero regulado y queda fuera de alcance del proyecto.

## Diferencia con Fintonic y apps similares

Apps como Fintonic, YNAB o Money Lover funcionan **a posteriori**: te conectas las cuentas, gastas con normalidad, y la app **categoriza** cada movimiento que ya ocurrió ("esto es ocio", "esto es comida") para darte estadísticas de en qué se te fue el dinero. Es una fotografía del pasado — no decide nada por ti, tú sigues gastando libremente y luego revisas.

Kubo funciona **a priori**, en el momento en que entra el ingreso: en vez de dejar que el dinero se gaste libremente y clasificar el rastro después, reparte automáticamente el ingreso mensual completo en el momento en que llega, siguiendo la cascada de prioridad fija de arriba. No dice "en qué gastaste", dice "esto es lo que le toca a cada cubo este mes", antes de que se pueda gastar.

Dicho de otra forma: Fintonic es un espejo retrovisor (categorización descriptiva), Kubo es un motor de reglas prescriptivo (asignación automática por prioridad).

## Stack

- Backend: Python 3.12 + FastAPI + Pydantic v2 + SQLAlchemy 2.0 + Alembic
- Base de datos: PostgreSQL
- App móvil: Expo (React Native + TypeScript)
- Auth: Supabase/Clerk
- Infra dev: Docker Compose
- CI/CD: GitHub Actions

### Qué hace cada pieza del backend

- **Python** — el lenguaje.
- **FastAPI** — la API web, la "puerta de entrada" que recibe peticiones HTTP y devuelve respuestas en JSON.
- **Pydantic** — valida que los datos que entran/salen de la API tengan la forma correcta.
- **SQLAlchemy** — el ORM (Object-Relational Mapper): traduce entre tablas SQL y objetos Python, para no escribir SQL a mano (menos errores, evita inyección SQL).
- **Alembic** — el "Git de la base de datos": versiona cada cambio de estructura (tablas, columnas) en scripts aplicables y reversibles, usando las clases de SQLAlchemy para detectar los cambios.

## Fases

- **Fase 0 (actual):** motor de allocation puro en Python, sin DB/API/UI.
- **Fase 1:** API + base de datos.
- **Fase 2:** app Expo.
- **Fase 3:** CI/CD.
- **Fase 4:** legal.

## Cómo levantar el proyecto (Fase 0)

Fase 0 no tiene dependencias externas más allá de pytest para los tests.

```bash
python -m pip install pytest
python -m pytest -v
```

## Regla de dinero: todo en céntimos, nunca float

Los números decimales (`float`) no representan el dinero con exactitud, porque los ordenadores guardan los decimales en binario y arrastran pequeños errores de redondeo:

```python
>>> 0.1 + 0.2
0.30000000000000004
```

Para evitarlo, todos los importes se guardan como **enteros que representan céntimos**, nunca euros con decimales:

- 3.000€ → `300000` (int)
- 12,50€ → `1250` (int)

Los enteros no tienen errores de redondeo. Solo se divide entre 100 al mostrar el importe en pantalla; internamente nunca se opera con decimales. Por eso los campos se llaman `*_cents` y no `*_euros`.

Además, el ledger (registro de movimientos) es **append-only**: nunca se hace `UPDATE` sobre un asiento existente, solo se añaden asientos nuevos de reversión si hay que corregir algo. Así queda todo el histórico auditable.

## Motor de allocation (`motor/`)

### Conceptos usados

**`Enum`** (librería estándar de Python): define un conjunto cerrado de valores con nombre. Evita usar strings sueltos (`"FIXED"`) repetidos por el código, con el riesgo de typos que eso implica. Al heredar también de `str`, el enum se comporta como string (útil para serializar a JSON más adelante).

**`@dataclass(frozen=True)`** (librería estándar `dataclasses`): genera automáticamente el constructor, `__repr__`, `__eq__`, etc. a partir de los atributos anotados. `frozen=True` hace la clase inmutable — una vez creado el objeto no se puede reasignar ningún campo. Es la versión ligera de Pydantic, sin validación de tipos en runtime ni dependencias externas.

**Pydantic** (librería externa, no usada todavía en Fase 0): sirve para validar datos y (de)serializar JSON automáticamente. FastAPI la usa internamente para validar los bodies de las requests HTTP. No aporta valor en Fase 0 porque el motor no toca HTTP ni JSON, solo hace cálculos en memoria — se incorporará en Fase 1 cuando construyamos la API.

### Tipos (`motor/models.py`)

**`BucketStrategy`** — las 3 formas en que un bucket puede recibir dinero en la cascada:

- `FIXED` — importe fijo cada mes, siempre el mismo (ej. gastos fijos). Requiere `fixed_amount_cents`.
- `FILL_TO_TARGET` — se rellena hasta un objetivo y deja de recibir dinero al alcanzarlo (ej. colchón, imprevistos). Requiere `target_cents > 0`.
- `REMAINDER` — se lleva todo lo que sobre después de los cubos anteriores (ej. inversión). No necesita ni objetivo ni importe fijo, su cantidad se calcula.

**`Bucket`** — definición inmutable de un cubo (la regla, ej. "el colchón tiene objetivo 4.000€"). Valida en `__post_init__` que cada estrategia tenga el dato que necesita.

**`BucketAllocation`** — resultado de repartir dinero a UN bucket concreto en un mes concreto (ej. "este mes al colchón le tocaron 200€").

**`AllocationResult`** — resumen completo del reparto de un ingreso mensual entre todos los buckets. Usa `tuple` en vez de `list` para las allocations, para que el resultado sea completamente inmutable una vez calculado. `unallocated_cents` debería ser siempre `0`; si no lo es, hay un error en el cálculo.

## API y base de datos (`app/`) — Fase 1

### Cómo levantar el entorno

```bash
docker compose up -d          # levanta PostgreSQL en un contenedor
python -m pip install -r requirements.txt
python -m alembic upgrade head    # aplica las migraciones (crea las tablas)
python -m uvicorn app.main:app --reload
```

La API queda disponible en `http://127.0.0.1:8000`, con documentación interactiva automática en `http://127.0.0.1:8000/docs`.

### Conceptos usados

**Docker / Docker Compose**: en vez de instalar PostgreSQL directamente en el sistema operativo, se levanta dentro de un contenedor (una copia aislada y desechable del programa). `docker-compose.yml` describe qué contenedores levantar (aquí, solo `db`) y con qué configuración.

**FastAPI**: framework que expone la lógica como una API HTTP. Cada función decorada con `@app.get(...)` o `@app.post(...)` en `app/main.py` es un endpoint. Genera la documentación de `/docs` automáticamente a partir del propio código.

**ORM (SQLAlchemy)**: traduce entre las tablas de Postgres y clases de Python. `app/models.py` define `BucketModel` y `LedgerEntryModel`, que son la representación en código de las tablas `buckets` y `ledger_entries`. El ORM no crea las tablas por sí solo: solo describe cómo deberían ser.

**Alembic**: compara esa descripción (el ORM) contra lo que existe realmente en Postgres, y genera/aplica los scripts de migración (`alembic/versions/`) que crean o modifican las tablas. Es el paso intermedio entre "el código dice que debería haber esta tabla" y "la tabla existe de verdad en la base de datos".

**Pydantic (esquemas de la API, `app/schemas.py`)**: los modelos ORM (`BucketModel`) no se exponen directamente en la API. Se definen esquemas Pydantic aparte (`BucketCreate`, `BucketRead`, ...) que validan lo que entra y controlan exactamente lo que se devuelve en JSON — separa la representación interna (base de datos) de la representación pública (API).

### Tablas

**`buckets`** — la configuración de cada bucket del usuario (mismos campos que `motor.models.Bucket`: `id`, `name`, `strategy`, `priority`, `target_cents`, `fixed_amount_cents`). Nota: la API todavía no valida que cada estrategia tenga el dato que necesita (esa validación sí existe en `motor.models.Bucket.__post_init__`, pero aún no se reutiliza aquí).

**`ledger_entries`** — histórico **append-only** de movimientos: cada asignación de dinero a un bucket es una fila nueva, nunca se modifica una fila existente. El saldo actual de un bucket se calcula sumando todas sus filas (`SUM(amount_cents) WHERE bucket_id = ...`), en vez de guardar un campo "saldo" que se pueda sobrescribir. `bucket_id` es una **clave foránea** (`ForeignKey`) a `buckets.id`: Postgres impide crear un movimiento que apunte a un bucket inexistente.

### Endpoints

- `GET /health` — comprobación de que la API está viva.
- `POST /buckets` / `GET /buckets` — crear y listar buckets.
- `POST /allocate` — ejecuta un reparto real:
  1. Lee los buckets guardados en `buckets`.
  2. Calcula el saldo actual de cada uno sumando `ledger_entries`.
  3. Convierte cada `BucketModel` (fila de la base de datos) a un `Bucket` del motor puro (`motor.models`), que no depende de la base de datos ni de FastAPI.
  4. Llama a `motor.engine.allocate(...)` — la misma función ya probada con tests en Fase 0, reutilizada tal cual.
  5. Guarda el resultado como nuevas filas en `ledger_entries` (solo los buckets que recibieron dinero > 0).
  6. Devuelve el desglose completo (`AllocationResultRead`).

## Convenciones

- Código (clases, funciones, variables): inglés.
- Commits, branches, PRs, comentarios de código y conversación: español.
- Commits: Conventional Commits en español, sin emojis, sin coautoría de Claude.
- Branches: `feat/motor-allocation`, etc.
