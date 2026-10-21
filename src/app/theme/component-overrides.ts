import { alpha, type Components, type Theme } from '@mui/material/styles';

import { designTokens } from './tokens';

const { colours, radii } = designTokens;

export const componentOverrides: Components<Omit<Theme, 'components'>> = {
  MuiCssBaseline: {
    styleOverrides: {
      html: {
        maxWidth: '100%',
        overflowX: 'hidden',
      },
      body: {
        backgroundColor: colours.pageBackground,
        maxWidth: '100%',
        overflowX: 'hidden',
      },
      '#root': {
        maxWidth: '100%',
        overflowX: 'hidden',
      },
      'input:-webkit-autofill, textarea:-webkit-autofill, select:-webkit-autofill': {
        WebkitBoxShadow: `0 0 0 100px ${colours.cardBackground} inset`,
        WebkitTextFillColor: colours.darkText,
        caretColor: colours.darkText,
        transition: 'background-color 9999s ease-out 0s',
      },
      'input:-webkit-autofill:focus, textarea:-webkit-autofill:focus, select:-webkit-autofill:focus':
        {
          WebkitBoxShadow: `0 0 0 100px ${alpha(colours.lightGreen, 0.38)} inset`,
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
  MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
  MuiInputLabel: {
    styleOverrides: {
      root: {
        maxWidth: 'calc(100% - 24px)',
        '&.MuiInputLabel-shrink': {
          backgroundColor: colours.cardBackground,
          paddingInline: 4,
          maxWidth: 'calc(133% - 32px)',
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: radii.medium,
        backgroundColor: colours.cardBackground,
        '&.MuiInputBase-multiline': {
          alignItems: 'flex-start',
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
      input: {
        minWidth: 0,
      },
      notchedOutline: {
        borderColor: colours.border,
      },
    },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: {
        marginTop: 4,
        marginLeft: 0,
        marginRight: 0,
        lineHeight: 1.45,
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
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
        maxWidth: 'calc(100% - 16px)',
        maxHeight: 'calc(100% - 16px)',
        margin: 8,
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        flexWrap: 'wrap',
        gap: 8,
        padding: 16,
        '& > :not(style) ~ :not(style)': {
          marginLeft: 0,
        },
      },
    },
  },
  MuiTableContainer: {
    styleOverrides: {
      root: {
        maxWidth: '100%',
        overflowX: 'auto',
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
        minHeight: 40,
        minWidth: 40,
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
};
