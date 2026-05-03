import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, FileText, TrendingUp, ChevronDown, Briefcase, MapPin, Building, ArrowRight, CheckCircle2, Clock, LayoutDashboard, UserCircle, Settings } from 'lucide-react';
import type { ApplicationStage } from '../../types/database';
import NotificationBell from '../../components/NotificationBell';
import AnimatedBackground from '../../components/AnimatedBackground';

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
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [publishedJobs, setPublishedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchMyData = async () => {
      const { data } = await supabase.from('applications')
        .select('id, score_overall, score_breakdown, current_stage, applied_at, jobs(id, title, location, department, workplace_type)')
        .eq('candidate_id', profile.id)
        .order('applied_at', { ascending: false });
      setApplications((data as any) || []);
      setLoading(false);
    };
    fetchMyData();
    supabase.from('jobs').select('id, title, location, department, workplace_type, required_skills').eq('status', 'published').order('published_at', { ascending: false }).limit(4).then(({ data }) => { setPublishedJobs(data || []); });
    const channel = supabase.channel('applications-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => { if (payload.new && (payload.new as any).candidate_id === profile.id) fetchMyData(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  const scoredApps = applications.filter(a => a.score_overall !== null);
  const avgScore = scoredApps.length > 0 ? Math.round(scoredApps.reduce((s, a) => s + (a.score_overall || 0), 0) / scoredApps.length) : null;

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
            <SideItem icon={<LayoutDashboard size={17} />} label="Dashboard" active />
            <SideItem icon={<Briefcase size={17} />} label="Browse Jobs" onClick={() => navigate('/')} />
            <SideItem icon={<UserCircle size={17} />} label="My Profile" onClick={() => navigate('/candidate/profile')} />
            <SideItem icon={<Settings size={17} />} label="Settings" />
          </div>
        </nav>
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem', padding: '0 0.5rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem' }}>{profile?.full_name?.charAt(0)}</div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>Candidate</div>
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
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>Here's your application overview.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <NotificationBell />
            <button onClick={() => navigate('/candidate/profile')} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Edit Profile</button>
          </div>
        </header>

        {/* Stats */}
        <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Total Applied" value={applications.length} color="var(--primary)" />
          <StatCard label="Interviewing" value={applications.filter(a => a.current_stage === 'INTERVIEW').length} color="#5ac8fa" />
          <StatCard label="Match Score" value={avgScore ? `${avgScore}%` : '—'} color="#34c759" />
          <StatCard label="In Review" value={applications.filter(a => a.current_stage === 'REVIEW').length} color="#ff9f0a" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem' }}>
          {/* Applications */}
          <div style={{ animation: 'fadeInUp 0.5s var(--ease-apple) 0.15s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your Applications</h2>
              <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>Browse Jobs <ArrowRight size={14} /></Link>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
            ) : applications.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '3.5rem 2rem', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                <Briefcase size={36} style={{ marginBottom: '1rem', color: 'var(--text-muted)', opacity: 0.3 }} />
                <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.35rem' }}>No applications yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>Start exploring and apply to your dream job.</p>
                <button onClick={() => navigate('/')} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Browse Jobs</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {applications.map((app, i) => <AppCard key={app.id} app={app} delay={i * 0.04} />)}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'slideInRight 0.5s var(--ease-apple) 0.2s both' }}>
            <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '1.25rem', border: '1px solid var(--border-light)' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '1rem' }}>Recommended</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {publishedJobs.map(job => (
                  <Link to="/" key={job.id} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', transition: 'var(--transition-smooth)', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-body)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '0.15rem' }}>{job.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{job.department || 'General'}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div style={{ background: '#000', borderRadius: 'var(--radius-xl)', padding: '1.25rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.35rem' }}>Profile Strength</h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Complete your profile to get better job matches.</p>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{ width: '75%', height: '100%', background: 'var(--primary)', borderRadius: '3px', transition: 'width 1s var(--ease-apple)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>75%</span>
                <Link to="/candidate/profile" style={{ color: 'var(--primary)', fontWeight: 600 }}>Complete</Link>
              </div>
            </div>
          </div>
        </div>
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
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--secondary)', letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.15rem' }}>{label}</div>
    </div>
  );
}

function AppCard({ app, delay }: { app: ApplicationWithJob; delay: number }) {
  const [open, setOpen] = useState(false);
  const { jobs, current_stage, score_overall, score_breakdown, applied_at } = app;
  const ALL_STAGES = ['REVIEW', 'INTERVIEW', 'OFFER', 'HIRED'];
  const idx = ALL_STAGES.indexOf(current_stage);
  const rejected = current_stage === 'REJECTED';

  return (
    <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', transition: 'var(--transition-smooth)', animation: `fadeInUp 0.4s var(--ease-apple) ${delay}s both` }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
      <div style={{ padding: '1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{jobs.title}</h3>
          <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={12} /> {jobs.location}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={12} /> {new Date(applied_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {score_overall !== null && <span style={{ fontSize: '0.95rem', fontWeight: 700, color: score_overall >= 70 ? 'var(--success)' : 'var(--warning)' }}>{score_overall}%</span>}
          <span className={`badge ${rejected ? 'badge-error' : 'badge-info'}`}>{current_stage}</span>
          <ChevronDown size={16} color="var(--text-muted)" style={{ transition: 'transform 0.3s var(--ease-apple)', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
        </div>
      </div>
      <div style={{ maxHeight: open ? '500px' : '0', overflow: 'hidden', transition: 'max-height 0.4s var(--ease-apple)' }}>
        <div style={{ padding: '0 1.15rem 1.15rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '0.5rem 0 1.5rem' }}>
            <div style={{ position: 'absolute', top: '11px', left: 0, right: 0, height: '2px', background: 'var(--border-light)' }} />
            <div style={{ position: 'absolute', top: '11px', left: 0, height: '2px', background: rejected ? 'var(--error)' : 'var(--primary)', width: rejected ? '100%' : `${(idx / 3) * 100}%`, transition: 'width 0.8s var(--ease-apple)' }} />
            {ALL_STAGES.map((s, i) => (
              <div key={s} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i <= idx ? (rejected ? 'var(--error)' : 'var(--primary)') : 'white', border: `2px solid ${i <= idx ? (rejected ? 'var(--error)' : 'var(--primary)') : 'var(--border-light)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s var(--ease-apple)' }}>
                  {i <= idx ? <CheckCircle2 size={12} color="white" /> : null}
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 600, color: i <= idx ? 'var(--secondary)' : 'var(--text-muted)' }}>{s}</span>
              </div>
            ))}
          </div>
          {/* Insights */}
          <div style={{ background: 'var(--bg-body)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[['Skills', score_breakdown?.skills], ['Experience', score_breakdown?.experience], ['Education', score_breakdown?.education]].map(([l, v]) => (
                <div key={l as string} style={{ textAlign: 'center', background: 'white', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{l as string}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>{v || 0}%</div>
                </div>
              ))}
            </div>
            {score_breakdown?.missing_skills?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {score_breakdown.missing_skills.map((s: any) => <span key={s} className="badge badge-error">{s}</span>)}
              </div>
            )}
            {score_breakdown?.improvement_suggestion && (
              <p style={{ fontSize: '0.82rem', color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', lineHeight: 1.5 }}>💡 {score_breakdown.improvement_suggestion}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
