import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Tab, TabBar } from '../components/TabBar';
import { obtenerUltimoReparto } from '../lib/api';
import { esDelMesActual } from '../lib/text';
import { HistorialScreen } from './HistorialScreen';
import { HomeScreen } from './HomeScreen';
import { ProfileScreen } from './ProfileScreen';

export function MainTabs() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState<Tab>('inicio');
  const [faltaRepartir, setFaltaRepartir] = useState(false);

  const comprobarReparto = useCallback(async () => {
    try {
      const token = await getToken();
      const { realizado_en } = await obtenerUltimoReparto(token);
      setFaltaRepartir(realizado_en === null || !esDelMesActual(new Date(realizado_en)));
    } catch (err) {
      console.error('Error al comprobar el reparto del mes:', err);
    }
  }, [getToken]);

  // Se comprueba al abrir la app y cada vez que se cambia de pestaña, para
  // que el aviso desaparezca en cuanto repartes sin tener que reiniciar.
  useEffect(() => {
    comprobarReparto();
  }, [comprobarReparto, tab]);

  return (
    <View style={styles.contenedor}>
      <View style={styles.pantalla}>
        {tab === 'inicio' && <HomeScreen />}
        {tab === 'historial' && <HistorialScreen />}
        {tab === 'perfil' && <ProfileScreen />}
      </View>
      <TabBar activa={tab} onCambiar={setTab} avisoInicio={faltaRepartir} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  pantalla: {
    flex: 1,
  },
});
