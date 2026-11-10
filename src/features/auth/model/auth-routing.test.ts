import { describe, expect, it } from 'vitest';
import { getDefaultAuthenticatedPath } from './auth-routing';
import { PERMISSIONS } from './permissions';
import { paths } from '@shared/routing/paths';

describe('Wave 10 landing routes', () => {
  it('provides landing pages for staff granted only reporting or manufacturing access', () => {
    expect(getDefaultAuthenticatedPath({ accountType: 'FIRM_USER', permissions: [PERMISSIONS.REPORTS_VIEW] })).toBe(paths.reports);
    expect(getDefaultAuthenticatedPath({ accountType: 'FIRM_USER', permissions: [PERMISSIONS.MANUFACTURING_VIEW, PERMISSIONS.INVENTORY_VIEW] })).toBe(paths.manufacturing);
  });
  it('preserves existing landing priorities and platform scope', () => {
    expect(getDefaultAuthenticatedPath({ accountType: 'FIRM_USER', permissions: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.REPORTS_VIEW] })).toBe(paths.dashboard);
    expect(getDefaultAuthenticatedPath({ accountType: 'SUPER_ADMIN', permissions: [PERMISSIONS.REPORTS_VIEW] })).toBe(paths.platformFirms);
  });
  it('provides reachable workspaces for import and integration-only staff grants', () => {
    expect(getDefaultAuthenticatedPath({ accountType: 'FIRM_USER', permissions: [PERMISSIONS.IMPORTS_MANAGE] })).toBe(paths.imports);
    expect(getDefaultAuthenticatedPath({ accountType: 'FIRM_USER', permissions: [PERMISSIONS.API_KEYS_MANAGE] })).toBe(paths.connections);
    expect(getDefaultAuthenticatedPath({ accountType: 'FIRM_USER', permissions: [PERMISSIONS.WEBHOOKS_MANAGE] })).toBe(paths.connections);
  });
});
