import React, { useState, useEffect } from 'react';
import { Snapshot, AnalysisResult } from '../types';
import { analyzeContentGap } from '../lib/gemini';
import { X, Sparkles, Loader2, ArrowRight, Link } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  snapshot: Snapshot | null;
  domain: string;
}

export const ContentFixerModal: React.FC<Props> = ({ isOpen, onClose, snapshot, domain }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (isOpen && snapshot) {
      if (snapshot.analysis) {
        // Use existing analysis if available
        setAnalysis(snapshot.analysis as AnalysisResult);
      } else {
        // Fallback/Retry logic
        handleAnalysis();
      }
    }
  }, [isOpen, snapshot]);

  const handleAnalysis = async () => {
    if (!snapshot) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await analyzeContentGap(domain, snapshot.keyword_term, snapshot.raw_ai_text);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !snapshot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <h2 className="text-lg font-semibold">AI Content Fixer</h2>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Target Keyword</h3>
            <p className="text-2xl font-bold text-slate-800">{snapshot.keyword_term}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Current Organic Rank</span>
              <span className="text-xl font-mono font-semibold text-slate-700">#{snapshot.organic_rank || 'N/A'}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">AI Status</span>
              <span className={`text-sm font-bold px-2 py-1 rounded-full inline-block mt-1 ${
                snapshot.is_cited ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {snapshot.is_cited ? 'Cited in Overview' : 'Not Cited'}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-slate-600 font-medium">Analyzing Search Intent & AI Gaps with Gemini...</p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
               <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" /> Detected Gap
                </h4>
                <p className="text-indigo-800">{analysis.gap}</p>
              </div>

              <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                   Strategy to Rank
                </h4>
                <p className="text-green-800 text-lg leading-relaxed">{analysis.strategy}</p>
              </div>

              {analysis.sources && analysis.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                    <Link className="w-3 h-3" /> Grounding Sources
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {analysis.sources.map((source, idx) => (
                      <a 
                        key={idx} 
                        href={source} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 hover:underline truncate max-w-[200px]"
                      >
                        {new URL(source).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-slate-400 mt-4 text-center">
                Analysis generated by Google Gemini 2.5 Flash
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">
            Close
          </button>
          {!loading && (
             <button onClick={handleAnalysis} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
               Refresh Analysis
             </button>
          )}
        </div>
      </div>
    </div>
  );
};
