import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Shield, Users, Briefcase, Bell, TrendingUp, CheckCircle2, Clock, Trash2, ShieldAlert, Award, LayoutDashboard, UserPlus, Settings, ArrowRight, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import emailjs from '@emailjs/browser';
import type { UserProfile, Job } from '../../types/database';
import NotificationBell from '../../components/NotificationBell';

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'approvals'>('users');

  useEffect(() => {
    if (!profile) return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const { data: usersData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (usersData) setUsers(usersData);

    const { data: jobsData } = await supabase.from('jobs').select('*, users:recruiter_id(full_name)').order('created_at', { ascending: false });
    if (jobsData) setJobs(jobsData);

    const { data: appsData } = await supabase.from('applications')
      .select('id, current_stage, applied_at, users:candidate_id(full_name), jobs:job_id(title)')
      .order('applied_at', { ascending: true });
    if (appsData) setApplications(appsData);

    setLoading(false);
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'candidate' ? 'recruiter' : 'candidate';
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    }
  };

  const handleRecruiterVerification = async (user: UserProfile, action: 'approve' | 'reject') => {
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    const { error } = await supabase.from('users').update({ account_status: newStatus }).eq('id', user.id);
    
    if (!error) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, account_status: newStatus as any } : u));
      if (import.meta.env.VITE_EMAILJS_SERVICE_ID) {
        emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          {
            candidate_name: user.full_name,
            job_title: 'Recruiter Account',
            company_name: 'Talentiaa',
            status: action === 'approve' ? 'APPROVED! You can now post jobs.' : 'REJECTED. Please contact support.',
            to_email: user.email
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        ).catch(err => console.error(err));
      }
    }
  };

  const toggleJobStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'paused' : 'published';
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
    if (!error) {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus as any } : j));
    }
  };

  const totalCandidates = users.filter(u => u.role === 'candidate').length;
  const totalRecruiters = users.filter(u => u.role === 'recruiter' && u.account_status === 'active').length;
  const pendingRecruiters = users.filter(u => u.role === 'recruiter' && u.account_status === 'pending');
  const activeJobs = jobs.filter(j => j.status === 'published').length;
  const totalApps = applications.length;
  const hiredApps = applications.filter(a => a.current_stage === 'HIRED').length;
  const hiringRate = totalApps > 0 ? Math.round((hiredApps / totalApps) * 100) : 0;

  const appsByDate: Record<string, number> = {};
  applications.forEach(app => {
    const date = new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    appsByDate[date] = (appsByDate[date] || 0) + 1;
  });
  const areaChartData = Object.keys(appsByDate).map(date => ({ name: date, applications: appsByDate[date] })).slice(-10);

  const stageCounts = applications.reduce((acc, curr) => {
    acc[curr.current_stage] = (acc[curr.current_stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const donutData = Object.keys(stageCounts).map(stage => ({ name: stage, value: stageCounts[stage] }));
  const recentActivities = [...applications].sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()).slice(0, 5);

  return (
    <div className="dashboard-v2" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-body)' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'var(--secondary)', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit' }}>Talentiaa</span>
        </div>

        <nav style={{ flex: 1, padding: '1rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 1rem 0.5rem' }}>System</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <NavItem icon={<LayoutDashboard size={18} />} label="Analytics Overview" active={activeTab === 'users'} />
            <NavItem icon={<Users size={18} />} label="User Management" onClick={() => setActiveTab('users')} active={activeTab === 'users'} />
            <NavItem icon={<Briefcase size={18} />} label="Job Moderation" onClick={() => setActiveTab('jobs')} active={activeTab === 'jobs'} />
            <NavItem icon={<ShieldAlert size={18} />} label="Approvals" onClick={() => setActiveTab('approvals')} active={activeTab === 'approvals'} />
          </div>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>A</div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>System Admin</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Super Control</div>
            </div>
          </div>
          <button onClick={() => signOut()} className="btn btn-secondary" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', justifyContent: 'flex-start' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: '260px', padding: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin HQ Overview</h1>
            <p style={{ color: 'var(--text-muted)' }}>প্ল্যাটফর্মের পারফরম্যান্স এবং ইউজার ডাটা মনিটর করুন।</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <NotificationBell />
            <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>Refresh Data</button>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <StatCard title="Total Users" value={users.length} icon={<Users size={20} />} color="var(--primary)" subtitle={`${totalCandidates} Candidates`} />
          <StatCard title="Active Jobs" value={activeJobs} icon={<Briefcase size={20} />} color="var(--info)" subtitle={`${jobs.length} Total`} />
          <StatCard title="Total Applications" value={totalApps} icon={<BarChart3 size={20} />} color="var(--success)" subtitle="Across all jobs" />
          <StatCard title="Pending Approvals" value={pendingRecruiters.length} icon={<ShieldAlert size={20} />} color="var(--error)" subtitle="Action required" />
        </div>

        {/* Analytics Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-light)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Application Growth (Last 10 Days)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                  <Area type="monotone" dataKey="applications" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-light)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
             <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Stage Distribution</h3>
             <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                      {donutData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                {donutData.map((entry, index) => (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                    {entry.name}: {entry.value}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Management Area */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
            <TabItem label="Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
            <TabItem label="Jobs" active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} />
            <TabItem label="Approvals" active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} count={pendingRecruiters.length} />
          </div>

          <div className="data-table-container" style={{ border: 'none', borderRadius: '0' }}>
            <table className="data-table">
              {activeTab === 'users' && (
                <>
                  <thead>
                    <tr>
                      <th>USER INFO</th>
                      <th>ROLE</th>
                      <th>JOINED DATE</th>
                      <th style={{ textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => u.account_status === 'active').map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-error' : u.role === 'recruiter' ? 'badge-success' : 'badge-info'}`}>{u.role}</span></td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          {u.role !== 'admin' && (
                            <button onClick={() => toggleUserRole(u.id, u.role)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                              {u.role === 'candidate' ? 'Promote to Recruiter' : 'Revoke Recruiter'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'jobs' && (
                <>
                  <thead>
                    <tr>
                      <th>JOB TITLE</th>
                      <th>POSTED BY</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>MODERATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id}>
                        <td style={{ fontWeight: 600 }}>{j.title}</td>
                        <td>{(j as any).users?.full_name || 'N/A'}</td>
                        <td><span className={`badge ${j.status === 'published' ? 'badge-success' : 'badge-warning'}`}>{j.status}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <button onClick={() => toggleJobStatus(j.id, j.status)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', color: j.status === 'published' ? 'var(--error)' : 'var(--success)' }}>
                            {j.status === 'published' ? 'Pause Job' : 'Publish Job'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {activeTab === 'approvals' && (
                <>
                  <thead>
                    <tr>
                      <th>RECRUITER</th>
                      <th>COMPANY</th>
                      <th>ID CARD</th>
                      <th style={{ textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRecruiters.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No pending recruiter approvals found.</td></tr>
                    ) : pendingRecruiters.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.email}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.company_name}</td>
                        <td>
                          {r.id_card_url ? <a href={r.id_card_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>View ID Card</a> : 'N/A'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleRecruiterVerification(r, 'approve')} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'var(--success)' }}>Approve</button>
                            <button onClick={() => handleRecruiterVerification(r, 'reject')} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: 'var(--error)' }}>Reject</button>
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

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none',
        background: active ? 'rgba(255,255,255,0.1)' : 'transparent', color: active ? 'white' : '#94a3b8',
        fontWeight: active ? 600 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
      }}
    >
      <span style={{ color: active ? 'var(--primary)' : 'inherit' }}>{icon}</span>
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, color, subtitle }: { title: string, value: any, icon: any, color: string, subtitle: string }) {
  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ width: '40px', height: '40px', background: `${color}15`, color: color, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        {icon}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 700, margin: '0.25rem 0' }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</div>
    </div>
  );
}

function TabItem({ label, active, onClick, count }: { label: string, active: boolean, onClick: () => void, count?: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '1.25rem 2rem', border: 'none', background: 'none', fontSize: '0.9rem', fontWeight: 700,
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
      }}
    >
      {label}
      {count !== undefined && count > 0 && <span style={{ background: 'var(--error)', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '50px' }}>{count}</span>}
    </button>
  );
}
