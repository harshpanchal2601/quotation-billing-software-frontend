import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useFieldArray, useFormContext } from 'react-hook-form';

import type { ItemOption } from '../../items/items.types';
import type { CalculatedQuotationTotals } from '../quotations.types';
import type { QuotationFormSubmitValues } from '../quotations.schema';
import { QuotationItemRow } from './QuotationItemRow';

type QuotationItemsFieldProps = {
  itemOptions: ItemOption[];
  calculatedTotals: CalculatedQuotationTotals | null;
  currency?: string;
};

export function QuotationItemsField({
  itemOptions,
  calculatedTotals,
  currency = 'INR',
}: QuotationItemsFieldProps) {
  const { control, setValue, formState: { errors } } = useFormContext<QuotationFormSubmitValues>();

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  });

  const handleSelectItem = (index: number, selected: ItemOption | null) => {
    if (selected) {
      setValue(`items.${index}.itemId`, selected.id);
      setValue(`items.${index}.itemName`, selected.name);
      setValue(`items.${index}.description`, selected.shortDescription || '');
      setValue(`items.${index}.measurementUnit`, selected.measurementUnit.symbol);
      setValue(`items.${index}.unitRate`, selected.defaultRate);
      setValue(`items.${index}.gstRate`, selected.gstRate);
    } else {
      setValue(`items.${index}.itemId`, null);
    }
  };

  const handleAddItem = () => {
    append({
      itemId: null,
      lineNumber: fields.length + 1,
      itemName: '',
      description: '',
      measurementUnit: 'NOS',
      quantity: 1,
      unitRate: 0,
      discountType: 'NONE',
      discountValue: 0,
      gstRate: 18,
      sortOrder: fields.length,
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          Line Items ({fields.length})
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddOutlinedIcon />}
          onClick={handleAddItem}
          disabled={fields.length >= 100}
        >
          Add Line Item
        </Button>
      </Box>

      {errors.items?.root ? (
        <Typography variant="caption" color="error">
          {errors.items.root.message}
        </Typography>
      ) : null}

      <Stack spacing={2}>
        {fields.map((fieldItem, index) => {
          const calculatedLine = calculatedTotals?.items[index];
          return (
            <QuotationItemRow
              key={fieldItem.id}
              index={index}
              itemOptions={itemOptions}
              calculatedLine={calculatedLine}
              canMoveUp={index > 0}
              canMoveDown={index < fields.length - 1}
              canRemove={fields.length > 1}
              currency={currency}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onRemove={() => remove(index)}
              onSelectItem={handleSelectItem}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
