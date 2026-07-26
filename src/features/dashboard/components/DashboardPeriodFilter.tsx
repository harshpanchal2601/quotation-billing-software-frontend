import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

import type { DashboardPeriod } from '../dashboard.types';

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
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
      {rangeLabel ? (
        <Chip
          icon={<CalendarTodayOutlinedIcon />}
          label={rangeLabel}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600, py: 2.2 }}
        />
      ) : null}

      <FormControl size="small" sx={{ minWidth: 200 }}>
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
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            type="date"
            label="From"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={Boolean(dateError)}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            error={Boolean(dateError)}
          />
          <Button variant="outlined" size="small" onClick={handleCustomApply} sx={{ height: 40 }}>
            Apply
          </Button>
        </Stack>
      ) : null}

      {dateError ? (
        <Box sx={{ color: 'error.main', fontSize: '0.75rem', width: '100%' }}>{dateError}</Box>
      ) : null}

      <Button
        variant="outlined"
        color="inherit"
        size="small"
        startIcon={<RefreshOutlinedIcon />}
        onClick={onRefresh}
        disabled={isFetching}
        sx={{ height: 40, ml: 'auto' }}
      >
        {isFetching ? 'Refreshing...' : 'Refresh'}
      </Button>
    </Stack>
  );
}
