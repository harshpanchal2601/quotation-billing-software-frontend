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
import { permitsEntitledPermission, type EffectiveAccess } from '@shared/tenancy/entitlements';

export { paths };
export type { AppRoutePath };

export type NavigationItem = {
  title: string;
  path: AppRoutePath;
  icon: SvgIconComponent;
  section: 'Platform' | 'Main' | 'Quotation Management' | 'Billing' | 'Master Management' | 'Configuration' | 'System';
  permissions?: Permission[];
  accountTypes?: AccountType[];
  tenantScoped?: boolean;
};

export const navigationItems: NavigationItem[] = [
  { title: 'Firms', path: paths.platformFirms, icon: CorporateFareOutlinedIcon, section: 'Platform', accountTypes: ['SUPER_ADMIN'], tenantScoped: false },
  { title: 'Plans & Features', path: paths.platformPlans, icon: TuneOutlinedIcon, section: 'Platform', accountTypes: ['SUPER_ADMIN'], tenantScoped: false },
  { title: 'Subscriptions', path: paths.platformSubscriptions, icon: BusinessOutlinedIcon, section: 'Platform', accountTypes: ['SUPER_ADMIN'], tenantScoped: false },
  { title: 'Subscription & Usage', path: paths.firmEntitlements, icon: AssessmentOutlinedIcon, section: 'System', accountTypes: ['FIRM_ADMIN', 'FIRM_USER'] },
  { title: 'Dashboard', path: paths.dashboard, icon: DashboardOutlinedIcon, section: 'Main', permissions: [PERMISSIONS.DASHBOARD_VIEW] },
  { title: 'Business Reports', path: paths.reports, icon: AssessmentOutlinedIcon, section: 'Main', permissions: [PERMISSIONS.REPORTS_VIEW] },
  { title: 'Import Center', path: paths.imports, icon: Inventory2OutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.IMPORTS_MANAGE] },
  { title: 'API & Webhooks', path: paths.connections, icon: SettingsOutlinedIcon, section: 'Configuration', permissions: [PERMISSIONS.API_KEYS_MANAGE, PERMISSIONS.WEBHOOKS_MANAGE, PERMISSIONS.FIRM_PROFILE_MANAGE] },
  { title: 'Manufacturing', path: paths.manufacturing, icon: Inventory2OutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.MANUFACTURING_VIEW] },
  { title: 'Business Assistant', path: paths.assistant, icon: AssessmentOutlinedIcon, section: 'Main', permissions: [PERMISSIONS.ASSISTANT_LOCAL, PERMISSIONS.ASSISTANT_LLM], accountTypes: ['FIRM_ADMIN', 'FIRM_USER'] },
  { title: 'Assistant Settings', path: paths.assistantSettings, icon: TuneOutlinedIcon, section: 'Configuration', permissions: [PERMISSIONS.ASSISTANT_SETTINGS_MANAGE], accountTypes: ['FIRM_ADMIN'] },
  { title: 'Quotations', path: paths.quotations, icon: DescriptionOutlinedIcon, section: 'Quotation Management', permissions: [PERMISSIONS.QUOTATIONS_VIEW] },
  { title: 'Create Quotation', path: paths.newQuotation, icon: NoteAddOutlinedIcon, section: 'Quotation Management', permissions: [PERMISSIONS.QUOTATIONS_CREATE] },
  { title: 'Invoices', path: paths.invoices, icon: DescriptionOutlinedIcon, section: 'Billing', permissions: [PERMISSIONS.INVOICES_VIEW] },
  { title: 'CRM & Follow-ups', path: paths.crm, icon: GroupOutlinedIcon, section: 'Quotation Management', permissions: [PERMISSIONS.CRM_VIEW] },
  { title: 'Inventory', path: paths.inventory, icon: Inventory2OutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.INVENTORY_VIEW] },
  { title: 'Purchasing & Expenses', path: paths.purchasing, icon: BusinessOutlinedIcon, section: 'Billing', permissions: [PERMISSIONS.PURCHASING_VIEW, PERMISSIONS.SUPPLIER_BILLS_VIEW, PERMISSIONS.EXPENSES_VIEW] },
  { title: 'Sales Orders', path: paths.salesOrders, icon: DescriptionOutlinedIcon, section: 'Quotation Management', permissions: [PERMISSIONS.SALES_ORDERS_VIEW] },
  { title: 'Customer Portal Access', path: paths.portalAccess, icon: GroupOutlinedIcon, section: 'Quotation Management', permissions: [PERMISSIONS.PORTAL_MANAGE] },
  { title: 'Customer Payments', path: paths.payments, icon: AccountBalanceOutlinedIcon, section: 'Billing', permissions: [PERMISSIONS.PAYMENTS_VIEW] },
  { title: 'Receivables & Ageing', path: paths.receivables, icon: AssessmentOutlinedIcon, section: 'Billing', permissions: [PERMISSIONS.PAYMENTS_VIEW] },
  { title: 'Recurring Drafts', path: paths.billingSchedules, icon: NoteAddOutlinedIcon, section: 'Billing', permissions: [PERMISSIONS.BILLING_RECURRING] },
  { title: 'Proformas', path: paths.proformas, icon: NoteAddOutlinedIcon, section: 'Billing', permissions: [PERMISSIONS.PROFORMAS_VIEW] },
  { title: 'Credit & Debit Notes', path: paths.billingAdjustments, icon: AssessmentOutlinedIcon, section: 'Billing', permissions: [PERMISSIONS.ADJUSTMENTS_VIEW] },
  { title: 'Billing Configuration', path: paths.billingSettings, icon: TuneOutlinedIcon, section: 'Configuration', permissions: [PERMISSIONS.BILLING_SETTINGS_MANAGE, PERMISSIONS.INVOICE_FIELDS_MANAGE] },
  { title: 'Companies', path: paths.companies, icon: BusinessOutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.COMPANIES_VIEW] },
  { title: 'Items', path: paths.items, icon: Inventory2OutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.ITEMS_VIEW] },
  { title: 'Categories', path: paths.categories, icon: CategoryOutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.CATALOG_VIEW] },
  { title: 'Measurement Units', path: paths.measurementUnits, icon: RulerOutlinedIcon, section: 'Master Management', permissions: [PERMISSIONS.CATALOG_VIEW] },
  { title: 'Business Settings', path: paths.businessSettings, icon: SettingsOutlinedIcon, section: 'Configuration', permissions: [PERMISSIONS.FIRM_PROFILE_MANAGE] },
  { title: 'Automation Settings', path: paths.automation, icon: TuneOutlinedIcon, section: 'Configuration', permissions: [PERMISSIONS.AUTOMATION_MANAGE], accountTypes: ['FIRM_ADMIN'] },
  { title: 'Approvals & Notifications', path: paths.approvals, icon: AssessmentOutlinedIcon, section: 'System', permissions: [PERMISSIONS.AUTOMATION_VIEW], accountTypes: ['FIRM_ADMIN', 'FIRM_USER'] },
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
  access?: EffectiveAccess,
) {
  if (item.accountTypes !== undefined && !item.accountTypes.includes(user.accountType)) return false;
  if (item.tenantScoped !== false && user.accountType === 'SUPER_ADMIN' && !hasSelectedFirm) return false;
  return item.permissions === undefined || permitsEntitledPermission(access, item.permissions.filter((permission) => user.permissions.includes(permission)));
}

export function getRouteTitle(pathname: string) {
  if (/^\/sales-orders\/\d+$/.test(pathname)) return 'Sales Order Details';
  if (pathname === paths.accessDenied) return 'Access Denied';
  if (pathname === paths.changePassword) return 'Change Password';
  if (pathname === paths.newCompany) return 'Add Company';
  if (/^\/companies\/\d+\/edit$/.test(pathname)) return 'Edit Company';
  if (/^\/companies\/\d+$/.test(pathname)) return 'Company Details';
  if (pathname === `${paths.items}/new`) return 'Add Item';
  if (/^\/items\/\d+\/edit$/.test(pathname)) return 'Edit Item';
  if (/^\/items\/\d+$/.test(pathname)) return 'Item Details';
  if (pathname === paths.newQuotation) return 'Create Quotation';
  if (/^\/(invoices|proformas)\/new$/.test(pathname)) return pathname.startsWith('/proformas') ? 'Create Proforma Draft' : 'Create Invoice Draft';
  if (/^\/(invoices|proformas|billing-adjustments)\/\d+\/fields$/.test(pathname)) return 'Review Invoice Fields';
  if (/^\/(invoices|proformas)\/\d+\/edit$/.test(pathname)) return 'Edit Draft';
  if (/^\/(invoices|proformas|billing-adjustments)\/\d+$/.test(pathname)) return 'Billing Document Details';
  if (/^\/payments\/\d+$/.test(pathname)) return 'Customer Receipt Details';
  if (/^\/quotations\/\d+\/edit$/.test(pathname)) return 'Edit Quotation';
  if (/^\/quotations\/\d+$/.test(pathname)) return 'Quotation Details';
  return navigationItems.find((item) => item.path === pathname)?.title ?? 'Page not found';
}
