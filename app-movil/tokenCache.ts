import * as SecureStore from 'expo-secure-store';

// Clerk necesita guardar el token de sesión en algún sitio del dispositivo
// para no obligar al usuario a hacer login cada vez que abre la app.
// expo-secure-store lo guarda cifrado (Keychain en iOS, Keystore en Android).
export const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};
