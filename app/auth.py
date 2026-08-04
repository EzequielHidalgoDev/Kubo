import os

from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions
from dotenv import load_dotenv
from fastapi import HTTPException, Request

load_dotenv()

CLERK_SECRET_KEY = os.environ["CLERK_SECRET_KEY"]

# Cliente de Clerk, reutilizado en toda la app para no crearlo en cada petición.
clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)


def get_current_user_id(request: Request) -> str:
    """Comprueba el token de la petición (cabecera Authorization) y
    devuelve el id del usuario autenticado. Si el token falta o no es
    válido, corta la petición con un 401."""
    request_state = clerk.authenticate_request(
        request,
        AuthenticateRequestOptions(),
    )

    if not request_state.is_signed_in:
        raise HTTPException(status_code=401, detail="No autenticado")

    # 'sub' (subject) es el estándar de JWT para "de quién es este token".
    return request_state.payload["sub"]
