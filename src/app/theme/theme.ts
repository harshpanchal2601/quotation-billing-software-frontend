import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

import { componentOverrides } from './component-overrides';
import { designTokens } from './tokens';

const { colours, radii } = designTokens;

const baseTheme = createTheme({
  palette: {
    primary: {
      main: colours.primaryGreen,
      dark: colours.darkGreen,
      light: colours.lightGreen,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colours.logoNavy,
      contrastText: '#FFFFFF',
    },
    success: {
      main: colours.success,
    },
    error: {
      main: colours.error,
    },
    warning: {
      main: colours.warning,
    },
    info: {
      main: colours.info,
    },
    background: {
      default: colours.pageBackground,
      paper: colours.cardBackground,
    },
    text: {
      primary: colours.darkText,
      secondary: colours.secondaryText,
    },
    divider: colours.border,
  },
  typography: {
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    h1: { fontSize: 28, lineHeight: 1.25, fontWeight: 700 },
    h2: { fontSize: 24, lineHeight: 1.3, fontWeight: 700 },
    h3: { fontSize: 20, lineHeight: 1.35, fontWeight: 600 },
    h4: { fontSize: 18, lineHeight: 1.4, fontWeight: 600 },
    body1: { fontSize: 14, lineHeight: 1.6, fontWeight: 400 },
    body2: { fontSize: 13, lineHeight: 1.55, fontWeight: 400 },
    button: { fontSize: 14, fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: radii.medium,
  },
  shadows: [
    'none',
    `0 1px 2px ${alpha(colours.darkText, 0.08)}`,
    `0 6px 18px ${alpha(colours.darkText, 0.08)}`,
    `0 10px 28px ${alpha(colours.darkText, 0.1)}`,
    ...Array(21).fill(`0 10px 28px ${alpha(colours.darkText, 0.1)}`),
  ] as unknown as import('@mui/material/styles').Shadows,
  components: componentOverrides,
});

export const theme = responsiveFontSizes(baseTheme);
