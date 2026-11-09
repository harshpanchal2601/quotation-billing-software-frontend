import type { EffectiveAccess } from '@shared/tenancy/entitlements';

export type SubscriptionPolicy = {
  trialDays: number; graceDays: number; billingCycle: 'MANUAL' | 'MONTHLY' | 'ANNUAL';
  cancellationAccess: 'IMMEDIATE' | 'END_OF_TERM'; downgradeTiming: 'IMMEDIATE' | 'AT_RENEWAL'; retention: 'RETAIN';
  overridePrecedence: 'LATEST_EFFECTIVE_REPLACEMENT';
};
export type Plan = { id: number; name: string; slug: string; isLegacy: boolean; archivedAt: string | null };
export type PlanVersion = {
  id: number; planId: number; revision: number; policy: SubscriptionPolicy | null; price: string | null; currency: string | null; publishedAt: string | null;
  features: Array<{ featureKey: string }>; quotas: Array<{ resource: string; limit: string | null }>;
};
export type PlanDetail = Plan & { versions: PlanVersion[] };
export type FeatureDefinition = { key: string; description: string; module: string; dependencies: string[]; required: boolean; legacy: boolean; switch: null | { hardDisabled: boolean; reason: string } };
export type PlanVersionInput = { features: string[]; quotas: { users: string; documents: string | null; storageBytes: string | null; aiCredits: string | null }; policy: SubscriptionPolicy | null; price: string | null; currency: string | null; reason: string };
export type FirmSubscription = { id: number; planVersionId: number; status: string; effectiveFrom: string; effectiveUntil: string | null; trialEndsAt: string | null; graceEndsAt: string | null; currentPeriodEndsAt: string | null; renewalAt: string | null; reason: string; authorId: number };
export type SubscriptionInput = Omit<FirmSubscription, 'id' | 'authorId'> & { expectedSubscriptionId: number | null };
export type FirmOverride = { id: number; target: string; effect: 'ALLOW' | 'DENY' | 'LIMIT'; limit: string | null; startsAt: string; expiresAt: string | null; revokedAt: string | null; reason: string; authorId: number };
export type OverrideInput = Omit<FirmOverride, 'id' | 'revokedAt' | 'authorId'>;
export type PlatformOption<Value extends string = string> = { value: Value; label: string };
export type PolicyChoiceKey = Exclude<keyof SubscriptionPolicy, 'trialDays' | 'graceDays'>;
export type SubscriptionOptions = {
  currencies: PlatformOption[];
  policy: { [Key in PolicyChoiceKey]: PlatformOption<Extract<SubscriptionPolicy[Key], string>>[] };
  subscriptionStatuses: PlatformOption[];
  overrideEffects: PlatformOption<OverrideInput['effect']>[];
  paymentKinds: PlatformOption<'PAYMENT' | 'REFUND'>[];
};
export type PlatformCharge = { id: number; amount: string; currency: string; reason: string; payments: Array<{ id: number; kind: string; amount: string; reference: string }> };
export type SubscriptionDetails = { access: EffectiveAccess; subscriptions: Array<FirmSubscription & { planVersion?: { revision: number; plan: { name: string } } }>; overrides: FirmOverride[]; charges: PlatformCharge[]; pagination: Record<'subscriptions' | 'overrides' | 'charges', { page: number; totalPages: number }>; paymentMode: 'MANUAL' };
export type SubscriptionAuditEvent = { id: number; firmId: number | null; authorId: number; kind: string; payload: unknown; createdAt: string };
