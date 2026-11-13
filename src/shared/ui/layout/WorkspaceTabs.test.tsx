import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { WorkspaceTabs } from './WorkspaceTabs';

afterEach(() => vi.unstubAllGlobals());
it('shows the selected record type on a narrow screen and selects an authorized option', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })));
  const change = vi.fn();
  render(<WorkspaceTabs label="Purchasing records" value="expenses" items={[{ value: 'orders', label: 'Purchase orders' }, { value: 'expenses', label: 'Expenses' }]} onChange={change} />);
  expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Purchasing records' })).toHaveTextContent('Expenses');
  await userEvent.click(screen.getByRole('combobox', { name: 'Purchasing records' }));
  await userEvent.click(screen.getByRole('option', { name: 'Purchase orders' }));
  expect(change).toHaveBeenCalledWith('orders');
});
