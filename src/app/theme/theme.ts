import { alpha, createTheme, responsiveFontSizes } from '@mui/material/styles';

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
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colours.pageBackground,
        },
        '*:focus-visible': {
          outline: `3px solid ${alpha(colours.info, 0.38)}`,
          outlineOffset: 2,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            scrollBehavior: 'auto !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.medium,
          boxShadow: 'none',
          minHeight: 40,
          textTransform: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radii.medium,
          backgroundColor: colours.cardBackground,
        },
        notchedOutline: {
          borderColor: colours.border,
        },
      },
    },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${colours.border}`,
          borderRadius: radii.large,
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radii.large,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radii.small, fontWeight: 600 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: 12,
          borderRadius: radii.small,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.medium,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: `1px solid ${colours.border}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${colours.border}`,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radii.medium,
          marginInline: 8,
          '&.Mui-selected': {
            backgroundColor: colours.lightGreen,
            color: colours.darkGreen,
            '& .MuiListItemIcon-root': {
              color: colours.darkGreen,
            },
          },
          '&.Mui-selected:hover': {
            backgroundColor: colours.lightGreen,
          },
        },
      },
    },
  },
});

export const theme = responsiveFontSizes(baseTheme);
