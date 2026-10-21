import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import { AppIconButton } from '@shared/ui/actions';

type DashboardMetricCardProps = {
  title: string;
  value: string | number;
  caption: string;
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  linkTo?: string;
};

export function DashboardMetricCard({
  title,
  value,
  caption,
  icon,
  iconBgColor = 'primary.light',
  iconColor = 'primary.main',
  linkTo,
}: DashboardMetricCardProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography color="text.secondary" variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
          <Box
            sx={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 2,
              bgcolor: iconBgColor,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography component="p" fontWeight={700} sx={{ fontSize: { xs: 26, sm: 28 }, lineHeight: 1.3, mb: 0.5, overflowWrap: 'anywhere' }}>
          {value}
        </Typography>

        <Box sx={{ mt: 'auto', display: 'flex', gap: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>

          {linkTo ? (
            <AppIconButton
              component={RouterLink}
              to={linkTo}
              size="small"
              color="primary"
              label={`View ${title}`}
            >
              <ArrowForwardIcon fontSize="small" />
            </AppIconButton>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
