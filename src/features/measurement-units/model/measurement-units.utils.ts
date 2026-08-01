export function formatQuantityTypeLabel(allowDecimal: boolean): string {
  return allowDecimal ? 'Decimal quantities allowed' : 'Whole quantities only';
}
