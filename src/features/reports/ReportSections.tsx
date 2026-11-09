import { Alert, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { REPORT_SECTION_LABELS, type ReportSection } from './reports.types';

export function ReportSections({ sections }: { sections: ReportSection[] }) {
  return <Stack spacing={3}>{sections.map((section) => <Paper key={section.key} variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
    <Typography component="h2" variant="h2">{REPORT_SECTION_LABELS[section.key]}</Typography>
    {section.status === 'UNAVAILABLE' ? <Alert severity="info">Access to this report is unavailable for your role or subscription.</Alert> : <Stack spacing={1}>
      <Typography color="text.secondary">{section.data.basis}</Typography>
      <Typography variant="caption">{section.data.dateBasis === 'PERIOD' ? 'Selected period' : section.data.dateBasis === 'CURRENT' ? 'Current balances' : 'Closing balance'} · As of {section.data.asOf} · {section.data.timezone}{section.data.scope === 'OWNED_OR_CREATED' ? ' · Your owned or created opportunities' : ''}</Typography>
      {section.data.metrics.length === 0 ? <Typography>No matching source records.</Typography> : <TableContainer>
        <Table size="small" aria-label={REPORT_SECTION_LABELS[section.key]}>
          <TableHead><TableRow><TableCell>Measure</TableCell><TableCell>Group</TableCell><TableCell>Currency</TableCell><TableCell align="right">Value</TableCell></TableRow></TableHead>
          <TableBody>{section.data.metrics.map((row) => <TableRow key={`${row.key}:${row.currency}:${row.dimension}`}>
            <TableCell>{row.label}</TableCell><TableCell>{row.dimension?.replace(/_/g, ' ') ?? '—'}</TableCell><TableCell>{row.currency ?? '—'}</TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{row.value}{row.unit === 'PERCENT' ? '%' : ''}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </TableContainer>}
    </Stack>}
  </Paper>)}</Stack>;
}
