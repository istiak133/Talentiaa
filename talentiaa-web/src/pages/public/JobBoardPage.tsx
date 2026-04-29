import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, MapPin, Briefcase, Clock, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';
import type { Job } from '../../types/database';

const PAGE_SIZE = 8;

export default function JobBoardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Filters from URL
  const keyword = searchParams.get('q') || '';
  const jobType = searchParams.get('type') || '';
  const workplace = searchParams.get('workplace') || '';
  const experience = searchParams.get('exp') || '';
  const page = parseInt(searchParams.get('page') || '1');

  // Debounced search
  const [searchInput, setSearchInput] = useState(keyword);
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (searchInput) p.set('q', searchInput); else p.delete('q');
      p.set('page', '1');
      setSearchParams(p);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch jobs
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
    if (profile) {
      navigate(`/candidate/apply/${jobId}`);
    } else {
      navigate(`/login?redirect=/candidate/apply/${jobId}`);
    }
  };

  const timeAgo = (d: string | null) => {
    if (!d) return '';
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return 'আজ';
    if (diff === 1) return '১ দিন আগে';
    return `${diff} দিন আগে`;
  };

  return (
    <div className="job-board-v2" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="nav-header">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <a href="/" className="nav-logo">Talentiaa</a>
            <nav style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="/" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.95rem' }}>জব বোর্ড</a>
              <a href="#" style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem' }}>কোম্পানি</a>
            </nav>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {profile ? (
              <>
                <button 
                  onClick={() => navigate(profile.role === 'admin' ? '/admin' : profile.role === 'recruiter' ? '/recruiter' : '/candidate')} 
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Dashboard
                </button>
                {profile.role === 'candidate' && (
                  <button 
                    onClick={() => navigate('/candidate/profile')}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  >
                    Profile
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>লগইন</button>
                <button onClick={() => navigate('/signup')} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>সাইন আপ</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section style={{ background: 'white', borderBottom: '1px solid var(--border-light)', padding: '1.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="জব টাইটেল বা কি-ওয়ার্ড দিয়ে সার্চ করুন..."
                className="input-field"
                style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', border: '1.5px solid var(--border-light)', borderRadius: '12px', outline: 'none', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select value={jobType} onChange={e => setFilter('type', e.target.value)} className="select-field">
                <option value="">জব টাইপ</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
              <select value={workplace} onChange={e => setFilter('workplace', e.target.value)} className="select-field">
                <option value="">কাজের ধরন</option>
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
              {(keyword || jobType || workplace || experience) && (
                <button onClick={() => { setSearchInput(''); setSearchParams({}); }} className="btn btn-secondary" style={{ color: 'var(--error)' }}>
                  <X size={18} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div className="container" style={{ display: 'flex', width: '100%', gap: '2rem', padding: '2rem 1.5rem', height: 'calc(100vh - 160px)' }}>
          
          {/* Left Column: Job List */}
          <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '10px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="loading-spinner-sm" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
              </div>
            ) : jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <p style={{ color: 'var(--text-muted)' }}>কোনো জব পাওয়া যায়নি।</p>
              </div>
            ) : jobs.map(job => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`job-item-card ${selectedJob?.id === job.id ? 'active' : ''}`}
                style={{
                  background: 'white',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: selectedJob?.id === job.id ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  boxShadow: selectedJob?.id === job.id ? 'var(--shadow-md)' : 'none'
                }}
              >
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>{job.title}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {job.location}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={14} /> {job.workplace_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{job.job_type.replace('_', ' ')}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(job.published_at)}</span>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', paddingBottom: '1rem' }}>
                <button disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))} className="btn btn-secondary" style={{ padding: '0.5rem' }}><ChevronLeft size={18} /></button>
                <button disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))} className="btn btn-secondary" style={{ padding: '0.5rem' }}><ChevronRight size={18} /></button>
              </div>
            )}
          </div>

          {/* Right Column: Job Details */}
          <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid var(--border-light)', overflowY: 'auto', boxShadow: 'var(--shadow-sm)' }}>
            {selectedJob ? (
              <div style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{selectedJob.title}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{selectedJob.department} · {selectedJob.location}</p>
                  </div>
                  <button onClick={() => handleApply(selectedJob.id)} className="btn btn-primary" style={{ padding: '0.875rem 2rem' }}>
                    আবেদন করুন
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-body)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>কাজের ধরন</p>
                    <p style={{ fontWeight: 600 }}>{selectedJob.workplace_type} / {selectedJob.job_type}</p>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--bg-body)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>বেতন</p>
                    <p style={{ fontWeight: 600 }}>
                      {selectedJob.salary_visible ? `${selectedJob.salary_currency} ${selectedJob.salary_min?.toLocaleString()} - ${selectedJob.salary_max?.toLocaleString()}` : 'আলোচনা সাপেক্ষে'}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>প্রয়োজনীয় স্কিলসমূহ</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedJob.required_skills?.map(s => (
                      <span key={s} className="badge badge-info" style={{ padding: '0.5rem 1rem' }}>{s}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '1rem' }}>জব ডেসক্রিপশন</h4>
                  <div style={{ color: 'var(--secondary-light)', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>
                    {selectedJob.description}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <div style={{ textAlign: 'center' }}>
                  <Briefcase size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                  <p>বিস্তারিত দেখতে বাম পাশ থেকে একটি জব সিলেক্ট করুন</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .select-field {
          padding: 0.75rem 1rem;
          border: 1.5px solid var(--border-light);
          border-radius: 12px;
          outline: none;
          background: white;
          font-weight: 500;
          cursor: pointer;
        }
        .job-item-card:hover {
          border-color: var(--primary) !important;
          transform: translateX(4px);
        }
        .job-item-card.active {
          background: var(--primary-light) !important;
        }
      `}</style>
    </div>
  );
}

const filterStyle: React.CSSProperties = { padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none' };
