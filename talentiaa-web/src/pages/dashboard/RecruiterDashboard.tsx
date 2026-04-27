import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, Briefcase, Users, Bell, Plus, ChevronDown, ChevronUp, LayoutList, KanbanSquare } from 'lucide-react';
import type { ApplicationStage } from '../../types/database';
import KanbanBoard from '../../components/KanbanBoard';

interface JobWithApplicants {
  id: string;
  title: string;
  status: string;
  location: string;
  published_at: string | null;
  _applicants?: Applicant[];
  _expanded?: boolean;
}

interface Applicant {
  id: string;
  score_overall: number | null;
  current_stage: ApplicationStage;
  applied_at: string;
  users: { full_name: string; email: string } | null;
}

export default function RecruiterDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithApplicants[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [selectedPipelineJobId, setSelectedPipelineJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from('jobs')
      .select('id, title, status, location, published_at')
      .eq('recruiter_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { 
        const fetchedJobs = (data as JobWithApplicants[]) || [];
        setJobs(fetchedJobs); 
        setLoading(false); 
        if (fetchedJobs.length > 0) setSelectedPipelineJobId(fetchedJobs[0].id);
      });
  }, [profile]);

  const toggleJob = async (jobId: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== jobId) return j;
      if (j._expanded) return { ...j, _expanded: false };
      return { ...j, _expanded: true };
    }));

    // Fetch applicants for this job
    const job = jobs.find(j => j.id === jobId);
    if (job && !job._applicants) {
      const { data } = await supabase.from('applications')
        .select('id, score_overall, current_stage, applied_at, users:candidate_id(full_name, email)')
        .eq('job_id', jobId)
        .order('score_overall', { ascending: false, nullsFirst: false });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _applicants: (data as any) || [] } : j));
    }
  };

  // Fetch applicants for pipeline view when selected job changes
  useEffect(() => {
    if (viewMode === 'pipeline' && selectedPipelineJobId) {
      const job = jobs.find(j => j.id === selectedPipelineJobId);
      if (job && !job._applicants) {
        supabase.from('applications')
          .select('id, score_overall, current_stage, applied_at, users:candidate_id(full_name, email)')
          .eq('job_id', selectedPipelineJobId)
          .order('score_overall', { ascending: false, nullsFirst: false })
          .then(({ data }) => {
            setJobs(prev => prev.map(j => j.id === selectedPipelineJobId ? { ...j, _applicants: (data as any) || [] } : j));
          });
      }
    }
  }, [viewMode, selectedPipelineJobId, jobs]);

  const handleStageChange = async (applicantId: string, newStage: ApplicationStage) => {
    // Optimistic UI update
    setJobs(prev => prev.map(job => {
      if (!job._applicants) return job;
      return {
        ...job,
        _applicants: job._applicants.map(app => 
          app.id === applicantId ? { ...app, current_stage: newStage } : app
        )
      };
    }));

    // DB update
    const { error } = await supabase
      .from('applications')
      .update({ current_stage: newStage })
      .eq('id', applicantId);
      
    if (error) {
      console.error('Failed to update stage:', error);
      // Revert could be handled here if needed
    }
  };


  const activeJobs = jobs.filter(j => j.status === 'published').length;
  const scoreColor = (s: number) => s >= 70 ? '#16a34a' : s >= 50 ? '#ca8a04' : '#dc2626';

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="header-logo">Talentiaa</h1>
          <span className="role-badge role-recruiter">Recruiter</span>
        </div>
        <div className="header-right">
          <button className="btn-icon" title="Notifications"><Bell size={20} /></button>
          <div className="user-info">
            <div className="avatar avatar-recruiter">{profile?.full_name?.charAt(0).toUpperCase() || 'R'}</div>
            <span className="user-name">{profile?.full_name}</span>
          </div>
          <button className="btn btn-ghost" onClick={signOut}><LogOut size={18} /> Logout</button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-section">
          <h2>স্বাগতম, {profile?.full_name}! 👋</h2>
          <p>আপনার রিক্রুটমেন্ট ড্যাশবোর্ড।</p>
        </div>

        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={() => navigate('/recruiter/jobs/create')}>
            <Plus size={18} /> নতুন জব পোস্ট করুন
          </button>
        </div>

        {/* Stats */}
        <div className="dashboard-grid">
          <div className="dash-card">
            <div className="card-icon card-icon-blue"><Briefcase size={24} /></div>
            <h3>Active Jobs</h3>
            <p className="card-count">{activeJobs}</p>
          </div>
          <div className="dash-card">
            <div className="card-icon card-icon-green"><Users size={24} /></div>
            <h3>Total Jobs</h3>
            <p className="card-count">{jobs.length}</p>
          </div>
          <div className="dash-card">
            <div className="card-icon card-icon-orange"><Bell size={24} /></div>
            <h3>Notifications</h3>
            <p className="card-count">0</p>
          </div>
        </div>

        {/* Job List with expandable applicants */}
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>📋 My Jobs & Applicants</h3>
            {jobs.length > 0 && (
              <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                <button 
                  onClick={() => setViewMode('list')}
                  style={{ padding: '6px 12px', border: 'none', background: viewMode === 'list' ? '#fff' : 'transparent', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'list' ? '#111827' : '#6b7280' }}
                >
                  <LayoutList size={16} /> List
                </button>
                <button 
                  onClick={() => setViewMode('pipeline')}
                  style={{ padding: '6px 12px', border: 'none', background: viewMode === 'pipeline' ? '#fff' : 'transparent', borderRadius: '6px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: viewMode === 'pipeline' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'pipeline' ? '#111827' : '#6b7280' }}
                >
                  <KanbanSquare size={16} /> Pipeline
                </button>
              </div>
            )}
          </div>
          {loading ? <p>Loading...</p> : jobs.length === 0 ? (
            <div className="empty-state"><p>📋 এখনো কোনো জব পোস্ট করা হয়নি। <strong>"নতুন জব পোস্ট করুন"</strong> বাটনে ক্লিক করে শুরু করুন!</p></div>
          ) : viewMode === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {jobs.map(job => (
                <div key={job.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Job row */}
                  <div onClick={() => toggleJob(job.id)} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{job.title}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>{job.location} · <span style={{ padding: '2px 8px', background: job.status === 'published' ? '#dcfce7' : '#f3f4f6', borderRadius: '12px', fontSize: '11px', fontWeight: 600, color: job.status === 'published' ? '#16a34a' : '#6b7280' }}>{job.status}</span></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>{job._applicants?.length ?? '?'} applicants</span>
                      {job._expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Applicants list */}
                  {job._expanded && (
                    <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 20px', background: '#f9fafb' }}>
                      {!job._applicants || job._applicants.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#9ca3af' }}>No applicants yet.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ fontSize: '12px', color: '#6b7280', textAlign: 'left' }}>
                              <th style={{ padding: '8px 0' }}>Candidate</th>
                              <th>Email</th>
                              <th>Match Score</th>
                              <th>Stage</th>
                              <th>Applied</th>
                            </tr>
                          </thead>
                          <tbody>
                            {job._applicants.map(app => (
                              <tr key={app.id} style={{ borderTop: '1px solid #e5e7eb', fontSize: '13px' }}>
                                <td style={{ padding: '10px 0', fontWeight: 600 }}>{app.users?.full_name || '—'}</td>
                                <td style={{ color: '#6b7280' }}>{app.users?.email || '—'}</td>
                                <td>
                                  {app.score_overall !== null ? (
                                    <span style={{ fontWeight: 800, color: scoreColor(app.score_overall) }}>{app.score_overall}%</span>
                                  ) : <span style={{ color: '#9ca3af' }}>—</span>}
                                </td>
                                <td><span style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>{app.current_stage}</span></td>
                                <td style={{ color: '#9ca3af' }}>{new Date(app.applied_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Select Job Pipeline:</span>
                <select 
                  value={selectedPipelineJobId || ''} 
                  onChange={e => setSelectedPipelineJobId(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' }}
                >
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
                {selectedPipelineJobId && jobs.find(j => j.id === selectedPipelineJobId)?._applicants ? (
                  <KanbanBoard 
                    applicants={jobs.find(j => j.id === selectedPipelineJobId)!._applicants!} 
                    onStageChange={handleStageChange}
                  />
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading pipeline...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
