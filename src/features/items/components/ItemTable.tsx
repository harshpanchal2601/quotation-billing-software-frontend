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

import { SafeImage } from '../../../components/common/SafeImage';
import type { ItemListItem } from '../items.types';
import {
  formatCurrencyRate,
  formatGstRateLabel,
  formatItemSourceTypeLabel,
  formatReadableDate,
  resolveAssetUrl,
} from '../items.utils';

type ItemTableProps = {
  items: ItemListItem[];
  busyItemId?: number | null;
  onView: (item: ItemListItem) => void;
  onEdit: (item: ItemListItem) => void;
  onStatusChange: (item: ItemListItem) => void;
  onDelete: (item: ItemListItem) => void;
};

export function ItemTable({
  items,
  busyItemId = null,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
}: ItemTableProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeItem, setActiveItem] = useState<ItemListItem | null>(null);

  function handleOpenMenu(event: MouseEvent<HTMLElement>, item: ItemListItem) {
    setAnchorEl(event.currentTarget);
    setActiveItem(item);
  }

  function handleCloseMenu() {
    setAnchorEl(null);
    setActiveItem(null);
  }

  if (!isDesktop) {
    return (
      <Stack spacing={2}>
        {items.map((item) => {
          const imageUrl = resolveAssetUrl(item.imageUrl);
          return (
            <Card key={item.id} variant="outlined">
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 1.5,
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <SafeImage src={imageUrl} alt={item.name} fallbackLabel="No image" />
                    </Box>

                    <Box minWidth={0} flex={1}>
                      <Typography fontWeight={700} variant="h6" noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Code: <strong>{item.itemCode}</strong>
                      </Typography>
                    </Box>

                    <Chip
                      label={item.isActive ? 'Active' : 'Inactive'}
                      color={item.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Category
                      </Typography>
                      <Typography variant="body2">{item.category?.name ?? 'Uncategorised'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Unit
                      </Typography>
                      <Typography variant="body2">
                        {item.measurementUnit.symbol} ({item.measurementUnit.name})
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Rate & GST
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrencyRate(item.defaultRate)} ({formatGstRateLabel(item.gstRate)})
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1}>
                    <Typography variant="body2" color="text.secondary">
                      Quotations: <strong>{item.quotationUsageCount}</strong>
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label={`Actions for ${item.name}`}
                      onClick={(e) => handleOpenMenu(e, item)}
                      disabled={busyItemId === item.id}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
        {renderActionMenu()}
      </Stack>
    );
  }

  return (
    <>
      <TableContainer component={Card} variant="outlined">
        <Table aria-label="Item table">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Item Code</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Default Rate</TableCell>
              <TableCell align="right">GST</TableCell>
              <TableCell>Source</TableCell>
              <TableCell align="right">Quotations</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const imageUrl = resolveAssetUrl(item.imageUrl);
              return (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ minWidth: 220 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <SafeImage src={imageUrl} alt={item.name} fallbackLabel="No image" />
                      </Box>

                      <Box minWidth={0}>
                        <Typography fontWeight={600} noWrap>
                          {item.name}
                        </Typography>
                        {item.shortDescription ? (
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {item.shortDescription}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {item.itemCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.category?.name ?? 'Uncategorised'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      <strong style={{ fontFamily: 'monospace' }}>{item.measurementUnit.symbol}</strong> ({item.measurementUnit.name})
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>{formatCurrencyRate(item.defaultRate)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{formatGstRateLabel(item.gstRate)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formatItemSourceTypeLabel(item.sourceType)}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>{item.quotationUsageCount}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.isActive ? 'Active' : 'Inactive'}
                      color={item.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatReadableDate(item.updatedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={`Actions for ${item.name}`}
                      onClick={(e) => handleOpenMenu(e, item)}
                      disabled={busyItemId === item.id}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {renderActionMenu()}
    </>
  );

  function renderActionMenu() {
    if (!activeItem) return null;

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
            const itm = activeItem;
            handleCloseMenu();
            onView(itm);
          }}
        >
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            const itm = activeItem;
            handleCloseMenu();
            onEdit(itm);
          }}
        >
          Edit Item
        </MenuItem>
        <MenuItem
          onClick={() => {
            const itm = activeItem;
            handleCloseMenu();
            onStatusChange(itm);
          }}
        >
          {activeItem.isActive ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            const itm = activeItem;
            handleCloseMenu();
            onDelete(itm);
          }}
          sx={{ color: 'error.main' }}
        >
          Delete Item
        </MenuItem>
      </Menu>
    );
  }
}
