// Sistema de diseño centralizado de Kubo. Cualquier color, tamaño de texto
// o espaciado de la app sale de aquí, nunca de un valor suelto en un
// componente — así toda la app queda visualmente consistente.

export const colors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',

  textPrimary: '#071A3D', // Navy: también funciona como color de texto principal
  textSecondary: '#64748B',
  textOnAccent: '#F8FAFC',

  accent: '#22C58B', // Emerald: botones y acciones principales
  accentPressed: '#1AA173',

  error: '#DC2626',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  display: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  body: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  bodyMedium: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  caption: { fontSize: 13, fontFamily: 'Inter_400Regular' },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;
