// Algunos mensajes de error de Clerk llegan en crudo desde su API y no
// pasan por la localización esES del ClerkProvider (solo traduce el texto
// de su propia interfaz, no estos mensajes de validación puntuales).
// Aquí centralizamos la traducción de los que nos vamos encontrando,
// en vez de traducir cada uno suelto en cada pantalla.
const TRADUCCIONES: Record<string, string> = {
  'Identifier is invalid.': 'Ese email o nombre de usuario no es válido',
  'Enter email address': 'Introduce tu email',
  'Passwords must be 8 characters or more.': 'La contraseña debe tener al menos 8 caracteres',
  'Password has been found in an online data breach. For account safety, please use a different password.':
    'Esa contraseña ha aparecido en alguna filtración de datos conocida — usa una distinta',
  "Couldn't find your account.": 'No encontramos ninguna cuenta con esos datos',
  'Password is incorrect. Try again, or use another method.':
    'La contraseña no es correcta',
};

export function traducirErrorClerk(err: any, mensajePorDefecto: string): string {
  const mensajeOriginal: string | undefined = err?.errors?.[0]?.message;
  if (!mensajeOriginal) return mensajePorDefecto;
  return TRADUCCIONES[mensajeOriginal] ?? mensajePorDefecto;
}
