import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../test/render';
import type { CategoryListItem } from './categories.types';
import { CategoriesPage } from './pages/CategoriesPage';

const categoriesApi = vi.hoisted(() => ({
  listCategoriesRequest: vi.fn(),
  getCategoryOptionsRequest: vi.fn(),
  getCategoryRequest: vi.fn(),
  createCategoryRequest: vi.fn(),
  updateCategoryRequest: vi.fn(),
  updateCategoryStatusRequest: vi.fn(),
  deleteCategoryRequest: vi.fn(),
}));

vi.mock('./api/categories.api', () => categoriesApi);

afterEach(() => {
  vi.clearAllMocks();
});

describe('category frontend', () => {
  it('renders category list data and sends URL search and filter params to the API', async () => {
    categoriesApi.listCategoriesRequest.mockResolvedValue({
      categories: [categoryListItem()],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderPage(<CategoriesPage />, '/categories?search=vessel&isActive=true&sort=name:asc');

    expect(await screen.findByText('Vessels & Reactors')).toBeInTheDocument();
    expect(categoriesApi.listCategoriesRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'vessel',
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    );
  });

  it('creates category without submitting a slug field', async () => {
    categoriesApi.createCategoryRequest.mockResolvedValue(categoryListItem());

    renderPage(<CategoriesPage />, '/categories');

    await userEvent.click(screen.getByRole('button', { name: /add category/i }));
    await userEvent.type(screen.getByLabelText(/category name/i), 'Vessels & Reactors');
    await userEvent.type(screen.getByLabelText(/description/i), 'Vessel category description');
    await userEvent.click(screen.getByRole('button', { name: /create category/i }));

    await waitFor(() => expect(categoriesApi.createCategoryRequest).toHaveBeenCalled());
    const payload = categoriesApi.createCategoryRequest.mock.calls[0][0];
    expect(payload).toEqual({
      name: 'Vessels & Reactors',
      description: 'Vessel category description',
      isActive: true,
    });
    expect(payload).not.toHaveProperty('slug');
  });

  it('disables deactivation and deletion for the protected uncategorised category', async () => {
    categoriesApi.listCategoriesRequest.mockResolvedValue({
      categories: [
        categoryListItem({ id: 1, name: 'Uncategorised', slug: 'uncategorised' }),
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderPage(<CategoriesPage />, '/categories');

    expect(await screen.findByText('Uncategorised')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /actions for uncategorised/i }));

    const deactivateBtn = screen.getByRole('menuitem', { name: /deactivate/i });
    const deleteBtn = screen.getByRole('menuitem', { name: /delete category/i });

    expect(deactivateBtn).toHaveAttribute('aria-disabled', 'true');
    expect(deleteBtn).toHaveAttribute('aria-disabled', 'true');
  });

  it('displays backend deletion conflict when items are linked to a category', async () => {
    categoriesApi.listCategoriesRequest.mockResolvedValue({
      categories: [categoryListItem({ linkedItemCount: 2 })],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });
    categoriesApi.deleteCategoryRequest.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { success: false, message: 'Category cannot be deleted because items are linked to it.' },
      },
    });

    renderPage(<CategoriesPage />, '/categories');

    expect(await screen.findByText('Vessels & Reactors')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /actions for vessels & reactors/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /delete category/i }));

    expect(screen.getByText(/cannot be deleted because/i)).toBeInTheDocument();
    const deleteSubmitBtn = screen.getByRole('button', { name: /delete category/i });
    expect(deleteSubmitBtn).toBeDisabled();
  });
});

function renderPage(ui: ReactElement, route: string) {
  return renderWithProviders(ui, { route });
}

function categoryListItem(overrides: Partial<CategoryListItem> = {}): CategoryListItem {
  return {
    id: 1,
    name: 'Vessels & Reactors',
    slug: 'vessels-reactors',
    description: 'Vessel category description',
    isActive: true,
    linkedItemCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
