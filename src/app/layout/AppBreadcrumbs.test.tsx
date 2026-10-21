import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppBreadcrumbs } from './AppBreadcrumbs';

describe('AppBreadcrumbs', () => {
  it('renders every ancestor as its own breadcrumb item on nested quotation pages', () => {
    render(<MemoryRouter initialEntries={['/quotations/new']}><AppBreadcrumbs /></MemoryRouter>);

    const breadcrumbs = screen.getByRole('navigation', { name: 'Breadcrumbs' });
    expect(within(breadcrumbs).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Dashboard', 'Quotation Management', 'Quotations', 'Create Quotation',
    ]);
  });
});
