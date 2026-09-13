import React, { useState } from 'react';
import { Award, ShieldAlert, CheckCircle, ChevronRight, Search, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import { Candidate } from '../../types';
import { api } from '../../services/api';

interface CandidateLeaderboardProps {
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
  onCandidateDeleted?: () => void;
}

export const CandidateLeaderboard: React.FC<CandidateLeaderboardProps> = ({
  candidates,
  onSelectCandidate,
  onCandidateDeleted
}) => {
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [candToDelete, setCandToDelete] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!candToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/jobs/${candToDelete.job_id}/candidates/${candToDelete.id}`);
      setCandToDelete(null);
      if (onCandidateDeleted) onCandidateDeleted();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCandidates = candidates.filter((cand) => {
    const evalData = cand.evaluation;
    if (!evalData) return true;

    if (filterTier === 'strong' && evalData.recommendation !== 'Strong Match') return false;
    if (filterTier === 'moderate' && evalData.recommendation !== 'Moderate Match') return false;
    if (filterTier === 'flagged' && evalData.reviewer_status !== 'flagged') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const tokenMatch = cand.redacted_name_token.toLowerCase().includes(q);
      const fileMatch = (cand.stored_filename || cand.file_path).toLowerCase().includes(q);
      const skillMatch = evalData.matched_mandatory.some(m => m.skill.toLowerCase().includes(q));
      if (!tokenMatch && !fileMatch && !skillMatch) return false;
    }

    return true;
  });

  const getBadgeStyle = (rec?: string) => {
    switch (rec) {
      case 'Strong Match':
        return 'bg-emerald-light text-emerald-brand border-emerald-brand';
      case 'Moderate Match':
        return 'bg-amber-light text-amber-brand border-amber-brand';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="bg-white border border-paper-200 rounded-2xl shadow-sm overflow-hidden relative">
      {/* Header & Filter Controls */}
      <div className="p-6 border-b border-paper-200 bg-paper-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-brand" /> Candidate Ranking Leaderboard
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {candidates.length} candidates evaluated • Sorted by match percentage & verified mandatory skills
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter candidate token / skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-paper-300 rounded-xl text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-amber-brand"
            />
          </div>

          <div className="flex gap-1 bg-paper-200 p-1 rounded-xl">
            <button
              onClick={() => setFilterTier('all')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${filterTier === 'all' ? 'bg-white text-ink-900 shadow-sm' : 'text-gray-600 hover:text-ink-900'}`}
            >
              All ({candidates.length})
            </button>
            <button
              onClick={() => setFilterTier('strong')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${filterTier === 'strong' ? 'bg-emerald-brand text-white shadow-sm' : 'text-gray-600 hover:text-emerald-brand'}`}
            >
              Strong
            </button>
            <button
              onClick={() => setFilterTier('flagged')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${filterTier === 'flagged' ? 'bg-amber-brand text-white shadow-sm' : 'text-gray-600 hover:text-amber-brand'}`}
            >
              Flagged
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      {filteredCandidates.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p className="text-sm font-medium">No candidate dossiers match the active filters.</p>
        </div>
      ) : (
        <div className="divide-y divide-paper-200">
          {filteredCandidates.map((cand) => {
            const evalData = cand.evaluation;
            const ranking = cand.ranking;
            const isTopCandidate = evalData?.is_top_candidate;

            return (
              <div
                key={cand.id}
                onClick={() => onSelectCandidate(cand)}
                className={`p-5 hover:bg-paper-50/80 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group relative ${isTopCandidate ? 'bg-emerald-50/40 border-l-4 border-l-emerald-500' : ''
                  }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-xl font-serif font-bold text-lg flex items-center justify-center flex-shrink-0 border shadow-sm ${isTopCandidate ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-ink-900 text-amber-brand border-ink-800'
                    }`}>
                    #{ranking?.rank || '?'}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-ink-900">
                        {cand.redacted_name_token}
                      </span>

                      {/* Top Candidate Green Light Badge */}
                      {isTopCandidate && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3 text-amber-300" /> Top Candidate
                        </span>
                      )}

                      {/* Approval Status Badge */}
                      {evalData?.approval_status === 'approved' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Approved
                        </span>
                      )}
                      {evalData?.approval_status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-800 border border-red-300">
                          Rejected
                        </span>
                      )}

                      {evalData?.reviewer_status === 'flagged' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-brand" /> Flagged
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono flex items-center gap-2">
                      <span>File: {cand.stored_filename || cand.file_path}</span>
                      {cand.original_filename && cand.original_filename !== cand.stored_filename && (
                        <span className="text-[10px] text-gray-400">({cand.original_filename})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Skills, Match score & Actions */}
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="hidden lg:block text-right">
                    <div className="text-[11px] font-mono text-gray-500">Matched Skills</div>
                    <div className="flex flex-wrap gap-1 mt-0.5 justify-end">
                      {evalData?.matched_mandatory.slice(0, 3).map((m, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-emerald-light text-emerald-brand text-[10px] font-semibold rounded border border-emerald-200">
                          {m.skill}
                        </span>
                      ))}
                      {(evalData?.matched_mandatory.length || 0) > 3 && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          +{(evalData?.matched_mandatory.length || 0) - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-serif text-xl font-bold text-ink-900">
                      {evalData?.match_percentage || 0}%
                    </div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getBadgeStyle(evalData?.recommendation)}`}>
                      {evalData?.recommendation || 'Evaluated'}
                    </span>
                  </div>

                  {/* Candidate Trash Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCandToDelete(cand);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete Candidate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-brand group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Deletion Confirmation Modal */}
      {candToDelete && (
        <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-paper-300">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="p-3 bg-red-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-ink-900">Remove Candidate</h3>
                <p className="text-xs text-gray-500 font-mono">{candToDelete.redacted_name_token}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-6">
              Remove this candidate from this job? This cannot be undone. The candidate will be soft-deleted and rankings will automatically recalculate.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setCandToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-paper-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isDeleting ? 'Removing...' : 'Confirm Remove Candidate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

