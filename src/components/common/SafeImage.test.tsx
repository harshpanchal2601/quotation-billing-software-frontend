import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SafeImage } from './SafeImage';

describe('SafeImage', () => {
  it('shows an image-loading skeleton before using the existing fallback on failure', () => {
    render(
      <SafeImage
        src="/storage/items/missing.png"
        alt="Missing product"
        fallbackLabel="Product image unavailable"
      />,
    );

    expect(screen.getByLabelText('Loading Missing product')).toBeInTheDocument();

    fireEvent.error(screen.getByAltText('Missing product'));

    expect(screen.getByRole('img', { name: 'Product image unavailable' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Loading Missing product')).not.toBeInTheDocument();
  });
});
