import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { LogOut, FileText, TrendingUp, ChevronDown, ChevronUp, Briefcase, MapPin, Building, ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { ApplicationStage } from '../../types/database';
import NotificationBell from '../../components/NotificationBell';

interface ApplicationWithJob {
  id: string;
  score_overall: number | null;
  score_breakdown: any;
  current_stage: ApplicationStage;
  applied_at: string;
  jobs: { id: string; title: string; location: string; department: string | null; workplace_type: string; };
}

export default function CandidateDashboard() {
  const { profile, signOut } = useAuth();

  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [publishedJobs, setPublishedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    
    // Fetch my applications
    supabase.from('applications')
      .select('id, score_overall, score_breakdown, current_stage, applied_at, jobs(id, title, location, department, workplace_type)')
      .eq('candidate_id', profile.id)
      .order('applied_at', { ascending: false })
      .then(({ data }) => { setApplications((data as any) || []); setLoading(false); });

    // Fetch published jobs for the sidebar
    supabase.from('jobs')
      .select('id, title, location, department, workplace_type, required_skills')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(4)
      .then(({ data }) => { setPublishedJobs(data || []); });
  }, [profile]);

  const avgScore = applications.length > 0
    ? Math.round(applications.filter(a => a.score_overall).reduce((s, a) => s + (a.score_overall || 0), 0) / applications.filter(a => a.score_overall).length)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp color="white" size={18} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(to right, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Talentiaa</h1>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px' }}>Candidate</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationBell />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
              <div style={{ width: '36px', height: '36px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', fontWeight: 600 }}>
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div style={{ textAlign: 'left', display: 'none' }} className="user-details">
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{profile?.full_name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{profile?.email}</div>
              </div>
              <button onClick={() => signOut()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '32px auto', padding: '0 32px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px' }}>
        
        {/* Left Column: Applications */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>My Applications</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Track the status of your job applications</p>
            </div>
            <Link to="/" style={{ fontSize: '14px', fontWeight: 600, color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Find more jobs <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>Loading applications...</div>
          ) : applications.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '64px 32px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileText size={28} color="#94a3b8" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>No applications yet</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px', marginBottom: '24px' }}>You haven't applied to any jobs yet. Start exploring!</p>
              <Link to="/" style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
                Browse Jobs
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {applications.map(app => (
                <ApplicationCard key={app.id} application={app} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Sidebar */}
        <div>
          {/* Stats Widget */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="#4f46e5" /> Your Impact
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '4px' }}>Applied</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{applications.length}</div>
              </div>
              <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500, marginBottom: '4px' }}>Avg. Score</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>{avgScore ? `${avgScore}%` : '-'}</div>
              </div>
            </div>
          </div>

          {/* Recommended Jobs */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} color="#4f46e5" /> Recommended Jobs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {publishedJobs.map(job => (
                <Link to={`/job/${job.id}`} key={job.id} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', transition: 'all 0.2s' }} className="hover-card">
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{job.title}</h4>
                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={12} /> {job.department || 'General'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '16px', fontSize: '13px', fontWeight: 600, color: '#4f46e5', textDecoration: 'none' }}>
              View all open roles
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        .hover-card:hover { border-color: #cbd5e1; background: #f8fafc; }
        @media (max-width: 900px) {
          main { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}


// --- Helper Component for the Application Card & Timeline ---
function ApplicationCard({ application }: { application: ApplicationWithJob }) {
  const [expanded, setExpanded] = useState(false);
  const { jobs, current_stage, score_overall, score_breakdown, applied_at } = application;
  
  // Define standard stages timeline
  const ALL_STAGES = ['REVIEW', 'INTERVIEW', 'OFFER', 'HIRED'];
  
  // Calculate current active index
  let currentIndex = ALL_STAGES.indexOf(current_stage);
  const isRejected = current_stage === 'REJECTED';
  if (isRejected) currentIndex = ALL_STAGES.length; // Max out the bar, but color it red

  const scoreColor = (s: number) => s >= 70 ? '#16a34a' : s >= 50 ? '#ca8a04' : '#dc2626';
  const scoreBg = (s: number) => s >= 70 ? '#dcfce7' : s >= 50 ? '#fef9c3' : '#fee2e2';

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Top Header Section */}
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>{jobs.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b', fontSize: '13px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building size={14} /> {jobs.department || 'Company'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {jobs.location}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Applied: {new Date(applied_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {score_overall !== null && (
            <div style={{ padding: '4px 10px', background: scoreBg(score_overall), color: scoreColor(score_overall), borderRadius: '20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Match: {score_overall}%
            </div>
          )}
          <div style={{ padding: '6px', background: '#f8fafc', borderRadius: '50%', color: '#94a3b8' }}>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Progress Timeline Section */}
      <div style={{ padding: '0 24px 24px 24px' }}>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          {/* Background Track */}
          <div style={{ position: 'absolute', top: '12px', left: '0', right: '0', height: '4px', background: '#e2e8f0', zIndex: 0, borderRadius: '2px' }}></div>
          
          {/* Fill Track */}
          <div style={{ 
            position: 'absolute', top: '12px', left: '0', height: '4px', zIndex: 1, borderRadius: '2px', transition: 'all 0.5s ease',
            background: isRejected ? '#ef4444' : '#2563eb',
            width: isRejected ? '100%' : `${(currentIndex / (ALL_STAGES.length - 1)) * 100}%`
          }}></div>

          {/* Steps */}
          {ALL_STAGES.map((stage, idx) => {
            const isCompleted = isRejected || idx <= currentIndex;
            const isCurrent = !isRejected && idx === currentIndex;
            
            return (
              <div key={stage} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '60px' }}>
                <div style={{ 
                  width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease',
                  background: isRejected ? '#fee2e2' : (isCompleted ? '#2563eb' : '#fff'),
                  border: isRejected ? '2px solid #ef4444' : (isCompleted ? '2px solid #2563eb' : '2px solid #cbd5e1'),
                  color: isRejected ? '#ef4444' : (isCompleted ? '#fff' : '#cbd5e1'),
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.1)' : 'none'
                }}>
                  {isRejected ? <XCircle size={16} /> : (isCompleted ? <CheckCircle2 size={16} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#cbd5e1' }} />)}
                </div>
                <span style={{ 
                  fontSize: '11px', fontWeight: isCurrent ? 700 : 600, 
                  color: isRejected ? '#ef4444' : (isCurrent ? '#1e293b' : '#94a3b8')
                }}>
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded AI Details */}
      {expanded && (
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '24px', background: '#fafafa', animation: 'slideDown 0.3s ease-out' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>AI Match Breakdown</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Skills Match</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{score_breakdown?.skills || 0}%</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Experience</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{score_breakdown?.experience || 0}%</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Education</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{score_breakdown?.education || 0}%</div>
            </div>
          </div>

          {/* Missing Skills from our new feature */}
          {score_breakdown?.missing_skills && score_breakdown.missing_skills.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', marginBottom: '8px', textTransform: 'uppercase' }}>Missing Skills</h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {score_breakdown.missing_skills.map((s: string) => (
                  <span key={s} style={{ padding: '4px 10px', background: '#fef3c7', color: '#b45309', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestion from our new feature */}
          {score_breakdown?.improvement_suggestion && (
            <div>
              <h5 style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '4px', textTransform: 'uppercase' }}>How to improve</h5>
              <p style={{ fontSize: '13px', color: '#1e3a8a', background: '#eff6ff', padding: '12px', borderRadius: '8px', lineHeight: 1.5, border: '1px solid #dbeafe' }}>
                {score_breakdown.improvement_suggestion}
              </p>
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
