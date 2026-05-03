import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Shield, Users, Briefcase, ShieldAlert, LayoutDashboard, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import emailjs from '@emailjs/browser';
import type { UserProfile, Job } from '../../types/database';
import NotificationBell from '../../components/NotificationBell';
import AnimatedBackground from '../../components/AnimatedBackground';

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'approvals'>('users');

  useEffect(() => { if (profile) fetchData(); }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const { data: u } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (u) setUsers(u);
    const { data: j } = await supabase.from('jobs').select('*, users:recruiter_id(full_name)').order('created_at', { ascending: false });
    if (j) setJobs(j);
    const { data: a } = await supabase.from('applications').select('id, current_stage, applied_at, users:candidate_id(full_name), jobs:job_id(title)').order('applied_at', { ascending: true });
    if (a) setApplications(a);
    setLoading(false);
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'candidate' ? 'recruiter' : 'candidate';
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
  };

  const handleRecruiterVerification = async (user: UserProfile, action: 'approve' | 'reject') => {
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    const { error } = await supabase.from('users').update({ account_status: newStatus }).eq('id', user.id);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, account_status: newStatus as any } : u));
      if (import.meta.env.VITE_EMAILJS_SERVICE_ID) {
        emailjs.send(import.meta.env.VITE_EMAILJS_SERVICE_ID, import.meta.env.VITE_EMAILJS_TEMPLATE_ID, {
          candidate_name: user.full_name, job_title: 'Recruiter Account', company_name: 'Talentiaa',
          status: action === 'approve' ? 'APPROVED! You can now post jobs.' : 'REJECTED. Please contact support.', to_email: user.email
        }, import.meta.env.VITE_EMAILJS_PUBLIC_KEY).catch(err => console.error(err));
      }
    }
  };

  const toggleJobStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'paused' : 'published';
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
    if (!error) setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus as any } : j));
  };

  const pendingRecruiters = users.filter(u => u.role === 'recruiter' && u.account_status === 'pending');
  const activeJobs = jobs.filter(j => j.status === 'published').length;

  const appsByDate: Record<string, number> = {};
  applications.forEach(a => { const d = new Date(a.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); appsByDate[d] = (appsByDate[d] || 0) + 1; });
  const areaChartData = Object.keys(appsByDate).map(d => ({ name: d, applications: appsByDate[d] })).slice(-10);

  const stageCounts = applications.reduce((acc, c) => { acc[c.current_stage] = (acc[c.current_stage] || 0) + 1; return acc; }, {} as Record<string, number>);
  const COLORS = ['#0071e3', '#5ac8fa', '#34c759', '#ff9f0a', '#ff3b30'];
  const donutData = Object.keys(stageCounts).map(s => ({ name: s, value: stageCounts[s] }));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-body)' }}>
      {/* Sidebar */}
      <aside style={{ width: '250px', background: '#000', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100, animation: 'slideInLeft 0.4s var(--ease-apple)', overflow: 'hidden' }}>
        <AnimatedBackground variant="dots" particleCount={25} color="255, 255, 255" speed={0.15} connectDistance={0} style={{ opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="nav-logo" style={{ color: 'white', fontSize: '1.25rem' }}>Talentiaa</span>
        </div>
        <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <SideItem icon={<LayoutDashboard size={17} />} label="Overview" active onClick={() => setActiveTab('users')} />
            <SideItem icon={<Users size={17} />} label="Users" onClick={() => setActiveTab('users')} active={activeTab === 'users'} />
            <SideItem icon={<Briefcase size={17} />} label="Jobs" onClick={() => setActiveTab('jobs')} active={activeTab === 'jobs'} />
            <SideItem icon={<ShieldAlert size={17} />} label="Approvals" onClick={() => setActiveTab('approvals')} active={activeTab === 'approvals'} badge={pendingRecruiters.length} />
          </div>
        </nav>
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', padding: '0 0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#48484a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' }}>A</div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Admin</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>Super Admin</div>
            </div>
          </div>
          <button onClick={() => signOut()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: '250px', padding: '2rem 2.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', animation: 'fadeInUp 0.5s var(--ease-apple)' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Admin Overview</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Monitor platform performance and user activity.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <NotificationBell />
            <button onClick={fetchData} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Refresh</button>
          </div>
        </header>

        {/* Stats */}
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Total Users" value={users.length} color="var(--primary)" sub={`${users.filter(u => u.role === 'candidate').length} candidates`} />
          <StatCard label="Active Jobs" value={activeJobs} color="#5ac8fa" sub={`${jobs.length} total`} />
          <StatCard label="Applications" value={applications.length} color="#34c759" sub="All time" />
          <StatCard label="Pending" value={pendingRecruiters.length} color="#ff3b30" sub="Needs action" />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', marginBottom: '2rem', animation: 'fadeInUp 0.5s var(--ease-apple) 0.15s both' }}>
          <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1.25rem' }}>Application Trend</h3>
            <div style={{ height: '260px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData}>
                  <defs><linearGradient id="cA" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0071e3" stopOpacity={0.12}/><stop offset="95%" stopColor="#0071e3" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)', fontSize: '0.82rem' }} />
                  <Area type="monotone" dataKey="applications" stroke="#0071e3" strokeWidth={2.5} fillOpacity={1} fill="url(#cA)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.75rem' }}>Stage Distribution</h3>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">{donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginTop: '0.5rem' }}>
              {donutData.map((e, i) => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />{e.name}: {e.value}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs + Table */}
        <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', overflow: 'hidden', animation: 'fadeInUp 0.5s var(--ease-apple) 0.25s both' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
            {(['users', 'jobs', 'approvals'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '1rem 1.5rem', border: 'none', background: 'none', fontSize: '0.85rem', fontWeight: 600,
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer', transition: 'var(--transition-smooth)', display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'approvals' && pendingRecruiters.length > 0 && (
                  <span style={{ background: 'var(--error)', color: 'white', fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>{pendingRecruiters.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="data-table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              {activeTab === 'users' && (
                <>
                  <thead><tr><th>User</th><th>Role</th><th>Joined</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                  <tbody>
                    {users.filter(u => u.account_status === 'active').map(u => (
                      <tr key={u.id}>
                        <td><div style={{ fontWeight: 600 }}>{u.full_name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email}</div></td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-error' : u.role === 'recruiter' ? 'badge-success' : 'badge-info'}`}>{u.role}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>{u.role !== 'admin' && <button onClick={() => toggleUserRole(u.id, u.role)} className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem' }}>{u.role === 'candidate' ? 'Make Recruiter' : 'Revoke'}</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'jobs' && (
                <>
                  <thead><tr><th>Job</th><th>Posted By</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id}>
                        <td style={{ fontWeight: 600 }}>{j.title}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{(j as any).users?.full_name || '—'}</td>
                        <td><span className={`badge ${j.status === 'published' ? 'badge-success' : 'badge-warning'}`}>{j.status}</span></td>
                        <td style={{ textAlign: 'right' }}><button onClick={() => toggleJobStatus(j.id, j.status)} className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem', color: j.status === 'published' ? 'var(--error)' : 'var(--success)' }}>{j.status === 'published' ? 'Pause' : 'Publish'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'approvals' && (
                <>
                  <thead><tr><th>Recruiter</th><th>Company</th><th>ID Card</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                  <tbody>
                    {pendingRecruiters.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No pending approvals.</td></tr>
                    ) : pendingRecruiters.map(r => (
                      <tr key={r.id}>
                        <td><div style={{ fontWeight: 600 }}>{r.full_name}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.email}</div></td>
                        <td style={{ fontWeight: 600 }}>{r.company_name}</td>
                        <td>{r.id_card_url ? <a href={r.id_card_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.82rem' }}>View</a> : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleRecruiterVerification(r, 'approve')} className="btn btn-primary" style={{ fontSize: '0.72rem', padding: '0.35rem 0.85rem' }}>Approve</button>
                            <button onClick={() => handleRecruiterVerification(r, 'reject')} style={{ fontSize: '0.72rem', padding: '0.35rem 0.85rem', background: 'var(--error-light)', color: 'var(--error)', border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideItem({ icon, label, active, onClick, badge }: { icon: any; label: string; active?: boolean; onClick?: () => void; badge?: number }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.45)', fontWeight: active ? 600 : 400, fontSize: '0.88rem', cursor: 'pointer', transition: 'var(--transition-smooth)', textAlign: 'left' }}>
      {icon}{label}
      {badge !== undefined && badge > 0 && <span style={{ marginLeft: 'auto', background: 'var(--error)', color: 'white', fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>{badge}</span>}
    </button>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: any; color: string; sub: string }) {
  return (
    <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', transition: 'var(--transition-smooth)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, marginBottom: '0.75rem' }} />
      <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '0.15rem' }}>{label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>
    </div>
  );
}
