import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { ClerkProvider, SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-expo';
import { esES } from '@clerk/localizations';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Button } from './components/Button';
import { Screen } from './components/Screen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { SignInScreen } from './screens/SignInScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { tokenCache } from './tokenCache';
import { colors, spacing, typography } from './theme';

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
        <PantallaPrincipal />
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

// Placeholder temporal: aquí irá el listado real de buckets.
function PantallaPrincipal() {
  const { user } = useUser();
  const { signOut } = useAuth();
  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.saludo}>Hola, {user?.primaryEmailAddress?.emailAddress}</Text>
        <Button label="Cerrar sesión" onPress={() => signOut()} variant="secondary" />
      </View>
    </Screen>
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  saludo: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
