import MoreVertIcon from '@mui/icons-material/MoreVert';
import IconButton, { type IconButtonProps } from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState, type ReactNode, type MouseEvent } from 'react';

export type RowAction = {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export type RowActionsMenuProps = {
  triggerLabel: string;
  actions: RowAction[];
  disabled?: boolean;
  triggerSize?: IconButtonProps['size'];
};

export function RowActionsMenu({
  triggerLabel,
  actions,
  disabled = false,
  triggerSize = 'small',
}: RowActionsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  function handleOpenMenu(event: MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleCloseMenu() {
    setAnchorEl(null);
  }

  return (
    <>
      <IconButton
        size={triggerSize}
        aria-label={triggerLabel}
        onClick={handleOpenMenu}
        disabled={disabled}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {actions.map((action) => (
          <MenuItem
            key={action.key}
            disabled={action.disabled}
            onClick={() => {
              handleCloseMenu();
              action.onSelect();
            }}
            sx={{ color: action.disabled ? 'text.disabled' : action.destructive ? 'error.main' : undefined }}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
