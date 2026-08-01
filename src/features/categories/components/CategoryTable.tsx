import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState, type MouseEvent } from 'react';

import type { CategoryListItem } from '../model/categories.types';
import { isProtectedCategory } from '../model/categories.utils';

type CategoryTableProps = {
  categories: CategoryListItem[];
  busyCategoryId?: number | null;
  onView: (category: CategoryListItem) => void;
  onEdit: (category: CategoryListItem) => void;
  onStatusChange: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
};

export function CategoryTable({
  categories,
  busyCategoryId = null,
  onView,
  onEdit,
  onStatusChange,
  onDelete,
}: CategoryTableProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryListItem | null>(null);

  function handleOpenMenu(event: MouseEvent<HTMLElement>, category: CategoryListItem) {
    setAnchorEl(event.currentTarget);
    setActiveCategory(category);
  }

  function handleCloseMenu() {
    setAnchorEl(null);
    setActiveCategory(null);
  }

  function formatDate(isoString: string) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(isoString));
  }

  if (!isDesktop) {
    return (
      <Stack spacing={2}>
        {categories.map((cat) => {
          const isProtected = isProtectedCategory(cat.slug);
          return (
            <Card key={cat.id} variant="outlined">
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box minWidth={0}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={700} variant="h6" noWrap>
                          {cat.name}
                        </Typography>
                        {isProtected ? (
                          <Tooltip title="System protected category">
                            <Chip
                              icon={<LockOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                              label="System"
                              size="small"
                              color="default"
                              variant="outlined"
                              sx={{ height: 22, fontSize: 11 }}
                            />
                          </Tooltip>
                        ) : null}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        slug: {cat.slug}
                      </Typography>
                    </Box>
                    <Chip
                      label={cat.isActive ? 'Active' : 'Inactive'}
                      color={cat.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>

                  {cat.description ? (
                    <Typography variant="body2" color="text.secondary">
                      {cat.description}
                    </Typography>
                  ) : null}

                  <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1}>
                    <Typography variant="body2" color="text.secondary">
                      Linked Items: <strong>{cat.linkedItemCount}</strong>
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" aria-label={`Actions for ${cat.name}`} onClick={(e) => handleOpenMenu(e, cat)} disabled={busyCategoryId === cat.id}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
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
        <Table aria-label="Category table">
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Linked Items</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((cat) => {
              const isProtected = isProtectedCategory(cat.slug);
              return (
                <TableRow key={cat.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600}>{cat.name}</Typography>
                      {isProtected ? (
                        <Tooltip title="Default Uncategorised category cannot be deactivated or deleted">
                          <Chip
                            icon={<LockOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                            label="System"
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ height: 22, fontSize: 11 }}
                          />
                        </Tooltip>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {cat.slug}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 240 }}>
                      {cat.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={600}>{cat.linkedItemCount}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cat.isActive ? 'Active' : 'Inactive'}
                      color={cat.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(cat.updatedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label={`Actions for ${cat.name}`}
                      onClick={(e) => handleOpenMenu(e, cat)}
                      disabled={busyCategoryId === cat.id}
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
    if (!activeCategory) return null;
    const isProtected = isProtectedCategory(activeCategory.slug);

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
            const cat = activeCategory;
            handleCloseMenu();
            onView(cat);
          }}
        >
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            const cat = activeCategory;
            handleCloseMenu();
            onEdit(cat);
          }}
        >
          Edit Category
        </MenuItem>
        <MenuItem
          disabled={isProtected && activeCategory.isActive}
          onClick={() => {
            const cat = activeCategory;
            handleCloseMenu();
            onStatusChange(cat);
          }}
        >
          {activeCategory.isActive ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem
          disabled={isProtected}
          onClick={() => {
            const cat = activeCategory;
            handleCloseMenu();
            onDelete(cat);
          }}
          sx={{ color: isProtected ? 'text.disabled' : 'error.main' }}
        >
          Delete Category
        </MenuItem>
      </Menu>
    );
  }
}
