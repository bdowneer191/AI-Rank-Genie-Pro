
import { supabase } from '../lib/supabase';
import { Project, Keyword, Snapshot } from '../types';

export const getOrCreateProject = async (domain: string): Promise<Project | null> => {
  // Check if project exists
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('domain', domain)
    .single();

  if (data) return data;

  if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
     console.error('Error fetching project:', error);
     return null;
  }

  // Create if not exists
  // Updated to match Phase 1 Schema (added name)
  const { data: newData, error: createError } = await supabase
    .from('projects')
    .insert([{ domain, name: domain, user_id: 'temp-user' }]) // Minimal fields for now
    .select()
    .single();

  if (createError) {
    console.error('Error creating project:', createError);
    return null;
  }

  return newData;
};

export const getKeywords = async (projectId: string): Promise<Keyword[]> => {
  const { data, error } = await supabase
    .from('keywords')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching keywords:', error);
    return [];
  }
  return data || [];
};

export const addKeyword = async (projectId: string, term: string): Promise<Keyword | null> => {
  // Updated to match Phase 1 Schema (added location, is_active)
  const { data, error } = await supabase
    .from('keywords')
    .insert([{
        project_id: projectId,
        term,
        location: 'United States',
        is_active: true
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding keyword:', error);
    return null;
  }
  return data;
};

export const deleteKeyword = async (keywordId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('keywords')
        .delete()
        .eq('id', keywordId);

    if (error) {
        console.error('Error deleting keyword:', error);
        return false;
    }
    return true;
}

export const saveSnapshot = async (snapshot: Partial<Snapshot>): Promise<Snapshot | null> => {
    // Exclude 'id' if it's a temp ID
    const { id, ...snapshotData } = snapshot;

    const { data, error } = await supabase
        .from('snapshots')
        .insert([snapshotData])
        .select()
        .single();

    if (error) {
        console.error('Error saving snapshot:', error);
        return null;
    }
    return data;
}

export const getLatestSnapshots = async (keywordIds: string[]): Promise<Snapshot[]> => {
     if (keywordIds.length === 0) return [];

     // Optimize: Fetch latest snapshot for each keyword individually
     // This avoids fetching full history.
     const promises = keywordIds.map(async (kid) => {
         const { data, error } = await supabase
            .from('snapshots')
            .select('*')
            .eq('keyword_id', kid)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

         if (error && error.code !== 'PGRST116') {
             // PGRST116 is no rows found, which is fine
             console.warn(`Error fetching snapshot for keyword ${kid}:`, error);
         }
         return data;
     });

     const results = await Promise.all(promises);
     return results.filter((s): s is Snapshot => !!s);
}
