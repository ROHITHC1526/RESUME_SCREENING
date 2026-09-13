import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Briefcase, Sparkles, CheckCircle2, Edit3, Trash2, AlertTriangle, Save, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Navbar } from '../components/dashboard/Navbar';
import { CandidateLeaderboard } from '../components/dashboard/CandidateLeaderboard';
import { CandidateDossierDrawer } from '../components/dashboard/CandidateDossierDrawer';
import { Job, Candidate } from '../types';
import { api } from '../services/api';
import { JobUploadWizard } from '../components/dashboard/JobUploadWizard';
import { useAuthStore } from '../store/authStore';

export const JobDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showUploadWizard, setShowUploadWizard] = useState(true);
  const [loading, setLoading] = useState(true);

  // Edit Job state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editRawJd, setEditRawJd] = useState('');
  const [editMinExp, setEditMinExp] = useState(0);
  const [rescreenChoice, setRescreenChoice] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Job state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmTitleInput, setConfirmTitleInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!jobId) return;
    try {
      const [jobRes, candRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/jobs/${jobId}/candidates`)
      ]);
      setJob(jobRes.data);
      setCandidates(candRes.data);
      setEditTitle(jobRes.data.title);
      setEditRawJd(jobRes.data.raw_jd_text);
      setEditMinExp(jobRes.data.min_experience_years);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;
    setSavingEdit(true);
    try {
      await api.patch(`/jobs/${jobId}`, {
        title: editTitle,
        raw_jd_text: editRawJd,
        min_experience_years: editMinExp,
        rescreen_candidates: rescreenChoice
      });
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !jobId) return;
    if (confirmTitleInput.trim().toLowerCase() !== job.title.trim().toLowerCase()) {
      setDeleteError(`Job title does not match '${job.title}'`);
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/jobs/${jobId}`, {
        data: { confirm_title: confirmTitleInput }
      });
      setShowDeleteModal(false);
      navigate('/jobs');
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.response?.data?.detail || "Failed to delete job");
    } finally {
      setIsDeleting(false);
    }
  };

  const canDeleteJob = user?.role === 'admin' || (job && job.recruiter_id === user?.id);

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link to="/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-ink-900">
            <ArrowLeft className="w-4 h-4" /> Back to All Job Postings
          </Link>

          {job && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="py-1.5 px-3 bg-white border border-paper-300 text-ink-900 hover:bg-paper-100 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Job Details
              </button>
              {canDeleteJob && (
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setConfirmTitleInput('');
                    setDeleteError('');
                  }}
                  className="py-1.5 px-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Job
                </button>
              )}
            </div>
          )}
        </div>

        {/* Read-Only Reference Header */}
        {job && (
          <div className="bg-ink-900 text-paper-50 rounded-2xl p-8 mb-8 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase font-mono bg-amber-brand text-ink-900 px-2.5 py-0.5 rounded font-bold">
                    Job Intelligence Header (v{job.requirements_version || 1})
                  </span>
                  <span className="text-[10px] font-mono text-paper-300">
                    Min {job.min_experience_years} Yrs Exp Required
                  </span>
                </div>

                <h1 className="font-serif text-3xl lg:text-4xl font-bold text-white mb-3">{job.title}</h1>

                {/* Job Description & Requirements Text */}
                <div className="mb-4 p-4 bg-ink-800/90 rounded-xl border border-ink-700 max-w-4xl">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-brand mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Full Job Description & Requirements
                  </div>
                  <p className="text-xs text-paper-200 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-2">
                    {job.raw_jd_text}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-paper-300">Extracted Mandatory Skills:</span>
                  {job.mandatory_skills?.map((s, i) => (
                    <span key={i} className="px-2.5 py-0.5 bg-ink-800 border border-ink-700 text-amber-brand text-xs font-mono rounded-md">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowUploadWizard(!showUploadWizard)}
                className="py-3 px-5 bg-amber-brand hover:bg-amber-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 flex-shrink-0"
              >
                <Upload className="w-4 h-4" /> {showUploadWizard ? 'Hide Resume Upload' : 'Upload More Resumes'}
              </button>
            </div>
          </div>
        )}

        {showUploadWizard && jobId && (
          <JobUploadWizard jobId={jobId} onJobCreated={() => { fetchData(); }} />
        )}

        {/* Candidate Leaderboard */}
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-mono text-xs">Evaluating candidate pool...</div>
        ) : (
          <CandidateLeaderboard
            candidates={candidates}
            onSelectCandidate={(cand) => setSelectedCandidate(cand)}
            onCandidateDeleted={fetchData}
          />
        )}

        {/* Edit Job Details Modal */}
        {showEditModal && job && (
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-paper-300 max-h-[90vh] overflow-y-auto">
              <h3 className="font-serif text-xl font-bold text-ink-900 mb-4">Edit Job Details & Requirements</h3>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-900 mb-1">Job Title</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs font-semibold text-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-900 mb-1">Min Experience (Years)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editMinExp}
                    onChange={(e) => setEditMinExp(parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs font-semibold text-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-900 mb-1">Raw Job Description Text</label>
                  <textarea
                    rows={6}
                    value={editRawJd}
                    onChange={(e) => setEditRawJd(e.target.value)}
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs font-mono text-ink-900"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rescreenChoice}
                      onChange={(e) => setRescreenChoice(e.target.checked)}
                      className="w-4 h-4 text-amber-brand rounded focus:ring-amber-brand"
                    />
                    <span className="text-xs font-bold text-ink-900">
                      Re-screen existing candidate pool under updated requirements version
                    </span>
                  </label>
                  <p className="text-[11px] text-gray-600 mt-1 pl-6">
                    If checked, existing candidates' requirements marker will update to v{(job.requirements_version || 1) + 1}.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={savingEdit}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-paper-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-brand hover:bg-amber-hover rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> {savingEdit ? 'Updating...' : 'Save Job Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Job Modal */}
        {showDeleteModal && job && (
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-paper-300">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-3 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-ink-900">Delete Job Posting</h3>
                  <p className="text-xs text-gray-500 font-mono">Job ID: {job.id}</p>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-xl border border-red-200 mb-4 text-xs text-red-800 space-y-1">
                <p className="font-bold">Warning: Permanent Cascade Action</p>
                <p>
                  This will delete this job posting and all {candidates.length} screened candidates and their evaluation history. This cannot be undone.
                </p>
              </div>

              <form onSubmit={handleDeleteJob} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-900 uppercase tracking-wider mb-1">
                    To confirm, type <span className="font-mono text-red-600 select-all">"{job.title}"</span> below:
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmTitleInput}
                    onChange={(e) => setConfirmTitleInput(e.target.value)}
                    placeholder="Type exact job title to confirm..."
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs font-mono text-ink-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                {deleteError && (
                  <p className="text-xs font-bold text-red-600 font-mono">{deleteError}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-paper-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeleting || confirmTitleInput.trim().toLowerCase() !== job.title.trim().toLowerCase()}
                    className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all ${confirmTitleInput.trim().toLowerCase() === job.title.trim().toLowerCase()
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-300 cursor-not-allowed'
                      }`}
                  >
                    {isDeleting ? 'Deleting Job...' : 'Permanently Delete Job'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Case File Dossier Drawer */}
      {selectedCandidate && jobId && (
        <CandidateDossierDrawer
          candidate={selectedCandidate}
          jobId={jobId}
          onClose={() => setSelectedCandidate(null)}
          onOverrideSuccess={() => {
            fetchData();
            setSelectedCandidate(null);
          }}
        />
      )}
    </div>
  );
};

