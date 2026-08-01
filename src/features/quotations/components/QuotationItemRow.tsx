import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext } from 'react-hook-form';

import type { ItemOption } from '../../items/items.types';
import type { CalculatedLineItem } from '../quotations.types';
import { formatCurrency } from '../quotations.utils';
import type { QuotationFormSubmitValues } from '../quotations.schema';

type QuotationItemRowProps = {
  index: number;
  itemOptions: ItemOption[];
  calculatedLine?: CalculatedLineItem;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  currency?: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onSelectItem: (index: number, selected: ItemOption | null) => void;
};

export function QuotationItemRow({
  index,
  itemOptions,
  calculatedLine,
  canMoveUp,
  canMoveDown,
  canRemove,
  currency = 'INR',
  onMoveUp,
  onMoveDown,
  onRemove,
  onSelectItem,
}: QuotationItemRowProps) {
  const { control, watch, formState: { errors } } = useFormContext<QuotationFormSubmitValues>();

  const selectedItemId = watch(`items.${index}.itemId`);
  const selectedMaster = itemOptions.find((opt) => opt.id === selectedItemId);
  const isWholeUnitOnly = selectedMaster ? !selectedMaster.measurementUnit.allowDecimal : false;
  const unitSymbol = selectedMaster ? selectedMaster.measurementUnit.symbol : (watch(`items.${index}.measurementUnit`) || 'NOS');

  const rowError = errors.items?.[index];

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
              #{index + 1}
            </Typography>
            {selectedMaster ? (
              <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600, wordBreak: 'break-word' }}>
                {selectedMaster.itemCode}
              </Typography>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <IconButton size="small" onClick={onMoveUp} disabled={!canMoveUp} title="Move Up" aria-label={`Move line ${index + 1} up`}>
              <ArrowUpwardOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onMoveDown} disabled={!canMoveDown} title="Move Down" aria-label={`Move line ${index + 1} down`}>
              <ArrowDownwardOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={onRemove} disabled={!canRemove} title="Remove Item" aria-label={`Remove line ${index + 1}`}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2, mb: 1.5 }}>
          {/* Master Item Autocomplete */}
          <Autocomplete
            size="small"
            options={itemOptions}
            getOptionLabel={(option) => `${option.itemCode} - ${option.name}`}
            value={selectedMaster || null}
            onChange={(_e, newValue) => onSelectItem(index, newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Master Item"
                placeholder="Search catalog items..."
                error={Boolean(rowError?.itemId)}
                helperText={rowError?.itemId?.message}
              />
            )}
          />

          {/* Custom / Overridden Item Name */}
          <Controller
            name={`items.${index}.itemName`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Item Display Name"
                placeholder="Item name"
                error={Boolean(rowError?.itemName)}
                helperText={rowError?.itemName?.message}
              />
            )}
          />

          {/* Unit Symbol Display */}
          <Controller
            name={`items.${index}.measurementUnit`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label="Unit Symbol"
                value={field.value || unitSymbol}
                placeholder="NOS / KG"
                error={Boolean(rowError?.measurementUnit)}
              />
            )}
          />
        </Box>

        {/* Description Override */}
        <Box sx={{ mb: 1.5 }}>
          <Controller
            name={`items.${index}.description`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value || ''}
                size="small"
                fullWidth
                label="Description / Specifications"
                placeholder="Custom description or specifications for this quotation item..."
                multiline
                rows={2}
              />
            )}
          />
        </Box>

        {/* Financial Inputs Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1.2fr 1fr 1fr 1.2fr' }, gap: 1.5, alignItems: 'center' }}>
          {/* Quantity */}
          <Controller
            name={`items.${index}.quantity`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                type="number"
                label={`Quantity (${unitSymbol})`}
                inputProps={{ step: isWholeUnitOnly ? '1' : '0.001', min: '0.001' }}
                error={Boolean(rowError?.quantity)}
                helperText={rowError?.quantity?.message || (isWholeUnitOnly ? 'Whole number unit' : undefined)}
              />
            )}
          />

          {/* Unit Rate */}
          <Controller
            name={`items.${index}.unitRate`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                type="number"
                label="Unit Rate"
                inputProps={{ step: '0.01', min: '0' }}
                error={Boolean(rowError?.unitRate)}
                helperText={rowError?.unitRate?.message}
              />
            )}
          />

          {/* Item Discount Type */}
          <Controller
            name={`items.${index}.discountType`}
            control={control}
            render={({ field }) => (
              <FormControl size="small" fullWidth>
                <InputLabel id={`line-disc-type-${index}`}>Discount</InputLabel>
                <Select
                  {...field}
                  labelId={`line-disc-type-${index}`}
                  label="Discount"
                  value={field.value || 'NONE'}
                >
                  <MenuItem value="NONE">None</MenuItem>
                  <MenuItem value="PERCENTAGE">%</MenuItem>
                  <MenuItem value="FIXED">Fixed</MenuItem>
                </Select>
              </FormControl>
            )}
          />

          {/* Item Discount Value */}
          <Controller
            name={`items.${index}.discountValue`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                type="number"
                label="Disc Val"
                disabled={watch(`items.${index}.discountType`) === 'NONE'}
                inputProps={{ step: '0.01', min: '0' }}
              />
            )}
          />

          {/* GST Rate */}
          <Controller
            name={`items.${index}.gstRate`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                type="number"
                label="GST Rate (%)"
                inputProps={{ step: '0.01', min: '0', max: '100' }}
                error={Boolean(rowError?.gstRate)}
                helperText={rowError?.gstRate?.message}
              />
            )}
          />
        </Box>

        {/* Calculated Line Subtotal Summary */}
        {calculatedLine ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              gap: 1,
              mt: 1.5,
              pt: 1,
              borderTop: '1px dashed',
              borderColor: 'divider',
              bgcolor: 'grey.50',
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ width: '100%', wordBreak: 'break-word' }}>
              Base: {formatCurrency(calculatedLine.baseAmount, currency)} | Taxable: {formatCurrency(calculatedLine.taxableAmount, currency)} | Tax: {formatCurrency(calculatedLine.taxAmount, currency)} ({calculatedLine.gstRate}%)
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ width: { xs: '100%', sm: 'auto' }, textAlign: { xs: 'left', sm: 'right' } }}>
              Line Total: {formatCurrency(calculatedLine.lineTotal, currency)}
            </Typography>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
