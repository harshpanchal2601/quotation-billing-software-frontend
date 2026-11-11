import { Box, MenuItem, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { FormSection } from '@shared/forms/FormSection';
import { AppButton } from '@shared/ui/actions';
import type { PurchaseOptions } from './purchasing.api';

export function PurchaseLineFields({ kind, options }: { kind: 'orders' | 'bills'; options: PurchaseOptions }) {
  const [count, setCount] = useState(1);
  return <><input type="hidden" name="lineCount" value={count} />{Array.from({ length: count }, (_, index) => <PurchaseLine key={index} index={index} kind={kind} options={options} />)}<Stack direction="row" spacing={1}><AppButton disabled={count >= 100} onClick={() => setCount((value) => value + 1)}>Add line</AppButton><AppButton disabled={count <= 1} onClick={() => setCount((value) => value - 1)}>Remove last line</AppButton></Stack></>;
}
function PurchaseLine({ index, kind, options }: { index: number; kind: 'orders' | 'bills'; options: PurchaseOptions }) {
  const [receiptId, setReceiptId] = useState('');
  const [itemId, setItemId] = useState('');
  const [selectedItem, setSelectedItem] = useState<PurchaseOptions['items'][number] | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PurchaseOptions['receiptLines'][number] | null>(null);
  const receipt = options.receiptLines.find((line) => line.id === Number(receiptId)) ?? selectedReceipt;
  const field = (name: string) => `line_${index}_${name}`;
  return <FormSection title={`Line ${index + 1}`} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: 'primary.main' }}>
    {kind === 'orders' ? <TextField select label={`Item on line ${index + 1}`} name={field('itemId')} value={itemId} onChange={(event) => { setItemId(event.target.value); setSelectedItem(options.items.find((row) => row.id === Number(event.target.value)) ?? null); }} required><MenuItem value="" disabled>Select item</MenuItem>{selectedItem && !options.items.some((row) => row.id === selectedItem.id) ? <MenuItem value={selectedItem.id}>{selectedItem.name}</MenuItem> : null}{options.items.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.stockTracking ? 'Stock tracked' : item.kind === 'SERVICE' ? 'Service' : 'Untracked goods'}</MenuItem>)}</TextField> : <TextField select label={`Match receipt on line ${index + 1}`} name={field('receiptId')} value={receiptId} onChange={(event) => { setReceiptId(event.target.value); setSelectedReceipt(options.receiptLines.find((line) => line.id === Number(event.target.value)) ?? null); }}><MenuItem value="">Not matched to a receipt</MenuItem>{selectedReceipt && !options.receiptLines.some((line) => line.id === selectedReceipt.id) ? <MenuItem value={selectedReceipt.id}>{selectedReceipt.reference} · {selectedReceipt.description} · {selectedReceipt.quantity} received · {selectedReceipt.currency}</MenuItem> : null}{options.receiptLines.map((line) => <MenuItem key={line.id} value={line.id}>{line.reference} · {line.description} · {line.quantity} received · {line.currency}</MenuItem>)}</TextField>}
    <Box key={receiptId} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}><TextField sx={{ gridColumn: '1 / -1' }} name={field('description')} label={`Description on line ${index + 1}`} defaultValue={receipt?.description ?? ''} required inputProps={{ minLength: 2, maxLength: 2000 }} /><TextField name={field('quantity')} label={`Quantity on line ${index + 1}`} defaultValue={receipt?.quantity ?? '1'} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} /><TextField name={field('unitCost')} label={`Unit cost on line ${index + 1}`} defaultValue={receipt?.unitCost ?? ''} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} /><TextField name={field('taxRate')} label={`Tax percentage on line ${index + 1}`} defaultValue={receipt?.taxRate ?? '0'} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,2})?' }} /><TextField sx={{ gridColumn: '1 / -1' }} name={field('expenseCategory')} label={`Expense category on line ${index + 1}`} required={kind === 'bills' && !receipt} inputProps={{ maxLength: 100 }} /></Box>
  </FormSection>;
}
