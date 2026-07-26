import { QueryClient } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/render';
import type { ItemDetail, ItemListItem } from './items.types';
import { CreateItemPage } from './pages/CreateItemPage';
import { ItemDetailsPage } from './pages/ItemDetailsPage';
import { ItemsPage } from './pages/ItemsPage';

const itemsApi = vi.hoisted(() => ({
  listItemsRequest: vi.fn(),
  getItemOptionsRequest: vi.fn(),
  getItemRequest: vi.fn(),
  createItemRequest: vi.fn(),
  updateItemRequest: vi.fn(),
  updateItemStatusRequest: vi.fn(),
  deleteItemRequest: vi.fn(),
  uploadItemImageRequest: vi.fn(),
  deleteItemImageRequest: vi.fn(),
}));

const categoriesApi = vi.hoisted(() => ({
  getCategoryOptionsRequest: vi.fn(),
}));

const unitsApi = vi.hoisted(() => ({
  getMeasurementUnitOptionsRequest: vi.fn(),
}));

vi.mock('./api/items.api', () => itemsApi);
vi.mock('../categories/api/categories.api', () => categoriesApi);
vi.mock('../measurement-units/api/measurement-units.api', () => unitsApi);

afterEach(() => {
  vi.clearAllMocks();
});

describe('item management frontend', () => {
  it('renders item list data and passes URL search and filter params to the API', async () => {
    itemsApi.listItemsRequest.mockResolvedValue({
      items: [mockItemListItem()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
    categoriesApi.getCategoryOptionsRequest.mockResolvedValue([]);
    unitsApi.getMeasurementUnitOptionsRequest.mockResolvedValue([]);

    renderItem(<ItemsPage />, '/items?search=reactor&isActive=true&sort=name:asc');

    expect(await screen.findByText('Reactor Tank 500L')).toBeInTheDocument();
    expect(itemsApi.listItemsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'reactor',
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    );
  });

  it('shows an intentional fallback when a list item image fails to load', async () => {
    itemsApi.listItemsRequest.mockResolvedValue({
      items: [mockItemListItem({ imageUrl: '/storage/items/missing.png' })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
    categoriesApi.getCategoryOptionsRequest.mockResolvedValue([]);
    unitsApi.getMeasurementUnitOptionsRequest.mockResolvedValue([]);

    renderItem(<ItemsPage />, '/items');

    const image = await screen.findByAltText('Reactor Tank 500L');
    fireEvent.error(image);

    expect(await screen.findByRole('img', { name: /no image/i })).toBeInTheDocument();
  });

  it('creates item without submitting read-only itemCode, imagePath or sourceType fields', async () => {
    categoriesApi.getCategoryOptionsRequest.mockResolvedValue([
      { id: 10, name: 'Vessels', slug: 'vessels' },
    ]);
    unitsApi.getMeasurementUnitOptionsRequest.mockResolvedValue([
      { id: 2, name: 'Pieces', symbol: 'PCS', allowDecimal: false },
    ]);
    itemsApi.createItemRequest.mockResolvedValue(mockItemDetail());

    renderItem(<CreateItemPage />, '/items/new');

    await screen.findByLabelText(/item name/i);
    await userEvent.type(screen.getByLabelText(/item name/i), 'Reactor Tank 500L');

    // Open measurement unit select and pick PCS option
    const unitSelect = screen.getByRole('combobox', { name: /measurement unit/i });
    await userEvent.click(unitSelect);
    const option = await screen.findByRole('option', { name: /PCS — Pieces/i });
    await userEvent.click(option);

    await userEvent.click(screen.getByRole('button', { name: /create item/i }));

    await waitFor(() => expect(itemsApi.createItemRequest).toHaveBeenCalled());
    const payload = itemsApi.createItemRequest.mock.calls[0][0];

    expect(payload.name).toBe('Reactor Tank 500L');
    expect(payload.measurementUnitId).toBe(2);
    expect(payload.defaultRate).toBe('0.00');
    expect(payload.gstRate).toBe('18.00');

    expect(payload).not.toHaveProperty('itemCode');
    expect(payload).not.toHaveProperty('imagePath');
    expect(payload).not.toHaveProperty('sourceType');
  });

  it('displays activation dependency conflict from backend response on item details page', async () => {
    itemsApi.getItemRequest.mockResolvedValue(mockItemDetail({ isActive: false }));
    itemsApi.updateItemStatusRequest.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          success: false,
          message: 'Cannot activate item because category "Vessels" is inactive.',
        },
      },
    });

    renderItemRoute(<ItemDetailsPage />, '/items/:id', '/items/1');

    expect(await screen.findByText('Reactor Tank 500L')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /activate/i }));

    const confirmBtn = screen.getByRole('button', { name: /^activate$/i });
    await userEvent.click(confirmBtn);

    expect(await screen.findByText(/cannot activate item because category/i)).toBeInTheDocument();
  });

  it('soft deletes item showing quotation usage count alert in confirmation dialog', async () => {
    itemsApi.getItemRequest.mockResolvedValue(mockItemDetail({ quotationUsageCount: 3 }));
    itemsApi.deleteItemRequest.mockResolvedValue(undefined);

    renderItemRoute(<ItemDetailsPage />, '/items/:id', '/items/1');

    expect(await screen.findByText('Reactor Tank 500L')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(screen.getByText(/referenced in 3 quotation line item/i)).toBeInTheDocument();

    const deleteConfirmBtn = screen.getByRole('button', { name: /delete item/i });
    await userEvent.click(deleteConfirmBtn);

    await waitFor(() => expect(itemsApi.deleteItemRequest).toHaveBeenCalledWith(1));
  });
});

function renderItem(ui: ReactElement, route: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderWithProviders(ui, { route, queryClient });
}

function renderItemRoute(ui: ReactElement, path: string, route: string) {
  return renderItem(<Routes><Route path={path} element={ui} /></Routes>, route);
}

function mockItemListItem(overrides: Partial<ItemListItem> = {}): ItemListItem {
  return {
    id: 1,
    itemCode: 'ITEM-000001',
    name: 'Reactor Tank 500L',
    shortDescription: 'Industrial stainless steel reactor tank',
    category: { id: 10, name: 'Vessels', slug: 'vessels', isActive: true },
    measurementUnit: { id: 2, name: 'Pieces', symbol: 'PCS', allowDecimal: false, isActive: true },
    defaultRate: '4500.00',
    hsnCode: '8419',
    gstRate: '18.00',
    imageUrl: '/storage/items/item-test.png',
    sourceType: 'MANUAL',
    isActive: true,
    quotationUsageCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockItemDetail(overrides: Partial<ItemDetail> = {}): ItemDetail {
  return {
    ...mockItemListItem(),
    detailedDescription: 'Full stainless steel 316 grade reactor tank for chemical processing.',
    specifications: [
      { label: 'Capacity', value: '500 Liters' },
      { label: 'Material', value: 'SS316' },
    ],
    sourceUrl: null,
    ...overrides,
  };
}
