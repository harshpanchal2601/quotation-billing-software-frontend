import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableSkeleton } from './TableSkeleton';

describe('TableSkeleton', () => {
  it('renders the requested number of loading rows', () => {
    render(<TableSkeleton rowCount={4} />);

    expect(screen.getByLabelText('Loading table data').children).toHaveLength(4);
  });
});
