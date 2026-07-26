import { describe, expect, it } from 'vitest';

import { designTokens } from './tokens';
import { theme } from './theme';

describe('theme', () => {
  it('exposes the expected primary green and navy colours', () => {
    expect(theme.palette.primary.main).toBe(designTokens.colours.primaryGreen);
    expect(theme.palette.secondary.main).toBe(designTokens.colours.logoNavy);
  });
});
