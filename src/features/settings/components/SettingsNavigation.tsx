import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { paths } from '../../../routes/routeConfig';

const settingsTabs = [
  { label: 'Business Profile', path: paths.businessSettings, icon: BusinessOutlinedIcon },
  { label: 'Quotation Settings', path: paths.quotationSettings, icon: TuneOutlinedIcon },
  { label: 'Bank Details', path: paths.bankDetails, icon: AccountBalanceOutlinedIcon },
] as const;

export function SettingsNavigation() {
  const location = useLocation();
  const activeValue = settingsTabs.some((tab) => tab.path === location.pathname)
    ? location.pathname
    : paths.businessSettings;

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}>
      <Tabs value={activeValue} variant="scrollable" scrollButtons="auto" aria-label="Settings sections">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Tab
              key={tab.path}
              component={RouterLink}
              to={tab.path}
              value={tab.path}
              icon={<Icon fontSize="small" />}
              iconPosition="start"
              label={tab.label}
              sx={{ minHeight: 48, textTransform: 'none' }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
}

