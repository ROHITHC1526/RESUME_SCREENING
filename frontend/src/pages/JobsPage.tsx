import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Users, ChevronRight, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { Navbar } from '../components/dashboard/Navbar';
import { JobUploadWizard } from '../components/dashboard/JobUploadWizard';
import { InfinityLoader } from '../components/common/InfinityLoader';
import { Job } from '../types';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const JobsPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [confirmTitleInput, setConfirmTitleInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data);
    } catch (err: any) {
      console.error('GET /api/jobs error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDeleteJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobToDelete) return;
    if (confirmTitleInput.trim().toLowerCase() !== jobToDelete.title.trim().toLowerCase()) {
      setDeleteError(`Job title does not match '${jobToDelete.title}'`);
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/jobs/${jobToDelete.id}`, {
        data: { confirm_title: confirmTitleInput }
      });
      setJobToDelete(null);
      setConfirmTitleInput('');
      fetchJobs();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.response?.data?.detail || "Failed to delete job");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink-900">Active Job Postings</h1>
            <p className="text-xs text-gray-600 mt-1">
              Manage candidate pipelines, extract requirements with AI, and review evidence-backed candidate ranks.
            </p>
          </div>

          <button
            onClick={() => setShowWizard(!showWizard)}
            className="btn-animated-upload py-3 px-5 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> {showWizard ? 'Close Wizard' : 'Post New Job Posting'}
          </button>
        </div>

        {showWizard && (
          <JobUploadWizard
            onJobCreated={(newJobId) => {
              navigate(`/jobs/${newJobId}`);
            }}
          />
        )}


        {/* Job List */}
        {loading ? (
          <div className="py-24 flex justify-center">
            <InfinityLoader
              size="lg"
              message="Loading Active Job Pipelines..."
              submessage="Fetching real-time candidate pools and requirement schemas..."
            />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white border border-paper-200 rounded-2xl p-12 text-center shadow-sm">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-serif text-xl font-bold text-ink-900">No Job Postings Yet</h3>
            <p className="text-xs text-gray-500 mt-1 mb-6">Create your first job posting to trigger the AI requirement extraction agent.</p>
            <button
              onClick={() => setShowWizard(true)}
              className="py-2.5 px-5 bg-ink-900 text-paper-50 text-xs font-bold rounded-xl"
            >
              Post Job & Upload Resumes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => {
              const canDelete = user?.role === 'admin' || job.recruiter_id === user?.id;

              return (
                <div
                  key={job.id}
                  className="bg-white border border-paper-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border-l-4 border-l-amber-brand relative"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-mono uppercase bg-paper-100 text-ink-900 px-2 py-0.5 rounded font-semibold">
                        Min {job.min_experience_years} Yrs Exp
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400">
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setJobToDelete(job);
                              setConfirmTitleInput('');
                              setDeleteError('');
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Delete Job Posting"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <Link to={`/jobs/${job.id}`}>
                      <h3 className="font-serif text-xl font-bold text-ink-900 group-hover:text-amber-brand transition-colors mb-2">
                        {job.title}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {job.mandatory_skills?.slice(0, 4).map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 bg-paper-100 text-ink-900 text-[10px] font-mono rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    to={`/jobs/${job.id}`}
                    className="pt-4 border-t border-paper-200 flex justify-between items-center text-xs font-semibold text-ink-900"
                  >
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Users className="w-4 h-4 text-amber-brand" /> View Candidate Pool
                    </span>
                    <ChevronRight className="w-4 h-4 text-amber-brand group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* High Friction Job Deletion Modal */}
        {jobToDelete && (
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-paper-300">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <div className="p-3 bg-red-50 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-ink-900">Delete Job Posting</h3>
                  <p className="text-xs text-gray-500 font-mono">Job ID: {jobToDelete.id}</p>
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded-xl border border-red-200 mb-4 text-xs text-red-800 space-y-1">
                <p className="font-bold">Warning: High Friction Permanent Action</p>
                <p>
                  This action will soft-delete this job posting and cascade soft-delete all screened candidates and evaluation history. This action will be recorded in the system audit log.
                </p>
              </div>

              <form onSubmit={handleDeleteJob} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-900 uppercase tracking-wider mb-1">
                    To confirm, type <span className="font-mono text-red-600 select-all">"{jobToDelete.title}"</span> below:
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
                    onClick={() => setJobToDelete(null)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-paper-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeleting || confirmTitleInput.trim().toLowerCase() !== jobToDelete.title.trim().toLowerCase()}
                    className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
                      confirmTitleInput.trim().toLowerCase() === jobToDelete.title.trim().toLowerCase()
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
    </div>
  );
};

