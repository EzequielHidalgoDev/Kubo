const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// El backend casi siempre manda un "detail" legible; esto solo entra en
// juego cuando no lo hace (p.ej. un 500 sin manejar). "Error 500" no le dice
// nada a nadie que no sea programador.
function mensajeGenericoPorEstado(status: number): string {
  if (status === 401 || status === 403) {
    return 'Tu sesión ha caducado. Vuelve a entrar.';
  }
  if (status === 404) {
    return 'No se ha encontrado lo que buscabas.';
  }
  if (status >= 500) {
    return 'Ha fallado el servidor. Inténtalo de nuevo en un momento.';
  }
  return 'Algo ha ido mal. Inténtalo de nuevo.';
}

// Cliente mínimo para hablar con la API de Kubo: añade el token de Clerk
// en cada petición y convierte los errores en excepciones con mensaje.
export async function apiFetch<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // fetch() solo lanza aquí cuando la petición ni siquiera llega a un
    // servidor (sin conexión, API caída): un mensaje técnico como "Failed
    // to fetch" no le dice nada al usuario.
    throw new Error('Sin conexión. Comprueba tu internet e inténtalo de nuevo.');
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new Error(cuerpo.detail ?? mensajeGenericoPorEstado(respuesta.status));
  }

  // 204 No Content (ej. borrar un bucket) no trae cuerpo que parsear.
  if (respuesta.status === 204) {
    return undefined as T;
  }
  return respuesta.json();
}

export type Bucket = {
  id: string;
  name: string;
  strategy: 'FIXED' | 'FILL_TO_TARGET' | 'REMAINDER' | 'DEBT';
  priority: number;
  target_cents: number | null;
  fixed_amount_cents: number | null;
  balance_cents: number;
};

export function listarBuckets(token: string | null) {
  return apiFetch<Bucket[]>('/buckets', token);
}

export type NuevoBucket = {
  id: string;
  name: string;
  strategy: 'FIXED' | 'FILL_TO_TARGET' | 'REMAINDER' | 'DEBT';
  priority: number;
  target_cents?: number;
  fixed_amount_cents?: number;
  initial_balance_cents?: number;
};

export function crearBucket(token: string | null, datos: NuevoBucket) {
  return apiFetch<Bucket>('/buckets', token, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

export type CambiosBucket = {
  name: string;
  strategy: 'FIXED' | 'FILL_TO_TARGET' | 'DEBT' | 'REMAINDER';
  priority: number;
  target_cents?: number;
  fixed_amount_cents?: number;
};

export function editarBucket(token: string | null, id: string, datos: CambiosBucket) {
  return apiFetch<Bucket>(`/buckets/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
}

export function borrarBucket(token: string | null, id: string) {
  return apiFetch<void>(`/buckets/${id}`, token, { method: 'DELETE' });
}

export type BucketAllocation = {
  bucket_id: string;
  amount_cents: number;
  reached_target: boolean;
};

export type AllocationResult = {
  income_cents: number;
  allocations: BucketAllocation[];
  unallocated_cents: number;
};

export function ejecutarReparto(token: string | null, incomeCents: number) {
  return apiFetch<AllocationResult>('/allocate', token, {
    method: 'POST',
    body: JSON.stringify({ income_cents: incomeCents }),
  });
}

export type UltimoReparto = {
  realizado_en: string | null;
};

export function obtenerUltimoReparto(token: string | null) {
  return apiFetch<UltimoReparto>('/allocate/ultimo', token);
}

export type HistorialAsignacion = {
  bucket_id: string;
  bucket_name: string;
  amount_cents: number;
};

export type HistorialMes = {
  year: number;
  month: number;
  income_cents: number;
  allocations: HistorialAsignacion[];
};

export function obtenerHistorial(token: string | null) {
  return apiFetch<HistorialMes[]>('/historial', token);
}

export function retirarDeBucket(token: string | null, id: string, amountCents: number) {
  return apiFetch<Bucket>(`/buckets/${id}/retirar`, token, {
    method: 'POST',
    body: JSON.stringify({ amount_cents: amountCents }),
  });
}
