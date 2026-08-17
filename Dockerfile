FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .


# Forma shell (no exec) para poder expandir $PORT: Render inyecta esa
# variable con el puerto real que espera, y no coincide siempre con el
# 8000 fijo que usamos en local (docker-compose no define PORT, así que
# ahí sigue cayendo en el valor por defecto).
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --reload
