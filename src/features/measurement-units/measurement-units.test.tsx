import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { measurementUnitFormSchema } from './measurement-units.schema';
import type { MeasurementUnitListItem } from './measurement-units.types';
import { MeasurementUnitsPage } from './pages/MeasurementUnitsPage';

const unitsApi = vi.hoisted(() => ({
  listMeasurementUnitsRequest: vi.fn(),
  getMeasurementUnitOptionsRequest: vi.fn(),
  getMeasurementUnitRequest: vi.fn(),
  createMeasurementUnitRequest: vi.fn(),
  updateMeasurementUnitRequest: vi.fn(),
  updateMeasurementUnitStatusRequest: vi.fn(),
  deleteMeasurementUnitRequest: vi.fn(),
}));

vi.mock('./api/measurement-units.api', () => unitsApi);

afterEach(() => {
  vi.clearAllMocks();
});

describe('measurement unit frontend', () => {
  it('validates measurement unit symbol length against the backend contract', () => {
    const fiftyCharacterSymbol = 'A'.repeat(50);

    expect(measurementUnitFormSchema.parse({
      name: 'Long Symbol Unit',
      symbol: fiftyCharacterSymbol,
      allowDecimal: true,
      isActive: true,
    }).symbol).toBe(fiftyCharacterSymbol);

    expect(measurementUnitFormSchema.safeParse({
      name: 'Too Long Symbol Unit',
      symbol: 'A'.repeat(51),
      allowDecimal: true,
      isActive: true,
    }).success).toBe(false);
  });

  it('renders measurement unit list and preserves exact symbol string casing', async () => {
    unitsApi.listMeasurementUnitsRequest.mockResolvedValue({
      measurementUnits: [unitListItem({ name: 'Square Meter', symbol: 'm²' })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderPage(<MeasurementUnitsPage />, '/measurement-units?allowDecimal=true');

    expect(await screen.findByText('Square Meter')).toBeInTheDocument();
    expect(screen.getByText('m²')).toBeInTheDocument();
    expect(unitsApi.listMeasurementUnitsRequest).toHaveBeenCalledWith(
      expect.objectContaining({ allowDecimal: true }),
    );
  });

  it('creates measurement unit with symbol submitted as string', async () => {
    unitsApi.createMeasurementUnitRequest.mockResolvedValue(unitListItem());

    renderPage(<MeasurementUnitsPage />, '/measurement-units');

    await userEvent.click(screen.getByRole('button', { name: /add measurement unit/i }));
    await userEvent.type(screen.getByLabelText(/unit name/i), 'Kilogram');
    await userEvent.type(screen.getByLabelText(/symbol/i), 'kg');
    await userEvent.click(screen.getByRole('button', { name: /create measurement unit/i }));

    await waitFor(() => expect(unitsApi.createMeasurementUnitRequest).toHaveBeenCalled());
    const payload = unitsApi.createMeasurementUnitRequest.mock.calls[0][0];
    expect(payload).toEqual({
      name: 'Kilogram',
      symbol: 'kg',
      allowDecimal: true,
      isActive: true,
    });
  });

  it('displays duplicate unit conflict error safely from server response', async () => {
    unitsApi.createMeasurementUnitRequest.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { success: false, message: 'Measurement unit name or symbol already exists' },
      },
    });

    renderPage(<MeasurementUnitsPage />, '/measurement-units');

    await userEvent.click(screen.getByRole('button', { name: /add measurement unit/i }));
    await userEvent.type(screen.getByLabelText(/unit name/i), 'Kilogram');
    await userEvent.type(screen.getByLabelText(/symbol/i), 'kg');
    await userEvent.click(screen.getByRole('button', { name: /create measurement unit/i }));

    expect(await screen.findByText('Measurement unit name or symbol already exists')).toBeInTheDocument();
  });

  it('toggles measurement unit status on confirmation', async () => {
    unitsApi.listMeasurementUnitsRequest.mockResolvedValue({
      measurementUnits: [unitListItem({ isActive: true })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
    unitsApi.updateMeasurementUnitStatusRequest.mockResolvedValue(unitListItem({ isActive: false }));

    renderPage(<MeasurementUnitsPage />, '/measurement-units');

    expect(await screen.findByText('Kilogram')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /actions for kilogram/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /deactivate/i }));

    await userEvent.click(screen.getByRole('button', { name: /^deactivate$/i }));

    await waitFor(() => expect(unitsApi.updateMeasurementUnitStatusRequest).toHaveBeenCalledWith(1, false));
  });
});

function renderPage(ui: ReactElement, route: string) {
  return renderWithProviders(ui, { route });
}

function unitListItem(overrides: Partial<MeasurementUnitListItem> = {}): MeasurementUnitListItem {
  return {
    id: 1,
    name: 'Kilogram',
    symbol: 'kg',
    allowDecimal: true,
    isActive: true,
    linkedItemCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
