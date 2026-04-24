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
