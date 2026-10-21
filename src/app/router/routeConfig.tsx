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
import CorporateFareOutlinedIcon from '@mui/icons-material/CorporateFareOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import type { SvgIconComponent } from '@mui/icons-material';

import { paths, type AppRoutePath } from '@shared/routing/paths';
import { PERMISSIONS, type AccountType, type Permission } from '@features/auth';

export { paths };
export type { AppRoutePath };

export type NavigationItem = {
  title: string;
  path: AppRoutePath;
  icon: SvgIconComponent;
  section: 'Platform' | 'Main' | 'Quotation Management' | 'Master Management' | 'Configuration' | 'System';
  permissions?: Permission[];
  accountTypes?: AccountType[];
  tenantScoped?: boolean;
};

export const navigationItems: NavigationItem[] = [
  { title: 'Firms', path: paths.platformFirms, icon: CorporateFareOutlinedIcon, section: 'Platform', accountTypes: ['SUPER_ADMIN'], tenantScoped: false },
  { title: 'Dashboard', path: paths.dashboard, icon: DashboardOutlinedIcon, section: 'Main', permissions: [PERMISSIONS.DASHBOARD_VIEW] },
  { title: 'Quotations', path: paths.quotations, icon: DescriptionOutlinedIcon, section: 'Quotation Management', permissions: [PERMISSIONS.QUOTATIONS_VIEW] },
  { title: 'Create Quotation', path: paths.newQuotation, icon: NoteAddOutlinedIcon, section: 'Quotation Management', permissions: [PERMISSIONS.QUOTATIONS_CREATE] },
  { title: 'Companies', path: paths.companies, icon: BusinessOutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.COMPANIES_VIEW] },
  { title: 'Items', path: paths.items, icon: Inventory2OutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.ITEMS_VIEW] },
  { title: 'Categories', path: paths.categories, icon: CategoryOutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.CATALOG_VIEW] },
  { title: 'Measurement Units', path: paths.measurementUnits, icon: RulerOutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.CATALOG_VIEW] },
  { title: 'Business Settings', path: paths.businessSettings, icon: SettingsOutlinedIcon, section: 'Configuration', permissions: [PERMISSIONS.FIRM_PROFILE_MANAGE] },
  { title: 'Quotation Settings', path: paths.quotationSettings, icon: TuneOutlinedIcon, section: 'Configuration', permissions: [PERMISSIONS.QUOTATION_SETTINGS_MANAGE] },
  { title: 'Bank Details', path: paths.bankDetails, icon: AccountBalanceOutlinedIcon, section: 'Configuration', permissions: [PERMISSIONS.BANK_DETAILS_MANAGE] },
  { title: 'Users', path: paths.firmUsers, icon: GroupOutlinedIcon, section: 'System', permissions: [PERMISSIONS.USERS_MANAGE] },
  { title: 'Roles & Access', path: paths.firmRoles, icon: AdminPanelSettingsOutlinedIcon, section: 'System', permissions: [PERMISSIONS.ROLES_MANAGE] },
  { title: 'Audit Logs', path: paths.auditLogs, icon: AssessmentOutlinedIcon, section: 'System', permissions: [PERMISSIONS.AUDIT_VIEW] },
];

export function canAccessNavigationItem(
  item: NavigationItem,
  user: { accountType: AccountType; permissions: Permission[] },
  hasSelectedFirm: boolean,
) {
  if (item.accountTypes !== undefined && !item.accountTypes.includes(user.accountType)) return false;
  if (item.tenantScoped !== false && user.accountType === 'SUPER_ADMIN' && !hasSelectedFirm) return false;
  return item.permissions === undefined || item.permissions.some((permission) => user.permissions.includes(permission));
}

export function getRouteTitle(pathname: string) {
  if (pathname === paths.accessDenied) return 'Access Denied';
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
