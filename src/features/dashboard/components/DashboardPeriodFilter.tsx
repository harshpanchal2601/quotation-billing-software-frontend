import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

import { AppButton } from '@shared/ui/actions';

import type { DashboardPeriod } from '../model/dashboard.types';

type DashboardPeriodFilterProps = {
  period: DashboardPeriod;
  dateFrom?: string;
  dateTo?: string;
  rangeLabel?: string;
  isFetching?: boolean;
  onPeriodChange: (newPeriod: DashboardPeriod, newFrom?: string, newTo?: string) => void;
  onRefresh: () => void;
};

export function DashboardPeriodFilter({
  period,
  dateFrom = '',
  dateTo = '',
  rangeLabel = '',
  isFetching = false,
  onPeriodChange,
  onRefresh,
}: DashboardPeriodFilterProps) {
  const [customFrom, setCustomFrom] = useState(dateFrom);
  const [customTo, setCustomTo] = useState(dateTo);
  const [dateError, setDateError] = useState<string | null>(null);

  const handlePeriodSelect = (selectedPeriod: DashboardPeriod) => {
    if (selectedPeriod === 'CUSTOM') {
      onPeriodChange('CUSTOM', customFrom || undefined, customTo || undefined);
    } else {
      onPeriodChange(selectedPeriod);
    }
  };

  const handleCustomApply = () => {
    if (!customFrom || !customTo) {
      setDateError('Both Date From and Date To are required');
      return;
    }
    if (new Date(customFrom) > new Date(customTo)) {
      setDateError('Date From cannot be after Date To');
      return;
    }
    setDateError(null);
    onPeriodChange('CUSTOM', customFrom, customTo);
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
      {rangeLabel ? (
        <Chip
          icon={<CalendarTodayOutlinedIcon />}
          label={rangeLabel}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600, minHeight: 40, height: 'auto', maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'normal', py: 1 } }}
        />
      ) : null}

      <FormControl size="small" sx={{ minWidth: { xs: 0, sm: 200 }, width: { xs: '100%', sm: 'auto' } }}>
        <Select
          value={period}
          onChange={(e) => handlePeriodSelect(e.target.value as DashboardPeriod)}
          displayEmpty
          inputProps={{ 'aria-label': 'Select Dashboard Period' }}
        >
          <MenuItem value="CURRENT_FINANCIAL_YEAR">Current Financial Year</MenuItem>
          <MenuItem value="LAST_30_DAYS">Last 30 Days</MenuItem>
          <MenuItem value="LAST_90_DAYS">Last 90 Days</MenuItem>
          <MenuItem value="CURRENT_CALENDAR_YEAR">Current Calendar Year</MenuItem>
          <MenuItem value="CUSTOM">Custom Range</MenuItem>
        </Select>
      </FormControl>

      {period === 'CUSTOM' ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap flexWrap="wrap" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ minWidth: 0, maxWidth: '100%', width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            size="small"
            type="date"
            label="From"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={Boolean(dateError)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={Boolean(dateError)}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          />
          <AppButton variant="outlined" onClick={handleCustomApply} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Apply
          </AppButton>
        </Stack>
      ) : null}

      {dateError ? (
        <Box sx={{ color: 'error.main', fontSize: '0.75rem', width: '100%' }}>{dateError}</Box>
      ) : null}

      <AppButton
        variant="outlined"
        color="inherit"
        startIcon={<RefreshOutlinedIcon />}
        onClick={onRefresh}
        disabled={isFetching}
        sx={{ ml: { xs: 0, sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}
      >
        {isFetching ? 'Refreshing...' : 'Refresh'}
      </AppButton>
    </Stack>
  );
}
