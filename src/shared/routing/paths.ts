export const paths = {
  login: '/login',
  dashboard: '/dashboard',
  changePassword: '/change-password',
  quotations: '/quotations',
  newQuotation: '/quotations/new',
  companies: '/companies',
  newCompany: '/companies/new',
  items: '/items',
  categories: '/categories',
  measurementUnits: '/measurement-units',
  businessSettings: '/settings/business',
  quotationSettings: '/settings/quotation',
  bankDetails: '/settings/bank-details',
  auditLogs: '/audit-logs',
} as const;

export type AppRoutePath = (typeof paths)[keyof typeof paths];
