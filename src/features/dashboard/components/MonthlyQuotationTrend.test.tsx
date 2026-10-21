import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MonthlyQuotationTrend } from './MonthlyQuotationTrend';

describe('MonthlyQuotationTrend', () => {
  it('lets keyboard users switch between the chart and its data table', async () => {
    const user = userEvent.setup();
    render(<MonthlyQuotationTrend monthlyTrend={[{
      month: '2026-04',
      label: 'Apr 2026',
      quotationCount: 2,
      totalQuotationValue: '1200',
      acceptedQuotationCount: 1,
      acceptedQuotationValue: '600',
    }]} />);

    const toggle = screen.getByRole('button', { name: 'Toggle trend view' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Apr 2026' })).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard(' ');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});
