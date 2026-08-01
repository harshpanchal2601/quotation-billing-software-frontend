import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import { DataTableShell, RowActionsMenu } from '@shared/ui/tables';
import type { MeasurementUnitListItem } from '../model/measurement-units.types';
import { formatQuantityTypeLabel } from '../model/measurement-units.utils';

type MeasurementUnitTableProps = {
  units: MeasurementUnitListItem[];
  busyUnitId?: number | null;
  onView: (unit: MeasurementUnitListItem) => void;
  onEdit: (unit: MeasurementUnitListItem) => void;
  onStatusChange: (unit: MeasurementUnitListItem) => void;
  onDelete: (unit: MeasurementUnitListItem) => void;
};

export function MeasurementUnitTable({
  units,
  busyUnitId = null,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
}: MeasurementUnitTableProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  function formatDate(isoString: string) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(isoString));
  }

  function renderRowActions(unit: MeasurementUnitListItem) {
    return (
      <RowActionsMenu
        triggerLabel={`Actions for ${unit.name}`}
        disabled={busyUnitId === unit.id}
        actions={[
          { key: 'view', label: 'View Details', onSelect: () => onView(unit) },
          { key: 'edit', label: 'Edit Unit', onSelect: () => onEdit(unit) },
          {
            key: 'status',
            label: unit.isActive ? 'Deactivate' : 'Activate',
            onSelect: () => onStatusChange(unit),
          },
          {
            key: 'delete',
            label: 'Delete Unit',
            destructive: true,
            onSelect: () => onDelete(unit),
          },
        ]}
      />
    );
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
                  {renderRowActions(unit)}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <DataTableShell
      isLoading={false}
      isError={false}
      isEmpty={false}
      loadingContent={null}
      errorContent={null}
      emptyContent={null}
      tableContainerProps={{ component: Card, variant: 'outlined' }}
    >
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
                  {renderRowActions(unit)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </DataTableShell>
  );
}
