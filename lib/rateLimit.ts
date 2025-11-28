import { supabaseAdmin } from './supabase-server';

export async function checkRateLimit(userId: string, limit: number = 100) {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { count, error } = await supabaseAdmin
    .from('snapshots')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', oneDayAgo.toISOString());

  if (error) throw error;

  return (count || 0) < limit;
}
