import { supabaseAdmin } from './supabase-server';

const CACHE_TTL_HOURS = 24;

export async function getCachedSnapshot(keywordId: string, domain: string) {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - CACHE_TTL_HOURS);

  const { data, error } = await supabaseAdmin
    .from('snapshots')
    .select('*')
    .eq('keyword_id', keywordId)
    .eq('domain', domain)
    .gte('created_at', cutoffTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}
