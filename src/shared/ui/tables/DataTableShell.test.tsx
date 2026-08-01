import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTableShell } from './DataTableShell';

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
