import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DetailFields } from './DetailLayout';

describe('shared record detail text', () => {
  it('offers an accessible reversible disclosure for complete long text without altering it', async () => {
    const notes = Array.from({ length: 12 }, (_, index) => `Review line ${index + 1}: retain the original document text.`).join('\n');
    render(<DetailFields fields={[{ label: 'Document notes', value: notes }]} />);
    const expand = screen.getByRole('button', { name: 'Show full document notes' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    const content = document.getElementById(expand.getAttribute('aria-controls')!);
    expect(content?.textContent).toBe(notes);
    await userEvent.click(expand);
    expect(screen.getByRole('button', { name: 'Show less document notes' })).toHaveAttribute('aria-expanded', 'true');
    expect(content?.textContent).toBe(notes);
    await userEvent.click(screen.getByRole('button', { name: 'Show less document notes' }));
    expect(screen.getByRole('button', { name: 'Show full document notes' })).toHaveAttribute('aria-expanded', 'false');
  });
  it('keeps short values and rich content directly readable without empty disclosure actions', () => {
    render(<DetailFields fields={[{ label: 'Reference', value: 'QA-001' }, { label: 'State', value: <strong>Active</strong> }, { label: 'Notes', value: null }]} />);
    expect(screen.getByText('QA-001')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
