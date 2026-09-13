export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'recruiter' | 'admin';
  is_active?: boolean;
  created_at?: string;
}

export interface Job {
  id: string;
  title: string;
  raw_jd_text: string;
  mandatory_skills: string[];
  preferred_skills: string[];
  min_experience_years: number;
  education_requirements: string[];
  role_summary?: string;
  recruiter_id?: string;
  assigned_recruiter_id?: string;
  requirements_version?: number;
  deleted_at?: string;
  created_at: string;
}

export interface SkillMatch {
  skill: string;
  evidence_text: string;
  similarity_score: number;
  source_location: string;
}

export interface StrengthOrGap {
  title: string;
  evidence: string;
  source: string;
}

export interface CandidateEvaluation {
  match_percentage: number;
  recommendation: 'Strong Match' | 'Moderate Match' | 'Low Match';
  matched_mandatory: SkillMatch[];
  missing_mandatory: string[];
  matched_preferred: SkillMatch[];
  missing_preferred: string[];
  strengths: StrengthOrGap[];
  gaps: StrengthOrGap[];
  evidence: StrengthOrGap[];
  reviewer_status: 'validated' | 'flagged';
  reviewer_notes?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_note?: string;
  stage?: 'screened' | 'approved' | 'interview_requested' | 'interviewed' | 'hired' | 'rejected' | string;
  is_top_candidate?: boolean;
}

export interface CandidateRanking {
  rank: number;
  justification: string;
  is_manual_override: boolean;
  override_reason?: string;
}

export interface Candidate {
  id: string;
  job_id: string;
  redacted_name_token: string;
  file_path: string;
  stored_filename?: string;
  original_filename?: string;
  email?: string;
  name_extraction_status?: 'extracted' | 'failed' | 'ambiguous';
  extracted_name?: string;
  deleted_at?: string;
  created_at: string;
  parsed_json?: {
    skills?: string[];
    experience_years?: number;
    education?: string[];
    certifications?: string[];
    work_experience?: { title?: string; company?: string; duration?: string; description?: string }[];
    extracted_name?: string;
  };
  evaluation?: CandidateEvaluation;
  ranking?: CandidateRanking;
}

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata?: any;
  created_at: string;
}

export interface RecruiterUser extends User {
  job_count?: number;
}

export interface OrgJob extends Job {
  recruiter_name?: string;
  candidate_count?: number;
  pending_approval_count?: number;
}

