import { RULES } from '@aerotrace/contracts';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

/** Temporary shell. Replaced by Expo Router screens in backlog issue #7. */
export default function App() {
  const dark = useColorScheme() === 'dark';
  const { latitude, longitude } = RULES.demo.mapCenter;

  return (
    <View style={[styles.container, dark && styles.containerDark]}>
      <Text accessibilityRole="header" style={[styles.title, dark && styles.textDark]}>
        AeroTrace
      </Text>
      <Text style={[styles.subtitle, dark && styles.textDark]}>
        UAV mission planner and flight simulator
      </Text>
      <Text style={[styles.meta, dark && styles.textDark]}>
        Demo area: Parque das Nações, Lisbon ({latitude.toFixed(4)}, {longitude.toFixed(4)})
      </Text>
      <Text style={[styles.safety, dark && styles.textDark]}>
        Educational simulator only. Not flight-control software.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  containerDark: { backgroundColor: '#0b1220' },
  title: { fontSize: 32, fontWeight: '700', color: '#0b1220' },
  subtitle: { fontSize: 16, color: '#334155', textAlign: 'center' },
  meta: { fontSize: 13, color: '#475569', textAlign: 'center' },
  safety: { marginTop: 16, fontSize: 12, color: '#64748b', textAlign: 'center' },
  textDark: { color: '#e2e8f0' },
});
