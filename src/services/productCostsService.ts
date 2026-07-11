import { createClient } from '@/lib/supabase/server';

export interface SaveProductCostInput {
  orgId: string;
  sku: string;
  title?: string | null;
  unitCost: number;
}

export async function saveProductCost({
  orgId,
  sku,
  title,
  unitCost,
}: SaveProductCostInput): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: existing, error: lookupError } = await supabase
    .from('products')
    .select('id')
    .eq('org_id', orgId)
    .eq('sku', sku)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };

  if (existing) {
    // Produto já existe (veio de um sync de anúncios ou de um cadastro
    // anterior) — atualiza só o custo, sem tocar no título já sincronizado.
    const { error } = await supabase.from('products').update({ unit_cost: unitCost }).eq('id', existing.id);
    if (error) return { error: error.message };
    return {};
  }

  // SKU cadastrado manualmente antes de qualquer sync de anúncios — usa o
  // próprio SKU como título provisório (title é NOT NULL); o próximo sync de
  // anúncios sobrescreve com o título real do ML, se/quando existir.
  const trimmedTitle = title?.trim();
  const { error } = await supabase
    .from('products')
    .insert({ org_id: orgId, sku, title: trimmedTitle || sku, unit_cost: unitCost });

  if (error) return { error: error.message };
  return {};
}
