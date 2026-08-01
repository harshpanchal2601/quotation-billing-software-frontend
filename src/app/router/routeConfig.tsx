import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import RulerOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

import { paths, type AppRoutePath } from '@shared/routing/paths';

export { paths };
export type { AppRoutePath };

export type NavigationItem = {
  title: string;
  path: AppRoutePath;
  icon: SvgIconComponent;
  section: 'Main' | 'Quotation Management' | 'Master Management' | 'Configuration' | 'System';
  placeholder?: boolean;
};

export const navigationItems: NavigationItem[] = [
  { title: 'Dashboard', path: paths.dashboard, icon: DashboardOutlinedIcon, section: 'Main' },
  { title: 'Quotations', path: paths.quotations, icon: DescriptionOutlinedIcon, section: 'Quotation Management' },
  { title: 'Create Quotation', path: paths.newQuotation, icon: NoteAddOutlinedIcon, section: 'Quotation Management' },
  { title: 'Companies', path: paths.companies, icon: BusinessOutlinedIcon, section: 'Master Management' },
  { title: 'Items', path: paths.items, icon: Inventory2OutlinedIcon, section: 'Master Management' },
  { title: 'Categories', path: paths.categories, icon: CategoryOutlinedIcon, section: 'Master Management' },
  { title: 'Measurement Units', path: paths.measurementUnits, icon: RulerOutlinedIcon, section: 'Master Management' },
  { title: 'Business Settings', path: paths.businessSettings, icon: SettingsOutlinedIcon, section: 'Configuration' },
  { title: 'Quotation Settings', path: paths.quotationSettings, icon: TuneOutlinedIcon, section: 'Configuration' },
  { title: 'Bank Details', path: paths.bankDetails, icon: AccountBalanceOutlinedIcon, section: 'Configuration' },
  { title: 'Audit Logs', path: paths.auditLogs, icon: AssessmentOutlinedIcon, section: 'System', placeholder: true },
];

export function getRouteTitle(pathname: string) {
  if (pathname === paths.changePassword) return 'Change Password';
  if (pathname === paths.newCompany) return 'Add Company';
  if (/^\/companies\/\d+\/edit$/.test(pathname)) return 'Edit Company';
  if (/^\/companies\/\d+$/.test(pathname)) return 'Company Details';
  if (pathname === `${paths.items}/new`) return 'Add Item';
  if (/^\/items\/\d+\/edit$/.test(pathname)) return 'Edit Item';
  if (/^\/items\/\d+$/.test(pathname)) return 'Item Details';
  if (pathname === paths.newQuotation) return 'Create Quotation';
  if (/^\/quotations\/\d+\/edit$/.test(pathname)) return 'Edit Quotation';
  if (/^\/quotations\/\d+$/.test(pathname)) return 'Quotation Details';
  return navigationItems.find((item) => item.path === pathname)?.title ?? 'Page not found';
}
