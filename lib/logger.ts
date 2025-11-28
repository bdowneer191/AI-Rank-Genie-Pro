import { supabaseAdmin } from './supabase-server';

export async function logError(
  context: string,
  error: any,
  metadata?: Record<string, any>
) {
  try {
    // Check if error_logs table exists or wrap in try/catch to avoid crashing if it doesn't
    await supabaseAdmin.from('error_logs').insert({
      context,
      message: error.message || String(error),
      stack: error.stack,
      metadata,
      created_at: new Date().toISOString()
    });
  } catch (logError) {
    // Fallback to console if DB logging fails
    console.error('Failed to log error to DB:', logError);
    console.error('Original Error:', error);
  }
}
