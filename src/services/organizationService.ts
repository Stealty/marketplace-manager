import { createClient } from '@/lib/supabase/server';
import type { Organization } from '@/types/database';

export async function getCurrentUserOrganizations(): Promise<Organization[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('memberships')
    .select('organizations(*)')
    .returns<{ organizations: Organization }[]>();

  if (error) throw error;

  return data.map((row) => row.organizations);
}

export async function getCurrentUserOrgIds(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('memberships').select('org_id');

  if (error) throw error;

  return data.map((row) => row.org_id);
}
