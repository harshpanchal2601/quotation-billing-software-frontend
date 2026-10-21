import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { App } from '../App';
import { ChangePasswordPage, PERMISSIONS } from '@features/auth';
import { LoginPage } from '@features/auth';
import { DashboardPage } from '@features/dashboard';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';

import { AppLayout } from '../layout/AppLayout';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { PublicOnlyRoute } from './guards/PublicOnlyRoute';
import { AccessRoute } from './guards/AccessRoute';
import { NotFoundPage } from './pages/NotFoundPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { paths } from './routeConfig';

const BusinessSettingsPage = lazy(() =>
  import('@features/settings').then((module) => ({ default: module.BusinessSettingsPage })),
);
const QuotationSettingsPage = lazy(() =>
  import('@features/settings').then((module) => ({ default: module.QuotationSettingsPage })),
);
const BankDetailsPage = lazy(() =>
  import('@features/settings').then((module) => ({ default: module.BankDetailsPage })),
);
const CompaniesPage = lazy(() =>
  import('@features/companies').then((module) => ({ default: module.CompaniesPage })),
);
const CreateCompanyPage = lazy(() =>
  import('@features/companies').then((module) => ({ default: module.CreateCompanyPage })),
);
const CompanyDetailsPage = lazy(() =>
  import('@features/companies').then((module) => ({ default: module.CompanyDetailsPage })),
);
const EditCompanyPage = lazy(() =>
  import('@features/companies').then((module) => ({ default: module.EditCompanyPage })),
);
const CategoriesPage = lazy(() =>
  import('@features/categories').then((module) => ({ default: module.CategoriesPage })),
);
const MeasurementUnitsPage = lazy(() =>
  import('@features/measurement-units').then((module) => ({ default: module.MeasurementUnitsPage })),
);
const ItemsPage = lazy(() =>
  import('@features/items').then((module) => ({ default: module.ItemsPage })),
);
const CreateItemPage = lazy(() =>
  import('@features/items').then((module) => ({ default: module.CreateItemPage })),
);
const ItemDetailsPage = lazy(() =>
  import('@features/items').then((module) => ({ default: module.ItemDetailsPage })),
);
const EditItemPage = lazy(() =>
  import('@features/items').then((module) => ({ default: module.EditItemPage })),
);
const QuotationsPage = lazy(() =>
  import('@features/quotations').then((module) => ({ default: module.QuotationsPage })),
);
const CreateQuotationPage = lazy(() =>
  import('@features/quotations').then((module) => ({ default: module.CreateQuotationPage })),
);
const QuotationDetailsPage = lazy(() =>
  import('@features/quotations').then((module) => ({ default: module.QuotationDetailsPage })),
);
const EditQuotationPage = lazy(() =>
  import('@features/quotations').then((module) => ({ default: module.EditQuotationPage })),
);
const PlatformFirmsPage = lazy(() =>
  import('@features/platform').then((module) => ({ default: module.PlatformFirmsPage })),
);
const UsersPage = lazy(() =>
  import('@features/administration').then((module) => ({ default: module.UsersPage })),
);
const RolesPage = lazy(() =>
  import('@features/administration').then((module) => ({ default: module.RolesPage })),
);
const AuditLogsPage = lazy(() =>
  import('@features/audit-logs').then((module) => ({ default: module.AuditLogsPage })),
);

function lazyPage(element: React.ReactNode) {
  return <Suspense fallback={<FullPageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to={paths.dashboard} replace /> },
      {
        element: <PublicOnlyRoute />,
        children: [{ path: paths.login, element: <LoginPage /> }],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: paths.platformFirms, element: <AccessRoute accountTypes={['SUPER_ADMIN']} tenantScoped={false}>{lazyPage(<PlatformFirmsPage />)}</AccessRoute> },
              { path: paths.dashboard, element: <AccessRoute permissions={[PERMISSIONS.DASHBOARD_VIEW]}><DashboardPage /></AccessRoute> },
              { path: paths.changePassword, element: <ChangePasswordPage /> },
              { path: paths.accessDenied, element: <AccessDeniedPage /> },
              { path: paths.businessSettings, element: <AccessRoute permissions={[PERMISSIONS.FIRM_PROFILE_MANAGE]}>{lazyPage(<BusinessSettingsPage />)}</AccessRoute> },
              { path: paths.quotationSettings, element: <AccessRoute permissions={[PERMISSIONS.QUOTATION_SETTINGS_MANAGE]}>{lazyPage(<QuotationSettingsPage />)}</AccessRoute> },
              { path: paths.bankDetails, element: <AccessRoute permissions={[PERMISSIONS.BANK_DETAILS_MANAGE]}>{lazyPage(<BankDetailsPage />)}</AccessRoute> },
              { path: paths.companies, element: <AccessRoute permissions={[PERMISSIONS.COMPANIES_VIEW]}>{lazyPage(<CompaniesPage />)}</AccessRoute> },
              { path: paths.newCompany, element: <AccessRoute permissions={[PERMISSIONS.COMPANIES_MANAGE]}>{lazyPage(<CreateCompanyPage />)}</AccessRoute> },
              { path: `${paths.companies}/:id`, element: <AccessRoute permissions={[PERMISSIONS.COMPANIES_VIEW]}>{lazyPage(<CompanyDetailsPage />)}</AccessRoute> },
              { path: `${paths.companies}/:id/edit`, element: <AccessRoute permissions={[PERMISSIONS.COMPANIES_MANAGE]}>{lazyPage(<EditCompanyPage />)}</AccessRoute> },
              { path: paths.items, element: <AccessRoute permissions={[PERMISSIONS.ITEMS_VIEW]}>{lazyPage(<ItemsPage />)}</AccessRoute> },
              { path: `${paths.items}/new`, element: <AccessRoute permissions={[PERMISSIONS.ITEMS_MANAGE]}>{lazyPage(<CreateItemPage />)}</AccessRoute> },
              { path: `${paths.items}/:id`, element: <AccessRoute permissions={[PERMISSIONS.ITEMS_VIEW]}>{lazyPage(<ItemDetailsPage />)}</AccessRoute> },
              { path: `${paths.items}/:id/edit`, element: <AccessRoute permissions={[PERMISSIONS.ITEMS_MANAGE]}>{lazyPage(<EditItemPage />)}</AccessRoute> },
              { path: paths.categories, element: <AccessRoute permissions={[PERMISSIONS.CATALOG_VIEW]}>{lazyPage(<CategoriesPage />)}</AccessRoute> },
              { path: paths.measurementUnits, element: <AccessRoute permissions={[PERMISSIONS.CATALOG_VIEW]}>{lazyPage(<MeasurementUnitsPage />)}</AccessRoute> },
              { path: paths.quotations, element: <AccessRoute permissions={[PERMISSIONS.QUOTATIONS_VIEW]}>{lazyPage(<QuotationsPage />)}</AccessRoute> },
              { path: paths.newQuotation, element: <AccessRoute permissions={[PERMISSIONS.QUOTATIONS_CREATE]}>{lazyPage(<CreateQuotationPage />)}</AccessRoute> },
              { path: `${paths.quotations}/:id`, element: <AccessRoute permissions={[PERMISSIONS.QUOTATIONS_VIEW]}>{lazyPage(<QuotationDetailsPage />)}</AccessRoute> },
              { path: `${paths.quotations}/:id/edit`, element: <AccessRoute permissions={[PERMISSIONS.QUOTATIONS_EDIT]}>{lazyPage(<EditQuotationPage />)}</AccessRoute> },
              { path: paths.firmUsers, element: <AccessRoute permissions={[PERMISSIONS.USERS_MANAGE]}>{lazyPage(<UsersPage />)}</AccessRoute> },
              { path: paths.firmRoles, element: <AccessRoute permissions={[PERMISSIONS.ROLES_MANAGE]}>{lazyPage(<RolesPage />)}</AccessRoute> },
              { path: paths.auditLogs, element: <AccessRoute permissions={[PERMISSIONS.AUDIT_VIEW]}>{lazyPage(<AuditLogsPage />)}</AccessRoute> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
