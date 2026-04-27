export type UserRole = 'admin' | 'recruiter' | 'candidate';
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  email_verified: boolean;
  account_status: AccountStatus;
  avatar_url: string | null;
  created_at: string;
}

// Phase 2: Job Posting Types
export type JobStatus = 'draft' | 'published' | 'paused' | 'closed';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type WorkplaceType = 'onsite' | 'hybrid' | 'remote';
export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'lead';

export interface Job {
  id: string;
  recruiter_id: string;
  title: string;
  department: string | null;
  job_type: JobType;
  workplace_type: WorkplaceType;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_visible: boolean;
  experience_level: ExperienceLevel;
  required_skills: string[];
  description: string;
  application_deadline: string;
  hiring_count: number;
  threshold_score: number;
  scoring_config: Record<string, number>;
  status: JobStatus;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Phase 3 & 4: Application Types
export type ApplicationStage = 'REVIEW' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface Applicant {
  id: string;
  score_overall: number | null;
  current_stage: ApplicationStage;
  applied_at: string;
  users: { full_name: string; email: string } | null;
}

// Phase 9: Notifications
export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}
