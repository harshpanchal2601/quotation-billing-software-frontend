import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppButton } from '../actions';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders one page heading and optional description', () => {
    render(<PageHeader title="Categories" description="Manage categories." />);

    expect(screen.getByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByText('Manage categories.')).toBeInTheDocument();
  });

  it('renders optional page actions', () => {
    render(<PageHeader title="Categories" actions={<AppButton>Add Category</AppButton>} />);

    expect(screen.getByRole('button', { name: 'Add Category' })).toBeInTheDocument();
  });
});
