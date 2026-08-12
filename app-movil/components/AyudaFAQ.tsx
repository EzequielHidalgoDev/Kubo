import { PreguntaAyuda } from './PreguntaAyuda';

// Lista de preguntas compartida entre Perfil (donde vive siempre) y
// cualquier otra pantalla que quiera enlazarla en el momento justo en que
// alguien se queda con una duda (ver AyudaScreen). Un solo sitio para
// mantener las respuestas, no una copia por pantalla.
export function AyudaFAQ() {
  return (
    <>
      <PreguntaAyuda pregunta="¿Por qué el colchón pide 4 veces mis gastos fijos?">
        Es la pauta habitual en planificación financiera: cubrir entre 3 y 6 meses de lo que
        necesitas sí o sí si te quedas sin ingresos. Kubo usa 4 meses de tus gastos fijos, no de
        tu ingreso completo.
      </PreguntaAyuda>
      <PreguntaAyuda pregunta="¿Qué diferencia hay entre importe fijo, objetivo y deuda?">
        Importe fijo: la misma cantidad cada mes, sin más (alquiler, libre para gastar). Objetivo:
        se rellena hasta llegar a una cifra y luego para (colchón). Deuda: igual que un objetivo,
        pero es dinero que sale hacia fuera, no que ahorras tú.
      </PreguntaAyuda>
      <PreguntaAyuda pregunta="¿Por qué la deuda va antes que la inversión?">
        Porque casi ninguna inversión rinde más que el interés de una deuda. Pagarla antes casi
        siempre te deja mejor a largo plazo que invertir mientras la arrastras.
      </PreguntaAyuda>
      <PreguntaAyuda pregunta="¿Por qué solo puedo repartir el ingreso una vez al mes?">
        Para que se parezca a la vida real: el dinero llega una vez y se reparte una vez. Si
        editas un bucket después de repartir, ese reparto se recalcula solo con los datos nuevos,
        sin que tengas que repetirlo a mano.
      </PreguntaAyuda>
      <PreguntaAyuda pregunta="¿Puedo cambiar qué bucket va antes que otro?">
        Sí, en los buckets de "Ahorro e inversión" tienes flechas para subir o bajar su orden. El
        número (1º, 2º...) es el orden real en que reciben el dinero cada mes.
      </PreguntaAyuda>
    </>
  );
}
