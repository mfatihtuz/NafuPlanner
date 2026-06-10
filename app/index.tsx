import { Redirect } from 'expo-router';

/**
 * Giriş noktası. Asıl oturum yönlendirmesi kök yerleşimdeki AuthGate'te yapılır;
 * burada varsayılan hedefe yönlendiririz (oturum yoksa AuthGate login'e atar).
 */
export default function Index() {
  return <Redirect href="/(app)" />;
}
