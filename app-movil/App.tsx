import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import { esES } from '@clerk/localizations';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
      localization={esES}
    >
      <SafeAreaProvider>
        <AuthGate />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
