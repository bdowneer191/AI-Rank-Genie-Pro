
import React from 'react';
import { Snapshot } from '../types';
import { X, ExternalLink, Image as ImageIcon, FileText, CheckCircle2, AlertCircle, HelpCircle, Bot } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  snapshot: Snapshot | null;
}

export const ResultPreviewModal: React.FC<Props> = ({ isOpen, onClose, snapshot }) => {
  if (!isOpen || !snapshot) return null;

  const getModeStyles = (mode: string) => {
    if (mode === 'Cited') {
      return {
        container: 'bg-emerald-50 border-emerald-200',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        text: 'text-emerald-900',
        subtext: 'text-emerald-700',
        icon: CheckCircle2,
        label: 'Brand Cited',
        description: 'Your domain is referenced in the AI Mode response.'
      };
    }
    if (mode === 'Not Cited') {
      return {
        container: 'bg-amber-50 border-amber-200',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        text: 'text-amber-900',
        subtext: 'text-amber-700',
        icon: AlertCircle,
        label: 'Not Cited',
        description: 'AI Mode is active but your domain is not cited.'
      };
    }
    return {
      container: 'bg-slate-50 border-slate-200',
      iconBg: 'bg-slate-200',
      iconColor: 'text-slate-500',
      text: 'text-slate-700',
      subtext: 'text-slate-500',
      icon: HelpCircle,
      label: 'Not Found',
      description: 'No AI Mode results found for this keyword.'
    };
  };

  const modeStyle = getModeStyles(snapshot.ai_mode || 'Not Found');
  const ModeIcon = modeStyle.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              SERP Snapshot
            </h2>
            <p className="text-sm text-slate-400">Viewing real-time results for: <span className="text-white font-medium">{snapshot.keyword_term}</span></p>
          </div>
          <button onClick={onClose} className="hover:bg-slate-800 p-2 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left: Screenshot / Visual */}
          <div className="flex-1 bg-slate-100 p-4 overflow-y-auto border-r border-slate-200 space-y-4">
            
            {/* Standard Screenshot */}
            <div className="bg-white rounded-lg shadow-sm p-2 border border-slate-200">
              <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                   Google Search
                </span>
                <a href={snapshot.screenshot_url || '#'} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  Open Original <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {snapshot.screenshot_url ? (
                <img 
                  src={snapshot.screenshot_url} 
                  alt="SERP Result" 
                  className="w-full h-auto rounded border border-slate-200" 
                  loading="lazy"
                />
              ) : (
                 <img 
                  src="https://placehold.co/600x400/f1f5f9/94a3b8?text=No+Standard+Screenshot" 
                  alt="No Standard Screenshot" 
                  className="w-full h-auto rounded border border-slate-200 opacity-70" 
                  loading="lazy"
                />
              )}
            </div>

            {/* AI Mode Screenshot */}
             <div className="bg-white rounded-lg shadow-sm p-2 border border-slate-200">
              <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                   <Bot className="w-3 h-3" /> AI Mode (Gemini)
                </span>
                <a href={snapshot.ai_mode_screenshot_url || '#'} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  Open Original <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {snapshot.ai_mode_screenshot_url ? (
                <img 
                  src={snapshot.ai_mode_screenshot_url} 
                  alt="AI Mode Result" 
                  className="w-full h-auto rounded border border-slate-200" 
                  loading="lazy"
                />
              ) : (
                <img 
                  src="https://placehold.co/600x400/f1f5f9/94a3b8?text=No+AI+Mode+Screenshot" 
                  alt="No AI Mode Screenshot" 
                  className="w-full h-auto rounded border border-slate-200 opacity-70" 
                  loading="lazy"
                />
              )}
            </div>

          </div>

          {/* Right: Data & Analysis */}
          <div className="w-full md:w-80 bg-white p-6 overflow-y-auto shrink-0 space-y-6">
            
            {/* AI Overview Status */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" /> 
                AI Overview Data
              </h3>
              
              <div className={`p-3 rounded-lg border text-sm ${
                snapshot.ai_overview_present 
                  ? 'bg-indigo-50 border-indigo-100 text-indigo-900' 
                  : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                {snapshot.ai_overview_present ? (
                  snapshot.raw_ai_text ? (
                    <p className="line-clamp-6 leading-relaxed text-xs">
                      "{snapshot.raw_ai_text}"
                    </p>
                  ) : <em>AI Overview detected but no text captured.</em>
                ) : (
                  <p>No AI Overview appeared for this search.</p>
                )}
              </div>
            </div>

            {/* Rankings Summary */}
            <div className="space-y-3">
               <h3 className="text-sm font-semibold text-slate-900">Rankings Breakdown</h3>
               
               <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-xs text-slate-500 block">Google Organic</span>
                    <span className="font-mono font-bold text-slate-700 text-lg">
                      #{snapshot.organic_rank || '-'}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-xs text-slate-500 block">Gemini Search</span>
                    <span className="font-mono font-bold text-indigo-600 text-lg">
                      #{snapshot.gemini_rank || '-'}
                    </span>
                  </div>
               </div>
            </div>

             {/* AI Mode Details */}
             <div className={`p-4 rounded-xl border ${modeStyle.container}`}>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">
                  AI Mode Status
                </span>
                
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full shrink-0 ${modeStyle.iconBg} ${modeStyle.iconColor}`}>
                    <ModeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`font-bold block text-sm ${modeStyle.text}`}>
                      {modeStyle.label}
                    </span>
                    <span className={`text-xs block mt-1 leading-relaxed ${modeStyle.subtext}`}>
                      {modeStyle.description}
                    </span>
                  </div>
                </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
};
