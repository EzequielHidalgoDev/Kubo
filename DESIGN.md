---
name: Kubo
description: Motor de reparto que organiza tu ingreso mensual en gastos fijos, colchón, deuda, inversión y libre para gastar, en el momento en que llega.
colors:
  ink-navy: "#01081D"
  emerald: "#22C58B"
  cool-mist: "#F8FAFC"
  pure-white: "#FFFFFF"
  soft-slate: "#E2E8F0"
  slate-gray: "#64748B"
  alert-red: "#DC2626"
typography:
  display:
    fontFamily: "Inter"
    fontSize: "40px"
    fontWeight: 700
    letterSpacing: "-0.5px"
  title:
    fontFamily: "Inter"
    fontSize: "22px"
    fontWeight: 600
  body:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
  body-medium:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 500
  caption:
    fontFamily: "Inter"
    fontSize: "13px"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink-navy}"
    textColor: "{colors.pure-white}"
    rounded: "{rounded.pill}"
    padding: "8px 24px"
    height: "56px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.pill}"
    padding: "8px 24px"
  card:
    backgroundColor: "{colors.pure-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink-navy}"
    rounded: "0px"
    height: "48px"
---

# Design System: Kubo

## Overview

**Creative North Star: "El asesor discreto"**

Kubo se comporta como un asesor financiero de confianza, no como una app de gastos. Nada grita, nada compite por atención: la interfaz existe para que el número correcto (cuánto toca a cada bucket) se lea al instante y sin ambigüedad. El silencio visual — mucho espacio en blanco, un solo acento de color usado con cuentagotas — es lo que transmite seriedad, de la misma forma en que un buen asesor no necesita alzar la voz.

La dirección de diseño se fijó explícitamente en contra de la estética por defecto de las apps "montadas con IA": sin gradientes, sin iconos genéricos en burbujas de colores, sin sombras decorativas, sin relleno visual. Las referencias declaradas son Airbnb, Revolut y N26 — fintech real, no plantillas de SaaS. Kubo no tiene una identidad "vistosa" a propósito: la confianza se construye con consistencia, no con personalidad gráfica.

**Key Characteristics:**
- Paleta de dos colores con roles estrictos: Navy para estructura y texto, Emerald reservado casi en exclusiva para progreso y cifras positivas.
- Tipografía única (Inter) en toda la app, sin mezclar familias.
- Cero sombras: la jerarquía se construye con borde de 1px y color de fondo, nunca con elevación.
- Bordes redondeados en dos únicos modos: pastilla completa (999px) para todo lo interactivo, esquina suave (16px) para contenedores.
- Soporta modo claro y modo oscuro real (no solo una inversión de color): el modo oscuro reescribe el rol de "Navy" para que los botones primarios sigan siendo legibles sobre un fondo casi negro.

## Colors

Paleta deliberadamente corta: dos colores con función, cinco neutros de apoyo. No hay Secundario ni Terciario — cuando solo hace falta un acento, añadir más colores es ruido.

### Primary
- **Ink Navy** (`#01081D`): color de marca y texto principal en modo claro. Rellena los botones de acción principal, los iconos/textos activos de la barra de pestañas, y es literalmente el texto por defecto de toda la app. En modo oscuro se sustituye por una variante aclarada (`#1C2540`) solo en los botones, porque el Navy original desaparece contra un fondo casi negro; el resto de usos migran a blanco roto.
- **Emerald** (`#22C58B`): el único acento de color de toda la interfaz. Se usa para el relleno de las barras de progreso de ahorro, la cifra "en total" del historial, la marca de "deuda saldada", y el icono de Google en el botón de login. No decora: cada aparición comunica una cifra positiva o un progreso real. Es el mismo verde en claro y en oscuro — funciona en los dos fondos sin ajuste.

### Neutral
- **Cool Mist** (`#F8FAFC` claro / `#05070D` oscuro): fondo de página.
- **Pure White** (`#FFFFFF` claro / `#101526` oscuro): fondo de tarjetas y superficies elevadas por color (nunca por sombra).
- **Soft Slate** (`#E2E8F0` claro / `#232A3D` oscuro): bordes de tarjetas, líneas de separación, borde inferior de los inputs en reposo.
- **Slate Gray** (`#64748B` claro / `#94A3B8` oscuro): texto secundario — etiquetas, ayudas, cifras no protagonistas.
- **Alert Red** (`#DC2626` claro / `#EF4444` oscuro): único uso para errores de formulario y validación.

### Named Rules
**The One Accent Rule.** Emerald aparece en menos del 10% de los elementos de cualquier pantalla. Si algo necesita destacar y no es una cifra de progreso o una confirmación positiva, no le toca ser verde — se resuelve con jerarquía tipográfica o agrupación, nunca añadiendo color.

**The No-Shadow Rule.** Ninguna sombra en toda la app. La profundidad se transmite con `borderWidth: 1` + color de fondo distinto al de la página, punto. Fue una decisión explícita para evitar la estética "SaaS genérico".

## Typography

**Display/Body Font:** Inter (pesos Regular 400, Medium 500, SemiBold 600, Bold 700)

**Character:** Una sola familia tipográfica hace todo el trabajo — títulos, cuerpo, etiquetas — apoyándose solo en peso y tamaño para la jerarquía. Nada de fuentes decorativas ni una segunda familia para "acentuar".

### Hierarchy
- **Display** (700, 40px, letter-spacing -0.5px): reservado, apenas usado hoy — pensado para una cifra hero futura (p.ej. el total invertido).
- **Title** (600, 22px): títulos de pantalla ("Historial", "Perfil") y de tarjeta destacada ("Ingreso de Agosto").
- **Body** (400, 16px): texto de párrafo, subtítulos explicativos, valor de los inputs.
- **Body Medium** (500, 16px): nombre de cada bucket, botones, email de cuenta — cualquier texto que deba pesar un poco más que el cuerpo sin llegar a título.
- **Caption** (400, 13px): etiquetas de campo, texto de ayuda, cifras secundarias del historial.

### Named Rules
**The Weight-Not-Color Rule.** La jerarquía entre texto "importante" y "secundario" se resuelve casi siempre con `textSecondary` + tamaño menor, no con negrita agresiva ni color de marca. El peso Bold (700) prácticamente no se usa fuera de Display.

## Layout

Una sola columna, ancho máximo de 440px centrado (así la versión web de escritorio simula un móvil real en vez de estirarse a ancho completo). Padding exterior de pantalla `spacing.lg` (24px), separación entre bloques `spacing.md` (16px), separación interna de tarjeta `spacing.xs`–`spacing.sm` (4–8px). Sin grid: todo es apilado vertical, coherente con que la app es de un solo flujo por pantalla, sin paneles paralelos.

La barra de pestañas inferior fija tres accesos (Inicio, Historial, Perfil), con el mismo límite de 440px centrado que el resto del contenido.

## Elevation & Depth

Sistema completamente plano. No hay sombras en ningún componente, ni siquiera en el botón "primary" al presionarlo (el feedback de presión es un cambio de color de fondo, no una sombra que aparece/desaparece). La separación entre una tarjeta y el fondo de la página se logra solo con `borderWidth: 1` + `borderColor` (Soft Slate) + un `backgroundColor` de superficie distinto al de fondo.

### Named Rules
**The Flat-By-Default Rule.** Ninguna superficie se eleva nunca. Si algo necesita distinguirse del fondo, cambia de color de superficie y gana un borde de 1px — no gana una sombra.

## Shapes

Dos radios, sin términos medios: **pastilla** (`999px`, redondeo total) para todo lo interactivo — botones, segmented control, badge de aviso — y **esquina suave** (`16px`) para contenedores — tarjetas, inputs de tipo card. Un tercer radio (`12px`) existe en el token pero apenas se usa hoy. Los inputs de texto no tienen esquina en absoluto: son una línea inferior de 1.5px, sin caja ni fondo propio (`TextField`), para que la pantalla no se llene de rectángulos anidados.

## Components

### Buttons
- **Shape:** pastilla completa (999px de radio).
- **Primary:** fondo Ink Navy sólido, texto blanco, altura mínima 56px con padding vertical flexible (para no romperse con Dynamic Type). Al presionar, el fondo pasa a un Navy ligeramente más claro (`navyPressed`) — sin sombra, sin escala.
- **Secondary:** sin relleno, borde de 1.5px en Soft Slate, texto en Ink Navy. Al presionar, gana un fondo de superficie sutil.
- **Google (variante de marca):** mismo patrón que Secondary pero con icono de Google a la izquierda; es la única vez que aparece un logo de terceros en la app.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** color de superficie (blanco en claro, navy muy oscuro en oscuro).
- **Shadow Strategy:** ninguna — ver Elevation & Depth.
- **Border:** 1px, Soft Slate.
- **Internal Padding:** 16px, con 4–8px de separación entre elementos internos.

### Inputs / Fields
- **Style:** sin caja ni fondo, solo borde inferior de 1.5px en Soft Slate. Etiqueta en Caption/Slate Gray encima del campo.
- **Focus:** el borde inferior cambia a Emerald — es, junto a las barras de progreso, uno de los pocos usos deliberados del acento.
- **Error:** el borde inferior cambia a Alert Red y aparece un texto Caption en rojo debajo.

### Navigation (barra de pestañas)
Tres iconos (Ionicons) + etiqueta Caption de 11px, fondo de superficie con borde superior de 1px. El icono y la etiqueta de la pestaña activa pasan de contorno a relleno y de Slate Gray a Ink Navy. Un punto Emerald de 8px se superpone al icono de "Inicio" cuando falta repartir el ingreso del mes — el único badge de notificación de toda la app.

### BucketCard (componente de firma)
Es el componente más repetido y el que más carga visual soporta: nombre + saldo en la cabecera, barra de progreso opcional (solo si el bucket tiene objetivo), línea de detalle (importe fijo/objetivo/deuda total) y acciones de texto subrayado (Editar/Borrar/Retirar) alineadas a la derecha. Nunca lleva icono ni imagen — toda la comunicación es tipográfica y de color de progreso. Buckets de tipo Deuda muestran un aviso en Emerald cuando se saldan del todo; el bucket Colchón lleva siempre un consejo en cursiva sobre cuentas remuneradas.

## Do's and Don'ts

### Do:
- **Do** usar Emerald únicamente para progreso, cifras positivas y confirmaciones — nunca como color decorativo de fondo o de icono suelto.
- **Do** resolver la jerarquía visual con peso tipográfico y `textSecondary`, antes que con tamaño extremo o color de marca.
- **Do** mantener bordes de 1px como único recurso de separación entre superficies; cero sombras.
- **Do** usar `useColors()` dentro de cada componente para leer la paleta — nunca importar un color fijo a nivel de módulo, porque rompe el modo oscuro.
- **Do** limitar el `maxFontSizeMultiplier` en textos de contenedores ajustados (botones, pestañas) a 1.3, para que Dynamic Type no rompa el layout, dejando libre el texto de párrafo.

### Don't:
- **Don't** añadir una segunda familia tipográfica o pesos fuera de la escala Inter 400/500/600/700.
- **Don't** usar gradientes, iconos en burbujas de color, ni ningún patrón que recuerde a una plantilla de SaaS genérica — es una prohibición explícita del propietario del proyecto.
- **Don't** dar sombra a ningún elemento, ni siquiera sutil, ni siquiera en estado de presión o foco.
- **Don't** usar rayas largas (—) ni frases sobre-explicadas en los textos de la interfaz; el copy es corto y directo, sin tono "generado por IA".
- **Don't** mostrar ningún texto, icono o mención que revele que la app se construye con asistencia de IA — restricción explícita en todo el repositorio.
