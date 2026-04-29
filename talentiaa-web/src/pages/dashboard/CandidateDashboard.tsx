import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, FileText, TrendingUp, ChevronDown, ChevronUp, Briefcase, MapPin, Building, ArrowRight, CheckCircle2, Clock, XCircle, User, Bell, Search, LayoutDashboard, UserCircle, Settings } from 'lucide-react';
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

    // Fetch published jobs once
    supabase.from('jobs')
      .select('id, title, location, department, workplace_type, required_skills')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(4)
      .then(({ data }) => { setPublishedJobs(data || []); });

    // REAL-TIME SUBSCRIPTION (Robust Version)
    const channel = supabase
      .channel('applications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        (payload) => {
          if (payload.new && (payload.new as any).candidate_id === profile.id) {
            console.log('Update detected for candidate! Refreshing...');
            fetchMyData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const scoredApps = applications.filter(a => a.score_overall !== null);
  const avgScore = scoredApps.length > 0
    ? Math.round(scoredApps.reduce((s, a) => s + (a.score_overall || 0), 0) / scoredApps.length)
    : null;

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
          <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 1rem 0.5rem' }}>Menu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
            <NavItem icon={<Briefcase size={18} />} label="Browse Jobs" onClick={() => navigate('/')} />
            <NavItem icon={<UserCircle size={18} />} label="My Profile" onClick={() => navigate('/candidate/profile')} />
            <NavItem icon={<Settings size={18} />} label="Settings" />
          </div>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {profile?.full_name?.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Candidate</div>
            </div>
          </div>
          <button onClick={() => signOut()} className="btn btn-secondary" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', justifyContent: 'flex-start', padding: '0.6rem 1rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '260px', padding: '2rem' }}>
        {/* Top Navbar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
            <p style={{ color: 'var(--text-muted)' }}>এখানে আপনার সব অ্যাপ্লিকেশনের আপডেট দেখতে পাবেন।</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NotificationBell />
            <div style={{ width: '1px', height: '24px', background: 'var(--border-light)' }}></div>
            <button onClick={() => navigate('/candidate/profile')} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
              Edit Profile
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <StatCard title="Total Applied" value={applications.length} icon={<Briefcase size={20} />} color="var(--primary)" />
          <StatCard title="Interviewing" value={applications.filter(a => a.current_stage === 'INTERVIEW').length} icon={<Clock size={20} />} color="var(--info)" />
          <StatCard title="Avg Match Score" value={avgScore ? `${avgScore}%` : 'N/A'} icon={<TrendingUp size={20} />} color="var(--success)" />
          <StatCard title="Pending Review" value={applications.filter(a => a.current_stage === 'REVIEW').length} icon={<FileText size={20} />} color="var(--warning)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2.5rem' }}>
          {/* Left: Applications List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Active Applications</h2>
              <Link to="/" style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Find more jobs <ArrowRight size={16} />
              </Link>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}><span className="loading-spinner-sm" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>
            ) : applications.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '4rem 2rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ width: '60px', height: '60px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Briefcase size={30} color="var(--primary)" />
                </div>
                <h3>এখনও কোনো অ্যাপ্লাই করেননি</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>আপনার ড্রিম জব খুঁজে বের করুন এবং অ্যাপ্লাই করুন।</p>
                <button onClick={() => navigate('/')} className="btn btn-primary">Browse Jobs</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {applications.map(app => (
                  <ApplicationCard key={app.id} application={app} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Sidebar Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Recommended Jobs */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border-light)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="var(--primary)" /> Recommended for you
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {publishedJobs.map(job => (
                  <Link to="/" key={job.id} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)', transition: 'var(--transition)' }} className="rec-job-card">
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '0.25rem' }}>{job.title}</h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building size={12} /> {job.department || 'General'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <button onClick={() => navigate('/')} className="btn btn-secondary" style={{ width: '100%', marginTop: '1.25rem', fontSize: '0.85rem' }}>
                View All Jobs
              </button>
            </div>

            {/* Profile Strength */}
            <div style={{ background: 'var(--secondary)', borderRadius: '16px', padding: '1.5rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Profile Strength</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>আপনার প্রোফাইল ১০০% সম্পন্ন করলে জব পাওয়ার সম্ভাবনা বেড়ে যায়।</p>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '0.5rem' }}>
                  <div style={{ width: '75%', height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span>75% Complete</span>
                  <Link to="/candidate/profile" style={{ color: 'var(--primary)' }}>Finish Now</Link>
                </div>
              </div>
              <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1 }}>
                <UserCircle size={100} color="white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .rec-job-card:hover { background: var(--primary-light); border-color: var(--primary); transform: translateY(-2px); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: 'none',
        background: active ? 'rgba(79, 70, 229, 0.15)' : 'transparent', color: active ? 'white' : '#94a3b8',
        fontWeight: active ? 600 : 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
      }}
    >
      <span style={{ color: active ? 'var(--primary)' : 'inherit' }}>{icon}</span>
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: any, icon: any, color: string }) {
  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ width: '40px', height: '40px', background: `${color}15`, color: color, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.25rem' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{title}</div>
    </div>
  );
}

function ApplicationCard({ application }: { application: ApplicationWithJob }) {
  const [expanded, setExpanded] = useState(false);
  const { jobs, current_stage, score_overall, score_breakdown, applied_at } = application;
  const ALL_STAGES = ['REVIEW', 'INTERVIEW', 'OFFER', 'HIRED'];
  let currentIndex = ALL_STAGES.indexOf(current_stage);
  const isRejected = current_stage === 'REJECTED';

  return (
    <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }}>
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--bg-body)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Building size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{jobs.title}</h3>
            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {jobs.location}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {new Date(applied_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {score_overall !== null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>AI MATCH</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: score_overall >= 70 ? 'var(--success)' : 'var(--warning)' }}>{score_overall}%</div>
            </div>
          )}
          <div className={`badge ${isRejected ? 'badge-error' : 'badge-info'}`}>{current_stage}</div>
          {expanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 1.5rem 1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ height: '1px', background: 'var(--border-light)', marginBottom: '1.5rem' }}></div>
          
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>Application Progress</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '12px', left: '0', right: '0', height: '2px', background: 'var(--border-light)', zIndex: 0 }}></div>
              <div style={{ position: 'absolute', top: '12px', left: '0', height: '2px', background: isRejected ? 'var(--error)' : 'var(--primary)', zIndex: 1, width: isRejected ? '100%' : `${(currentIndex / 3) * 100}%`, transition: 'width 0.8s ease' }}></div>
              
              {ALL_STAGES.map((s, i) => (
                <div key={s} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: i <= currentIndex ? (isRejected ? 'var(--error)' : 'var(--primary)') : 'white', border: `2px solid ${i <= currentIndex ? (isRejected ? 'var(--error)' : 'var(--primary)') : 'var(--border-light)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {i <= currentIndex ? <CheckCircle2 size={14} color="white" /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border-light)' }}></div>}
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: i <= currentIndex ? 'var(--secondary)' : 'var(--text-muted)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-body)', borderRadius: '12px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem' }}>AI Insights & Suggestions</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <InsightItem label="Skills Match" value={`${score_breakdown?.skills || 0}%`} />
              <InsightItem label="Exp. Match" value={`${score_breakdown?.experience || 0}%`} />
              <InsightItem label="Edu. Match" value={`${score_breakdown?.education || 0}%`} />
            </div>
            {score_breakdown?.missing_skills?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>MISSING SKILLS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {score_breakdown.missing_skills.map((s: any) => <span key={s} style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600 }}>{s}</span>)}
                </div>
              </div>
            )}
            {score_breakdown?.improvement_suggestion && (
              <p style={{ fontSize: '0.85rem', color: '#1e40af', background: '#dbeafe', padding: '1rem', borderRadius: '8px', lineHeight: 1.5 }}>
                💡 <b>Suggestion:</b> {score_breakdown.improvement_suggestion}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightItem({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--secondary)', marginTop: '2px' }}>{value}</div>
    </div>
  );
}
