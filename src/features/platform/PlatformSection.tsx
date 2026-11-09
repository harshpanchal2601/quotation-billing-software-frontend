import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { FormSection, type FormSectionProps } from '@shared/forms';

export function PlatformSection({ sx, ...props }: FormSectionProps) {
  return (
    <FormSection
      {...props}
      sx={[
        { p: { xs: 2, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', minWidth: 0 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}

export function PlatformFormGrid({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2, alignItems: 'start', '& .MuiTextField-root': { width: '100%' } }}>
      {children}
    </Box>
  );
}
