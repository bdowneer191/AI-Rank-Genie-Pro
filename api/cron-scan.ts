import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const CRON_SECRET = process.env.CRON_SECRET; // Shared secret for security
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all active keywords
    // Inner join on projects to ensure we only get keywords for active projects if needed,
    // and to get domain info if we need to process immediately (though we just queue here)
    const { data: keywords, error } = await supabase
      .from('keywords')
      .select('*, projects!inner(domain)')
      .eq('is_active', true)
      .limit(10); // Scan only 10 per cron run to stay within limits

    if (error) throw error;

    // Queue them for scanning (add to scan_queue table)
    const queueItems = keywords?.map(k => ({
      keyword_id: k.id,
      status: 'pending'
    })) || [];

    if (queueItems.length > 0) {
      const { error: insertError } = await supabase.from('scan_queue').insert(queueItems);
      if (insertError) throw insertError;
    }

    return res.status(200).json({
      success: true,
      queued: queueItems.length
    });

  } catch (error: any) {
    console.error('Cron error:', error);
    return res.status(500).json({ error: error.message });
  }
}
