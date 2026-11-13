import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppTablePagination } from './AppTablePagination';
import { RecordPagination } from './DataTableShell';

describe('AppTablePagination', () => {
  it('preserves an unknown-count page and stops Next when the server has no more records', async () => {
    const change = vi.fn();
    const view = render(<RecordPagination pagination={{ page: 2, limit: 20, total: -1, hasMore: true }} page={2} change={change} />);
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /go to previous page/i })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: /go to next page/i }));
    expect(change).toHaveBeenCalledWith(3);
    view.rerender(<RecordPagination pagination={{ page: 3, limit: 20, total: -1, hasMore: false }} page={3} change={change} />);
    expect(screen.getByRole('button', { name: /go to next page/i })).toBeDisabled();
    expect(change).toHaveBeenCalledTimes(1);
  });
  it('converts one-based feature pages to MUI pagination callbacks', async () => {
    const onPageChange = vi.fn();

    render(
      <AppTablePagination
        count={45}
        page={2}
        rowsPerPage={10}
        onPageChange={onPageChange}
        onRowsPerPageChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /go to next page/i }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('returns selected rows per page as a number', async () => {
    const onRowsPerPageChange = vi.fn();

    render(
      <AppTablePagination
        count={45}
        page={1}
        rowsPerPage={10}
        onPageChange={vi.fn()}
        onRowsPerPageChange={onRowsPerPageChange}
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: /rows per page/i }));
    await userEvent.click(screen.getByRole('option', { name: '20' }));

    expect(onRowsPerPageChange).toHaveBeenCalledWith(20);
  });

  it('accepts business-neutral style overrides for existing pagination spacing', () => {
    const { container } = render(
      <AppTablePagination
        count={45}
        page={1}
        rowsPerPage={10}
        onPageChange={vi.fn()}
        onRowsPerPageChange={vi.fn()}
        sx={{ mt: 2 }}
      />,
    );

    expect(container.firstElementChild).toBeInTheDocument();
  });
});
