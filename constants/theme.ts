// 
import { Platform } from "react-native";

// Platform fonts (keeps your existing components working)
export const FontFamilies = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Keep old Fonts export so existing components don't break
export const Fonts = FontFamilies;

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  xxxl: 40,
  hero: 52,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Colors = {
  background: '#0D1117',
  surface: '#161B22',
  card: '#1C2333',
  cardBorder: '#21262D',
  primary: '#00D4FF',
  primaryDim: '#00D4FF22',
  accent: '#7C3AED',
  accentDim: '#7C3AED22',
  gold: '#F59E0B',
  goldDim: '#F59E0B22',
  silver: '#9CA3AF',
  bronze: '#CD7F32',
  text: '#F0F6FC',
  textMuted: '#8B949E',
  textSecondary: '#C9D1D9',
  error: '#FF4444',
  errorDim: '#FF444422',
  success: '#10B981',
  successDim: '#10B98122',
  border: '#30363D',
  heartRate: '#EF4444',
  heartRateDim: '#EF444422',
  calories: '#F97316',
  caloriesDim: '#F9731622',
  teamPurple: '#7C3AED',
  white: '#FFFFFF',
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};