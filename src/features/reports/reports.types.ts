export const REPORT_SECTION_LABELS = {
  quotations: 'Quotation conversion', sales: 'Invoice sales', receivables: 'Outstanding & customer credit',
  pipeline: 'Sales pipeline', stock: 'Stock valuation', purchaseOrders: 'Purchase commitments', supplierBills: 'Supplier bills', expenses: 'Expenses',
} as const;
export type ReportSectionKey = keyof typeof REPORT_SECTION_LABELS;
export type ReportFilters = { dateFrom: string; dateTo: string; currency?: string; sections: ReportSectionKey[]; locale?: import('@shared/localization/presentation').Presentation['locale']; language?: 'en' | 'hi' | 'gu'; timezone?: string };
export type ReportMetric = { key: string; label: string; currency: string | null; dimension: string | null; value: string; unit: 'MONEY' | 'COUNT' | 'PERCENT' | 'VALUATION' };
export type ReportSection = { key: ReportSectionKey } & (
  | { status: 'UNAVAILABLE' }
  | { status: 'AVAILABLE'; data: { source: string; basis: string; dateBasis: 'PERIOD' | 'CURRENT' | 'CLOSING'; asOf: string; timezone: string; scope: 'FIRM' | 'OWNED_OR_CREATED'; metrics: ReportMetric[] } }
);
export type ReportOverview = { schemaVersion: 1; firmId: number; generatedAt: string; dateFrom: string; dateTo: string; currency: string | null; currencyPolicy: 'SEGMENTED_NO_CONVERSION'; sections: ReportSection[]; localizationSnapshot?: import('@shared/localization/presentation').Presentation };
export type SavedReportView = { id: string; name: string; version: number; filters: ReportFilters; createdAt: string; updatedAt: string };
export type SavedReportPage = { views: SavedReportView[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
