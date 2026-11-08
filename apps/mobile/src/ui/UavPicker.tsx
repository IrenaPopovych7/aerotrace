import { hoverEnduranceMinutes, UAV_LIST, type UavId, type UavProfile } from '@aerotrace/contracts';
import { Pressable, View } from 'react-native';
import { Txt } from './primitives';
import { useTheme } from './theme';

const MOTOR_ICON: Record<UavProfile['motorCount'], string> = { 4: '✣', 6: '✻', 8: '❋' };

export function uavSpecLine(uav: UavProfile): string {
  return `${uav.motorCount} motors · ${uav.frameDiagonalMillimeters} mm · ${uav.takeoffWeightKilograms} kg`;
}

/** Choose the airframe. Each option shows the specs that change the estimate. */
export function UavPicker({
  value,
  onChange,
  disabled,
}: {
  value: UavId;
  onChange: (id: UavId) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="UAV type"
      style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}
    >
      {UAV_LIST.map((uav) => {
        const selected = uav.id === value;
        return (
          <Pressable
            key={uav.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: !!disabled }}
            accessibilityLabel={`${uav.name}, ${uav.airframe}, ${uavSpecLine(uav)}, cruise ${uav.cruiseSpeedMetersPerSecond} metres per second`}
            disabled={disabled}
            onPress={() => onChange(uav.id)}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: '30%',
              minWidth: 150,
              padding: 12,
              gap: 2,
              borderRadius: t.radius.md,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? t.color.accent : t.color.border,
              backgroundColor: selected ? t.color.surfaceAlt : t.color.surface,
              opacity: disabled && !selected ? 0.45 : pressed ? 0.8 : 1,
            })}
          >
            <Txt variant="heading" style={{ fontSize: 16 }}>
              {MOTOR_ICON[uav.motorCount]} {uav.name}
              {selected ? '  ✓' : ''}
            </Txt>
            <Txt variant="small" style={{ textTransform: 'capitalize' }}>
              {uav.airframe}
            </Txt>
            <Txt variant="small">{uavSpecLine(uav)}</Txt>
            <Txt variant="small">
              {uav.cruiseSpeedMetersPerSecond} m/s · {uav.batteryCapacityWattHours} Wh · ~
              {Math.round(hoverEnduranceMinutes(uav))} min hover
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
