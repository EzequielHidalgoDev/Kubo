# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios, android

Kubo se desarrolla con Expo (React Native) y se prueba habitualmente en la versión web durante desarrollo, pero el destino real es la app móvil (iOS/Android). No es una plataforma "adaptive": usa un único sistema de diseño propio y consistente en ambos sistemas operativos, sin adoptar los componentes/idioms nativos de cada uno (no usa SF Symbols, Dynamic Type, Material Design, etc.). Esto es una decisión de diseño explícita del proyecto, no una laguna.

## Users

Personas que no saben organizarse financieramente por su cuenta: no tienen el hábito de repartir su ingreso entre gastos, ahorro e inversión, y necesitan que la app tome esa decisión estructural por ellas en el momento en que llega el dinero, no que las eduque a posteriori revisando gastos ya hechos.

## Product Purpose

Kubo reparte automáticamente el ingreso mensual de una persona entre "buckets" (gastos fijos, colchón de emergencia, deuda, inversión, libre para gastar) en el momento en que ese ingreso llega, siguiendo una cascada de prioridades configurable. El objetivo final es que, con el tiempo y sin esfuerzo activo del usuario, todo su dinero quede organizado e invertido a largo plazo.

## Positioning

A diferencia de apps de categorización de gastos (tipo Fintonic), que analizan transacciones ya hechas para decirte en qué te has gastado el dinero, Kubo decide de antemano, en el momento en que el ingreso entra, cuánto va a cada finalidad. No es una herramienta de seguimiento retrospectivo; es un motor de asignación prospectivo. Restricción legal explícita: Kubo nunca recomienda productos de inversión concretos ni asume rentabilidades — solo calcula cifras de reparto.

## Operating Context

- El usuario introduce su ingreso una vez al mes (bloqueado hasta el mes siguiente tras repartir, salvo que edite un bucket, lo que recalcula el reparto de ese mes automáticamente).
- Un asistente de onboarding calcula una propuesta de reparto inicial a partir de gastos fijos, cuánto quiere para gastar libremente, colchón ya ahorrado y deuda pendiente (opcional).
- Los buckets tienen 4 estrategias: importe fijo mensual, relleno hasta un objetivo (ahorro), pago hasta saldar (deuda), o "se lleva el resto" (inversión).
- Historial mensual con desglose por bucket y totales acumulados.
- Aviso recurrente (cada 3 meses) para revisar si los gastos fijos/deuda siguen siendo correctos, y aviso visual si falta repartir el ingreso del mes.

## Capabilities and Constraints

- Backend: FastAPI + PostgreSQL, multi-tenant (aislado por usuario), autenticación con Clerk.
- Motor de reparto en cascada con prioridades: los buckets de la misma prioridad se reparten en paralelo/proporcional; prioridades distintas se sirven en cascada estricta.
- Ledger append-only: los movimientos nunca se editan, solo se añaden (incluye "retirar" como movimiento negativo para buckets de ahorro, no disponible en buckets de importe fijo ni de deuda).
- Sin seguimiento de transacciones reales ni conexión bancaria: Kubo no sabe en qué gasta el usuario el dinero de "libre para gastar", solo se lo asigna.
- Actualmente no soporta Dark Mode ni Dynamic Type/accesibilidad de texto del sistema operativo.

## Brand Commitments

- Paleta fija: Navy `#01081D` (texto principal, elementos primarios) y Emerald `#22C58B` (acento, progreso, cifras positivas), fondo `#F8FAFC`.
- Tipografía Inter (pesos Regular/Medium/SemiBold/Bold) en toda la app.
- Dirección de diseño explícita: minimalista y profesional, referencias tipo Airbnb/Revolut/N26 — evitar deliberadamente cualquier estética que "parezca generada por IA" (gradientes llamativos, exceso de iconos redondeados genéricos, sombras exageradas).
- Copy corto y directo, sin rayas largas (—) ni tono explicativo de asistente de IA.
- El nombre "Kubo" y toda referencia a que la app se construye con asistencia de IA se mantienen fuera del repositorio y de cualquier texto visible (requisito explícito del propietario).

## Evidence on Hand

Ninguna todavía: sin testimonios, casos de uso reales publicados, ni cifras de usuarios. No inventar ninguno en trabajo futuro.

## Product Principles

1. Organizar el 100% del ingreso cada mes, sin dejar remanentes sin categorizar.
2. Priorizar en el orden financiero correcto: gastos esenciales → colchón mínimo → deuda de interés alto → resto del colchón → inversión → gasto libre garantizado.
3. La app decide la estructura por el usuario (upfront), no le pide que analice después.
4. Nunca dar consejo de inversión específico ni prometer rentabilidad.
5. Simplicidad de uso por encima de exhaustividad: ocultar la complejidad del motor detrás de una interfaz mínima.
