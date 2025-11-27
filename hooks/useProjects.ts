import { useState, useEffect } from 'react';
import { supabase, Project, Keyword } from '../lib/supabase';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchKeywords(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeywords(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function addProject(name: string, domain: string) {
    try {
      // For demo: using a fixed user_id. Replace with auth.
      const { data, error } = await supabase
        .from('projects')
        .insert({ name, domain, user_id: '00000000-0000-0000-0000-000000000000' })
        .select()
        .single();

      if (error) throw error;
      setProjects([data, ...projects]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }

  async function addKeyword(projectId: string, term: string, location: string = 'United States') {
    try {
      const { data, error } = await supabase
        .from('keywords')
        .insert({ project_id: projectId, term, location })
        .select()
        .single();

      if (error) throw error;
      setKeywords([data, ...keywords]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }

  async function deleteKeyword(keywordId: string) {
    try {
      const { error } = await supabase
        .from('keywords')
        .update({ is_active: false })
        .eq('id', keywordId);

      if (error) throw error;
      setKeywords(keywords.filter(k => k.id !== keywordId));
    } catch (err: any) {
      setError(err.message);
    }
  }

  return {
    projects,
    keywords,
    loading,
    error,
    fetchProjects,
    fetchKeywords,
    addProject,
    addKeyword,
    deleteKeyword
  };
}
