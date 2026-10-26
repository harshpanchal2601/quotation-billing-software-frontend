import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import type { EffectiveAccess } from '@shared/tenancy/entitlements';

export function EffectiveAccessPanel({ access }: { access: EffectiveAccess }) {
  return <Stack spacing={2}>
    <Typography variant="h6">{access.subscription?.planName ?? 'Legacy compatible'} · {access.subscription?.status ?? 'ACTIVE'}{access.subscription ? ` · revision ${access.subscription.revision}` : ''}</Typography>
    <Typography color="text.secondary">Access checked {new Date(access.evaluatedAt).toLocaleString()}. Published revisions remain attached until an explicit assignment takes effect.</Typography>
    <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Resource</TableCell><TableCell>Used</TableCell><TableCell>Limit</TableCell><TableCell>Remaining</TableCell></TableRow></TableHead><TableBody>
      {access.quotas.map((quota) => <TableRow key={quota.resource}><TableCell>{quota.resource === 'storageBytes' ? 'Managed storage bytes' : quota.resource}</TableCell><TableCell>{quota.ready ? quota.used : 'Reconciliation pending'}</TableCell><TableCell>{quota.limit ?? 'Unlimited'}</TableCell><TableCell>{quota.ready ? quota.remaining ?? 'Unlimited' : 'Unknown'}</TableCell></TableRow>)}
    </TableBody></Table></TableContainer>
    {access.quotas.some((quota) => !quota.ready) ? <Alert severity="info">An administrator must reconcile legacy storage before applying a finite storage limit.</Alert> : null}
    <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Feature</TableCell><TableCell>Available to firm</TableCell><TableCell>Your access</TableCell><TableCell>Explanation</TableCell></TableRow></TableHead><TableBody>
      {access.features.map((feature) => <TableRow key={feature.key}><TableCell>{feature.description}</TableCell><TableCell>{feature.available ? 'Allowed' : 'Denied'}</TableCell><TableCell>{feature.allowed ? 'Allowed' : 'Denied'}</TableCell><TableCell>{feature.reason}</TableCell></TableRow>)}
    </TableBody></Table></TableContainer>
  </Stack>;
}
