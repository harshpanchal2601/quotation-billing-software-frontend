import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RowActionsMenu } from './RowActionsMenu';

describe('RowActionsMenu', () => {
  it('opens row actions, invokes the selected action and closes the menu', async () => {
    const onView = vi.fn();

    render(
      <RowActionsMenu
        triggerLabel="Actions for Row A"
        actions={[{ key: 'view', label: 'View Details', onSelect: onView }]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Row A' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'View Details' }));

    expect(onView).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: 'View Details' })).not.toBeInTheDocument();
  });

  it('does not open when the row trigger is disabled', async () => {
    render(
      <RowActionsMenu
        triggerLabel="Actions for Row A"
        disabled
        actions={[{ key: 'view', label: 'View Details', onSelect: vi.fn() }]}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Actions for Row A' });

    expect(trigger).toBeDisabled();
    expect(screen.queryByRole('menuitem', { name: 'View Details' })).not.toBeInTheDocument();
  });

  it('keeps disabled actions from invoking callbacks', async () => {
    const onDelete = vi.fn();

    render(
      <RowActionsMenu
        triggerLabel="Actions for Row A"
        actions={[{ key: 'delete', label: 'Delete Row', onSelect: onDelete, disabled: true }]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Row A' }));

    expect(screen.getByRole('menuitem', { name: 'Delete Row' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('can stop trigger clicks from bubbling to a row handler', async () => {
    const onRowClick = vi.fn();

    render(
      <div onClick={onRowClick}>
        <RowActionsMenu
          triggerLabel="Actions for Row A"
          stopPropagationOnTrigger
          actions={[{ key: 'view', label: 'View Details', onSelect: vi.fn() }]}
        />
      </div>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Row A' }));

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
