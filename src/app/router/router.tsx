import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { App } from '../App';
import { ChangePasswordPage } from '@features/auth';
import { LoginPage } from '@features/auth';
import { DashboardPage } from '@features/dashboard';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';

import { AppLayout } from '../layout/AppLayout';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { PublicOnlyRoute } from './guards/PublicOnlyRoute';
import { ModulePlaceholderPage } from './pages/ModulePlaceholderPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { navigationItems, paths } from './routeConfig';

const BusinessSettingsPage = lazy(() =>
  import('@features/settings/pages/BusinessSettingsPage').then((module) => ({ default: module.BusinessSettingsPage })),
);
const QuotationSettingsPage = lazy(() =>
  import('@features/settings/pages/QuotationSettingsPage').then((module) => ({ default: module.QuotationSettingsPage })),
);
const BankDetailsPage = lazy(() =>
  import('@features/settings/pages/BankDetailsPage').then((module) => ({ default: module.BankDetailsPage })),
);
const CompaniesPage = lazy(() =>
  import('@features/companies/pages/CompaniesPage').then((module) => ({ default: module.CompaniesPage })),
);
const CreateCompanyPage = lazy(() =>
  import('@features/companies/pages/CreateCompanyPage').then((module) => ({ default: module.CreateCompanyPage })),
);
const CompanyDetailsPage = lazy(() =>
  import('@features/companies/pages/CompanyDetailsPage').then((module) => ({ default: module.CompanyDetailsPage })),
);
const EditCompanyPage = lazy(() =>
  import('@features/companies/pages/EditCompanyPage').then((module) => ({ default: module.EditCompanyPage })),
);
const CategoriesPage = lazy(() =>
  import('@features/categories').then((module) => ({ default: module.CategoriesPage })),
);
const MeasurementUnitsPage = lazy(() =>
  import('@features/measurement-units').then((module) => ({ default: module.MeasurementUnitsPage })),
);
const ItemsPage = lazy(() =>
  import('@features/items/pages/ItemsPage').then((module) => ({ default: module.ItemsPage })),
);
const CreateItemPage = lazy(() =>
  import('@features/items/pages/CreateItemPage').then((module) => ({ default: module.CreateItemPage })),
);
const ItemDetailsPage = lazy(() =>
  import('@features/items/pages/ItemDetailsPage').then((module) => ({ default: module.ItemDetailsPage })),
);
const EditItemPage = lazy(() =>
  import('@features/items/pages/EditItemPage').then((module) => ({ default: module.EditItemPage })),
);
const QuotationsPage = lazy(() =>
  import('@features/quotations/pages/QuotationsPage').then((module) => ({ default: module.QuotationsPage })),
);
const CreateQuotationPage = lazy(() =>
  import('@features/quotations/pages/CreateQuotationPage').then((module) => ({ default: module.CreateQuotationPage })),
);
const QuotationDetailsPage = lazy(() =>
  import('@features/quotations/pages/QuotationDetailsPage').then((module) => ({ default: module.QuotationDetailsPage })),
);
const EditQuotationPage = lazy(() =>
  import('@features/quotations/pages/EditQuotationPage').then((module) => ({ default: module.EditQuotationPage })),
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
              { path: paths.dashboard, element: <DashboardPage /> },
              { path: paths.changePassword, element: <ChangePasswordPage /> },
              { path: paths.businessSettings, element: lazyPage(<BusinessSettingsPage />) },
              { path: paths.quotationSettings, element: lazyPage(<QuotationSettingsPage />) },
              { path: paths.bankDetails, element: lazyPage(<BankDetailsPage />) },
              { path: paths.companies, element: lazyPage(<CompaniesPage />) },
              { path: paths.newCompany, element: lazyPage(<CreateCompanyPage />) },
              { path: `${paths.companies}/:id`, element: lazyPage(<CompanyDetailsPage />) },
              { path: `${paths.companies}/:id/edit`, element: lazyPage(<EditCompanyPage />) },
              { path: paths.items, element: lazyPage(<ItemsPage />) },
              { path: `${paths.items}/new`, element: lazyPage(<CreateItemPage />) },
              { path: `${paths.items}/:id`, element: lazyPage(<ItemDetailsPage />) },
              { path: `${paths.items}/:id/edit`, element: lazyPage(<EditItemPage />) },
              { path: paths.categories, element: lazyPage(<CategoriesPage />) },
              { path: paths.measurementUnits, element: lazyPage(<MeasurementUnitsPage />) },
              { path: paths.quotations, element: lazyPage(<QuotationsPage />) },
              { path: paths.newQuotation, element: lazyPage(<CreateQuotationPage />) },
              { path: `${paths.quotations}/:id`, element: lazyPage(<QuotationDetailsPage />) },
              { path: `${paths.quotations}/:id/edit`, element: lazyPage(<EditQuotationPage />) },
              ...navigationItems
                .filter((item) => item.placeholder)
                .map((item) => ({ path: item.path, element: <ModulePlaceholderPage /> })),
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
