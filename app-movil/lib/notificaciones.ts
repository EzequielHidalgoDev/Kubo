import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Que la notificación se vea aunque la app esté abierta en primer plano:
// sin esto, expo-notifications la descarta en silencio mientras usas Kubo.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ID_RECORDATORIO = 'kubo-recordatorio-mensual';

// El recordatorio push solo existe en iOS/Android: expo-notifications no
// tiene equivalente real en web, así que aquí no hace nada en vez de
// lanzar un error (el punto verde en la pestaña Inicio sigue avisando
// igualmente en web).
export async function activarRecordatorioMensual(): Promise<void> {
  if (Platform.OS === 'web') return;

  const permisos = await Notifications.getPermissionsAsync();
  let concedido = permisos.granted;
  if (!concedido) {
    const solicitud = await Notifications.requestPermissionsAsync();
    concedido = solicitud.granted;
  }
  if (!concedido) return;

  // Se reprograma cada vez que se llama (p.ej. al abrir la app), así que
  // primero se cancela la anterior para no acabar con varias notificaciones
  // duplicadas apiladas con el mismo identificador.
  await Notifications.cancelScheduledNotificationAsync(ID_RECORDATORIO).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: ID_RECORDATORIO,
    content: {
      title: 'Toca repartir tu ingreso',
      body: 'Ya puedes organizar el dinero de este mes en Kubo.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: 1,
      hour: 10,
      minute: 0,
    },
  });
}
