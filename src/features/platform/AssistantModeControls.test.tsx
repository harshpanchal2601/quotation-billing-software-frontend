import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EffectiveAccess } from '@shared/tenancy/entitlements';
import { AssistantModeControls } from './AssistantModeControls';
import { subscriptionsApi } from './subscriptions.api';

vi.mock('./subscriptions.api', () => ({ subscriptionsApi: { override: vi.fn().mockResolvedValue({}) } }));
function access(): EffectiveAccess { return { firmId: 7, legacy: false, evaluatedAt: new Date().toISOString(), permissions: {}, quotas: [], subscription: null, features: ['assistant.local', 'ai.credits'].map((key) => ({ key, description: key, module: 'AI', dependencies: [], required: false, available: false, allowed: false, reason: 'PLAN_EXCLUDES_FEATURE' })) }; }
beforeEach(() => vi.clearAllMocks());
describe('platform per-firm assistant switches', () => {
  it('grants only the selected mode and firm through the existing audited override endpoint', async () => {
    render(<AssistantModeControls firmId={7} access={access()} reason="Approved paid add-on" pending={false} onChange={(operation) => { void operation(); }} />);
    await userEvent.click(screen.getByLabelText('Connected LLM assistant'));
    await waitFor(() => expect(subscriptionsApi.override).toHaveBeenCalledWith(7, expect.objectContaining({ target: 'feature:ai.credits', effect: 'ALLOW', limit: null, reason: 'Approved paid add-on' })));
    expect(subscriptionsApi.override).toHaveBeenCalledTimes(1);
  });
  it('requires an audit reason and respects a global hard disable', () => {
    const denied = access(); denied.features[0].reason = 'GLOBAL_HARD_DISABLED';
    const { rerender } = render(<AssistantModeControls firmId={7} access={denied} reason="Approved paid add-on" pending={false} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Local assistant')).toBeDisabled();
    rerender(<AssistantModeControls firmId={7} access={access()} reason="" pending={false} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Connected LLM assistant')).toBeDisabled(); expect(subscriptionsApi.override).not.toHaveBeenCalled();
  });
});
