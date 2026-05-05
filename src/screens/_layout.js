// SafeScanQRApp/src/screens/_layout.js
import { Stack } from 'expo-router';

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="scanner" options={{ title: 'Scanner' }} />
    </Stack>
  );
};

export default Layout;