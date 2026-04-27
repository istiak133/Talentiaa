import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Shield, Users, Briefcase, Bell, TrendingUp, CheckCircle2, Clock, Trash2, ShieldAlert, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import emailjs from '@emailjs/browser';
import type { UserProfile, Job } from '../../types/database';
import NotificationBell from '../../components/NotificationBell';

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'jobs' | 'approvals'>('users');

  useEffect(() => {
    if (!profile) return;
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch Users
    const { data: usersData } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (usersData) setUsers(usersData);

    // Fetch Jobs
    const { data: jobsData } = await supabase.from('jobs').select('*, users:recruiter_id(full_name)').order('created_at', { ascending: false });
    if (jobsData) setJobs(jobsData);

    // Fetch Applications for Analytics & Activity Feed
    const { data: appsData } = await supabase.from('applications')
      .select('id, current_stage, applied_at, users:candidate_id(full_name), jobs:job_id(title)')
      .order('applied_at', { ascending: true }); // chronological for charts
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
      
      // Send Email
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
        ).catch(err => console.error('Failed to send email:', err));
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

  // --- Analytics Calculations ---
  const totalCandidates = users.filter(u => u.role === 'candidate').length;
  const totalRecruiters = users.filter(u => u.role === 'recruiter' && u.account_status === 'active').length;
  const pendingRecruiters = users.filter(u => u.role === 'recruiter' && u.account_status === 'pending');
  const activeJobs = jobs.filter(j => j.status === 'published').length;
  const totalApps = applications.length;
  const hiredApps = applications.filter(a => a.current_stage === 'HIRED').length;
  const hiringRate = totalApps > 0 ? Math.round((hiredApps / totalApps) * 100) : 0;

  // Area Chart Data (Group applications by day)
  const appsByDate: Record<string, number> = {};
  applications.forEach(app => {
    const date = new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    appsByDate[date] = (appsByDate[date] || 0) + 1;
  });
  const areaChartData = Object.keys(appsByDate).map(date => ({ name: date, applications: appsByDate[date] })).slice(-10); // last 10 active days

  // Donut Chart Data
  const stageCounts = applications.reduce((acc, curr) => {
    acc[curr.current_stage] = (acc[curr.current_stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
  const donutData = Object.keys(stageCounts).map(stage => ({ name: stage, value: stageCounts[stage] }));

  // Recent Activity (Last 5 applications)
  const recentActivities = [...applications].sort((a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()).slice(0, 5);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', padding: '16px 32px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #0f172a, #334155)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield color="white" size={18} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Talentiaa</h1>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: '#0f172a', padding: '4px 10px', borderRadius: '12px', marginLeft: '8px', letterSpacing: '0.5px' }}>ADMIN HQ</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationBell />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
              <div style={{ width: '36px', height: '36px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 700, border: '2px solid #e2e8f0' }}>
                A
              </div>
              <button onClick={() => signOut()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '32px auto', padding: '0 32px' }}>
        
        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Users</p>
                <h3 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>{users.length}</h3>
                <div style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  <TrendingUp size={14} /> {totalCandidates} Candidates · {totalRecruiters} Recruiters
                </div>
              </div>
              <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '12px', color: '#3b82f6' }}><Users size={24} /></div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Jobs</p>
                <h3 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>{activeJobs}</h3>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Out of {jobs.length} total jobs</div>
              </div>
              <div style={{ padding: '12px', background: '#f5f3ff', borderRadius: '12px', color: '#8b5cf6' }}><Briefcase size={24} /></div>
            </div>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applications</p>
                <h3 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>{totalApps}</h3>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Processed by AI</div>
              </div>
              <div style={{ padding: '12px', background: '#fdf4ff', borderRadius: '12px', color: '#d946ef' }}><Bell size={24} /></div>
            </div>
          </div>

          <div className="glass-card" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', borderColor: '#334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hiring Rate</p>
                <h3 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '8px 0' }}>{hiringRate}%</h3>
                <div style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  <Award size={14} /> Platform Success
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}><CheckCircle2 size={24} /></div>
            </div>
          </div>

        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          
          {/* Area Chart */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>Application Growth</h3>
            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="applications" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Stage Distribution</h3>
            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {donutData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
              {donutData.map((entry, index) => (
                <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: '#475569' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#64748b" /> Recent Activity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentActivities.map((act, i) => (
                <div key={act.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? '#3b82f6' : '#cbd5e1', marginTop: '6px' }}></div>
                  <div>
                    <p style={{ fontSize: '13px', color: '#1e293b', margin: 0, fontWeight: 500 }}>
                      <span style={{ fontWeight: 700 }}>{act.users?.full_name}</span> applied for <span style={{ color: '#3b82f6' }}>{act.jobs?.title}</span>
                    </p>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(act.applied_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8' }}>No recent activities.</p>}
            </div>
          </div>

        </div>

        {/* Management Tables */}
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
            <button 
              onClick={() => setActiveTab('users')}
              style={{ padding: '20px 24px', border: 'none', background: 'none', fontSize: '15px', fontWeight: 600, color: activeTab === 'users' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'users' ? '2px solid #0f172a' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              User Management
            </button>
            <button 
              onClick={() => setActiveTab('jobs')}
              style={{ padding: '20px 24px', border: 'none', background: 'none', fontSize: '15px', fontWeight: 600, color: activeTab === 'jobs' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'jobs' ? '2px solid #0f172a' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Job Moderation
            </button>
            <button 
              onClick={() => setActiveTab('approvals')}
              style={{ padding: '20px 24px', border: 'none', background: 'none', fontSize: '15px', fontWeight: 600, color: activeTab === 'approvals' ? '#0f172a' : '#64748b', borderBottom: activeTab === 'approvals' ? '2px solid #0f172a' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Pending Approvals
              {pendingRecruiters.length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '12px' }}>{pendingRecruiters.length}</span>
              )}
            </button>
          </div>

          <div style={{ padding: '0' }}>
            {activeTab === 'users' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }}>User</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }}>Role</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }}>Joined Date</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{u.full_name}</div>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                          background: u.role === 'admin' ? '#f1f5f9' : (u.role === 'recruiter' ? '#dcfce7' : '#e0e7ff'),
                          color: u.role === 'admin' ? '#475569' : (u.role === 'recruiter' ? '#16a34a' : '#4f46e5')
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '13px' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        {u.role !== 'admin' && (
                          <button 
                            onClick={() => toggleUserRole(u.id, u.role)}
                            style={{ 
                              padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                              background: u.role === 'candidate' ? '#fff' : '#fef2f2',
                              borderColor: u.role === 'candidate' ? '#e2e8f0' : '#fecaca',
                              color: u.role === 'candidate' ? '#0f172a' : '#ef4444'
                            }}
                          >
                            {u.role === 'candidate' ? 'Make Recruiter' : 'Revoke Recruiter'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'jobs' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }}>Job Title</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }}>Company/Dept</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right' }}>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{j.title}</div>
                        <div style={{ color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldAlert size={12} /> {(j as any).users?.full_name || 'Recruiter'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', color: '#475569', fontSize: '13px', fontWeight: 500 }}>
                        {j.department || 'N/A'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                          background: j.status === 'published' ? '#dcfce7' : '#f1f5f9',
                          color: j.status === 'published' ? '#16a34a' : '#64748b'
                        }}>
                          {j.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button 
                          onClick={() => toggleJobStatus(j.id, j.status)}
                          style={{ 
                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                            background: j.status === 'published' ? '#fef2f2' : '#fff',
                            borderColor: j.status === 'published' ? '#fecaca' : '#e2e8f0',
                            color: j.status === 'published' ? '#ef4444' : '#0f172a',
                            display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          {j.status === 'published' ? <><Trash2 size={12} /> Pause</> : <><CheckCircle2 size={12} /> Publish</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'approvals' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }}>Recruiter Info</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left' }}>Company</th>
                    <th style={{ padding: '16px 24px', textAlign: 'center' }}>ID Card</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRecruiters.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="table-row-hover">
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{r.full_name}</div>
                        <div style={{ color: '#64748b', fontSize: '13px' }}>{r.email}</div>
                      </td>
                      <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px', fontWeight: 500 }}>
                        <ShieldAlert size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {r.company_name || 'N/A'}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        {r.id_card_url ? (
                          <a href={r.id_card_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                            View ID Card
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '13px' }}>Missing</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleRecruiterVerification(r, 'approve')}
                            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #bbf7d0', background: '#dcfce7', color: '#16a34a' }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRecruiterVerification(r, 'reject')}
                            style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444' }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingRecruiters.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No pending recruiter approvals.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .table-row-hover:hover {
          background: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
