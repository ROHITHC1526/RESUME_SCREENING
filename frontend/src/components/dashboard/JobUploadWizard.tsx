import React, { useState } from 'react';
import { Upload, FileText, Plus, CheckCircle, Sparkles, X, Star, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';
import { InfinityLoader } from '../common/InfinityLoader';

interface JobUploadWizardProps {
  jobId?: string;
  onJobCreated: (jobId: string) => void;
}

interface SkillItem {
  id: string;
  name: string;
  is_mandatory: boolean;
}

export const JobUploadWizard: React.FC<JobUploadWizardProps> = ({ jobId, onJobCreated }) => {
  // Step 1: Input JD, Step 2: Review & Customize Requirements, Step 3: Batch Upload Resumes
  const [step, setStep] = useState<1 | 2 | 3>(jobId ? 3 : 1);
  const [title, setTitle] = useState('');
  const [rawJdText, setRawJdText] = useState('');
  const [minExpYears, setMinExpYears] = useState<number>(0);
  const [educationReq, setEducationReq] = useState<string>('');
  
  // Extracted and customizable skills
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillMandatory, setNewSkillMandatory] = useState(true);

  const [analyzingJd, setAnalyzingJd] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(jobId || null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingResumes, setUploadingResumes] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ status: string; processed: number; total: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Step 1 -> Step 2: Trigger AI JD Analysis
  const handleAnalyzeJD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a job title.');
      return;
    }
    const jdText = rawJdText.trim() || title.trim();

    setAnalyzingJd(true);
    setFormError(null);

    try {
      const res = await api.post('/jobs/analyze-jd', { raw_jd_text: jdText });
      const data = res.data;

      const mandSkills: string[] = data.mandatory_skills || [];
      const prefSkills: string[] = data.preferred_skills || [];

      const combinedSkills: SkillItem[] = [];
      const seen = new Set<string>();

      mandSkills.forEach((s) => {
        if (s && !seen.has(s.toLowerCase())) {
          seen.add(s.toLowerCase());
          combinedSkills.push({ id: Math.random().toString(36).substring(7), name: s, is_mandatory: true });
        }
      });

      prefSkills.forEach((s) => {
        if (s && !seen.has(s.toLowerCase())) {
          seen.add(s.toLowerCase());
          combinedSkills.push({ id: Math.random().toString(36).substring(7), name: s, is_mandatory: false });
        }
      });

      setSkillsList(combinedSkills);
      setMinExpYears(Number(data.min_experience_years) || 0);
      setEducationReq(data.education_requirements?.[0] || '');
      setStep(2);
    } catch (err: any) {
      console.error('JD ANALYSIS ERROR', err);
      setFormError(err.response?.data?.detail || 'Failed to analyze job description.');
    } finally {
      setAnalyzingJd(false);
    }
  };

  // Toggle skill between mandatory and optional
  const handleToggleMandatory = (id: string) => {
    setSkillsList(prev => prev.map(s => s.id === id ? { ...s, is_mandatory: !s.is_mandatory } : s));
  };

  // Remove skill
  const handleRemoveSkill = (id: string) => {
    setSkillsList(prev => prev.filter(s => s.id !== id));
  };

  // Add custom skill
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const clean = newSkillName.trim();
    if (!skillsList.some(s => s.name.toLowerCase() === clean.toLowerCase())) {
      setSkillsList(prev => [
        ...prev,
        { id: Math.random().toString(36).substring(7), name: clean, is_mandatory: newSkillMandatory }
      ]);
    }
    setNewSkillName('');
  };

  // Step 2 -> Step 3: Persist Job with Confirmed Requirements
  const handleConfirmAndCreateJob = async () => {
    setCreatingJob(true);
    setFormError(null);

    const mandatory = skillsList.filter(s => s.is_mandatory).map(s => s.name);
    const preferred = skillsList.filter(s => !s.is_mandatory).map(s => s.name);

    const payload = {
      title: title.trim(),
      raw_jd_text: rawJdText.trim() || title.trim(),
      mandatory_skills: mandatory,
      preferred_skills: preferred,
      min_experience_years: minExpYears,
      education_requirements: educationReq ? [educationReq] : []
    };

    try {
      const res = await api.post('/jobs', payload);
      const job = res.data;
      setCreatedJobId(job.id);
      setStep(3);
    } catch (err: any) {
      console.error('JOB CREATION ERROR', err);
      setFormError(err.response?.data?.detail || 'Failed to create job posting.');
    } finally {
      setCreatingJob(false);
    }
  };

  // Step 3: Handle File Upload & Polling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadResumes = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetJobId = createdJobId || jobId;
    if (!targetJobId || selectedFiles.length === 0) return;

    setUploadingResumes(true);
    setFormError(null);

    const formData = new FormData();
    selectedFiles.forEach((f) => formData.append('files', f));

    try {
      const res = await api.post(`/jobs/${targetJobId}/candidates/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const tid = res.data.task_id;
      setTaskId(tid);
      pollProgress(tid, targetJobId);
    } catch (err: any) {
      console.error('UPLOAD ERROR', err);
      setFormError(err.response?.data?.detail || 'Failed to upload resumes.');
      setUploadingResumes(false);
    }
  };

  const pollProgress = (tid: string, jid: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        let res;
        try {
          res = await api.get(`/jobs/tasks/${tid}/progress`);
        } catch (e: any) {
          if (e.response?.status === 404) {
            res = await api.get(`/jobs/${jid}/candidates/upload-status/${tid}`);
          } else {
            throw e;
          }
        }

        if (res && res.data) {
          setProgress(res.data);
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            clearInterval(interval);
            setUploadingResumes(false);
            onJobCreated(jid);
          }
        }
      } catch (err) {
        // If still processing or temporary lag, retry up to 10 attempts before concluding
        if (attempts >= 8) {
          clearInterval(interval);
          setUploadingResumes(false);
          onJobCreated(jid);
        }
      }
    }, 1500);
  };

  return (
    <div className="bg-white dark:bg-ink-800 border border-paper-200 dark:border-ink-700 rounded-2xl p-6 shadow-sm mb-8 transition-colors">
      
      {/* Fullscreen / Inline Infinity Loader Overlays during Wait States */}
      {analyzingJd && (
        <div className="py-12 flex items-center justify-center">
          <InfinityLoader
            size="lg"
            message="AI Agent Analyzing Job Description & Requirements"
            submessage="Extracting core technical skills, experience threshold, soft skills & education qualifications..."
          />
        </div>
      )}

      {creatingJob && (
        <div className="py-12 flex items-center justify-center">
          <InfinityLoader
            size="lg"
            message="Persisting Job & Requirements Graph"
            submessage="Configuring custom mandatory/preferred taxonomy and versioning schema..."
          />
        </div>
      )}

      {!analyzingJd && !creatingJob && (
        <>
          {/* Step Indicator Header */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-paper-200 dark:border-ink-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-brand text-white flex items-center justify-center font-bold text-sm">
                {step}
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-ink-900 dark:text-white">
                  {step === 1 && 'Step 1: Enter Job Description & Extract Requirements'}
                  {step === 2 && 'Step 2: Review & Choose Mandatory vs. Optional Skills'}
                  {step === 3 && 'Step 3: Batch Upload Candidate Resumes'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-paper-300">
                  {step === 1 && 'Enter Job Title and Description. AI extracts all skills, experience, and education.'}
                  {step === 2 && 'Click badges to toggle Mandatory vs Optional. Adjust experience years and custom skills.'}
                  {step === 3 && 'Upload PDF/DOCX resumes for fairness-first PII redaction and transparent scoring.'}
                </p>
              </div>
            </div>

            {/* Step Progress Tracker */}
            <div className="hidden sm:flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${step === 1 ? 'bg-amber-brand text-white' : 'bg-paper-100 dark:bg-ink-700 text-gray-600 dark:text-paper-300'}`}>1. JD & AI</span>
              <span className="text-gray-300 dark:text-ink-600">→</span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${step === 2 ? 'bg-amber-brand text-white' : 'bg-paper-100 dark:bg-ink-700 text-gray-600 dark:text-paper-300'}`}>2. Requirements</span>
              <span className="text-gray-300 dark:text-ink-600">→</span>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${step === 3 ? 'bg-amber-brand text-white' : 'bg-paper-100 dark:bg-ink-700 text-gray-600 dark:text-paper-300'}`}>3. Resumes</span>
            </div>
          </div>

          {formError && (
            <div className="p-3 mb-6 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-200 text-xs font-semibold rounded-xl">
              {formError}
            </div>
          )}

          {/* STEP 1: JOB DESCRIPTION INPUT */}
          {step === 1 && (
            <form onSubmit={handleAnalyzeJD} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-900 dark:text-paper-200 uppercase tracking-wider mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer (Node.js / Python / REST API)"
                  className="w-full p-3 bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-900 dark:text-paper-200 uppercase tracking-wider mb-1">
                  Raw Job Description Text <span className="text-gray-400 font-normal">(AI Agent extracts all skills & criteria)</span>
                </label>
                <textarea
                  rows={8}
                  value={rawJdText}
                  onChange={(e) => setRawJdText(e.target.value)}
                  placeholder="Paste the full job posting text here. Include required responsibilities, technical stacks (e.g. Node.js, Express, Python, Docker, AWS), min experience years, and degree preferences."
                  className="w-full p-3 bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-600 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-brand dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="btn-animated-upload py-3 px-6 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 group"
              >
                <Sparkles className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" /> 
                <span>Analyze & Review Extracted Requirements</span> 
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: REQUIREMENT CUSTOMIZATION */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider block">Recruiter Requirement Review</span>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Click any skill badge to toggle between <strong>Mandatory</strong> (must-have) and <strong>Optional</strong> (bonus).
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/60 px-2.5 py-1 rounded-lg">
                    {skillsList.filter(s => s.is_mandatory).length} Mandatory • {skillsList.filter(s => !s.is_mandatory).length} Optional
                  </span>
                </div>
              </div>

              {/* Extracted Skills Badges */}
              <div>
                <label className="block text-xs font-semibold text-ink-900 dark:text-paper-200 uppercase tracking-wider mb-2">
                  Extracted Skills & Competencies ({skillsList.length})
                </label>

                <div className="flex flex-wrap gap-2.5 p-4 bg-paper-50 dark:bg-ink-900 border border-paper-200 dark:border-ink-700 rounded-xl min-h-[90px] items-center">
                  {skillsList.map((skill) => (
                    <div
                      key={skill.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                        skill.is_mandatory
                          ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                          : 'bg-white dark:bg-ink-800 text-ink-900 dark:text-paper-200 border-paper-300 dark:border-ink-600 hover:border-paper-400'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleMandatory(skill.id)}
                        className="flex items-center gap-1.5 hover:underline"
                        title="Click to toggle Mandatory vs Optional"
                      >
                        {skill.is_mandatory ? (
                          <span className="bg-white text-amber-700 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider">
                            Mandatory
                          </span>
                        ) : (
                          <span className="bg-paper-100 dark:bg-ink-700 text-gray-600 dark:text-paper-300 px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider">
                            Optional
                          </span>
                        )}
                        <span>{skill.name}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                        title="Remove skill"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {skillsList.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No skills extracted yet. Add custom skills below.</span>
                  )}
                </div>
              </div>

              {/* Add Custom Skill Form */}
              <form onSubmit={handleAddSkill} className="flex flex-col sm:flex-row gap-3 items-end p-4 bg-paper-100 dark:bg-ink-900/60 rounded-xl border border-paper-200 dark:border-ink-700">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-ink-900 dark:text-paper-200 uppercase tracking-wider mb-1">
                    Add Custom Requirement / Skill
                  </label>
                  <input
                    type="text"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="e.g. Express.js, GraphQL, Kubernetes, Microservices"
                    className="w-full p-2 bg-white dark:bg-ink-800 border border-paper-300 dark:border-ink-600 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-brand"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-ink-900 dark:text-paper-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newSkillMandatory}
                      onChange={(e) => setNewSkillMandatory(e.target.checked)}
                      className="w-4 h-4 text-amber-brand rounded focus:ring-amber-brand"
                    />
                    <span className="font-semibold">Mark as Mandatory</span>
                  </label>

                  <button
                    type="submit"
                    className="py-2 px-4 bg-ink-800 dark:bg-ink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-ink-900 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Skill
                  </button>
                </div>
              </form>

              {/* Experience & Education Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 dark:text-paper-200 uppercase tracking-wider mb-1">
                    Minimum Experience Required (Years)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={minExpYears}
                    onChange={(e) => setMinExpYears(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-600 rounded-xl text-xs font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-brand"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 dark:text-paper-200 uppercase tracking-wider mb-1">
                    Preferred Education / Degree
                  </label>
                  <input
                    type="text"
                    value={educationReq}
                    onChange={(e) => setEducationReq(e.target.value)}
                    placeholder="e.g. Bachelor's in Computer Science or related engineering discipline"
                    className="w-full p-2.5 bg-paper-50 dark:bg-ink-900 border border-paper-300 dark:border-ink-600 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-brand"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-paper-200 dark:border-ink-700">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 px-4 text-xs font-semibold text-gray-600 dark:text-paper-300 hover:text-ink-900 dark:hover:text-white flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Edit JD
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndCreateJob}
                  className="btn-animated-upload py-3 px-6 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Save Job & Proceed to Resume Upload <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BATCH RESUME UPLOAD */}
          {step === 3 && (
            <div className="space-y-4">
              {uploadingResumes ? (
                <div className="py-8">
                  <InfinityLoader
                    size="xl"
                    message="Agentic AI Screening Candidate Pool..."
                    submessage={
                      progress
                        ? `Processing ${progress.processed} of ${progress.total} candidate resumes with vector RAG & transparent evidence extraction...`
                        : "Concurrently redacting PII, extracting real candidate skills, and evaluating match scores..."
                    }
                  />

                  {progress && progress.total > 0 && (
                    <div className="max-w-md mx-auto mt-6">
                      <div className="flex justify-between text-xs font-bold text-amber-900 dark:text-amber-200 mb-1 font-mono">
                        <span>Progress</span>
                        <span>{Math.round((progress.processed / progress.total) * 100)}% ({progress.processed}/{progress.total})</span>
                      </div>
                      <div className="w-full bg-paper-200 dark:bg-ink-900 h-2.5 rounded-full overflow-hidden border border-paper-300 dark:border-ink-700">
                        <div
                          className="bg-gradient-to-r from-amber-brand via-amber-400 to-emerald-500 h-full transition-all duration-300 shadow-sm"
                          style={{ width: `${(progress.processed / Math.max(1, progress.total)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleUploadResumes} className="space-y-4">
                  <div className="border-2 border-dashed border-paper-300 dark:border-ink-600 rounded-2xl p-8 text-center bg-paper-50/50 dark:bg-ink-900/50 hover:bg-paper-50 dark:hover:bg-ink-900 transition-all">
                    <Upload className="w-10 h-10 text-amber-brand mx-auto mb-3 animate-float-slow" />
                    <p className="text-sm font-semibold text-ink-900 dark:text-paper-100">Select PDF or DOCX Resume Files</p>
                    <p className="text-xs text-gray-500 dark:text-paper-300 mt-1 mb-4">Batch process candidate resumes concurrently against the configured requirements</p>

                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                      id="resume-upload-input"
                    />
                    <label
                      htmlFor="resume-upload-input"
                      className="px-4 py-2 bg-white dark:bg-ink-800 border border-paper-300 dark:border-ink-600 text-ink-900 dark:text-paper-100 font-semibold text-xs rounded-xl shadow-sm cursor-pointer hover:bg-paper-100 dark:hover:bg-ink-700"
                    >
                      Browse Files ({selectedFiles.length} selected)
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="text-xs font-mono text-gray-600 dark:text-paper-300 space-y-1 max-h-36 overflow-y-auto p-2 bg-paper-50 dark:bg-ink-900/50 rounded-xl">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-amber-brand" /> {f.name} ({(f.size / 1024).toFixed(1)} KB)
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 items-center pt-2">
                    <button
                      type="submit"
                      disabled={selectedFiles.length === 0}
                      className="btn-animated-upload py-3.5 px-7 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none group"
                    >
                      <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform animate-float-slow" /> 
                      <span>Start Agentic Resume Evaluation ({selectedFiles.length} files)</span>
                    </button>

                    {!jobId && (
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="py-3 px-4 text-xs font-semibold text-gray-600 dark:text-paper-300 hover:text-ink-900 dark:hover:text-white"
                      >
                        Back to Requirement Review
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
