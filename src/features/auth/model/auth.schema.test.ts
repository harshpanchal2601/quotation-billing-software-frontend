import { describe, expect, it } from 'vitest';

import { changePasswordSchema, loginSchema } from './auth.schemas';

describe('auth schemas', () => {
  it('rejects empty login fields', () => {
    expect(loginSchema.safeParse({ identifier: '', password: '' }).success).toBe(false);
  });

  it('enforces password policy and matching confirmation', () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'StrongPass1!',
        newPassword: 'weak',
        confirmPassword: 'different',
      }).success,
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        currentPassword: 'StrongPass1!',
        newPassword: 'NewStrongPass1!',
        confirmPassword: 'NewStrongPass1!',
      }).success,
    ).toBe(true);
  });
});
