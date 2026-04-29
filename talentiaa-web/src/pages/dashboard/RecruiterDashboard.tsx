import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Briefcase, Users, Plus, ChevronDown, ChevronUp, LayoutList, KanbanSquare, TrendingUp, LayoutDashboard, RefreshCcw, AlertTriangle, Bug } from 'lucide-react';
import emailjs from '@emailjs/browser';
import type { ApplicationStage, Applicant } from '../../types/database';
import KanbanBoard from '../../components/KanbanBoard';
import NotificationBell from '../../components/NotificationBell';

interface JobWithApplicants {
  id: string;
  title: string;
  status: string;
  location: string;
  published_at: string | null;
  _applicants?: Applicant[];
  _expanded?: boolean;
}

export default function RecruiterDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithApplicants[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [selectedPipelineJobId, setSelectedPipelineJobId] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setDebugLogs(prev => [msg, ...prev].slice(0, 5));

  const fetchJobs = useCallback(async () => {
    if (!profile) return;
    addLog(`Fetching jobs for recruiter: ${profile.id}`);
    const { data, error } = await supabase.from('jobs')
      .select('id, title, status, location, published_at')
      .eq('recruiter_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      addLog(`Job Fetch Error: ${error.message}`);
      return;
    }
    
    const fetchedJobs = (data as JobWithApplicants[]) || [];
    addLog(`Found ${fetchedJobs.length} jobs.`);
    
    setJobs(prev => fetchedJobs.map(nj => {
      const existing = prev.find(pj => pj.id === nj.id);
      return existing ? { ...nj, _applicants: existing._applicants, _expanded: existing._expanded } : nj;
    }));
    
    if (fetchedJobs.length > 0 && !selectedPipelineJobId) {
      setSelectedPipelineJobId(fetchedJobs[0].id);
    }
    setLoading(false);
  }, [profile, selectedPipelineJobId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const fetchApplicants = async (jobId: string) => {
    addLog(`Fetching applicants for job: ${jobId}`);
    const { data, error } = await supabase.from('applications')
      .select(`
        id, 
        candidate_id, 
        score_overall, 
        score_breakdown, 
        current_stage, 
        applied_at, 
        users!candidate_id (
          full_name, 
          email
        ),
        resumes!resume_id (
          file_url
        )
      `)
      .eq('job_id', jobId)
      .order('score_overall', { ascending: false, nullsFirst: false });
    
    if (error) {
      addLog(`Applicant Fetch Error: ${error.message}`);
      return [];
    }
    
    if (data && data.length > 0) {
      const first = data[0];
      addLog(`App[0] Resume: ${first.resumes ? 'Found' : 'MISSING'}`);
      if (first.resumes) addLog(`URL: ${first.resumes.file_url ? 'Yes' : 'Empty'}`);
    }
    
    addLog(`Success: Found ${data?.length || 0} applicants.`);
    return (data as any) || [];
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    if (selectedPipelineJobId) {
      const data = await fetchApplicants(selectedPipelineJobId);
      setJobs(prev => prev.map(j => j.id === selectedPipelineJobId ? { ...j, _applicants: data } : j));
    }
    setRefreshing(false);
  };

  const toggleJob = async (jobId: string) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _expanded: !j._expanded } : j));
    const job = jobs.find(j => j.id === jobId);
    if (job && !job._applicants) {
      const data = await fetchApplicants(jobId);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _applicants: data } : j));
    }
  };

  useEffect(() => {
    if (viewMode === 'pipeline' && selectedPipelineJobId) {
      const job = jobs.find(j => j.id === selectedPipelineJobId);
      if (job && !job._applicants) {
        fetchApplicants(selectedPipelineJobId).then(data => {
          setJobs(prev => prev.map(j => j.id === selectedPipelineJobId ? { ...j, _applicants: data } : j));
        });
      }
    }
  }, [viewMode, selectedPipelineJobId, jobs]);

  const handleStageChange = async (applicantId: string, newStage: ApplicationStage) => {
    // Robustly find the applicant across all jobs
    let currentApp: any = null;
    jobs.forEach(j => {
      const found = j._applicants?.find(a => a.id === applicantId);
      if (found) currentApp = found;
    });

    if (currentApp) {
      addLog(`Updating stage: ${currentApp.current_stage} -> ${newStage}`);
    }

    setJobs(prev => prev.map(job => ({
      ...job,
      _applicants: job._applicants?.map(app => app.id === applicantId ? { ...app, current_stage: newStage } : app)
    })));

    const { error } = await supabase
      .from('applications')
      .update({ current_stage: newStage })
      .eq('id', applicantId);
      
    if (error) addLog(`Stage Update Error: ${error.message}`);
    else addLog(`Stage updated to ${newStage}`);
  };

  return (
    <div className="dashboard-v2" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-body)' }}>
      {/* Sidebar Navigation */}
      <aside style={{ width: '260px', background: 'var(--secondary)', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 100 }}>
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Outfit' }}>Talentiaa</span>
        </div>

        <nav style={{ flex: 1, padding: '1rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 1rem 0.5rem' }}>Recruitment</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <NavItem icon={<LayoutDashboard size={18} />} label="Overview" active={viewMode === 'list'} onClick={() => setViewMode('list')} />
            <NavItem icon={<KanbanSquare size={18} />} label="Hiring Pipeline" active={viewMode === 'pipeline'} onClick={() => setViewMode('pipeline')} />
            <NavItem icon={<Briefcase size={18} />} label="My Jobs" />
          </div>
        </nav>

        {/* Debug Log Panel in Sidebar */}
        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', margin: '1rem', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.5rem' }}>
            <Bug size={12} /> SYSTEM LOGS
          </div>
          {debugLogs.map((log, i) => (
            <div key={i} style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '2px', fontFamily: 'monospace' }}>• {log}</div>
          ))}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {profile?.full_name?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Recruiter</div>
            </div>
          </div>
          <button onClick={() => signOut()} className="btn btn-secondary" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', justifyContent: 'flex-start', padding: '0.6rem 1rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '260px', padding: '2rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Hiring Dashboard</h1>
            <p style={{ color: 'var(--text-muted)' }}>ক্যান্ডিডেটদের পাইপলাইন ম্যানেজ করুন।</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button onClick={handleRefresh} className="btn btn-ghost" disabled={refreshing} title="Refresh Data">
              <RefreshCcw size={18} className={refreshing ? 'spin' : ''} />
            </button>
            <NotificationBell />
            <button onClick={() => navigate('/recruiter/jobs/create')} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
              <Plus size={18} /> Post a Job
            </button>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}><span className="loading-spinner-sm" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>
        ) : viewMode === 'list' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {jobs.length === 0 ? (
               <div style={{ background: 'white', padding: '4rem', textAlign: 'center', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
                 <p style={{ color: 'var(--text-muted)' }}>আপনার কোনো পোস্ট করা জব পাওয়া যায়নি।</p>
               </div>
            ) : jobs.map(job => <JobListItem key={job.id} job={job} onToggle={() => toggleJob(job.id)} />)}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-light)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hiring Pipeline</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select 
                    value={selectedPipelineJobId || ''} 
                    onChange={e => setSelectedPipelineJobId(e.target.value)}
                    className="select-field"
                    style={{ minWidth: '220px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontWeight: 600 }}
                  >
                    {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
                  </select>
                </div>
             </div>
             {selectedPipelineJobId ? (
                jobs.find(j => j.id === selectedPipelineJobId)?._applicants?.length === 0 ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>এই জবে এখনো কেউ অ্যাপ্লাই করেনি।</p>
                  </div>
                ) : jobs.find(j => j.id === selectedPipelineJobId)?._applicants ? (
                  <KanbanBoard 
                    applicants={jobs.find(j => j.id === selectedPipelineJobId)!._applicants!} 
                    onStageChange={handleStageChange}
                  />
                ) : (
                  <div style={{ padding: '4rem', textAlign: 'center' }}><span className="loading-spinner-sm" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>
                )
              ) : (
                <p style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>জব সিলেক্ট করুন।</p>
              )}
          </div>
        )}
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none',
      background: active ? 'rgba(79, 70, 229, 0.15)' : 'transparent', color: active ? 'white' : '#94a3b8',
      fontWeight: active ? 600 : 500, cursor: 'pointer', transition: 'all 0.2s'
    }}>
      {icon} {label}
    </button>
  );
}

function JobListItem({ job, onToggle }: { job: JobWithApplicants, onToggle: () => void }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--primary-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Briefcase size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{job.title}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{job.location}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{job._applicants?.length || 0} Applicants</div>
          {job._expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>
      {job._expanded && (
        <div style={{ padding: '1.5rem', background: '#fcfcfc', borderTop: '1px solid var(--border-light)' }}>
          {(!job._applicants || job._applicants.length === 0) ? (
             <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No applications received yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {job._applicants.map(app => (
                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'white', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                   <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{app.users?.full_name}</div>
                   <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>{app.score_overall}% Match</div>
                   <div className="badge badge-info" style={{ fontSize: '0.65rem' }}>{app.current_stage}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
