import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface ReviewFlagBannerProps {
  reviewerNotes: string;
}

export const ReviewFlagBanner: React.FC<ReviewFlagBannerProps> = ({ reviewerNotes }) => {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-brand p-4 rounded-r-xl shadow-sm mb-6 flex items-start gap-3">
      <ShieldAlert className="w-5 h-5 text-amber-brand flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
          Advisory Flagged by AI Reviewer Agent
        </div>
        <p className="text-xs text-amber-800 leading-relaxed font-mono">
          {reviewerNotes || "The Reviewer Agent detected potential discrepancy between assigned match score and extracted text evidence. Recruiter manual review recommended."}
        </p>
      </div>
    </div>
  );
};
