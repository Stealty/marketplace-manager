import { createClient } from '@/lib/supabase/server';
import { getMarketplaceConnections } from '@/services/connectionsService';
import { AppShell } from './app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const connections = await getMarketplaceConnections();
  const expiredConnections = connections
    .filter((c) => c.status === 'expired')
    .map((c) => ({ id: c.id, label: c.label, expiresAt: c.expires_at }));

  return (
    <AppShell userEmail={user?.email ?? null} expiredConnections={expiredConnections}>
      {children}
    </AppShell>
  );
}
