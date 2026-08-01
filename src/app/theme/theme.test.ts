import { describe, expect, it } from 'vitest';

import { designTokens } from './tokens';
import { theme } from './theme';

describe('theme', () => {
  it('exposes the expected primary green and navy colours', () => {
    expect(theme.palette.primary.main).toBe(designTokens.colours.primaryGreen);
    expect(theme.palette.secondary.main).toBe(designTokens.colours.logoNavy);
  });

  it('prevents page-level horizontal overflow by default', () => {
    const cssBaselineOverrides = theme.components?.MuiCssBaseline?.styleOverrides as Record<string, unknown>;
    expect(cssBaselineOverrides.body).toMatchObject({ overflowX: 'hidden', maxWidth: '100%' });
    expect(cssBaselineOverrides['#root']).toMatchObject({ overflowX: 'hidden', maxWidth: '100%' });
  });

  it('keeps dialogs inside narrow mobile viewports', () => {
    expect(theme.components?.MuiDialog?.styleOverrides?.paper).toMatchObject({
      maxWidth: 'calc(100% - 16px)',
      maxHeight: 'calc(100% - 16px)',
      margin: 8,
    });
  });

  it('makes table containers horizontally scrollable as a shared fallback', () => {
    expect(theme.components?.MuiTableContainer?.styleOverrides?.root).toMatchObject({
      maxWidth: '100%',
      overflowX: 'auto',
    });
  });

  it('keeps icon buttons large enough for touch use', () => {
    expect(theme.components?.MuiIconButton?.styleOverrides?.root).toMatchObject({
      minHeight: 40,
      minWidth: 40,
    });
  });
});
