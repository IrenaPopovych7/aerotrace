import { useColorScheme } from 'react-native';

const shared = {
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 10, lg: 16, pill: 999 },
  font: { xs: 12, sm: 13, md: 15, lg: 18, xl: 24, xxl: 32 },
} as const;

const light = {
  ...shared,
  dark: false,
  color: {
    bg: '#f4f6fa',
    surface: '#ffffff',
    surfaceAlt: '#eef2f7',
    border: '#d7dee8',
    text: '#0b1220',
    textMuted: '#4b5768',
    accent: '#1d5bd8',
    accentText: '#ffffff',
    good: '#137a3f',
    warning: '#a15c00',
    critical: '#b42318',
    goodBg: '#e3f4ea',
    warningBg: '#fdf1dc',
    criticalBg: '#fde7e5',
    route: '#1d5bd8',
    flown: '#d9480f',
    land: '#e9efe6',
    water: '#bcd7ee',
    grid: '#c9d3df',
  },
};

const dark: typeof light = {
  ...shared,
  dark: true,
  color: {
    bg: '#0a0f1a',
    surface: '#121a2a',
    surfaceAlt: '#1a2438',
    border: '#2a3650',
    text: '#e7edf7',
    textMuted: '#a3b0c5',
    accent: '#5b8cff',
    accentText: '#0a0f1a',
    good: '#4ade80',
    warning: '#fbbf24',
    critical: '#f87171',
    goodBg: '#123322',
    warningBg: '#3a2a08',
    criticalBg: '#3d1414',
    route: '#5b8cff',
    flown: '#ff8a4c',
    land: '#162030',
    water: '#0f2b45',
    grid: '#24324a',
  },
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
