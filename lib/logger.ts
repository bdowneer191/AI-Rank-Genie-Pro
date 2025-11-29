import { supabase } from './supabase-server';

export async function logError(
  context: string,
  error: any,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from('error_logs').insert({
      context,
      message: error.message || String(error),
      stack: error.stack,
      metadata,
      created_at: new Date().toISOString()
    });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// Add error_logs table in Supabase:
/*
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  context TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
*/
