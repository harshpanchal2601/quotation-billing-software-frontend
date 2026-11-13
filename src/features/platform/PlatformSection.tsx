import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import type { FormSectionProps } from '@shared/forms';
import { DetailSection } from '@shared/ui/layout';

export function PlatformSection(props: FormSectionProps) {
  return <DetailSection {...props} />;
}

export function PlatformFormGrid({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2, alignItems: 'start', '& .MuiTextField-root': { width: '100%' } }}>
      {children}
    </Box>
  );
}
