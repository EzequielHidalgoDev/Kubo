import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { ClerkProvider, SignedIn, SignedOut, useClerk } from '@clerk/clerk-expo';
import { esES } from '@clerk/localizations';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { MainTabs } from './screens/MainTabs';
import { SignInScreen } from './screens/SignInScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { tokenCache } from './tokenCache';

// Necesario para que el navegador de login de Google sepa cerrarse solo
// al terminar y devolver el control a la app (lo pide Clerk/Expo).
WebBrowser.maybeCompleteAuthSession();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

type Pantalla = 'login' | 'registro' | 'olvide-password';

function AuthGate() {
  const [pantalla, setPantalla] = useState<Pantalla>('login');
  const clerk = useClerk();

  // Solo en web: la redirección completa de Google vuelve aquí sin que
  // nada más la termine de procesar (en nativo, useSSO() hace todo esto
  // internamente; en web no hay equivalente automático sin el componente
  // <AuthenticateWithRedirectCallback />, que clerk-expo no expone).
  // handleRedirectCallback es el método real que usa ese componente por
  // dentro: lee el resultado de la URL, crea la cuenta si hace falta
  // (cuenta de Google nueva) o activa la sesión si ya existía, todo en un
  // único paso ya resuelto por Clerk en vez de reimplementarlo a mano.
  useEffect(() => {
    if (Platform.OS !== 'web' || !clerk.loaded) return;
    if (!new URLSearchParams(window.location.search).has('rotating_token_nonce')) return;

    clerk.handleRedirectCallback({}).catch(() => {
      // Si falla, la persona sigue viendo la pantalla de login normal
      // y puede reintentar tocando "Continuar con Google" de nuevo.
    });
  }, [clerk.loaded]);

  return (
    <>
      <SignedIn>
        <MainTabs />
      </SignedIn>
      <SignedOut>
        {pantalla === 'login' && (
          <SignInScreen
            onIrARegistro={() => setPantalla('registro')}
            onOlvideContrasena={() => setPantalla('olvide-password')}
          />
        )}
        {pantalla === 'registro' && (
          <SignUpScreen onVolverALogin={() => setPantalla('login')} />
        )}
        {pantalla === 'olvide-password' && (
          <ForgotPasswordScreen onVolverALogin={() => setPantalla('login')} />
        )}
      </SignedOut>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // En oscuro los iconos de la barra de estado (hora, batería) tienen que
  // ser claros: fijarlos siempre a "dark" los deja invisibles ahí.
  const esquemaOscuro = useColorScheme() === 'dark';

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      // expo-secure-store (Keychain/Keystore) no existe en navegador: en web,
      // Clerk guarda la sesión solo con sus propias cookies, sin necesitar
      // este tokenCache — pasarlo igualmente rompería el login ahí.
      tokenCache={Platform.OS === 'web' ? undefined : tokenCache}
      localization={esES}
    >
      <SafeAreaProvider>
        <AuthGate />
        <StatusBar style={esquemaOscuro ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
