import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis, Legend 
} from 'recharts';
import { Snapshot } from '../types';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#cbd5e1'];

interface DashboardProps {
  data: Snapshot[];
}

export const ShareOfVoiceChart: React.FC<DashboardProps> = ({ data }) => {
  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-slate-400">No Data Available</div>;

  const citedCount = data.filter(d => d.is_cited).length;
  const notCitedAi = data.filter(d => d.ai_overview_present && !d.is_cited).length;
  const noAi = data.filter(d => !d.ai_overview_present).length;

  const chartData = [
    { name: 'AI Cited (Winning)', value: citedCount },
    { name: 'AI Present (Losing)', value: notCitedAi },
    { name: 'No AI Overview', value: noAi },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const OpportunityMatrix: React.FC<DashboardProps> = ({ data }) => {
  if (data.length === 0) return <div className="h-64 flex items-center justify-center text-slate-400">No Data Available</div>;

  // Transformation for Scatter Plot
  // X: Organic Rank (Inverted logic for display: Rank 1 is right, Rank 100 is left)
  // Y: AI Visibility Score (100 if cited #1, 0 if not cited)
  const scatterData = data.map(d => ({
    term: d.keyword_term,
    organic: d.organic_rank ? d.organic_rank : 100, 
    aiScore: d.is_cited ? (10 - (d.ai_position || 10)) * 10 : 0, // Mock scoring logic
    status: d.is_cited ? 'Winning' : (d.organic_rank && d.organic_rank <= 10 && d.ai_overview_present ? 'Opportunity' : 'Safe')
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            dataKey="organic" 
            name="Organic Rank" 
            domain={[0, 20]} 
            reversed={true} 
            label={{ value: 'Organic Rank (Better →)', position: 'insideBottom', offset: -10 }} 
          />
          <YAxis 
            type="number" 
            dataKey="aiScore" 
            name="AI Visibility" 
            label={{ value: 'AI Visibility', angle: -90, position: 'insideLeft' }} 
          />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
            if (payload && payload.length) {
              const d = payload[0].payload;
              return (
                <div className="bg-white p-2 border rounded shadow text-sm">
                  <p className="font-bold">{d.term}</p>
                  <p>Organic: #{d.organic}</p>
                  <p>AI Score: {d.aiScore}</p>
                </div>
              );
            }
            return null;
          }} />
          <Scatter name="Keywords" data={scatterData} fill="#8884d8">
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.status === 'Winning' ? '#10b981' : entry.status === 'Opportunity' ? '#f59e0b' : '#94a3b8'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};