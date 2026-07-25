import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Briefcase, Users, Plus, ChevronDown, KanbanSquare, TrendingUp, LayoutDashboard, RefreshCcw, EyeOff, RotateCcw, Target, BarChart3, FileText, X } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { ApplicationStage, Applicant } from '../../types/database';
import KanbanBoard from '../../components/KanbanBoard';
import NotificationBell from '../../components/NotificationBell';
import AnimatedBackground from '../../components/AnimatedBackground';
import { SideItem, StatCard } from '../../components/DashboardShared';

interface JobWithApplicants {
  id: string; title: string; status: string; location: string; published_at: string | null;
  _applicants?: Applicant[]; _expanded?: boolean;
}

export default function RecruiterDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithApplicants[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline' | 'hidden'>('list');
  const [selectedPipelineJobId, setSelectedPipelineJobId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase.from('jobs').select('id, title, status, location, published_at').eq('recruiter_id', profile.id).order('created_at', { ascending: false });
    if (error) return;
    const fetchedJobs = (data as JobWithApplicants[]) || [];
    setJobs(prev => fetchedJobs.map(nj => { const ex = prev.find(p => p.id === nj.id); return ex ? { ...nj, _applicants: ex._applicants, _expanded: ex._expanded } : nj; }));
    if (fetchedJobs.length > 0 && !selectedPipelineJobId) setSelectedPipelineJobId(fetchedJobs[0].id);
    setLoading(false);
  }, [profile, selectedPipelineJobId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const fetchApplicants = async (jobId: string) => {
    const { data, error } = await supabase.from('applications').select(`id, candidate_id, score_overall, score_breakdown, current_stage, hidden_pool, applied_at, users!candidate_id (full_name, email), resumes!resume_id (file_url)`).eq('job_id', jobId).order('score_overall', { ascending: false, nullsFirst: false });
    if (error) return [];
    return (data as any) || [];
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    if (selectedPipelineJobId) { const d = await fetchApplicants(selectedPipelineJobId); setJobs(prev => prev.map(j => j.id === selectedPipelineJobId ? { ...j, _applicants: d } : j)); }
    setRefreshing(false);
  };

  const toggleJob = async (jobId: string) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _expanded: !j._expanded } : j));
    const job = jobs.find(j => j.id === jobId);
    if (job && !job._applicants) { const d = await fetchApplicants(jobId); setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _applicants: d } : j)); }
  };

  // Track which jobs have had applicants fetched to avoid infinite loop
  const fetchedApplicantJobIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (viewMode === 'pipeline' && selectedPipelineJobId && !fetchedApplicantJobIds.current.has(selectedPipelineJobId)) {
      fetchedApplicantJobIds.current.add(selectedPipelineJobId);
      fetchApplicants(selectedPipelineJobId).then(d => setJobs(prev => prev.map(j => j.id === selectedPipelineJobId ? { ...j, _applicants: d } : j)));
    }
  }, [viewMode, selectedPipelineJobId]);

  const handleStageChange = async (applicantId: string, newStage: ApplicationStage) => {
    // Find the applicant and their job for the email notification
    let candidateEmail = '';
    let candidateName = '';
    let jobTitle = '';
    for (const job of jobs) {
      const app = job._applicants?.find(a => a.id === applicantId);
      if (app) {
        candidateEmail = app.users?.email || '';
        candidateName = app.users?.full_name || '';
        jobTitle = job.title;
        break;
      }
    }

    // Optimistic UI update
    setJobs(prev => prev.map(job => ({ ...job, _applicants: job._applicants?.map(app => app.id === applicantId ? { ...app, current_stage: newStage } : app) })));
    await supabase.from('applications').update({ current_stage: newStage }).eq('id', applicantId);

    // Send email notification to candidate
    if (candidateEmail && import.meta.env.VITE_EMAILJS_SERVICE_ID) {
      const stageLabels: Record<string, string> = { review: 'Under Review', interview: 'Interview Stage', offer: 'Offer Extended', hired: 'Hired! 🎉', rejected: 'Not Selected' };
      emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          candidate_name: candidateName,
          job_title: jobTitle,
          company_name: 'Talentiaa',
          status: `Your application has moved to: ${stageLabels[newStage] || newStage}`,
          to_email: candidateEmail,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      ).catch(err => console.error('EmailJS notification failed:', err));
    }
  };

  const totalApplicants = jobs.reduce((s, j) => s + (j._applicants?.length || 0), 0);

  // Hidden pool helpers
  const allApplicants = jobs.flatMap(j => (j._applicants || []).map(a => ({ ...a, _jobTitle: j.title, _jobId: j.id })));
  const hiddenPoolApplicants = allApplicants.filter(a => a.hidden_pool);

  const handleRecoverFromHiddenPool = async (applicantId: string) => {
    // Optimistic update: remove from hidden pool, set to REVIEW
    setJobs(prev => prev.map(job => ({
      ...job,
      _applicants: job._applicants?.map(app =>
        app.id === applicantId ? { ...app, hidden_pool: false, current_stage: 'review' as ApplicationStage } : app
      )
    })));
    await supabase.from('applications').update({ hidden_pool: false, current_stage: 'review' }).eq('id', applicantId);
  };

  // Chart Data Preparation
  const activeApplicants = allApplicants.filter(a => !a.hidden_pool);
  
  const appsByDate: Record<string, number> = {};
  activeApplicants.forEach(a => { const d = new Date(a.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); appsByDate[d] = (appsByDate[d] || 0) + 1; });
  const areaChartData = Object.keys(appsByDate).map(d => ({ name: d, applicants: appsByDate[d] })).slice(-10);

  const stageCounts = activeApplicants.reduce((acc, c) => { acc[c.current_stage] = (acc[c.current_stage] || 0) + 1; return acc; }, {} as Record<string, number>);
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
            <SideItem icon={<LayoutDashboard size={17} />} label="Overview" active={viewMode === 'list'} onClick={() => setViewMode('list')} />
            <SideItem icon={<KanbanSquare size={17} />} label="Pipeline" active={viewMode === 'pipeline'} onClick={() => setViewMode('pipeline')} />
            <SideItem icon={<EyeOff size={17} />} label="Hidden Pool" active={viewMode === 'hidden'} onClick={() => setViewMode('hidden')} badge={hiddenPoolApplicants.length} />
            <SideItem icon={<Briefcase size={17} />} label="My Jobs" />
          </div>
        </nav>
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', padding: '0 0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' }}>{profile?.full_name?.charAt(0)}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>Recruiter</div>
            </div>
          </div>
          <button onClick={() => signOut()} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, transition: 'var(--transition)' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: '250px', padding: '2rem 2.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', animation: 'fadeInUp 0.5s var(--ease-apple)' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Hiring Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Manage your talent pipeline.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={handleRefresh} className="btn btn-ghost" disabled={refreshing}>
              <RefreshCcw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <NotificationBell />
            <button onClick={() => navigate('/recruiter/jobs/create')} className="btn btn-primary" style={{ fontSize: '0.85rem' }}><Plus size={16} /> Post Job</button>
          </div>
        </header>

        {/* Stats */}
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Posted Jobs" value={jobs.length} color="var(--primary)" />
          <StatCard label="Total Applicants" value={totalApplicants} color="#34c759" />
          <StatCard label="Active Jobs" value={jobs.filter(j => j.status === 'published').length} color="#5ac8fa" />
          <StatCard label="Hidden Pool" value={hiddenPoolApplicants.length} color="#ff9f0a" />
        </div>

        {/* Analytics Charts */}
        {viewMode === 'list' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', marginBottom: '2rem', animation: 'fadeInUp 0.5s var(--ease-apple) 0.15s both' }}>
            <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <TrendingUp size={16} color="var(--primary)" /> Application Trend
              </h3>
              <div style={{ height: '220px' }}>
                {areaChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaChartData}>
                      <defs><linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0071e3" stopOpacity={0.12}/><stop offset="95%" stopColor="#0071e3" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)', fontSize: '0.82rem' }} />
                      <Area type="monotone" dataKey="applicants" stroke="#0071e3" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApps)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available</div>
                )}
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <BarChart3 size={16} color="#5ac8fa" /> Stage Distribution
              </h3>
              <div style={{ height: '180px' }}>
                {donutData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                        {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available</div>
                )}
              </div>
              {donutData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {donutData.map((e, i) => (
                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: COLORS[i % COLORS.length] }} />{e.name}: {e.value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
        ) : viewMode === 'hidden' ? (
          /* Hidden Pool View */
          <div style={{ animation: 'fadeInUp 0.4s var(--ease-apple)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <EyeOff size={20} color="#ff9f0a" /> Hidden Pool
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  থ্রেশহোল্ডের নিচে স্কোর পাওয়া ক্যান্ডিডেটরা এখানে থাকে। আপনি তাদের রিকভার করে পাইপলাইনে ফিরিয়ে আনতে পারেন।
                </p>
              </div>
            </div>
            {hiddenPoolApplicants.length === 0 ? (
              <div style={{ background: 'white', padding: '3.5rem', textAlign: 'center', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
                <EyeOff size={36} style={{ marginBottom: '1rem', opacity: 0.15, color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>কোনো ক্যান্ডিডেট হিডেন পুলে নেই।</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {hiddenPoolApplicants.map((app, i) => (
                  <div key={app.id} style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'var(--transition-smooth)', animation: `fadeInUp 0.3s var(--ease-apple) ${i * 0.04}s both` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
                  >
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#f59e0b' }}>
                        {app.users?.full_name?.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{app.users?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.users?.email}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Job: {app._jobTitle}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--error)' }}>{app.score_overall}%</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {app.score_breakdown && (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {[{k: 'skills', c: '#0071e3'}, {k: 'experience', c: '#5ac8fa'}, {k: 'education', c: '#34c759'}].map(s => (
                              <span key={s.k} style={{ fontSize: '0.6rem', fontWeight: 700, color: s.c, background: `${s.c}10`, padding: '2px 6px', borderRadius: '6px' }}>
                                {s.k.charAt(0).toUpperCase()}: {app.score_breakdown?.[s.k] || 0}%
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRecoverFromHiddenPool(app.id)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f59e0b', border: 'none' }}
                      >
                        <RotateCcw size={14} /> Recover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {jobs.length === 0 ? (
              <div style={{ background: 'white', padding: '3.5rem', textAlign: 'center', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
                <Briefcase size={36} style={{ marginBottom: '1rem', opacity: 0.15 }} />
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No jobs posted yet.</p>
              </div>
            ) : jobs.map((job, i) => (
              <div key={job.id} style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', transition: 'var(--transition-smooth)', animation: `fadeInUp 0.4s var(--ease-apple) ${i * 0.04}s both` }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleJob(job.id)}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{job.title}</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{job.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`badge ${job.status === 'published' ? 'badge-success' : 'badge-warning'}`}>{job.status}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{job._applicants?.length || 0}</span>
                    <ChevronDown size={16} color="var(--text-muted)" style={{ transition: 'transform 0.3s var(--ease-apple)', transform: job._expanded ? 'rotate(180deg)' : '' }} />
                  </div>
                </div>
                {job._expanded && (
                  <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-body)', animation: 'fadeIn 0.3s var(--ease-apple)' }}>
                    {(!job._applicants || job._applicants.length === 0) ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.75rem' }}>No applications yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {job._applicants.map((app, j) => (
                          <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', animation: `fadeIn 0.25s var(--ease-apple) ${j * 0.03}s both` }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{app.users?.full_name}</span>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{app.score_overall}%</span>
                            <span className="badge badge-info">{app.current_stage}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', padding: '1.5rem', animation: 'fadeIn 0.4s var(--ease-apple)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Hiring Pipeline</h3>
              <select value={selectedPipelineJobId || ''} onChange={e => setSelectedPipelineJobId(e.target.value)} className="select-field" style={{ minWidth: '200px' }}>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            {selectedPipelineJobId ? (() => {
              const pipelineApplicants = (jobs.find(j => j.id === selectedPipelineJobId)?._applicants || []).filter(a => !a.hidden_pool);
              return pipelineApplicants.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><Users size={32} style={{ marginBottom: '0.75rem', opacity: 0.15 }} /><p style={{ fontWeight: 500 }}>No applicants in pipeline.</p></div>
              ) : (
                <KanbanBoard applicants={pipelineApplicants} onStageChange={handleStageChange} />
              );
            })() : <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Select a job.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
