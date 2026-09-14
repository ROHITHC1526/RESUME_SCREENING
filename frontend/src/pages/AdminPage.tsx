import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, Briefcase, Award, History, Plus, CheckCircle, XCircle, Search, UserPlus, ToggleLeft, ToggleRight, Sparkles, Filter, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Navbar } from '../components/dashboard/Navbar';
import { JobUploadWizard } from '../components/dashboard/JobUploadWizard';
import { CandidateDossierDrawer } from '../components/dashboard/CandidateDossierDrawer';
import { InfinityLoader } from '../components/common/InfinityLoader';
import { RecruiterUser, OrgJob, AuditLogEntry, Candidate } from '../types';
import { api } from '../services/api';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'approvals' | 'jobs' | 'recruiters' | 'audit'>('approvals');


  // Approval Queue State
  const [approvalQueue, setApprovalQueue] = useState<any[]>([]);
  const [approvalFilterJob, setApprovalFilterJob] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  // Org Jobs State
  const [orgJobs, setOrgJobs] = useState<OrgJob[]>([]);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobToAssign, setJobToAssign] = useState<OrgJob | null>(null);
  const [assignRecruiterId, setAssignRecruiterId] = useState<string>('');

  // Recruiter Management State
  const [recruiters, setRecruiters] = useState<RecruiterUser[]>([]);
  const [showCreateRecruiterModal, setShowCreateRecruiterModal] = useState(false);
  const [newRecruiterEmail, setNewRecruiterEmail] = useState('');
  const [newRecruiterPass, setNewRecruiterPass] = useState('');
  const [newRecruiterName, setNewRecruiterName] = useState('');
  const [recruiterFormError, setRecruiterFormError] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      const res = await api.get('/admin/approvals');
      setApprovalQueue(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrgJobs = async () => {
    try {
      const res = await api.get('/admin/jobs');
      setOrgJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecruiters = async () => {
    try {
      const res = await api.get('/admin/recruiters');
      setRecruiters(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      setAuditLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchApprovals(),
      fetchOrgJobs(),
      fetchRecruiters(),
      fetchAuditLogs()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleApprove = async (jobId: string, candidateId: string) => {
    try {
      await api.post(`/jobs/${jobId}/candidates/${candidateId}/approve`);
      fetchApprovals();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (jobId: string, candidateId: string) => {
    try {
      await api.post(`/jobs/${jobId}/candidates/${candidateId}/reject`, { note: "Rejected via Admin Dashboard" });
      fetchApprovals();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRecruiterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecruiterFormError('');
    try {
      await api.post('/admin/recruiters', {
        email: newRecruiterEmail,
        password: newRecruiterPass,
        full_name: newRecruiterName
      });
      setShowCreateRecruiterModal(false);
      setNewRecruiterEmail('');
      setNewRecruiterPass('');
      setNewRecruiterName('');
      fetchRecruiters();
      fetchAuditLogs();
    } catch (err: any) {
      console.error(err);
      setRecruiterFormError(err.response?.data?.detail || "Failed to create recruiter");
    }
  };

  const handleToggleRecruiterStatus = async (recruiterId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/recruiters/${recruiterId}`, {
        is_active: !currentStatus
      });
      fetchRecruiters();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobToAssign || !assignRecruiterId) return;
    try {
      await api.patch(`/admin/jobs/${jobToAssign.id}/assign`, {
        recruiter_id: assignRecruiterId
      });
      setJobToAssign(null);
      fetchOrgJobs();
      fetchAuditLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredApprovals = approvalQueue.filter(item => {
    if (approvalFilterJob !== 'all' && item.job_id !== approvalFilterJob) return false;
    return true;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    if (!auditSearchQuery) return true;
    const q = auditSearchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.user_name || '').toLowerCase().includes(q) ||
      log.target_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-mono bg-amber-brand text-ink-900 px-2 py-0.5 rounded font-bold">
                System Owner Portal
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-ink-900">Admin Control Center</h1>
            <p className="text-xs text-gray-600 mt-1">
              Manage organization recruiters, review approval queues, assign job postings, and inspect system audit logs.
            </p>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex border-b border-paper-300 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-4 px-6 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'border-amber-brand text-amber-brand font-extrabold'
                : 'border-transparent text-gray-600 hover:text-ink-900'
            }`}
          >
            <Award className="w-4 h-4" /> Candidate Approval Queue ({approvalQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-4 px-6 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'jobs'
                ? 'border-amber-brand text-amber-brand font-extrabold'
                : 'border-transparent text-gray-600 hover:text-ink-900'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Organization Jobs ({orgJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('recruiters')}
            className={`pb-4 px-6 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'recruiters'
                ? 'border-amber-brand text-amber-brand font-extrabold'
                : 'border-transparent text-gray-600 hover:text-ink-900'
            }`}
          >
            <Users className="w-4 h-4" /> Recruiter Management ({recruiters.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-4 px-6 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-amber-brand text-amber-brand font-extrabold'
                : 'border-transparent text-gray-600 hover:text-ink-900'
            }`}
          >
            <History className="w-4 h-4" /> Org Audit Log
          </button>
        </div>

        {loading ? (
          <div className="py-24 flex justify-center">
            <InfinityLoader
              size="lg"
              message="Loading Admin Control Center..."
              submessage="Aggregating pending approvals, active recruiter accounts, and security audit logs..."
            />
          </div>
        ) : (
          <>
            {/* TAB 1: APPROVAL QUEUE */}
            {activeTab === 'approvals' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-paper-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink-900">Pending Candidate Approvals</h3>
                <p className="text-xs text-gray-500">Human-in-the-loop sign-off required before recruiters can advance candidates.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">Filter by Job:</span>
                <select
                  value={approvalFilterJob}
                  onChange={(e) => setApprovalFilterJob(e.target.value)}
                  className="text-xs font-semibold text-ink-900 bg-paper-50 border border-paper-300 rounded-lg px-3 py-1.5 focus:outline-none"
                >
                  <option value="all">All Jobs ({approvalQueue.length})</option>
                  {orgJobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500 font-mono text-xs">Loading approval queue...</div>
            ) : filteredApprovals.length === 0 ? (
              <div className="bg-white border border-paper-200 rounded-2xl p-12 text-center shadow-sm">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-serif text-xl font-bold text-ink-900">Approval Queue Empty</h3>
                <p className="text-xs text-gray-500 mt-1">All candidate dossiers across the organization have been reviewed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApprovals.map((item) => (
                  <div
                    key={item.candidate_id}
                    className={`bg-white border border-paper-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ${
                      item.is_top_candidate ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-bold text-ink-900 bg-paper-100 px-2 py-0.5 rounded">
                          {item.redacted_name_token}
                        </span>

                        {item.is_top_candidate && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-300" /> Recommended Top Candidate
                          </span>
                        )}

                        <span className="text-xs font-semibold text-gray-500">
                          Job: <span className="text-ink-900 font-bold">{item.job_title}</span>
                        </span>
                        <span className="text-xs text-gray-400">| Recruiter: {item.recruiter_name}</span>
                      </div>

                      <div className="text-xs text-gray-600 font-mono space-y-0.5">
                        <div>Stored File: <span className="text-amber-brand">{item.stored_filename}</span></div>
                        {item.email && <div>Candidate Email: {item.email}</div>}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-3">
                        {item.matched_mandatory?.map((m: any, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-emerald-light text-emerald-brand text-[10px] font-semibold rounded border border-emerald-200">
                            {m.skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end">
                      <div className="text-right">
                        <div className="font-serif text-2xl font-bold text-ink-900">{item.match_percentage}%</div>
                        <span className="text-xs font-bold text-emerald-600">{item.recommendation}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedJobId(item.job_id);
                            setSelectedCandidate({
                              id: item.candidate_id,
                              job_id: item.job_id,
                              redacted_name_token: item.redacted_name_token,
                              file_path: item.stored_filename,
                              stored_filename: item.stored_filename,
                              original_filename: item.original_filename,
                              email: item.email,
                              created_at: item.created_at,
                              parsed_json: item.parsed_json,
                              evaluation: {
                                match_percentage: item.match_percentage,
                                recommendation: item.recommendation,
                                matched_mandatory: item.matched_mandatory || [],
                                missing_mandatory: item.missing_mandatory || [],
                                matched_preferred: item.matched_preferred || [],
                                missing_preferred: item.missing_preferred || [],
                                strengths: item.strengths || [],
                                gaps: item.gaps || [],
                                evidence: item.evidence || [],
                                reviewer_status: item.reviewer_status,
                                reviewer_notes: item.reviewer_notes,
                                approval_status: item.approval_status,
                                is_top_candidate: item.is_top_candidate
                              }
                            });
                          }}
                          className="py-2 px-3 bg-paper-100 hover:bg-paper-200 text-ink-900 text-xs font-bold rounded-xl transition-all"
                        >
                          View Dossier
                        </button>

                        <button
                          onClick={() => handleApprove(item.job_id, item.candidate_id)}
                          className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Approve
                        </button>

                        <button
                          onClick={() => handleReject(item.job_id, item.candidate_id)}
                          className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ORGANIZATION JOBS */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-paper-200 shadow-sm">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink-900">All Organization Jobs</h3>
                <p className="text-xs text-gray-500">Every job posting active across recruiters in the organization.</p>
              </div>

              <button
                onClick={() => setShowCreateJob(!showCreateJob)}
                className="py-2.5 px-4 bg-amber-brand text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:bg-amber-hover flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> {showCreateJob ? 'Close Wizard' : 'Create Job (Admin)'}
              </button>
            </div>

            {showCreateJob && (
              <JobUploadWizard onJobCreated={(newJobId) => { navigate(`/jobs/${newJobId}`); }} />
            )}


            <div className="bg-white border border-paper-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-paper-200">
              {orgJobs.map((j) => (
                <div key={j.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-paper-50/80 transition-all">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] bg-paper-100 text-ink-900 px-2 py-0.5 rounded font-bold">
                        Owner: {j.recruiter_name}
                      </span>
                      {j.assigned_recruiter_id && (
                        <span className="font-mono text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                          Assigned
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif text-lg font-bold text-ink-900">{j.title}</h4>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      Created: {new Date(j.created_at).toLocaleDateString()} • Candidates: {j.candidate_count} • Pending Approvals: {j.pending_approval_count}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setJobToAssign(j);
                        setAssignRecruiterId(j.recruiter_id || '');
                      }}
                      className="py-2 px-3 bg-paper-100 hover:bg-paper-200 text-xs font-bold text-ink-900 rounded-xl"
                    >
                      Assign Recruiter
                    </button>
                    <Link
                      to={`/jobs/${j.id}`}
                      className="py-2 px-3 bg-ink-900 hover:bg-ink-800 text-xs font-bold text-paper-50 rounded-xl flex items-center gap-1 inline-flex"
                    >
                      View Pool <ChevronRight className="w-3.5 h-3.5 text-amber-brand" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RECRUITER MANAGEMENT */}
        {activeTab === 'recruiters' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-paper-200 shadow-sm">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink-900">Recruiter User Accounts</h3>
                <p className="text-xs text-gray-500">Create operational recruiter accounts and manage access state.</p>
              </div>

              <button
                onClick={() => setShowCreateRecruiterModal(true)}
                className="py-2.5 px-4 bg-amber-brand text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:bg-amber-hover flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Create Recruiter Account
              </button>
            </div>

            <div className="bg-white border border-paper-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-paper-200">
              {recruiters.map((r) => (
                <div key={r.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-ink-900 text-amber-brand font-bold text-sm flex items-center justify-center border border-ink-800">
                      {r.full_name.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base font-bold text-ink-900">{r.full_name}</span>
                        <span className="text-[10px] font-mono uppercase bg-paper-100 text-amber-brand font-bold px-2 py-0.5 rounded">
                          {r.role}
                        </span>
                        {!r.is_active && (
                          <span className="text-[10px] font-mono uppercase bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">
                        {r.email} • Jobs Managed: {r.job_count || 0}
                      </div>
                    </div>
                  </div>

                  {r.role !== 'admin' && (
                    <button
                      onClick={() => handleToggleRecruiterStatus(r.id, r.is_active ?? true)}
                      className={`py-1.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        r.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {r.is_active ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-red-600" /> Deactivate Account
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-emerald-600" /> Reactivate Account
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOG VIEW */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-paper-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink-900">Organization Audit Stream</h3>
                <p className="text-xs text-gray-500">Immutable audit log records of job deletions, candidate approvals, overrides, and emails.</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search audit action..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-paper-50 border border-paper-300 rounded-xl text-xs text-ink-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-white border border-paper-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-paper-200">
              {filteredAuditLogs.map((log) => (
                <div key={log.id} className="p-4 text-xs font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-ink-900 bg-paper-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-gray-500">by {log.user_name}</span>
                    </div>
                    <div className="text-gray-600">
                      Target: <span className="font-bold text-ink-900">{log.target_type}</span> ({log.target_id})
                    </div>
                    {log.metadata && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-400 flex-shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Recruiter Modal */}
        {showCreateRecruiterModal && (
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-paper-300">
              <h3 className="font-serif text-xl font-bold text-ink-900 mb-4">Create Recruiter User Account</h3>

              <form onSubmit={handleCreateRecruiterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-900 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newRecruiterName}
                    onChange={(e) => setNewRecruiterName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs font-semibold text-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-900 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newRecruiterEmail}
                    onChange={(e) => setNewRecruiterEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs font-semibold text-ink-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-900 mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={newRecruiterPass}
                    onChange={(e) => setNewRecruiterPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs font-semibold text-ink-900"
                  />
                </div>

                {recruiterFormError && (
                  <p className="text-xs font-bold text-red-600 font-mono">{recruiterFormError}</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateRecruiterModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-paper-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-brand hover:bg-amber-hover rounded-xl shadow-md"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Job Modal */}
        {jobToAssign && (
          <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-paper-300">
              <h3 className="font-serif text-xl font-bold text-ink-900 mb-2">Reassign Job Owner</h3>
              <p className="text-xs text-gray-500 mb-4">Job Title: {jobToAssign.title}</p>

              <form onSubmit={handleAssignJobSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-900 mb-1">Select Target Recruiter</label>
                  <select
                    value={assignRecruiterId}
                    onChange={(e) => setAssignRecruiterId(e.target.value)}
                    className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs font-bold text-ink-900"
                  >
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>{r.full_name} ({r.email})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setJobToAssign(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-paper-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-brand hover:bg-amber-hover rounded-xl shadow-md"
                  >
                    Save Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </>
      )}

        {/* Candidate Dossier Drawer Trigger from Approval Queue */}
        {selectedCandidate && selectedJobId && (
          <CandidateDossierDrawer
            candidate={selectedCandidate}
            jobId={selectedJobId}
            onClose={() => setSelectedCandidate(null)}
            onOverrideSuccess={() => {
              fetchApprovals();
              setSelectedCandidate(null);
            }}
          />
        )}
      </main>
    </div>
  );
};
