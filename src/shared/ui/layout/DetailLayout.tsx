import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Children, useId, useState, type ReactNode } from 'react';
import { AppButton } from '@shared/ui/actions';
import { FormSection, type FormSectionProps } from '@shared/forms/FormSection';

export function DetailSection({ children, actions, ...props }: FormSectionProps) {
  return <Paper variant="outlined" sx={{ p: 2, minWidth: 0, borderRadius: 2 }}>
    <FormSection actions={actions ? <Box sx={{ display: 'flex', flexShrink: 0, maxWidth: '100%', alignSelf: { xs: 'flex-start', sm: 'center' }, alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0 }}>{actions}</Box> : undefined} titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: 'primary.main' }} descriptionTypographyProps={{ variant: 'body2' }} {...props}>{children}</FormSection>
  </Paper>;
}

export function DetailActions({ label, children }: { label: string; children: ReactNode }) {
  if (Children.toArray(children).length === 0) return null;
  return <Box role="group" aria-label={label} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, minWidth: 0, '& > .MuiButton-root': { flex: { xs: '1 1 150px', md: '0 0 auto' } } }}>{children}</Box>;
}

export function DetailHeader({ title, description, status, backAction, actions, actionLabel = 'Record actions' }: { title: ReactNode; description?: ReactNode; status?: ReactNode; backAction?: ReactNode; actions?: ReactNode; actionLabel?: string }) {
  return <Stack spacing={2}>
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
      {backAction}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography component="h1" variant="h1" sx={{ overflowWrap: 'anywhere', minWidth: 0 }}>{title}</Typography>
          {status}
        </Box>
        {description ? <Typography variant="caption" color="text.secondary">{description}</Typography> : null}
      </Box>
    </Box>
    {actions ? <DetailActions label={actionLabel}>{actions}</DetailActions> : null}
  </Stack>;
}

export function DetailFields({ fields, columns = 2 }: { fields: Array<{ label: string; value: ReactNode }>; columns?: 1 | 2 | 3 }) {
  return <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: columns === 1 ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))', lg: `repeat(${columns}, minmax(0, 1fr))` }, gap: 1.5, m: 0 }}>
    {fields.map(({ label, value }) => <Box key={label} sx={{ minWidth: 0 }}>
      <Typography component="dt" variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{label}</Typography>
      <DetailValue label={label} value={value} />
    </Box>)}
  </Box>;
}

function DetailValue({ label, value }: { label: string; value: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const longText = typeof value === 'string' && (value.length > 600 || value.split(/\r?\n/).length > 6);
  return <Typography component="dd" variant="body2" fontWeight={600} sx={{ m: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
    {longText ? <><Box component="span" id={contentId} sx={expanded ? { display: 'block' } : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 6, overflow: 'hidden' }}>{value}</Box><AppButton size="small" aria-expanded={expanded} aria-controls={contentId} aria-label={`${expanded ? 'Show less' : 'Show full'} ${label.toLowerCase()}`} onClick={() => setExpanded((current) => !current)} sx={{ mt: 0.5, p: 0, minWidth: 0 }}>{expanded ? 'Show less' : 'Show full text'}</AppButton></> : value ?? '—'}
  </Typography>;
}

export function AmountSummary({ rows }: { rows: Array<{ label: string; value: ReactNode; emphasis?: boolean }> }) {
  return <Box component="dl" sx={{ m: 0 }}>
    {rows.map(({ label, value, emphasis }) => <Stack key={label} direction="row" spacing={2} justifyContent="space-between" alignItems="baseline" sx={{ py: emphasis ? 1.5 : 0.75, ...(emphasis ? { borderTop: 1, borderColor: 'divider', mt: 1 } : {}) }}>
      <Typography component="dt" variant={emphasis ? 'h6' : 'body2'} color={emphasis ? 'primary.main' : 'text.secondary'} fontWeight={emphasis ? 700 : 400}>{label}</Typography>
      <Typography component="dd" variant={emphasis ? 'h6' : 'body2'} color={emphasis ? 'primary.main' : 'text.primary'} fontWeight={emphasis ? 700 : 400} sx={{ m: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere', minWidth: 0 }}>{value}</Typography>
    </Stack>)}
  </Box>;
}
