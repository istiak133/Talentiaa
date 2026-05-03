import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, MapPin, Briefcase, Clock, ChevronLeft, ChevronRight, X, DollarSign, Building2, ArrowRight } from 'lucide-react';
import type { Job } from '../../types/database';
import AnimatedBackground from '../../components/AnimatedBackground';
import Footer from '../../components/Footer';

const PAGE_SIZE = 8;

function useTypewriter(words: string[], speed = 80, pause = 2500) {
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    const current = words[wordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(current.substring(0, text.length + 1));
        if (text.length === current.length) { setTimeout(() => setIsDeleting(true), pause); return; }
      } else {
        setText(current.substring(0, text.length - 1));
        if (text.length === 0) { setIsDeleting(false); setWordIndex(p => (p + 1) % words.length); }
      }
    }, isDeleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, speed, pause]);
  return text;
}

export default function JobBoardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const keyword = searchParams.get('q') || '';
  const jobType = searchParams.get('type') || '';
  const workplace = searchParams.get('workplace') || '';
  const experience = searchParams.get('exp') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const [searchInput, setSearchInput] = useState(keyword);
  const typedHero = useTypewriter(['Software Engineer', 'Product Designer', 'Data Scientist', 'Marketing Lead', 'Full Stack Developer'], 70, 2000);

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (searchInput) p.set('q', searchInput); else p.delete('q');
      p.set('page', '1');
      setSearchParams(p);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    let query = supabase.from('jobs').select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (keyword) query = query.ilike('title', `%${keyword}%`);
    if (jobType) query = query.eq('job_type', jobType);
    if (workplace) query = query.eq('workplace_type', workplace);
    if (experience) query = query.eq('experience_level', experience);

    query.then(({ data, count }) => {
      setJobs((data as Job[]) || []);
      setTotal(count || 0);
      setLoading(false);
      if (data && data.length > 0 && !selectedJob) setSelectedJob(data[0] as Job);
    });
  }, [keyword, jobType, workplace, experience, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const setFilter = (key: string, val: string) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    p.set('page', '1');
    setSearchParams(p);
  };

  const handleApply = (jobId: string) => {
    if (profile) navigate(`/candidate/apply/${jobId}`);
    else navigate(`/login?redirect=/candidate/apply/${jobId}`);
  };

  const timeAgo = (d: string | null) => {
    if (!d) return '';
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return '1d ago';
    return `${diff}d ago`;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-body)' }}>
      {/* Frosted Nav */}
      <header className="nav-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" className="nav-logo">Talentiaa</a>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {profile ? (
              <button onClick={() => navigate(profile.role === 'admin' ? '/admin' : profile.role === 'recruiter' ? '/recruiter' : '/candidate')} className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>Dashboard</button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>Sign in</button>
                <button onClick={() => navigate('/signup')} className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>Get Started</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero — Grok-style Live Animated Background */}
      <section style={{ background: '#000', padding: '3.5rem 0 2.5rem', position: 'relative', overflow: 'hidden' }}>
        <AnimatedBackground variant="mesh" particleCount={80} color="0, 113, 227" speed={0.35} connectDistance={160} style={{ pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ animation: 'fadeInUp 0.6s var(--ease-apple)' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>Find Your Next Opportunity</p>
            <h1 style={{ color: 'white', fontSize: '2.8rem', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: '0.5rem', lineHeight: 1.1 }}>
              Search for{' '}
              <span className="gradient-text" style={{ fontSize: '2.8rem' }}>
                {typedHero}
              </span>
              <span style={{ display: 'inline-block', width: '2px', height: '2.2rem', background: 'var(--primary)', marginLeft: '3px', verticalAlign: 'text-bottom', animation: 'typing-cursor 1s step-end infinite' }} />
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1rem', marginTop: '0.5rem' }}>{total} open positions available</p>
          </div>

          {/* Search Bar — Apple-style */}
          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '720px', margin: '2rem auto 0', animation: 'fadeInUp 0.6s var(--ease-apple) 0.15s both' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Job title or keyword..."
                style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.8rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', outline: 'none', fontSize: '0.95rem', background: 'rgba(255,255,255,0.06)', color: 'white', transition: 'var(--transition-smooth)' }}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,113,227,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
              />
            </div>
            <select value={jobType} onChange={e => setFilter('type', e.target.value)} style={{ padding: '0 1rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontWeight: 500, fontSize: '0.88rem', cursor: 'pointer', outline: 'none' }}>
              <option value="" style={{ color: '#000' }}>Type</option>
              <option value="full_time" style={{ color: '#000' }}>Full-time</option>
              <option value="part_time" style={{ color: '#000' }}>Part-time</option>
              <option value="contract" style={{ color: '#000' }}>Contract</option>
              <option value="internship" style={{ color: '#000' }}>Internship</option>
            </select>
            <select value={workplace} onChange={e => setFilter('workplace', e.target.value)} style={{ padding: '0 1rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontWeight: 500, fontSize: '0.88rem', cursor: 'pointer', outline: 'none' }}>
              <option value="" style={{ color: '#000' }}>Location</option>
              <option value="onsite" style={{ color: '#000' }}>On-site</option>
              <option value="hybrid" style={{ color: '#000' }}>Hybrid</option>
              <option value="remote" style={{ color: '#000' }}>Remote</option>
            </select>
            {(keyword || jobType || workplace) && (
              <button onClick={() => { setSearchInput(''); setSearchParams({}); }} style={{ padding: '0 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,59,48,0.2)', background: 'rgba(255,59,48,0.08)', color: '#ff6961', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <main style={{ flex: 1 }}>
        <div className="container" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem 2rem', minHeight: '70vh' }}>
          {/* Job List */}
          <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', paddingRight: '6px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
            ) : jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)' }}>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No jobs found.</p>
              </div>
            ) : jobs.map((job, i) => (
              <div key={job.id} onClick={() => setSelectedJob(job)}
                style={{
                  background: selectedJob?.id === job.id ? 'white' : 'transparent',
                  padding: '1rem 1.15rem', borderRadius: 'var(--radius-lg)',
                  border: selectedJob?.id === job.id ? '1px solid var(--primary)' : '1px solid transparent',
                  cursor: 'pointer', transition: 'var(--transition-smooth)',
                  boxShadow: selectedJob?.id === job.id ? 'var(--shadow-glow)' : 'none',
                  animation: `fadeInUp 0.4s var(--ease-apple) ${i * 0.03}s both`
                }}
                onMouseEnter={e => { if (selectedJob?.id !== job.id) (e.currentTarget as HTMLDivElement).style.background = 'white'; }}
                onMouseLeave={e => { if (selectedJob?.id !== job.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--secondary)' }}>{job.title}</h3>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={12} /> {job.location}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={12} /> {timeAgo(job.published_at)}</span>
                </div>
                <div style={{ marginTop: '0.6rem' }}>
                  <span className="badge badge-info">{job.job_type.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem', padding: '0.5rem 0' }}>
                <button disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))} className="btn btn-ghost"><ChevronLeft size={16} /></button>
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))} className="btn btn-ghost"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>

          {/* Job Detail */}
          <div style={{ flex: 1, background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-light)', overflowY: 'auto', boxShadow: 'var(--shadow-sm)' }}>
            {selectedJob ? (
              <div key={selectedJob.id} style={{ padding: '2.5rem', animation: 'fadeIn 0.35s var(--ease-apple)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '-0.03em' }}>{selectedJob.title}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{selectedJob.department} · {selectedJob.location}</p>
                  </div>
                  <button onClick={() => handleApply(selectedJob.id)} className="btn btn-primary" style={{ padding: '0.7rem 1.8rem' }}>
                    Apply Now <ArrowRight size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                  <InfoChip icon={<Briefcase size={14} />} label={`${selectedJob.workplace_type} · ${selectedJob.job_type}`} />
                  <InfoChip icon={<DollarSign size={14} />} label={selectedJob.salary_visible ? `${selectedJob.salary_currency} ${selectedJob.salary_min?.toLocaleString()} – ${selectedJob.salary_max?.toLocaleString()}` : 'Negotiable'} />
                </div>

                {selectedJob.required_skills?.length > 0 && (
                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Required Skills</h4>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {selectedJob.required_skills.map(s => (
                        <span key={s} style={{ background: 'var(--bg-body)', color: 'var(--secondary)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', fontWeight: 500 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Description</h4>
                  <div style={{ color: '#48484a', lineHeight: 1.85, whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{selectedJob.description}</div>
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontWeight: 500 }}>Select a job to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function InfoChip({ icon, label }: { icon: any, label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-body)', padding: '0.45rem 1rem', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', fontWeight: 500, color: 'var(--secondary)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      {label}
    </div>
  );
}
