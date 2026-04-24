import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Shield, Users, Briefcase, Bell } from 'lucide-react';

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="header-logo">Talentiaa</h1>
          <span className="role-badge role-admin">Admin</span>
        </div>
        <div className="header-right">
          <button className="btn-icon" title="Notifications">
            <Bell size={20} />
          </button>
          <div className="user-info">
            <div className="avatar avatar-admin">
              {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
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
          <h2>Admin Panel 🛡️</h2>
          <p>প্ল্যাটফর্ম ম্যানেজমেন্ট ড্যাশবোর্ড।</p>
        </div>

        <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
          <div className="dash-card">
            <div className="card-icon card-icon-blue">
              <Users size={24} />
            </div>
            <h3>Total Users</h3>
            <p className="card-count">—</p>
            <p className="card-desc">মোট ব্যবহারকারী</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-green">
              <Shield size={24} />
            </div>
            <h3>Recruiters</h3>
            <p className="card-count">—</p>
            <p className="card-desc">সক্রিয় রিক্রুটার</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-purple">
              <Briefcase size={24} />
            </div>
            <h3>Active Jobs</h3>
            <p className="card-count">—</p>
            <p className="card-desc">চালু চাকরি</p>
          </div>
        </div>
      </main>
    </div>
  );
}
