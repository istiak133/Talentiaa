import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Briefcase, Users, BarChart3, Bell, Plus } from 'lucide-react';

export default function RecruiterDashboard() {
  const { profile, signOut } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="header-logo">Talentiaa</h1>
          <span className="role-badge role-recruiter">Recruiter</span>
        </div>
        <div className="header-right">
          <button className="btn-icon" title="Notifications">
            <Bell size={20} />
          </button>
          <div className="user-info">
            <div className="avatar avatar-recruiter">
              {profile?.full_name?.charAt(0).toUpperCase() || 'R'}
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
          <p>আপনার রিক্রুটমেন্ট ড্যাশবোর্ড।</p>
        </div>

        <div className="dashboard-actions">
          <button className="btn btn-primary">
            <Plus size={18} /> নতুন জব পোস্ট করুন
          </button>
        </div>

        <div className="dashboard-grid">
          <div className="dash-card">
            <div className="card-icon card-icon-blue">
              <Briefcase size={24} />
            </div>
            <h3>Active Jobs</h3>
            <p className="card-count">0</p>
            <p className="card-desc">চালু চাকরি বিজ্ঞাপন</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-green">
              <Users size={24} />
            </div>
            <h3>Total Applications</h3>
            <p className="card-count">0</p>
            <p className="card-desc">মোট আবেদন</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-purple">
              <BarChart3 size={24} />
            </div>
            <h3>Hired</h3>
            <p className="card-count">0</p>
            <p className="card-desc">এই মাসে নিয়োগ</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-orange">
              <Bell size={24} />
            </div>
            <h3>Notifications</h3>
            <p className="card-count">0</p>
            <p className="card-desc">নতুন আপডেট</p>
          </div>
        </div>

        <div className="empty-state">
          <p>📋 এখনো কোনো জব পোস্ট করা হয়নি। <strong>"নতুন জব পোস্ট করুন"</strong> বাটনে ক্লিক করে শুরু করুন!</p>
        </div>
      </main>
    </div>
  );
}
