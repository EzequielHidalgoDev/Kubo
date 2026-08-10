import { useColorScheme } from 'react-native';

// Sistema de diseño centralizado de Kubo. Cualquier color, tamaño de texto
// o espaciado de la app sale de aquí, nunca de un valor suelto en un
// componente — así toda la app queda visualmente consistente.
//
// Los colores dependen del modo (claro/oscuro) del sistema operativo, así
// que no son una constante: se leen con el hook useColors() dentro de cada
// componente, nunca importando `colors` directamente a nivel de módulo.

const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',

  textPrimary: '#01081D', // Navy: el mismo tono exacto del fondo del logo
  textSecondary: '#64748B',
  textOnDark: '#F8FAFC',

  navy: '#01081D',
  navyPressed: '#0A1530',

  accent: '#22C58B', // Emerald: reservado para detalles puntuales (progreso, cifras positivas)

  error: '#DC2626',
} as const;

const darkColors = {
  background: '#05070D',
  surface: '#101526',
  border: '#232A3D',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textOnDark: '#F8FAFC',

  // En oscuro el Navy original (#01081D) casi desaparece contra el fondo;
  // se aclara para que los botones primarios sigan siendo visibles.
  navy: '#1C2540',
  navyPressed: '#28335A',

  accent: '#22C58B', // el mismo verde funciona en los dos modos
  error: '#EF4444',
} as const;

export type Colors = typeof lightColors;

// Lee el esquema de color del sistema operativo (o del navegador, en web,
// vía prefers-color-scheme) y devuelve la paleta que toca. Los estilos de
// cada componente se calculan a partir de esto, nunca de un valor fijo.
export function useColors(): Colors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  display: { fontSize: 40, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  title: { fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  body: { fontSize: 16, fontFamily: 'Inter_400Regular' },
  bodyMedium: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  caption: { fontSize: 13, fontFamily: 'Inter_400Regular' },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

// Tope de escalado de Dynamic Type / tamaño de fuente del sistema. Sin
// límite, un usuario con letra grande puede romper botones y la barra de
// pestañas (texto muy corto, contenedores ajustados); 1.3 deja crecer el
// texto de forma notable sin desbordar el layout. El cuerpo de texto libre
// (inputs, párrafos largos) no usa este límite, ahí sí crece a placer.
export const MAX_FONT_SCALE_AJUSTADO = 1.3;
