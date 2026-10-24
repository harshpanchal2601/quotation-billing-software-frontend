import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';

import { getSelectedFirm, setSelectedFirm, switchSelectedFirm } from './selectedFirm';

afterEach(() => setSelectedFirm(null));

describe('selected firm cache boundary', () => {
  it('removes tenant data while preserving authentication and platform data', () => {
    const client = new QueryClient();
    client.setQueryData(['auth'], { id: 1 });
    client.setQueryData(['platform', 'firms'], ['A', 'B']);
    client.setQueryData(['companies'], ['private A']);
    client.setQueryData(['audit-logs', 1], ['private A audit']);
    switchSelectedFirm(client, { id: 2, name: 'Firm B' });
    expect(getSelectedFirm()).toEqual({ id: 2, name: 'Firm B' });
    expect(client.getQueryData(['companies'])).toBeUndefined();
    expect(client.getQueryData(['audit-logs', 1])).toBeUndefined();
    expect(client.getQueryData(['auth'])).toEqual({ id: 1 });
    expect(client.getQueryData(['platform', 'firms'])).toEqual(['A', 'B']);
    client.clear();
  });

  it('prevents a pending query from repopulating the previous tenant cache', async () => {
    const client = new QueryClient();
    let complete!: (value: string) => void;
    const pending = client.fetchQuery({ queryKey: ['companies'],
      queryFn: () => new Promise<string>((resolve) => { complete = resolve; }) }).catch(() => undefined);
    switchSelectedFirm(client, { id: 2, name: 'Firm B' });
    complete('private A');
    await pending;
    expect(client.getQueryData(['companies'])).toBeUndefined();
    client.clear();
  });
});
