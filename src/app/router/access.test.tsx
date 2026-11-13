import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@features/auth';
import { AccessRoute } from './guards/AccessRoute';
import { AccessDeniedPage } from './pages/AccessDeniedPage';

const state = vi.hoisted(() => ({
  user: { accountType: 'FIRM_USER', permissions: ['dashboard.view'] },
  allowed: true,
  logout: vi.fn(),
}));

vi.mock('@features/auth', async (original) => ({
  ...await original<typeof import('@features/auth')>(),
  useAuth: () => ({ user: state.user, logout: state.logout, isLoggingOut: false }),
}));
vi.mock('@shared/tenancy/selectedFirm', () => ({ useSelectedFirm: () => null }));
vi.mock('@shared/tenancy/entitlements', () => ({
  useEntitlements: () => ({ isPending: false, isError: false, data: {}, refetch: vi.fn() }),
  permitsEntitledPermission: () => state.allowed,
}));

function renderRoute(element: React.ReactNode) {
  return render(<MemoryRouter initialEntries={['/restricted']}><Routes>
    <Route path="/restricted" element={element} />
    <Route path="/access-denied" element={<AccessDeniedPage />} />
    <Route path="/dashboard" element={<h1>My workspace</h1>} />
    <Route path="/platform/firms" element={<h1>Choose a firm</h1>} />
  </Routes></MemoryRouter>);
}

describe('Shared access-denied navigation', () => {
  beforeEach(() => {
    state.user = { accountType: 'FIRM_USER', permissions: ['dashboard.view'] };
    state.allowed = true;
    state.logout.mockClear();
  });

  it('explains missing role access and returns to an allowed workspace', async () => {
    const user = userEvent.setup();
    renderRoute(<AccessRoute permissions={[PERMISSIONS.INVOICES_VIEW]}><h1>Private invoice</h1></AccessRoute>);
    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Private invoice' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to workspace' }));
    expect(screen.getByRole('heading', { name: 'My workspace' })).toBeInTheDocument();
  });

  it('uses the same page for account-type and subscription denials', () => {
    const first = renderRoute(<AccessRoute accountTypes={['SUPER_ADMIN']}><h1>Platform administration</h1></AccessRoute>);
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    first.unmount();
    state.allowed = false;
    renderRoute(<AccessRoute permissions={[PERMISSIONS.DASHBOARD_VIEW]}><h1>Plan restricted record</h1></AccessRoute>);
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.queryByText('Plan restricted record')).not.toBeInTheDocument();
  });

  it('does not offer a looping workspace link when no module is assigned', async () => {
    state.user.permissions = [];
    const user = userEvent.setup();
    renderRoute(<AccessDeniedPage />);
    expect(screen.queryByRole('button', { name: 'Back to workspace' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(state.logout).toHaveBeenCalledTimes(1);
  });

  it('keeps permitted content and firm selection reachable', () => {
    const first = renderRoute(<AccessRoute permissions={[PERMISSIONS.DASHBOARD_VIEW]}><h1>Allowed record</h1></AccessRoute>);
    expect(screen.getByRole('heading', { name: 'Allowed record' })).toBeInTheDocument();
    first.unmount();
    state.user.accountType = 'SUPER_ADMIN';
    renderRoute(<AccessRoute><h1>Needs a selected firm</h1></AccessRoute>);
    expect(screen.getByRole('heading', { name: 'Choose a firm' })).toBeInTheDocument();
  });
});
