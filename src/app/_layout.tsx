// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="home"
        options={{ title: 'Home', headerShown: false }}
      />
      <Stack.Screen
        name="profile"
        options={{ title: 'Perfil', headerShown: false }}
      />
      <Stack.Screen
        name="explore"
        options={{ title: 'Explorar', headerShown: false }}
      />
      <Stack.Screen
        name="card-detail"
        options={{ title: 'Detalhe da carta', headerShown: false }}
      />
    </Stack>
  );
}
