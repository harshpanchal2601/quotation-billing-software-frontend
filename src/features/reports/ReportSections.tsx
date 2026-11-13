import { Alert, Paper, Stack, Typography } from '@mui/material';
import { EmptyState } from '@shared/components/common/EmptyState';
import { RecordTable } from '@shared/ui/tables';
import type { ReportSection } from './reports.types';
import { formatExactDecimal, formatTimestamp, type Presentation } from '@shared/localization/presentation';
import { reportWords } from './reports.localization';
import { formatRecordStatus } from '@shared/ui/display';

export function ReportSections({ sections, presentation }: { sections: ReportSection[]; presentation?: Presentation }) {
  const words = reportWords(presentation?.language);
  return <Stack spacing={3}>{sections.map((section) => <Paper key={section.key} variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
    <Typography component="h2" variant="h2">{words.sections[section.key]}</Typography>
    {section.status === 'UNAVAILABLE' ? <Alert severity="info">Access to this report is unavailable for your role or subscription.</Alert> : <Stack spacing={1}>
      <Typography color="text.secondary">{section.data.basis}</Typography>
      <Typography variant="caption">{section.data.dateBasis === 'PERIOD' ? 'Selected period' : section.data.dateBasis === 'CURRENT' ? 'Current balances' : 'Closing balance'} · As of {presentation && section.data.asOf.includes('T') ? formatTimestamp(section.data.asOf, presentation) : section.data.asOf} · {presentation && section.data.asOf.includes('T') ? presentation.timezone : section.data.timezone}{section.data.scope === 'OWNED_OR_CREATED' ? ' · Your owned or created opportunities' : ''}</Typography>
      {section.data.metrics.length === 0 ? <EmptyState title="No report records" description="No matching source records." /> : <RecordTable rows={section.data.metrics} label={words.sections[section.key]} rowKey={(row) => `${row.key}:${row.currency}:${row.dimension}`} columns={[
        { key: 'measure', label: words.measure, sortValue: (row) => row.label, render: (row) => row.label },
        { key: 'group', label: words.group, sortValue: (row) => row.dimension, render: (row) => row.dimension ? section.key === 'pipeline' ? formatRecordStatus(row.dimension) : row.dimension : '—' },
        { key: 'currency', label: words.currency, sortValue: (row) => row.currency, render: (row) => row.currency ?? '—' },
        { key: 'value', label: words.value, align: 'right', sortValue: (row) => row.value, render: (row) => <>{presentation ? formatExactDecimal(row.value, presentation.locale) : row.value}{row.unit === 'PERCENT' ? '%' : ''}</> },
      ]} />}
    </Stack>}
  </Paper>)}</Stack>;
}
