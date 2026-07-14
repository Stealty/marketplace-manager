import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

export interface AdminAccess {
  user: User | null;
  isSuperAdmin: boolean;
  adminOrgIds: string[];
}

const NO_ACCESS: AdminAccess = { user: null, isSuperAdmin: false, adminOrgIds: [] };

// cache() memoiza por render pass do React Server Components — o layout e a
// page de /dashboard/admin chamam getAdminAccess() dentro da mesma requisição,
// e getUser() faz uma chamada de rede ao Supabase Auth a cada invocação.
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NO_ACCESS;

  const { data, error } = await supabase.from('memberships').select('org_id, role');
  if (error) throw error;

  const isSuperAdmin = data.some((m) => m.role === 'super_admin');
  const adminOrgIds = data.filter((m) => m.role === 'admin' || m.role === 'super_admin').map((m) => m.org_id);

  return { user, isSuperAdmin, adminOrgIds };
});

export function hasAdminAccess(access: AdminAccess): boolean {
  return access.isSuperAdmin || access.adminOrgIds.length > 0;
}
