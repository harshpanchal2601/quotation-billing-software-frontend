import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppTablePagination } from './AppTablePagination';

describe('AppTablePagination', () => {
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
});
