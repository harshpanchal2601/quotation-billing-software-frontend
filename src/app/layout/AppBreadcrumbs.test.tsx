import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppBreadcrumbs } from './AppBreadcrumbs';

vi.mock('@features/auth', async (original) => ({
  ...(await original<typeof import('@features/auth')>()),
  useAuth: () => ({ user: { accountType: 'FIRM_ADMIN', firmId: 1, permissions: ['dashboard.view', 'quotations.view', 'quotations.create', 'companies.view', 'companies.manage'] } }),
}));
vi.mock('@shared/tenancy/entitlements', async (original) => ({ ...(await original<typeof import('@shared/tenancy/entitlements')>()), useEntitlements: () => ({ data: { permissions: { 'dashboard.view': true, 'quotations.view': true, 'quotations.create': true, 'companies.view': true, 'companies.manage': true } } }) }));
vi.mock('@shared/tenancy/selectedFirm', () => ({ useSelectedFirm: () => null }));

describe('AppBreadcrumbs', () => {
  it('renders every ancestor as its own breadcrumb item on nested quotation pages', () => {
    render(<MemoryRouter initialEntries={['/quotations/new']}><AppBreadcrumbs /></MemoryRouter>);

    const breadcrumbs = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    expect(within(breadcrumbs).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Dashboard', 'Quotation Management', 'Quotations', 'Create Quotation',
    ]);
  });
});
