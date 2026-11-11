import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTableShell, RecordPagination, RecordTable } from './DataTableShell';

function renderShell(overrides: Partial<React.ComponentProps<typeof DataTableShell>> = {}) {
  return render(
    <DataTableShell
      isLoading={false}
      isError={false}
      isEmpty={false}
      loadingContent={<div>Loading rows</div>}
      errorContent={<div>Could not load rows</div>}
      emptyContent={<div>No rows</div>}
      pagination={<div>Pagination</div>}
      refreshIndicator={<div>Refreshing</div>}
      {...overrides}
    >
      <div>Loaded rows</div>
    </DataTableShell>,
  );
}

describe('DataTableShell', () => {
  it('prioritises loading over error, empty and populated content', () => {
    renderShell({ isLoading: true, isError: true, isEmpty: true });

    expect(screen.getByText('Loading rows')).toBeInTheDocument();
    expect(screen.queryByText('Could not load rows')).not.toBeInTheDocument();
    expect(screen.queryByText('No rows')).not.toBeInTheDocument();
    expect(screen.queryByText('Loaded rows')).not.toBeInTheDocument();
  });

  it('renders error before empty and populated content', () => {
    renderShell({ isError: true, isEmpty: true });

    expect(screen.getByText('Could not load rows')).toBeInTheDocument();
    expect(screen.queryByText('No rows')).not.toBeInTheDocument();
    expect(screen.queryByText('Loaded rows')).not.toBeInTheDocument();
  });

  it('renders empty content when no rows are available', () => {
    renderShell({ isEmpty: true });

    expect(screen.getByText('No rows')).toBeInTheDocument();
    expect(screen.queryByText('Loaded rows')).not.toBeInTheDocument();
  });

  it('renders populated content with pagination and refresh busy state', () => {
    renderShell({ isRefreshing: true });

    expect(screen.getByText('Refreshing')).toBeInTheDocument();
    expect(screen.getByText('Loaded rows')).toBeInTheDocument();
    expect(screen.getByText('Pagination')).toBeInTheDocument();
    expect(screen.getByText('Loaded rows').closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('can wrap loaded table content in the standard table container', () => {
    renderShell({
      tableContainerProps: { 'aria-label': 'Customers table shell' },
    });

    expect(screen.getByLabelText('Customers table shell')).toContainElement(
      screen.getByText('Loaded rows'),
    );
    expect(screen.getByText('Pagination')).toBeInTheDocument();
  });
});

describe('responsive record presentation', () => {
  afterEach(() => vi.unstubAllGlobals());
  const rows = [{ id: 1, quantity: '9007199254740993.003' }];
  const columns = [{ key: 'quantity', label: 'Quantity', align: 'right' as const, render: (row: typeof rows[number]) => row.quantity }, { key: 'actions', label: 'Actions', render: () => <button>Open record</button> }];
  it('keeps exact values, column headings and actions in a focusable desktop table', () => {
    render(<RecordTable rows={rows} columns={columns} rowKey={(row) => row.id} label="Stock records" />);
    expect(screen.getByRole('region', { name: 'Stock records' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('columnheader', { name: 'Quantity' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: rows[0]!.quantity })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open record' })).toBeInTheDocument();
  });
  it('retains labels, exact values and actions as mobile records', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })));
    render(<RecordTable rows={rows} columns={columns} rowKey={(row) => row.id} label="Stock records" />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Stock records' })).toBeInTheDocument();
    expect(screen.getByText('Quantity').tagName).toBe('DT');
    expect(screen.getByText(rows[0]!.quantity)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open record' })).toBeInTheDocument();
  });
  it('retains the table and its headings when there are no records', () => {
    render(<RecordTable rows={[]} columns={columns} rowKey={(row) => row.id} label="Stock records" emptyMessage="No stock yet." />);
    expect(screen.getByRole('table', { name: 'Stock records' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Quantity' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No stock yet.');
  });
  it('keeps mobile empty feedback outside a horizontally scrolling desktop table', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, media: '', onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })));
    render(<RecordTable rows={[]} columns={columns} rowKey={(row) => row.id} label="Stock records" emptyMessage="No stock yet." />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Stock records' })).getByRole('status')).toHaveTextContent('No stock yet.');
  });
  it('continues row numbers on later pages and delegates server sorting without reordering a partial page', async () => {
    const onChange = vi.fn();
    render(<RecordTable rows={[{ id: 2, quantity: '5.000' }, { id: 1, quantity: '2.000' }]} columns={[{ key: 'quantity', label: 'Quantity', sortKey: 'quantity', render: (row) => row.quantity }]} rowKey={(row) => row.id} label="Stock records" rowNumberStart={21} sorting={{ sortBy: 'quantity', sortOrder: 'desc', fields: [{ key: 'quantity', label: 'Quantity' }], onChange }} />);
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(within(bodyRows[0]!).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['21', '5.000']);
    expect(within(bodyRows[1]!).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['22', '2.000']);
    await userEvent.click(screen.getByRole('button', { name: 'Quantity' }));
    expect(onChange).toHaveBeenCalledWith({ sortBy: 'quantity', sortOrder: 'asc' });
    expect(screen.getByRole('columnheader', { name: 'Quantity' })).toHaveAttribute('aria-sort', 'descending');
  });
  it('sorts complete detail records using exact decimal values in both directions', async () => {
    render(<RecordTable rows={[{ id: 1, quantity: '9007199254740993.003' }, { id: 2, quantity: '9007199254740993.002' }]} columns={[{ key: 'quantity', label: 'Quantity', sortValue: (row) => row.quantity, render: (row) => row.quantity }]} rowKey={(row) => row.id} label="Stock records" />);
    await userEvent.click(screen.getByRole('button', { name: 'Quantity' }));
    expect(within(screen.getAllByRole('row')[1]!).getByText('9007199254740993.002')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quantity' }));
    expect(within(screen.getAllByRole('row')[1]!).getByText('9007199254740993.003')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), '');
    expect(screen.getByLabelText('Sort order')).toBeDisabled();
    expect(within(screen.getAllByRole('row')[1]!).getByText('9007199254740993.003')).toBeInTheDocument();
  });
  it('returns to an available page after removing the last record', () => {
    const change = vi.fn();
    render(<RecordPagination pagination={{ page: 3, limit: 20, total: 40 }} page={3} change={change} />);
    expect(change).toHaveBeenCalledWith(2);
  });
});
