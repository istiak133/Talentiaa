import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Briefcase, Users, Plus, ChevronDown, KanbanSquare, TrendingUp, LayoutDashboard, RefreshCcw } from 'lucide-react';
import emailjs from '@emailjs/browser';
import type { ApplicationStage, Applicant } from '../../types/database';
import KanbanBoard from '../../components/KanbanBoard';
import NotificationBell from '../../components/NotificationBell';
import AnimatedBackground from '../../components/AnimatedBackground';

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
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
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
    const { data, error } = await supabase.from('applications').select(`id, candidate_id, score_overall, score_breakdown, current_stage, applied_at, users!candidate_id (full_name, email), resumes!resume_id (file_url)`).eq('job_id', jobId).order('score_overall', { ascending: false, nullsFirst: false });
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

  useEffect(() => {
    if (viewMode === 'pipeline' && selectedPipelineJobId) {
      const job = jobs.find(j => j.id === selectedPipelineJobId);
      if (job && !job._applicants) fetchApplicants(selectedPipelineJobId).then(d => setJobs(prev => prev.map(j => j.id === selectedPipelineJobId ? { ...j, _applicants: d } : j)));
    }
  }, [viewMode, selectedPipelineJobId, jobs]);

  const handleStageChange = async (applicantId: string, newStage: ApplicationStage) => {
    setJobs(prev => prev.map(job => ({ ...job, _applicants: job._applicants?.map(app => app.id === applicantId ? { ...app, current_stage: newStage } : app) })));
    await supabase.from('applications').update({ current_stage: newStage }).eq('id', applicantId);
  };

  const totalApplicants = jobs.reduce((s, j) => s + (j._applicants?.length || 0), 0);

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
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Posted Jobs" value={jobs.length} color="var(--primary)" />
          <StatCard label="Total Applicants" value={totalApplicants} color="#34c759" />
          <StatCard label="Active Jobs" value={jobs.filter(j => j.status === 'published').length} color="#5ac8fa" />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
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
            {selectedPipelineJobId ? (
              jobs.find(j => j.id === selectedPipelineJobId)?._applicants?.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}><Users size={32} style={{ marginBottom: '0.75rem', opacity: 0.15 }} /><p style={{ fontWeight: 500 }}>No applicants yet.</p></div>
              ) : jobs.find(j => j.id === selectedPipelineJobId)?._applicants ? (
                <KanbanBoard applicants={jobs.find(j => j.id === selectedPipelineJobId)!._applicants!} onStageChange={handleStageChange} />
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
              )
            ) : <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Select a job.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function SideItem({ icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: active ? 'rgba(255,255,255,0.08)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.45)', fontWeight: active ? 600 : 400, fontSize: '0.88rem', cursor: 'pointer', transition: 'var(--transition-smooth)', textAlign: 'left' }}>
      {icon}{label}
    </button>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', transition: 'var(--transition-smooth)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, marginBottom: '0.75rem' }} />
      <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.15rem' }}>{label}</div>
    </div>
  );
}
