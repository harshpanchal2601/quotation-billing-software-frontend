import MenuItem from '@mui/material/MenuItem';
import type { FieldValues } from 'react-hook-form';

import { ControlledTextField, type ControlledTextFieldProps } from './ControlledTextField';

const currencyOptions = [
  { value: 'INR', label: 'INR (Indian Rupee)' },
  { value: 'USD', label: 'USD (US Dollar)' },
  { value: 'AED', label: 'AED (UAE Dirham)' },
  { value: 'SAR', label: 'SAR (Saudi Riyal)' },
];

export type ControlledCurrencyFieldProps<TFieldValues extends FieldValues, TTransformedValues = TFieldValues> =
  Omit<ControlledTextFieldProps<TFieldValues, TTransformedValues>, 'select' | 'children'> & {
    currentCurrency?: string;
  };

export function ControlledCurrencyField<TFieldValues extends FieldValues, TTransformedValues = TFieldValues>({
  currentCurrency,
  label = 'Currency',
  ...props
}: ControlledCurrencyFieldProps<TFieldValues, TTransformedValues>) {
  const options = currentCurrency && !currencyOptions.some((option) => option.value === currentCurrency)
    ? [...currencyOptions, { value: currentCurrency, label: currentCurrency }]
    : currencyOptions;

  return (
    <ControlledTextField<TFieldValues, TTransformedValues> {...props} label={label} select>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </ControlledTextField>
  );
}
