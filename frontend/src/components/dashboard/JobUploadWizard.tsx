import React, { useState } from 'react';
import { Upload, FileText, Plus, CheckCircle, Loader2, Sparkles, X, Star, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';

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

      // If empty fallback with title words
      if (combinedSkills.length === 0 && title.trim()) {
        const words = title.trim().split(/\s+/).filter(w => w.length > 2);
        words.forEach(w => {
          combinedSkills.push({ id: Math.random().toString(36).substring(7), name: w, is_mandatory: true });
        });
      }

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
      onJobCreated(job.id);
    } catch (err: any) {
      console.error('CREATE JOB ERROR', err);
      setFormError(err.response?.data?.detail || 'Failed to save job requirements.');
    } finally {
      setCreatingJob(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadResumes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdJobId || selectedFiles.length === 0) return;

    setUploadingResumes(true);
    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await api.post(`/jobs/${createdJobId}/candidates/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data;
      setTaskId(data.task_id);
      pollTaskStatus(data.task_id, createdJobId);
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Failed to upload resumes.');
      setUploadingResumes(false);
    }
  };

  const pollTaskStatus = (tId: string, jId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/jobs/${jId}/candidates/upload-status/${tId}`);
        const statusData = res.data;
        setProgress(statusData);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
          setUploadingResumes(false);
          onJobCreated(jId);
        }
      } catch (err) {
        clearInterval(interval);
        setUploadingResumes(false);
      }
    }, 1500);
  };

  return (
    <div className="bg-white border border-paper-200 rounded-2xl p-6 shadow-sm mb-8">
      {/* Step Indicator Header */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-paper-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-brand text-white flex items-center justify-center font-bold text-sm">
            {step}
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-ink-900">
              {step === 1 && 'Step 1: Enter Job Description & Extract Requirements'}
              {step === 2 && 'Step 2: Review & Choose Mandatory vs. Optional Skills'}
              {step === 3 && 'Step 3: Batch Upload Candidate Resumes'}
            </h2>
            <p className="text-xs text-gray-500">
              {step === 1 && 'Enter Job Title and Description. AI extracts all skills, experience, and education.'}
              {step === 2 && 'Click badges to toggle Mandatory vs Optional. Adjust experience years and custom skills.'}
              {step === 3 && 'Upload PDF/DOCX resumes for fairness-first PII redaction and transparent scoring.'}
            </p>
          </div>
        </div>

        {/* Step Progress Tracker */}
        <div className="hidden sm:flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${step === 1 ? 'bg-amber-brand text-white' : 'bg-paper-100 text-gray-600'}`}>1. JD & AI</span>
          <span className="text-gray-300">→</span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${step === 2 ? 'bg-amber-brand text-white' : 'bg-paper-100 text-gray-600'}`}>2. Requirements</span>
          <span className="text-gray-300">→</span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${step === 3 ? 'bg-amber-brand text-white' : 'bg-paper-100 text-gray-600'}`}>3. Resumes</span>
        </div>
      </div>

      {formError && (
        <div className="p-3 mb-6 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
          {formError}
        </div>
      )}

      {/* STEP 1: JOB DESCRIPTION INPUT */}
      {step === 1 && (
        <form onSubmit={handleAnalyzeJD} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer (Node.js / Python / REST API)"
              className="w-full p-3 bg-paper-50 border border-paper-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1">
              Job Description / Raw Requirements <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={6}
              value={rawJdText}
              onChange={(e) => setRawJdText(e.target.value)}
              placeholder="Paste full JD text or enter raw skills e.g.: NODE JS EXPRESS JS PYTHON REST API (Min 2 years exp)..."
              className="w-full p-3 bg-paper-50 border border-paper-300 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-amber-brand"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Tip: You can paste complete job postings, bullet lists, or comma/space-separated skill keywords.
            </p>
          </div>

          <button
            type="submit"
            disabled={analyzingJd}
            className="py-3 px-6 bg-ink-900 hover:bg-ink-800 text-paper-50 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            {analyzingJd ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Requirements with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-brand" /> Analyze & Review Extracted Requirements <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: REQUIREMENT CUSTOMIZATION */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">Recruiter Requirement Review</span>
              <p className="text-xs text-amber-800 mt-0.5">
                Click any skill badge to toggle between <strong>Mandatory</strong> (must-have) and <strong>Optional</strong> (bonus).
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-lg">
                {skillsList.filter(s => s.is_mandatory).length} Mandatory • {skillsList.filter(s => !s.is_mandatory).length} Optional
              </span>
            </div>
          </div>

          {/* Extracted Skills Badges */}
          <div>
            <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-2">
              Extracted Skills & Competencies ({skillsList.length})
            </label>

            <div className="flex flex-wrap gap-2.5 p-4 bg-paper-50 border border-paper-200 rounded-xl min-h-[90px] items-center">
              {skillsList.map((skill) => (
                <div
                  key={skill.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                    skill.is_mandatory
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-white text-ink-900 border-paper-300 hover:border-paper-400'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleMandatory(skill.id)}
                    className="flex items-center gap-1.5 focus:outline-none"
                    title="Click to toggle Mandatory vs Optional"
                  >
                    <span className="font-bold">{skill.name}</span>
                    <span
                      className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-extrabold ${
                        skill.is_mandatory ? 'bg-amber-700 text-amber-100' : 'bg-paper-200 text-gray-700'
                      }`}
                    >
                      {skill.is_mandatory ? '★ Mandatory' : 'Optional'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.id)}
                    className={`p-0.5 rounded-full hover:bg-black/20 focus:outline-none ${
                      skill.is_mandatory ? 'text-amber-100' : 'text-gray-400 hover:text-red-600'
                    }`}
                    title="Remove skill"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {skillsList.length === 0 && (
                <div className="text-xs text-gray-400 italic">No skills extracted. Add custom skills below.</div>
              )}
            </div>
          </div>

          {/* Add Custom Skill Form */}
          <form onSubmit={handleAddSkill} className="flex flex-wrap items-center gap-3 p-3 bg-paper-50 border border-paper-200 rounded-xl">
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Add another skill (e.g. GraphQL, Docker, PostgreSQL)..."
              className="flex-1 min-w-[200px] p-2 bg-white border border-paper-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-brand"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSkillMandatory}
                  onChange={(e) => setNewSkillMandatory(e.target.checked)}
                  className="rounded text-amber-brand focus:ring-amber-brand"
                />
                Mandatory
              </label>
              <button
                type="submit"
                disabled={!newSkillName.trim()}
                className="py-2 px-3 bg-ink-900 text-white text-xs font-bold rounded-lg hover:bg-ink-800 disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Skill
              </button>
            </div>
          </form>

          {/* Experience & Education Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1">
                Minimum Experience Required (Years)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={minExpYears}
                onChange={(e) => setMinExpYears(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-900 uppercase tracking-wider mb-1">
                Preferred Education / Degree
              </label>
              <input
                type="text"
                value={educationReq}
                onChange={(e) => setEducationReq(e.target.value)}
                placeholder="e.g. Bachelor's in Computer Science or related engineering discipline"
                className="w-full p-2.5 bg-paper-50 border border-paper-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-brand"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-paper-200">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-2.5 px-4 text-xs font-semibold text-gray-600 hover:text-ink-900 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Edit JD
            </button>

            <button
              type="button"
              onClick={handleConfirmAndCreateJob}
              disabled={creatingJob}
              className="py-3 px-6 bg-amber-brand hover:bg-amber-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {creatingJob ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Job...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save Job & Proceed to Resume Upload <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: BATCH RESUME UPLOAD */}
      {step === 3 && (
        <form onSubmit={handleUploadResumes} className="space-y-4">
          <div className="border-2 border-dashed border-paper-300 rounded-2xl p-8 text-center bg-paper-50/50 hover:bg-paper-50 transition-all">
            <Upload className="w-10 h-10 text-amber-brand mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink-900">Select PDF or DOCX Resume Files</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">Batch process candidate resumes concurrently against the configured requirements</p>

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
              className="px-4 py-2 bg-white border border-paper-300 text-ink-900 font-semibold text-xs rounded-xl shadow-sm cursor-pointer hover:bg-paper-100"
            >
              Browse Files ({selectedFiles.length} selected)
            </label>
          </div>

          {selectedFiles.length > 0 && (
            <div className="text-xs font-mono text-gray-600 space-y-1">
              {selectedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-brand" /> {f.name} ({(f.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          )}

          {progress && (
            <div className="p-4 bg-amber-light border border-amber-brand rounded-xl">
              <div className="flex justify-between text-xs font-bold text-amber-900 mb-1">
                <span>Batch Agent Processing Active</span>
                <span>{progress.processed} / {progress.total} Candidates Completed</span>
              </div>
              <div className="w-full bg-amber-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-brand h-full transition-all duration-300"
                  style={{ width: `${(progress.processed / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 items-center">
            <button
              type="submit"
              disabled={uploadingResumes || selectedFiles.length === 0}
              className="py-3 px-6 bg-amber-brand hover:bg-amber-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {uploadingResumes ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Screening Candidate Resumes...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Start Agentic Resume Evaluation
                </>
              )}
            </button>

            {!jobId && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-4 text-xs font-semibold text-gray-600 hover:text-ink-900"
              >
                Back to Requirement Review
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
