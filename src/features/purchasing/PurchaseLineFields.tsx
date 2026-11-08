import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { AppButton } from '@shared/ui/actions';
import type { PurchaseOptions } from './purchasing.api';

export function purchaseLines(data: FormData, kind: 'orders' | 'bills') {
  const count = Number(data.get('lineCount'));
  return Array.from({ length: count }, (_, index) => {
    const field = (name: string) => String(data.get(`line_${index}_${name}`) ?? '').trim();
    return { description: field('description'), quantity: field('quantity'), unitCost: field('unitCost'), taxRate: field('taxRate'), ...(field('expenseCategory') ? { expenseCategory: field('expenseCategory') } : {}), ...(kind === 'orders' ? { itemId: Number(field('itemId')) } : field('receiptId') ? { goodsReceiptLineId: Number(field('receiptId')) } : {}) };
  });
}
export function PurchaseLineFields({ kind, options }: { kind: 'orders' | 'bills'; options: PurchaseOptions }) {
  const [count, setCount] = useState(1);
  return <><input type="hidden" name="lineCount" value={count} />{Array.from({ length: count }, (_, index) => <PurchaseLine key={index} index={index} kind={kind} options={options} />)}<Stack direction="row"><AppButton disabled={count >= 100} onClick={() => setCount((value) => value + 1)}>Add line</AppButton><AppButton disabled={count <= 1} onClick={() => setCount((value) => value - 1)}>Remove last line</AppButton></Stack></>;
}
function PurchaseLine({ index, kind, options }: { index: number; kind: 'orders' | 'bills'; options: PurchaseOptions }) {
  const [receiptId, setReceiptId] = useState('');
  const [itemId, setItemId] = useState('');
  const [selectedItem, setSelectedItem] = useState<PurchaseOptions['items'][number] | null>(null);
  const receipt = options.receiptLines.find((line) => line.id === Number(receiptId));
  const field = (name: string) => `line_${index}_${name}`;
  return <Stack spacing={1}><Typography>Line {index + 1}</Typography>
    {kind === 'orders' ? <TextField select label={`Item on line ${index + 1}`} name={field('itemId')} value={itemId} onChange={(event) => { setItemId(event.target.value); setSelectedItem(options.items.find((row) => row.id === Number(event.target.value)) ?? null); }} required><MenuItem value="" disabled>Select item</MenuItem>{selectedItem && !options.items.some((row) => row.id === selectedItem.id) ? <MenuItem value={selectedItem.id}>{selectedItem.name}</MenuItem> : null}{options.items.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.stockTracking ? 'Stock tracked' : item.kind === 'SERVICE' ? 'Service' : 'Untracked goods'}</MenuItem>)}</TextField> : <TextField select label={`Match receipt on line ${index + 1}`} name={field('receiptId')} value={receiptId} onChange={(event) => setReceiptId(event.target.value)}><MenuItem value="">Standalone expense classification</MenuItem>{options.receiptLines.map((line) => <MenuItem key={line.id} value={line.id}>{line.reference} · {line.description} · {line.quantity} received · {line.currency}</MenuItem>)}</TextField>}
    <Stack key={receiptId} spacing={1}><TextField name={field('description')} label={`Description on line ${index + 1}`} defaultValue={receipt?.description ?? ''} required inputProps={{ minLength: 2, maxLength: 2000 }} /><TextField name={field('quantity')} label={`Quantity on line ${index + 1}`} defaultValue={receipt?.quantity ?? '1'} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} /><TextField name={field('unitCost')} label={`Unit cost on line ${index + 1}`} defaultValue={receipt?.unitCost ?? ''} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,3})?' }} /><TextField name={field('taxRate')} label={`Tax percentage on line ${index + 1}`} defaultValue={receipt?.taxRate ?? '0'} required inputProps={{ inputMode: 'decimal', pattern: '\\d+(\\.\\d{1,2})?' }} /><TextField name={field('expenseCategory')} label={`Expense category on line ${index + 1}`} required={kind === 'bills' && !receipt} inputProps={{ maxLength: 100 }} /></Stack>
  </Stack>;
}
