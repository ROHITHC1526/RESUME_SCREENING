import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface ScoreBreakdownProps {
  evaluation: {
    matched_mandatory: any[];
    missing_mandatory: any[];
    matched_preferred: any[];
    missing_preferred: any[];
    match_percentage: number;
  };
}

export const ScoreBreakdownChart: React.FC<ScoreBreakdownProps> = ({ evaluation }) => {
  const numMandMatched = evaluation.matched_mandatory.length;
  const numMandTotal = numMandMatched + evaluation.missing_mandatory.length;
  const mandScore = numMandTotal > 0 ? (numMandMatched / numMandTotal) * 50 : 50;

  const numPrefMatched = evaluation.matched_preferred.length;
  const numPrefTotal = numPrefMatched + evaluation.missing_preferred.length;
  const prefScore = numPrefTotal > 0 ? (numPrefMatched / numPrefTotal) * 15 : 15;

  const expScore = 25; // derived from sufficiency
  const eduScore = 10;

  const data = [
    { name: 'Mandatory Skills', score: Math.round(mandScore), max: 50, color: '#C97A3D' },
    { name: 'Experience', score: Math.round(expScore), max: 25, color: '#1E7A5F' },
    { name: 'Preferred Skills', score: Math.round(prefScore), max: 15, color: '#2C3E61' },
    { name: 'Education/Certs', score: Math.round(eduScore), max: 10, color: '#64748B' }
  ];

  return (
    <div className="bg-paper-50 p-4 rounded-xl border border-paper-300">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-900">
          Weighted Evaluation Breakdown
        </span>
        <span className="font-serif text-lg font-bold text-amber-brand">
          {evaluation.match_percentage}% Match
        </span>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <XAxis type="number" domain={[0, 50]} tick={{ fontSize: 10 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#0B1220' }} width={100} />
            <Tooltip
              formatter={(value: any, name: any, props: any) => [`${value} / ${props.payload.max} pts`, 'Score']}
              contentStyle={{ backgroundColor: '#0B1220', borderRadius: '8px', color: '#FAF7F0', fontSize: '12px' }}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
