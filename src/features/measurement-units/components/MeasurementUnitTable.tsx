import MoreVertIcon from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState, type MouseEvent } from 'react';

import type { MeasurementUnitListItem } from '../measurement-units.types';
import { formatQuantityTypeLabel } from '../measurement-units.utils';

type MeasurementUnitTableProps = {
  units: MeasurementUnitListItem[];
  disabled?: boolean;
  onView: (unit: MeasurementUnitListItem) => void;
  onEdit: (unit: MeasurementUnitListItem) => void;
  onStatusChange: (unit: MeasurementUnitListItem) => void;
  onDelete: (unit: MeasurementUnitListItem) => void;
};

export function MeasurementUnitTable({
  units,
  disabled = false,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
}: MeasurementUnitTableProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeUnit, setActiveUnit] = useState<MeasurementUnitListItem | null>(null);

  function handleOpenMenu(event: MouseEvent<HTMLElement>, unit: MeasurementUnitListItem) {
    setAnchorEl(event.currentTarget);
    setActiveUnit(unit);
  }

  function handleCloseMenu() {
    setAnchorEl(null);
    setActiveUnit(null);
  }

  function formatDate(isoString: string) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(isoString));
  }

  if (!isDesktop) {
    return (
      <Stack spacing={2}>
        {units.map((unit) => (
          <Card key={unit.id} variant="outlined">
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box minWidth={0}>
                    <Typography fontWeight={700} variant="h6" noWrap>
                      {unit.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Symbol: <strong>{unit.symbol}</strong>
                    </Typography>
                  </Box>
                  <Chip
                    label={unit.isActive ? 'Active' : 'Inactive'}
                    color={unit.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {formatQuantityTypeLabel(unit.allowDecimal)}
                </Typography>

                <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Linked Items: <strong>{unit.linkedItemCount}</strong>
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={`Actions for ${unit.name}`}
                    onClick={(e) => handleOpenMenu(e, unit)}
                    disabled={disabled}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {renderActionMenu()}
      </Stack>
    );
  }

  return (
    <>
      <TableContainer component={Card} variant="outlined">
        <Table aria-label="Measurement unit table">
          <TableHead>
            <TableRow>
              <TableCell>Unit Name</TableCell>
              <TableCell>Symbol</TableCell>
              <TableCell>Quantity Type</TableCell>
              <TableCell align="right">Linked Items</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {units.map((unit) => (
              <TableRow key={unit.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{unit.name}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={unit.symbol}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatQuantityTypeLabel(unit.allowDecimal)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={600}>{unit.linkedItemCount}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={unit.isActive ? 'Active' : 'Inactive'}
                    color={unit.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(unit.updatedAt)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    aria-label={`Actions for ${unit.name}`}
                    onClick={(e) => handleOpenMenu(e, unit)}
                    disabled={disabled}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {renderActionMenu()}
    </>
  );

  function renderActionMenu() {
    if (!activeUnit) return null;

    return (
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            const u = activeUnit;
            handleCloseMenu();
            onView(u);
          }}
        >
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            const u = activeUnit;
            handleCloseMenu();
            onEdit(u);
          }}
        >
          Edit Unit
        </MenuItem>
        <MenuItem
          onClick={() => {
            const u = activeUnit;
            handleCloseMenu();
            onStatusChange(u);
          }}
        >
          {activeUnit.isActive ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            const u = activeUnit;
            handleCloseMenu();
            onDelete(u);
          }}
          sx={{ color: 'error.main' }}
        >
          Delete Unit
        </MenuItem>
      </Menu>
    );
  }
}
