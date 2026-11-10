import { Alert, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import type { ReportSection } from './reports.types';
import { formatExactDecimal, formatTimestamp, type Presentation } from '@shared/localization/presentation';
import { reportWords } from './reports.localization';

export function ReportSections({ sections, presentation }: { sections: ReportSection[]; presentation?: Presentation }) {
  const words = reportWords(presentation?.language);
  return <Stack spacing={3}>{sections.map((section) => <Paper key={section.key} variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
    <Typography component="h2" variant="h2">{words.sections[section.key]}</Typography>
    {section.status === 'UNAVAILABLE' ? <Alert severity="info">Access to this report is unavailable for your role or subscription.</Alert> : <Stack spacing={1}>
      <Typography color="text.secondary">{section.data.basis}</Typography>
      <Typography variant="caption">{section.data.dateBasis === 'PERIOD' ? 'Selected period' : section.data.dateBasis === 'CURRENT' ? 'Current balances' : 'Closing balance'} · As of {presentation && section.data.asOf.includes('T') ? formatTimestamp(section.data.asOf, presentation) : section.data.asOf} · {presentation && section.data.asOf.includes('T') ? presentation.timezone : section.data.timezone}{section.data.scope === 'OWNED_OR_CREATED' ? ' · Your owned or created opportunities' : ''}</Typography>
      {section.data.metrics.length === 0 ? <Typography>No matching source records.</Typography> : <TableContainer>
        <Table size="small" aria-label={words.sections[section.key]}>
          <TableHead><TableRow><TableCell>{words.measure}</TableCell><TableCell>{words.group}</TableCell><TableCell>{words.currency}</TableCell><TableCell align="right">{words.value}</TableCell></TableRow></TableHead>
          <TableBody>{section.data.metrics.map((row) => <TableRow key={`${row.key}:${row.currency}:${row.dimension}`}>
            <TableCell>{row.label}</TableCell><TableCell>{row.dimension?.replace(/_/g, ' ') ?? '—'}</TableCell><TableCell>{row.currency ?? '—'}</TableCell>
            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{presentation ? formatExactDecimal(row.value, presentation.locale) : row.value}{row.unit === 'PERCENT' ? '%' : ''}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </TableContainer>}
    </Stack>}
  </Paper>)}</Stack>;
}
