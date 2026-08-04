import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { ClerkProvider, SignedIn, SignedOut, useUser } from '@clerk/clerk-expo';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Screen } from './components/Screen';
import { SignInScreen } from './screens/SignInScreen';
import { SignUpScreen } from './screens/SignUpScreen';
import { tokenCache } from './tokenCache';
import { colors, typography } from './theme';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function AuthGate() {
  const [pantalla, setPantalla] = useState<'login' | 'registro'>('login');

  return (
    <>
      <SignedIn>
        <PantallaPrincipal />
      </SignedIn>
      <SignedOut>
        {pantalla === 'login' ? (
          <SignInScreen onIrARegistro={() => setPantalla('registro')} />
        ) : (
          <SignUpScreen onVolverALogin={() => setPantalla('login')} />
        )}
      </SignedOut>
    </>
  );
}

// Placeholder temporal: aquí irá el listado real de buckets.
function PantallaPrincipal() {
  const { user } = useUser();
  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.saludo}>Hola, {user?.primaryEmailAddress?.emailAddress}</Text>
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
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
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
  },
  saludo: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
