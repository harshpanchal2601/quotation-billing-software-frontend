import { paths } from '@shared/routing/paths';
import type { AuthUser } from './auth.types';
import { PERMISSIONS } from './permissions';

const landingCandidates = [
  [PERMISSIONS.DASHBOARD_VIEW, paths.dashboard],
  [PERMISSIONS.QUOTATIONS_VIEW, paths.quotations],
  [PERMISSIONS.COMPANIES_VIEW, paths.companies],
  [PERMISSIONS.ITEMS_VIEW, paths.items],
  [PERMISSIONS.CATALOG_VIEW, paths.categories],
  [PERMISSIONS.FIRM_PROFILE_MANAGE, paths.businessSettings],
  [PERMISSIONS.USERS_MANAGE, paths.firmUsers],
  [PERMISSIONS.ROLES_MANAGE, paths.firmRoles],
  [PERMISSIONS.AUDIT_VIEW, paths.auditLogs],
] as const;

export function getDefaultAuthenticatedPath(user: Pick<AuthUser, 'accountType' | 'permissions'>) {
  if (user.accountType === 'SUPER_ADMIN') return paths.platformFirms;
  return landingCandidates.find(([permission]) => user.permissions.includes(permission))?.[1] ?? paths.accessDenied;
}
