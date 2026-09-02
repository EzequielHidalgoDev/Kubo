import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { ClerkProvider, SignedIn, SignedOut, useSignIn, useSignUp } from '@clerk/clerk-expo';
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
  const { signIn, isLoaded: signInCargado } = useSignIn();
  const { signUp, setActive, isLoaded: signUpCargado } = useSignUp();

  // Solo en web: la redirección completa de Google vuelve aquí sin que
  // nada más la termine de procesar (en nativo, useSSO() hace todo esto
  // internamente; en web no hay equivalente automático sin el componente
  // <AuthenticateWithRedirectCallback />, que clerk-expo no expone). Dos
  // casos posibles al volver:
  // - Cuenta nueva: el intento de inicio de sesión queda "transferable"
  //   (existe la cuenta de Google, pero ningún usuario de Kubo con ese
  //   email todavía) y hay que crearla explícitamente con transfer:true.
  // - Cuenta ya existente: el inicio de sesión queda "complete" pero la
  //   sesión no se activa sola, hay que activarla a mano.
  useEffect(() => {
    if (Platform.OS !== 'web' || !signInCargado || !signUpCargado) return;

    // Clerk no se entera solo de que Google ya terminó: hace falta pasarle
    // el "rotating_token_nonce" que vuelve en la URL para que recargue el
    // intento de inicio de sesión con el resultado real (mismo paso que
    // useSSO() hace en nativo, ver signIn.reload en su código). Sin esto,
    // signIn se quedaba con el estado de antes de ir a Google.
    const nonce = new URLSearchParams(window.location.search).get('rotating_token_nonce');
    if (!nonce) return;

    signIn
      .reload({ rotatingTokenNonce: nonce })
      .then(() => {
        if (signIn.status === 'complete' && signIn.createdSessionId) {
          return setActive({ session: signIn.createdSessionId });
        }
        if (signIn.firstFactorVerification?.status === 'transferable') {
          return signUp.create({ transfer: true }).then((resultado) => {
            if (resultado.createdSessionId) {
              return setActive({ session: resultado.createdSessionId });
            }
          });
        }
      })
      .catch(() => {
        // Si falla, la persona sigue viendo la pantalla de login normal
        // y puede reintentar tocando "Continuar con Google" de nuevo.
      });
  }, [signInCargado, signUpCargado]);

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
