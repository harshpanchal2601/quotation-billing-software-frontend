import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';

import { AppButton } from '@shared/ui/actions';
import type { QuotationListParams, QuotationStatus } from '../quotations.types';
import { formatQuotationStatusLabel } from '../quotations.utils';

type QuotationFiltersProps = {
  params: QuotationListParams;
  onFilterChange: (newParams: Partial<QuotationListParams>) => void;
  onClearFilters: () => void;
  companyOptions?: { id: number; name: string }[];
};

const SORT_OPTIONS: { label: string; sortBy: QuotationListParams['sortBy']; sortOrder: QuotationListParams['sortOrder'] }[] = [
  { label: 'Newest First', sortBy: 'createdAt', sortOrder: 'desc' },
  { label: 'Oldest First', sortBy: 'createdAt', sortOrder: 'asc' },
  { label: 'Quotation Number (A-Z)', sortBy: 'quotationNumber', sortOrder: 'asc' },
  { label: 'Quotation Number (Z-A)', sortBy: 'quotationNumber', sortOrder: 'desc' },
  { label: 'Quotation Date (Newest)', sortBy: 'quotationDate', sortOrder: 'desc' },
  { label: 'Quotation Date (Oldest)', sortBy: 'quotationDate', sortOrder: 'asc' },
  { label: 'Grand Total (High to Low)', sortBy: 'grandTotal', sortOrder: 'desc' },
  { label: 'Grand Total (Low to High)', sortBy: 'grandTotal', sortOrder: 'asc' },
];

const STATUS_LIST: QuotationStatus[] = [
  'DRAFT',
  'PENDING',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
];

export function QuotationFilters({
  params,
  onFilterChange,
  onClearFilters,
  companyOptions = [],
}: QuotationFiltersProps) {
  const [searchValue, setSearchValue] = useState(params.search || '');

  useEffect(() => {
    setSearchValue(params.search || '');
  }, [params.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (params.search || '')) {
        onFilterChange({ search: searchValue || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue, params.search, onFilterChange]);

  const currentSortKey = `${params.sortBy || 'createdAt'}-${params.sortOrder || 'desc'}`;

  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find((opt) => `${opt.sortBy}-${opt.sortOrder}` === value);
    if (option) {
      onFilterChange({ sortBy: option.sortBy, sortOrder: option.sortOrder, page: 1 });
    }
  };

  const hasActiveFilters = Boolean(
    params.search ||
      params.companyId ||
      params.status ||
      params.dateFrom ||
      params.dateTo ||
      params.validFrom ||
      params.validTo ||
      params.minTotal !== undefined ||
      params.maxTotal !== undefined,
  );

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 3,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          label="Search quotations"
          placeholder="Search by quote number, company, contact or remarks..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          sx={{ minWidth: { xs: 0, sm: 280 }, width: { xs: '100%', sm: 'auto' }, flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        {companyOptions.length > 0 ? (
          <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
            <InputLabel id="company-filter-label">Customer Company</InputLabel>
            <Select
              labelId="company-filter-label"
              value={params.companyId || ''}
              label="Customer Company"
              onChange={(e) =>
                onFilterChange({
                  companyId: e.target.value ? Number(e.target.value) : undefined,
                  page: 1,
                })
              }
            >
              <MenuItem value="">All Companies</MenuItem>
              {companyOptions.map((comp) => (
                <MenuItem key={comp.id} value={comp.id}>
                  {comp.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}

        <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 160 }, width: { xs: '100%', sm: 'auto' } }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={params.status || ''}
            label="Status"
            onChange={(e) =>
              onFilterChange({
                status: (e.target.value as QuotationStatus) || undefined,
                page: 1,
              })
            }
          >
            <MenuItem value="">All Statuses</MenuItem>
            {STATUS_LIST.map((st) => (
              <MenuItem key={st} value={st}>
                {formatQuotationStatusLabel(st)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 180 }, width: { xs: '100%', sm: 'auto' } }}>
          <InputLabel id="sort-filter-label">Sort By</InputLabel>
          <Select
            labelId="sort-filter-label"
            value={currentSortKey}
            label="Sort By"
            onChange={(e) => handleSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem key={`${opt.sortBy}-${opt.sortOrder}`} value={`${opt.sortBy}-${opt.sortOrder}`}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {hasActiveFilters ? (
          <AppButton size="small" color="inherit" onClick={onClearFilters} startIcon={<FilterListOutlinedIcon />} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Clear Filters
          </AppButton>
        ) : null}
      </Box>

      {/* Date & Amount Ranges */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          size="small"
          type="date"
          label="Quote Date From"
          value={params.dateFrom || ''}
          onChange={(e) => onFilterChange({ dateFrom: e.target.value || undefined, page: 1 })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 165 } }}
        />
        <TextField
          size="small"
          type="date"
          label="Quote Date To"
          value={params.dateTo || ''}
          onChange={(e) => onFilterChange({ dateTo: e.target.value || undefined, page: 1 })}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 165 } }}
        />
        <TextField
          size="small"
          type="date"
          label="Valid From"
          value={params.validFrom || ''}
          onChange={(e) => {
            const val = e.target.value || undefined;
            if (val && params.validTo && val > params.validTo) return;
            onFilterChange({ validFrom: val, page: 1 });
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 165 } }}
        />
        <TextField
          size="small"
          type="date"
          label="Valid To"
          value={params.validTo || ''}
          onChange={(e) => {
            const val = e.target.value || undefined;
            if (val && params.validFrom && val < params.validFrom) return;
            onFilterChange({ validTo: val, page: 1 });
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ width: { xs: '100%', sm: 165 } }}
        />
        <TextField
          size="small"
          type="number"
          label="Min Total"
          value={params.minTotal !== undefined ? params.minTotal : ''}
          onChange={(e) =>
            onFilterChange({
              minTotal: e.target.value !== '' ? Number(e.target.value) : undefined,
              page: 1,
            })
          }
          sx={{ width: { xs: '100%', sm: 120 } }}
        />
        <TextField
          size="small"
          type="number"
          label="Max Total"
          value={params.maxTotal !== undefined ? params.maxTotal : ''}
          onChange={(e) =>
            onFilterChange({
              maxTotal: e.target.value !== '' ? Number(e.target.value) : undefined,
              page: 1,
            })
          }
          sx={{ width: { xs: '100%', sm: 120 } }}
        />
      </Box>
    </Box>
  );
}
