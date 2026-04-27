import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, FileText, User, TrendingUp, Bell } from 'lucide-react';

interface ApplicationWithJob {
  id: string;
  score_overall: number | null;
  score_breakdown: any;
  current_stage: string;
  applied_at: string;
  jobs: { id: string; title: string; location: string; department: string | null; workplace_type: string; };
}

export default function CandidateDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [publishedJobs, setPublishedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    // Fetch my applications with job info
    supabase.from('applications')
      .select('id, score_overall, score_breakdown, current_stage, applied_at, jobs(id, title, location, department, workplace_type)')
      .eq('candidate_id', profile.id)
      .order('applied_at', { ascending: false })
      .then(({ data }) => { setApplications((data as any) || []); setLoading(false); });

    // Fetch published jobs for browsing
    supabase.from('jobs')
      .select('id, title, location, department, workplace_type, required_skills')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { setPublishedJobs(data || []); });
  }, [profile]);

  const avgScore = applications.length > 0
    ? Math.round(applications.filter(a => a.score_overall).reduce((s, a) => s + (a.score_overall || 0), 0) / applications.filter(a => a.score_overall).length)
    : null;

  const scoreColor = (s: number) => s >= 70 ? '#16a34a' : s >= 50 ? '#ca8a04' : '#dc2626';

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="header-logo">Talentiaa</h1>
          <span className="role-badge role-candidate">Candidate</span>
        </div>
        <div className="header-right">
          <button className="btn-icon" title="Notifications"><Bell size={20} /></button>
          <div className="user-info">
            <div className="avatar">{profile?.full_name?.charAt(0).toUpperCase() || 'C'}</div>
            <span className="user-name">{profile?.full_name}</span>
          </div>
          <button className="btn btn-ghost" onClick={signOut}><LogOut size={18} /> Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-section">
          <h2>স্বাগতম, {profile?.full_name}! 👋</h2>
          <p>আপনার ক্যারিয়ারের পরবর্তী ধাপ শুরু করুন।</p>
        </div>

        {/* Stats */}
        <div className="dashboard-grid">
          <div className="dash-card">
            <div className="card-icon card-icon-blue"><FileText size={24} /></div>
            <h3>My Applications</h3>
            <p className="card-count">{applications.length}</p>
          </div>
          <div className="dash-card">
            <div className="card-icon card-icon-purple"><TrendingUp size={24} /></div>
            <h3>Avg Match Score</h3>
            <p className="card-count" style={avgScore ? { color: scoreColor(avgScore) } : {}}>{avgScore ? `${avgScore}%` : '—'}</p>
          </div>
          <div className="dash-card">
            <div className="card-icon card-icon-green"><User size={24} /></div>
            <h3>Profile</h3>
            <p className="card-count">Active</p>
          </div>
        </div>

        {/* My Applications List */}
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📋 My Applications</h3>
          {loading ? <p>Loading...</p> : applications.length === 0 ? (
            <div className="empty-state"><p>🔍 এখনো কোনো application নেই। নিচে Browse Jobs থেকে apply করুন!</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {applications.map(app => (
                <div key={app.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{app.jobs?.title || 'Job'}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{app.jobs?.department} · {app.jobs?.location} · {app.jobs?.workplace_type}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Applied: {new Date(app.applied_at).toLocaleDateString()} · Stage: <b>{app.current_stage}</b></div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {app.score_overall !== null ? (
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: scoreColor(app.score_overall) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: scoreColor(app.score_overall) }}>
                        {app.score_overall}%
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>No score</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Browse Jobs */}
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>🔍 Browse Jobs</h3>
          {publishedJobs.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No jobs posted yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {publishedJobs.map(job => (
                <div key={job.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{job.title}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{job.department} · {job.location} · {job.workplace_type}</div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                      {job.required_skills?.slice(0, 4).map((s: string) => (
                        <span key={s} style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: '12px', fontSize: '11px', color: '#4b5563' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => navigate(`/candidate/apply/${job.id}`)} style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Apply →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
