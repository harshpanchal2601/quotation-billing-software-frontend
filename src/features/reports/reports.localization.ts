import type { Presentation } from '@shared/localization/presentation';
import { REPORT_SECTION_LABELS } from './reports.types';
export const reportWords = (language: Presentation['language'] = 'en') => ({
  en: { title: 'Business reports', measure: 'Measure', group: 'Group', currency: 'Currency', value: 'Value', sections: REPORT_SECTION_LABELS },
  hi: { title: 'व्यावसायिक रिपोर्ट', measure: 'माप', group: 'समूह', currency: 'मुद्रा', value: 'मूल्य', sections: { quotations: 'कोटेशन रूपांतरण', sales: 'चालान बिक्री', receivables: 'बकाया और ग्राहक क्रेडिट', pipeline: 'बिक्री के अवसर', stock: 'स्टॉक मूल्यांकन', purchaseOrders: 'खरीद प्रतिबद्धताएँ', supplierBills: 'आपूर्तिकर्ता बिल', expenses: 'व्यय' } },
  gu: { title: 'વ્યવસાયિક અહેવાલો', measure: 'માપ', group: 'જૂથ', currency: 'ચલણ', value: 'મૂલ્ય', sections: { quotations: 'ક્વોટેશન રૂપાંતર', sales: 'ઇનવોઇસ વેચાણ', receivables: 'બાકી રકમ અને ગ્રાહક ક્રેડિટ', pipeline: 'વેચાણની તકો', stock: 'સ્ટોક મૂલ્યાંકન', purchaseOrders: 'ખરીદી પ્રતિબદ્ધતાઓ', supplierBills: 'સપ્લાયર બિલ', expenses: 'ખર્ચ' } },
}[language]);
