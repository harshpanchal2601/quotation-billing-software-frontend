import { useAuth } from '@features/auth';
import { ErrorState } from '@shared/components/common/ErrorState';
import { FullPageLoader } from '@shared/components/common/FullPageLoader';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { useEntitlements } from '@shared/tenancy/entitlements';
import { EffectiveAccessPanel } from './EffectiveAccessPanel';

export function FirmEntitlementsPage() {
  const { user } = useAuth();
  const access = useEntitlements(user);
  return <PageContainer><PageHeader title="Subscription & Usage" description="Your subscribed features, remaining capacity and effective access." />
    {access.isPending ? <FullPageLoader /> : access.isError ? <ErrorState message="Subscription details could not be loaded." onRetry={() => { void access.refetch(); }} /> : <EffectiveAccessPanel access={access.data} />}
  </PageContainer>;
}
