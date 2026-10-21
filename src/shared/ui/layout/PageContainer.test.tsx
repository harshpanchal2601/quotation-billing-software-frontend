import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageContainer } from './PageContainer';

describe('PageContainer', () => {
  it('renders page content with the shared page container', () => {
    render(<PageContainer>Content</PageContainer>);

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('accepts supported Stack layout props', () => {
    render(
      <PageContainer component="main" data-testid="page" maxWidth={960}>
        Content
      </PageContainer>,
    );

    expect(screen.getByTestId('page').tagName).toBe('MAIN');
  });
});
