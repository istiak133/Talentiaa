export type UserRole = 'admin' | 'recruiter' | 'candidate';
export type AccountStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface UserProfile {
  // — Core fields (defined in talentiaa_schema.sql `users` table) —
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  email_verified: boolean;
  account_status: AccountStatus;
  avatar_url: string | null;
  created_at: string;

  // — Extended fields (added in Supabase but NOT in schema SQL — keep in sync) —
  company_name?: string | null;    // Recruiter company name
  id_card_url?: string | null;     // Recruiter ID verification doc
  university?: string | null;      // Candidate university
  major?: string | null;           // Candidate major/department
  cgpa?: number | null;            // Candidate CGPA
  hometown?: string | null;        // Candidate hometown
  study_program?: string | null;   // Candidate program (BSc, MSc, etc.)
  profile_pic_url?: string | null; // Profile picture URL
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
export type ApplicationStage = 'review' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface Applicant {
  id: string;
  candidate_id: string;
  score_overall: number | null;
  score_breakdown: any;
  current_stage: ApplicationStage;
  hidden_pool: boolean;
  applied_at: string;
  users: { full_name: string; email: string } | null;
  resumes?: { file_url: string } | null;
}

// Phase 9: Notifications
export type NotificationChannel = 'in_app' | 'email';
export type NotificationDeliveryStatus = 'queued' | 'sent' | 'failed' | 'skipped';

export interface AppNotification {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  event_type: string;
  title: string;
  message: string;
  payload: Record<string, any>;
  delivery_status: NotificationDeliveryStatus;
  is_read: boolean;
  read_at: string | null;
  related_application_id: string | null;
  sent_at: string | null;
  created_at: string;
}
