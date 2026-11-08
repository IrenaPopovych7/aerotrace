import { Text } from 'react-native';
import type { FlightSample } from '../state/types';

/** Native placeholder; the chart is drawn with SVG on web (BatteryChart.web.tsx). */
export function BatteryChart({ samples }: { samples: FlightSample[] }) {
  const last = samples.at(-1);
  return <Text>Battery at landing: {last?.batteryPercent ?? '—'}%</Text>;
}
