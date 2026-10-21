import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@shared/test/render';
import { AppLayout } from './AppLayout';

vi.mock('@features/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@features/auth')>()),
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      username: 'admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      accountType: 'FIRM_ADMIN',
      firmId: 1,
      firm: { id: 1, name: 'Example Firm', slug: 'example-firm' },
      firmRole: null,
      permissions: [
        'dashboard.view', 'companies.view', 'items.view', 'catalog.view', 'quotations.view',
        'quotations.create', 'firm.profile.manage', 'firm.quotation-settings.manage',
        'firm.bank-details.manage', 'firm.users.manage', 'firm.roles.manage', 'audit.view',
      ],
      mustChangePassword: false,
    },
    logout: vi.fn().mockResolvedValue(undefined),
    isLoggingOut: false,
  }),
}));

describe('AppLayout', () => {
  it('shows required navigation sections and active dashboard navigation', () => {
    renderWithProviders(<AppLayout />, { route: '/dashboard' });
    expect(screen.getAllByText('Quotation Management').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Master Management').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Configuration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('System').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('menuitem', { name: /dashboard/i })[0]).toHaveAttribute('aria-current', 'page');
  });

  it('opens the profile menu with safe user details', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />, { route: '/dashboard' });
    await user.click(screen.getByLabelText(/open profile menu/i));
    expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin@example.com').length).toBeGreaterThan(0);
    expect(screen.getByRole('menuitem', { name: /change password/i })).toBeInTheDocument();
  });

  it('selects only Create Quotation on its own route', () => {
    renderWithProviders(<AppLayout />, { route: '/quotations/new' });
    for (const link of screen.getAllByRole('menuitem', { name: /^quotations$/i })) {
      expect(link).not.toHaveClass('Mui-selected');
      expect(link).not.toHaveAttribute('aria-current');
    }
    for (const link of screen.getAllByRole('menuitem', { name: /^create quotation$/i })) {
      expect(link).toHaveClass('Mui-selected');
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    expect(document.title).toBe('Create Quotation | QuoteMerit');
  });
});
