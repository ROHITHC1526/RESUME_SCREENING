import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle, XCircle, FileText, AlertCircle, Award, Edit3, Save, Sparkles, Mail, ThumbsUp, ThumbsDown, CheckCircle2, UserCheck, Briefcase, GraduationCap, FileCheck } from 'lucide-react';
import { Candidate } from '../../types';
import { ScoreBreakdownChart } from './ScoreBreakdownChart';
import { ReviewFlagBanner } from './ReviewFlagBanner';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface CandidateDossierDrawerProps {
  candidate: Candidate | null;
  jobId: string;
  onClose: () => void;
  onOverrideSuccess: () => void;
}

export const CandidateDossierDrawer: React.FC<CandidateDossierDrawerProps> = ({
  candidate,
  jobId,
  onClose,
  onOverrideSuccess
}) => {
  const { user } = useAuthStore();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [newRank, setNewRank] = useState<number>(candidate?.ranking?.rank || 1);
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<string | null>(null);

  if (!candidate) return null;

  const evaluation = candidate.evaluation;
  const ranking = candidate.ranking;
  const isTopCandidate = evaluation?.is_top_candidate;
  const isAdmin = user?.role === 'admin';

  const getTierColor = (rec?: string) => {
    switch (rec) {
      case 'Strong Match':
        return 'bg-emerald-light text-emerald-brand border-emerald-brand';
      case 'Moderate Match':
        return 'bg-amber-light text-amber-brand border-amber-brand';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    setSavingOverride(true);
    try {
      await api.post(`/jobs/${jobId}/candidates/${candidate.id}/override`, {
        new_rank: newRank,
        override_reason: overrideReason
      });
      setShowOverrideModal(false);
      onOverrideSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${jobId}/candidates/${candidate.id}/approve`);
      onOverrideSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await api.post(`/jobs/${jobId}/candidates/${candidate.id}/reject`, {
        note: rejectionNote
      });
      setShowRejectInput(false);
      onOverrideSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotifyCandidate = async () => {
    setActionLoading(true);
    setNotifyStatus(null);
    try {
      const res = await api.post(`/jobs/${jobId}/candidates/${candidate.id}/notify`, {});
      setNotifyStatus(`Email sent to ${candidate.email}!`);
      onOverrideSuccess();
    } catch (err: any) {
      console.error(err);
      setNotifyStatus(err.response?.data?.detail || "Failed to send email notification");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStageChange = async (newStage: string) => {
    try {
      await api.patch(`/jobs/${jobId}/candidates/${candidate.id}/stage`, { stage: newStage });
      onOverrideSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink-900/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-paper-300 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 bg-ink-900 text-paper-50 border-b border-ink-800 flex justify-between items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs text-amber-brand bg-ink-800 px-2.5 py-1 rounded-md border border-ink-700 font-semibold">
                {candidate.redacted_name_token}
              </span>
              <span className="text-[11px] bg-emerald-brand/20 text-emerald-brand px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3" /> PII Masked for Scoring
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-white">Candidate Case Dossier</h2>
            <div className="text-xs text-paper-300 mt-1 font-mono space-y-0.5">
              <div>Stored File: <span className="text-amber-brand">{candidate.stored_filename || candidate.file_path}</span></div>
              {candidate.original_filename && candidate.original_filename !== candidate.stored_filename && (
                <div>Original Upload: {candidate.original_filename}</div>
              )}
              {candidate.email && <div>Extracted Email: {candidate.email}</div>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-paper-300 hover:text-white hover:bg-ink-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-paper-50">
          {/* Top Candidate Green Light Banner */}
          {isTopCandidate && (
            <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-lg border border-emerald-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Recommended Top Candidate ("Green Light")</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Highest job-fit score in pool with 100% verified mandatory skills and clean reviewer status.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Admin Approval & Actions Bar */}
          <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-paper-200">
              <div>
                <span className="text-[10px] uppercase font-mono text-gray-500 font-bold block">Approval Status</span>
                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded font-bold text-xs ${evaluation?.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  evaluation?.approval_status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                    'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                  {evaluation?.approval_status ? evaluation.approval_status.toUpperCase() : 'PENDING'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono text-gray-500 font-bold block">Hiring Stage</span>
                <select
                  value={evaluation?.stage || 'screened'}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="mt-0.5 text-xs font-bold text-ink-900 bg-paper-50 border border-paper-300 rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value="screened">Screened</option>
                  <option value="approved">Approved</option>
                  <option value="interview_requested">Interview Requested</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Notify Candidate Action */}
              <div>
                <button
                  onClick={handleNotifyCandidate}
                  disabled={actionLoading || evaluation?.approval_status !== 'approved' || !candidate.email}
                  title={
                    evaluation?.approval_status !== 'approved'
                      ? "Approval required before notifying candidate"
                      : !candidate.email
                        ? "No email address found in resume — cannot notify"
                        : "Send transactional notification email to candidate"
                  }
                  className={`py-2 px-3 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${evaluation?.approval_status === 'approved' && candidate.email
                    ? 'bg-ink-900 text-amber-brand hover:bg-ink-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Notify Candidate
                </button>
              </div>
            </div>

            {notifyStatus && (
              <div className="p-2.5 bg-paper-100 text-ink-900 text-xs font-mono rounded-lg border border-paper-300">
                {notifyStatus}
              </div>
            )}

            {/* Admin Approval Decision Buttons */}
            {isAdmin && evaluation?.approval_status === 'pending' && (
              <div className="pt-2">
                <p className="text-xs font-semibold text-ink-900 mb-2">Admin Sign-off Action:</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> Approve Candidate
                  </button>
                  <button
                    onClick={() => setShowRejectInput(!showRejectInput)}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> Reject Candidate
                  </button>
                </div>

                {showRejectInput && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Optional rejection note..."
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      className="w-full p-2 bg-paper-50 border border-paper-300 rounded-lg text-xs text-ink-900"
                    />
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="py-1.5 px-3 bg-red-700 text-white text-xs font-bold rounded-lg"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reviewer Advisory Banner */}
          {evaluation?.reviewer_status === 'flagged' && (
            <ReviewFlagBanner reviewerNotes={evaluation.reviewer_notes || ''} />
          )}

          {/* Ranking & Tier Banner */}
          <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-ink-900 text-amber-brand font-serif font-bold text-xl flex items-center justify-center border border-ink-700">
                #{ranking?.rank || 1}
              </div>
              <div>
                <div className="text-xs uppercase font-mono text-gray-500 font-semibold">AI Calculated Rank</div>
                <div className="text-sm font-semibold text-ink-900 mt-0.5">{ranking?.justification}</div>
                {ranking?.is_manual_override && (
                  <div className="mt-1 text-[11px] text-amber-brand font-mono">
                    Manual Recruiter Override: "{ranking.override_reason}"
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border ${getTierColor(evaluation?.recommendation)}`}>
                {evaluation?.recommendation || 'Evaluated'}
              </span>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="mt-2 text-xs text-ink-900 hover:text-amber-brand font-semibold flex items-center gap-1 justify-end underline"
              >
                <Edit3 className="w-3.5 h-3.5" /> Recruiter Override
              </button>
            </div>
          </div>

          {/* Weighted Breakdown Chart */}
          {evaluation && <ScoreBreakdownChart evaluation={evaluation} />}

          {/* 1. Relevant Experience & History */}
          <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-brand" /> Relevant Experience
            </h3>
            <div className="flex items-center gap-3 p-3 bg-paper-50 rounded-lg border border-paper-200 mb-3">
              <div className="text-2xl font-bold font-serif text-ink-900">
                {candidate.parsed_json?.experience_years || 0.0}
              </div>
              <div className="text-xs text-gray-600 font-mono">
                Years of Total Relevant Industry Experience
              </div>
            </div>
            {candidate.parsed_json?.work_experience && candidate.parsed_json.work_experience.length > 0 && (
              <div className="space-y-2">
                {candidate.parsed_json.work_experience.map((w, idx) => (
                  <div key={idx} className="p-2.5 bg-white border border-paper-200 rounded-lg text-xs">
                    <div className="font-bold text-ink-900">{w.title || 'Role'} <span className="font-normal text-gray-500">at {w.company || 'Company'}</span></div>
                    {w.duration && <div className="text-[10px] text-amber-brand font-mono">{w.duration}</div>}
                    {w.description && <div className="text-xs text-gray-600 font-serif mt-1">{w.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Education & Certifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Education */}
            <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" /> Education
              </h3>
              {candidate.parsed_json?.education && candidate.parsed_json.education.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-gray-700">
                  {candidate.parsed_json.education.map((edu, idx) => (
                    <li key={idx} className="p-2 bg-paper-50 rounded border border-paper-200 font-medium">
                      {edu}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-gray-400 font-mono italic">No formal degree listed</div>
              )}
            </div>

            {/* Certifications */}
            <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" /> Certifications
              </h3>
              {candidate.parsed_json?.certifications && candidate.parsed_json.certifications.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-gray-700">
                  {candidate.parsed_json.certifications.map((cert, idx) => (
                    <li key={idx} className="p-2 bg-emerald-50 text-emerald-900 rounded border border-emerald-200 font-medium">
                      {cert}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-gray-400 font-mono italic">No certifications listed</div>
              )}
            </div>
          </div>

          {/* 3. Mandatory Skills Matched */}
          <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-brand" /> Matched Mandatory Skills ({evaluation?.matched_mandatory.length || 0})
            </h3>
            <div className="space-y-3">
              {evaluation?.matched_mandatory.map((match, idx) => (
                <div key={idx} className="p-3 bg-emerald-light/40 border border-emerald-brand/30 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-emerald-900">{match.skill}</span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      Match: {(match.similarity_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs font-serif italic text-gray-700 bg-white p-2 rounded border border-emerald-100">
                    "{match.evidence_text}"
                  </p>
                  <span className="text-[10px] font-mono text-gray-400 mt-1 block">Resume Evidence Source: {match.source_location}</span>
                </div>
              ))}
              {(!evaluation?.matched_mandatory || evaluation.matched_mandatory.length === 0) && (
                <div className="text-xs text-gray-400 font-mono italic">No mandatory skills matched</div>
              )}
            </div>
          </div>

          {/* 3b. Preferred / Optional Skills Matched */}
          {evaluation?.matched_preferred && evaluation.matched_preferred.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Matched Optional / Preferred Skills ({evaluation.matched_preferred.length})
              </h3>
              <div className="space-y-3">
                {evaluation.matched_preferred.map((match, idx) => (
                  <div key={idx} className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-indigo-900">{match.skill}</span>
                      <span className="text-[10px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                        Bonus Match: {(match.similarity_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs font-serif italic text-gray-700 bg-white p-2 rounded border border-indigo-100">
                      "{match.evidence_text}"
                    </p>
                    <span className="text-[10px] font-mono text-gray-400 mt-1 block">Resume Evidence Source: {match.source_location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Missing Skills */}
          <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4 text-red-500" /> Missing Skills
            </h3>
            <div className="space-y-2">
              {evaluation?.missing_mandatory?.map((skill, idx) => (
                <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-800 text-xs">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Missing Required Skill: {skill}</span>
                    <p className="text-[11px] text-red-600 mt-0.5">No matching text evidence found in candidate resume.</p>
                  </div>
                </div>
              ))}
              {evaluation?.missing_preferred?.map((skill, idx) => (
                <div key={idx} className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                  <span className="font-semibold">Missing Preferred Skill: {skill}</span>
                </div>
              ))}
              {(!evaluation?.missing_mandatory || evaluation.missing_mandatory.length === 0) &&
                (!evaluation?.missing_preferred || evaluation.missing_preferred.length === 0) && (
                  <div className="text-xs text-emerald-600 font-mono">100% Skills Verified — Zero Skill Gaps Detected</div>
                )}
            </div>
          </div>

          {/* 5. Candidate Strengths */}
          <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-brand" /> Candidate Strengths
            </h3>
            <div className="space-y-2">
              {evaluation?.strengths?.map((item, idx) => (
                <div key={idx} className="p-3 bg-paper-50 border border-paper-200 rounded-lg">
                  <div className="text-xs font-semibold text-ink-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {item.title}
                  </div>
                  <div className="text-xs text-gray-600 font-serif mt-1 p-2 bg-white rounded border border-paper-300">
                    "{item.evidence}"
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Candidate Gaps */}
          {evaluation?.gaps && evaluation.gaps.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Candidate Gaps
              </h3>
              <div className="space-y-2">
                {evaluation.gaps.map((item, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-xs">
                    <div className="font-bold text-amber-900">{item.title}</div>
                    <p className="text-amber-800 text-[11px] mt-0.5">{item.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Documented Resume Evidence */}
          <div className="bg-white p-5 rounded-xl border border-paper-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900 mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" /> Verbatim Resume Evidence Spans
            </h3>
            <div className="space-y-2">
              {evaluation?.evidence?.map((ev, idx) => (
                <div key={idx} className="p-3 bg-blue-50/40 border border-blue-200 rounded-lg text-xs">
                  <div className="font-semibold text-blue-950 mb-1">{ev.title}</div>
                  <blockquote className="font-serif italic text-gray-700 bg-white p-2.5 rounded border border-blue-100">
                    "{ev.evidence}"
                  </blockquote>
                  <span className="text-[10px] font-mono text-gray-400 mt-1 block">Location: {ev.source}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Override Modal */}
        {showOverrideModal && (
          <div className="fixed inset-0 bg-ink-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-paper-300 shadow-2xl">
              <h3 className="font-serif text-xl font-bold text-ink-900 mb-2">Manual Recruiter Override</h3>
              <p className="text-xs text-gray-600 mb-4">
                Recruiter overrides are advisory, immutable once logged, and saved in the audit log for compliance.
              </p>

              <form onSubmit={handleOverrideSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1">
                    New Leaderboard Rank
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRank}
                    onChange={(e) => setNewRank(parseInt(e.target.value))}
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-sm font-bold text-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1">
                    Override Justification Reason (Required)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Verified candidate's Github repo showing 4 years FastAPI production experience..."
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs text-ink-900"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOverrideModal(false)}
                    className="px-4 py-2 text-xs text-gray-600 hover:text-ink-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingOverride}
                    className="px-4 py-2 text-xs bg-amber-brand text-white rounded-xl font-bold shadow-md hover:bg-amber-hover flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Override
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

