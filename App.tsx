
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Search, Settings, ExternalLink, 
  BarChart3, RefreshCw, Zap, AlertTriangle, CheckCircle, Sparkles,
  Plus, Trash2, ShieldAlert, ShieldCheck, HelpCircle, Eye,
  ImageIcon, Play
} from 'lucide-react';
import { useRankTracker } from './hooks/useRankTracker';
import { useProjects } from './hooks/useProjects';
import { ShareOfVoiceChart, OpportunityMatrix } from './components/DashboardCharts';
import { ContentFixerModal } from './components/ContentFixerModal';
import { ResultPreviewModal } from './components/ResultPreviewModal';
import { Keyword, Snapshot, Project } from './lib/supabase';
import { getLatestSnapshots } from './services/db';

const DOMAIN = 'hypefresh.co';

// Mapping new 'sentiment_score' to old 'sentiment' string
const getSentimentLabel = (score: number | null): 'Positive' | 'Neutral' | 'Negative' | 'Not Mentioned' => {
  if (score === null) return 'Not Mentioned';
  if (score >= 0.5) return 'Positive';
  if (score <= -0.5) return 'Negative';
  return 'Neutral';
};

// Mapping for UI display
interface DisplaySnapshot extends Snapshot {
  status: 'scanned' | 'pending' | 'failed';
  keyword_term: string;
  // Adapters for legacy components if they use these names
  is_cited: boolean;
  ai_overview_present: boolean;
  ai_position: number | null;
  gemini_rank: number | null;
  ai_mode: 'Cited' | 'Not Cited' | 'Not Found';
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Not Mentioned';
  screenshot_url?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'keywords'>('dashboard');
  const [selectedSnapshot, setSelectedSnapshot] = useState<DisplaySnapshot | null>(null);
  
  // Modals
  const [isFixerOpen, setIsFixerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // State from Hooks
  const { projects, keywords, loading: projectsLoading, fetchProjects, fetchKeywords, addProject, addKeyword, deleteKeyword } = useProjects();
  const { scanning, progress, results: scanResults, scanKeywords } = useRankTracker();

  const [project, setProject] = useState<Project | null>(null);
  const [historicalSnapshots, setHistoricalSnapshots] = useState<Snapshot[]>([]);
  const [newKeywordTerm, setNewKeywordTerm] = useState('');

  // Initial Load & Project Selection
  useEffect(() => {
    if (!projectsLoading) {
      const existingProject = projects.find(p => p.domain === DOMAIN);
      if (existingProject) {
        setProject(existingProject);
        fetchKeywords(existingProject.id);
      } else if (projects.length === 0 && !projectsLoading) {
          // If no projects exist, try to create the demo project
          // Note: useProjects addProject uses a fixed ID which might conflict if the DB isn't empty but doesn't have this exact domain
          // But for a fresh start/demo it should be okay.
           addProject('HypeFresh Demo', DOMAIN).then((newProj) => {
               if (newProj) {
                   setProject(newProj);
                   // No keywords to fetch for a new project
               }
           }).catch(e => console.error("Failed to auto-create project", e));
      }
    }
  }, [projects, projectsLoading]); // Re-run when projects list updates

  // Load Historical Snapshots when keywords change
  useEffect(() => {
      const loadHistory = async () => {
          if (keywords.length > 0) {
              const snapshots = await getLatestSnapshots(keywords.map(k => k.id));
              setHistoricalSnapshots(snapshots);
          } else {
              setHistoricalSnapshots([]);
          }
      };
      loadHistory();
  }, [keywords]);


  const handleScan = () => {
     if (project && keywords.length > 0) {
         scanKeywords(keywords, project.domain);
     }
  };

  const handleSingleScan = (keywordId: string) => {
    const keywordToScan = keywords.find(k => k.id === keywordId);
    if (keywordToScan && project) {
      scanKeywords([keywordToScan], project.domain);
    }
  };

  const handleOpenFixer = (snapshot: DisplaySnapshot) => {
    setSelectedSnapshot(snapshot);
    setIsFixerOpen(true);
  };

  const handleOpenPreview = (snapshot: DisplaySnapshot) => {
    setSelectedSnapshot(snapshot);
    setIsPreviewOpen(true);
  };

  const handleAddKeyword = async () => {
    if (!newKeywordTerm.trim() || !project) return;
    const term = newKeywordTerm.trim();
    
    // Prevent duplicates
    if (keywords.some(k => k.term.toLowerCase() === term.toLowerCase())) {
      alert('Keyword already exists');
      return;
    }

    await addKeyword(project.id, term);
    setNewKeywordTerm('');
  };

  const handleDeleteKeyword = async (id: string) => {
    if (confirm('Are you sure you want to delete this keyword?')) {
      await deleteKeyword(id);
    }
  };

  // Merge keywords with results and Adapt to DisplaySnapshot
  const displayedData: DisplaySnapshot[] = keywords.map(k => {
    // Priority: Scan Result -> Historical DB -> Pending
    const rawRes = scanResults.find(r => r.keyword_id === k.id)
                 || historicalSnapshots.find(r => r.keyword_id === k.id);

    if (rawRes) {
        const isCited = rawRes.ai_overview_cited;
        const geminiCited = rawRes.gemini_cited;

        return {
            ...rawRes,
            keyword_term: k.term,
            status: 'scanned',

            // Adapters
            is_cited: isCited,
            ai_overview_present: !!rawRes.ai_overview_snippet, // Infer presence from snippet or position
            ai_position: rawRes.ai_overview_position,
            gemini_rank: rawRes.gemini_position,
            ai_mode: geminiCited ? 'Cited' : (rawRes.gemini_position === null ? 'Not Found' : 'Not Cited'), // Simplification
            sentiment: getSentimentLabel(rawRes.sentiment_score),
            screenshot_url: `https://placehold.co/600x400/EEE/31343C?text=Snapshot+for+${encodeURIComponent(k.term)}` // Placeholder
        };
    }
    
    // Placeholder for unscanned keyword
    return {
      id: `temp-${k.id}`,
      keyword_id: k.id,
      domain: DOMAIN,
      keyword_term: k.term,

      organic_rank: null,
      organic_url: null,
      organic_title: null,

      ai_overview_cited: false,
      ai_overview_position: null,
      ai_overview_snippet: null,

      gemini_cited: false,
      gemini_position: null,
      gemini_snippet: null,

      sentiment_score: null,
      content_gaps: null,
      strategy_suggestions: null,

      scan_duration_ms: 0,
      created_at: new Date().toISOString(),

      // Display/Pending fields
      status: 'pending',
      is_cited: false,
      ai_overview_present: false,
      ai_position: null,
      gemini_rank: null,
      ai_mode: 'Not Found',
      sentiment: 'Not Mentioned',
      screenshot_url: ''
    };
  });

  // Filter data for charts to avoid skewing with pending items
  const scannedData = displayedData.filter(d => d.status === 'scanned');

  const aiShare = scannedData.length > 0 
    ? Math.round((scannedData.filter(d => d.ai_overview_present).length / scannedData.length) * 100)
    : 0;

  // Helper to determine status and icon
  const getStatus = (snapshot: DisplaySnapshot) => {
    if (snapshot.status === 'pending') return { label: 'Pending', color: 'bg-slate-100 text-slate-500', icon: HelpCircle };
    if (snapshot.sentiment === 'Negative') return { label: 'Critical', color: 'bg-red-50 text-red-700 border border-red-200', icon: ShieldAlert };
    if (snapshot.is_cited) return { label: 'Safe', color: 'bg-green-50 text-green-700 border border-green-200', icon: ShieldCheck };
    if (snapshot.organic_rank && snapshot.organic_rank <= 10 && !snapshot.is_cited) return { label: 'Risk', color: 'bg-orange-50 text-orange-700 border border-orange-200', icon: AlertTriangle };
    return { label: 'Opportunity', color: 'bg-blue-50 text-blue-700 border border-blue-200', icon: Sparkles };
  };

  // Calculate progress percentage for UI
  const progressPercent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600">
            <Zap className="w-6 h-6 fill-current" />
            <h1 className="font-bold text-xl tracking-tight">AI Rank Genie</h1>
          </div>
          <span className="text-xs font-medium text-slate-400 mt-1 block px-1">Pro Edition</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('keywords')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'keywords' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Search className="w-5 h-5" />
            Keywords
          </button>
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <BarChart3 className="w-5 h-5" />
            Competitors
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-30">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {activeTab === 'dashboard' ? 'Overview' : 'Keyword Analysis'}
            </h2>
            <p className="text-sm text-slate-500">Tracking <span className="font-medium text-slate-700">{DOMAIN}</span> in United States</p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Progress Bar for Scan */}
            {scanning && (
              <div className="flex flex-col items-end mr-4">
                 <span className="text-xs font-semibold text-indigo-600 mb-1 animate-pulse">
                   Scanning {progress.completed}/{progress.total}
                 </span>
                 <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                   <div 
                     className="h-full bg-indigo-600 transition-all duration-300 ease-out relative overflow-hidden"
                     style={{ width: `${progressPercent}%` }}
                   >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer"></div>
                   </div>
                 </div>
              </div>
            )}

            <button 
              onClick={handleScan}
              disabled={scanning}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition ${scanning ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Updating...' : 'Update Rankings'}
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-2">AI Share of Voice</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{aiShare}%</span>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Total AI Citations</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {scannedData.filter(d => d.is_cited).length}
                </span>
                <span className="text-sm text-slate-400">/ {scannedData.length}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Gemini Visibility</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-indigo-600">
                   {scannedData.filter(d => d.gemini_rank !== null).length}
                </span>
                <span className="text-sm text-slate-400">ranked terms</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Avg. Organic Rank</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {scannedData.length > 0 
                    ? (scannedData.reduce((acc, curr) => acc + (curr.organic_rank || 0), 0) / scannedData.filter(d => d.organic_rank).length || 0).toFixed(1)
                    : 'N/A'}
                </span>
                <span className="text-xs font-medium text-slate-400">Stable</span>
              </div>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Share of Voice */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-slate-800">AI Visibility Distribution</h3>
                </div>
                {/* Cast to any if needed to bypass strict type check for now or ensure DisplaySnapshot is compatible */}
                <ShareOfVoiceChart data={scannedData as any} />
              </div>

              {/* Opportunity Matrix */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-slate-800">Opportunity Matrix</h3>
                  <div className="text-xs text-slate-400">Low AI / High Organic</div>
                </div>
                <OpportunityMatrix data={scannedData as any} />
              </div>
            </div>
          )}

          {/* Keyword Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">Keyword Performance</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                  {displayedData.length}
                </span>
              </div>

              {/* Add Keyword Input */}
              <div className="flex w-full md:w-auto items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={newKeywordTerm}
                    onChange={(e) => setNewKeywordTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="Add new keyword..."
                    className="pl-3 pr-10 py-2 w-full md:w-64 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                  />
                  <button 
                    onClick={handleAddKeyword}
                    disabled={!newKeywordTerm.trim()}
                    className="absolute right-1 top-1 p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add Keyword"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Keyword</th>
                    <th className="px-6 py-3">Organic</th>
                    <th className="px-6 py-3">AI SGE</th>
                    <th className="px-6 py-3">Gemini Rank</th>
                    <th className="px-6 py-3">AI Mode</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Snapshot</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedData.length > 0 ? (
                    displayedData.map((row) => {
                       const statusInfo = getStatus(row);
                       const StatusIcon = statusInfo.icon;
                       return (
                      <tr key={row.keyword_id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900">{row.keyword_term}</td>
                        {/* Organic */}
                        <td className="px-6 py-4">
                          {row.status === 'pending' ? (
                            <span className="text-slate-400 italic">Pending...</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                              {row.organic_rank ? `#${row.organic_rank}` : 'N/A'}
                            </span>
                          )}
                        </td>
                        
                        {/* AI SGE Column */}
                        <td className="px-6 py-4">
                          {row.status === 'pending' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200">
                              Scan needed
                            </span>
                          ) : row.ai_overview_present ? (
                            row.is_cited ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Cited (#{row.ai_position})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                Not Cited
                              </span>
                            )
                          ) : (
                             <span className="text-slate-400 text-xs">Not Found</span>
                          )}
                        </td>

                        {/* Gemini Rank Column */}
                        <td className="px-6 py-4">
                           {row.status === 'pending' ? (
                             <span className="text-slate-400 italic">Pending...</span>
                           ) : (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                               {row.gemini_rank ? `#${row.gemini_rank}` : 'N/A'}
                             </span>
                           )}
                        </td>

                        {/* AI Mode Column */}
                        <td className="px-6 py-4">
                           {row.status === 'pending' ? (
                             <span className="text-slate-300">-</span>
                           ) : (
                             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                               row.ai_mode === 'Cited' 
                                 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                 : row.ai_mode === 'Not Cited'
                                   ? 'bg-amber-50 text-amber-700 border-amber-200'
                                   : 'bg-slate-50 text-slate-500 border-slate-200'
                             }`}>
                               {row.ai_mode || 'Not Found'}
                             </span>
                           )}
                        </td>

                         {/* Status Column */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                             <StatusIcon className="w-3 h-3" /> {statusInfo.label}
                          </span>
                        </td>
                        
                        {/* Snapshot Column */}
                        <td className="px-6 py-4 text-center">
                          {row.status === 'scanned' && (
                             <button 
                               onClick={() => handleOpenPreview(row)}
                               className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all group/btn"
                               title="View Screenshot"
                             >
                               {row.screenshot_url ? (
                                  <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden relative">
                                    <img src={row.screenshot_url} alt="Thumb" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover/btn:bg-black/10 transition-colors" />
                                  </div>
                               ) : (
                                  <ImageIcon className="w-4 h-4 text-slate-400 group-hover/btn:text-indigo-500" />
                               )}
                             </button>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {row.status === 'pending' ? (
                               <button 
                                 onClick={() => handleSingleScan(row.keyword_id)}
                                 disabled={scanning}
                                 className="px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-xs flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                 Scan <Play className="w-3 h-3 fill-current" />
                               </button>
                            ) : (
                              <button 
                                onClick={() => handleOpenFixer(row)}
                                className="text-indigo-600 hover:text-indigo-900 font-medium text-sm flex items-center gap-1"
                              >
                                {row.is_cited ? 'Analysis' : 'Fix'} <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteKeyword(row.keyword_id)}
                              className="text-slate-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Delete Keyword"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        {projectsLoading ? 'Loading projects...' : (project ? 'No keywords found. Add your first keyword above.' : 'No project found.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ContentFixerModal 
        isOpen={isFixerOpen} 
        onClose={() => setIsFixerOpen(false)} 
        snapshot={selectedSnapshot as any}
        domain={DOMAIN}
      />
      <ResultPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        snapshot={selectedSnapshot as any}
      />
    </div>
  );
}
