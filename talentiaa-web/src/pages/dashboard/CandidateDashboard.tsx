import { useAuth } from '../../contexts/AuthContext';
import { LogOut, FileText, User, TrendingUp, Bell } from 'lucide-react';

export default function CandidateDashboard() {
  const { profile, signOut } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="header-logo">Talentiaa</h1>
          <span className="role-badge role-candidate">Candidate</span>
        </div>
        <div className="header-right">
          <button className="btn-icon" title="Notifications">
            <Bell size={20} />
          </button>
          <div className="user-info">
            <div className="avatar">
              {profile?.full_name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <span className="user-name">{profile?.full_name}</span>
          </div>
          <button className="btn btn-ghost" onClick={signOut}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-section">
          <h2>স্বাগতম, {profile?.full_name}! 👋</h2>
          <p>আপনার ক্যারিয়ারের পরবর্তী ধাপ শুরু করুন।</p>
        </div>

        <div className="dashboard-grid">
          <div className="dash-card">
            <div className="card-icon card-icon-blue">
              <FileText size={24} />
            </div>
            <h3>My Applications</h3>
            <p className="card-count">0</p>
            <p className="card-desc">Apply করা চাকরির তালিকা</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-green">
              <User size={24} />
            </div>
            <h3>My Profile</h3>
            <p className="card-count">0%</p>
            <p className="card-desc">প্রোফাইল সম্পূর্ণতা</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-purple">
              <TrendingUp size={24} />
            </div>
            <h3>Match Score</h3>
            <p className="card-count">—</p>
            <p className="card-desc">গড় ম্যাচ স্কোর</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-orange">
              <Bell size={24} />
            </div>
            <h3>Notifications</h3>
            <p className="card-count">0</p>
            <p className="card-desc">নতুন নোটিফিকেশন</p>
          </div>
        </div>

        <div className="empty-state">
          <p>🔍 এখনো কোনো application নেই। <strong>Job Board</strong> থেকে আপনার পছন্দের চাকরিতে apply করুন!</p>
        </div>
      </main>
    </div>
  );
}
