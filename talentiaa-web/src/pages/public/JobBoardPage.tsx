import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, MapPin, Briefcase, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
    }, 300);
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
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    return `${diff} days ago`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Bar */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/')}>Talentiaa</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {profile ? (
            <button onClick={() => navigate('/')} style={btnStyle}>Dashboard</button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={{ ...btnStyle, background: '#fff', color: '#2563eb', border: '1.5px solid #2563eb' }}>Login</button>
              <button onClick={() => navigate('/signup')} style={btnStyle}>Sign Up</button>
            </>
          )}
        </div>
      </header>

      {/* Search & Filters */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: '#9ca3af' }} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search jobs by title..."
                style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select value={jobType} onChange={e => setFilter('type', e.target.value)} style={filterStyle}>
              <option value="">All Job Types</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            <select value={workplace} onChange={e => setFilter('workplace', e.target.value)} style={filterStyle}>
              <option value="">All Workplaces</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
            <select value={experience} onChange={e => setFilter('exp', e.target.value)} style={filterStyle}>
              <option value="">All Levels</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-Level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
            {(keyword || jobType || workplace || experience) && (
              <button onClick={() => { setSearchInput(''); setSearchParams({}); }} style={{ ...filterStyle, color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <X size={14} /> Clear
              </button>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6b7280', alignSelf: 'center' }}>{total} jobs found</span>
          </div>
        </div>
      </div>

      {/* Main Content: Split View */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px', display: 'flex', gap: '24px', minHeight: 'calc(100vh - 160px)' }}>
        
        {/* Left: Job List */}
        <div style={{ width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? <p style={{ color: '#9ca3af' }}>Loading...</p> : jobs.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', paddingTop: '40px' }}>No jobs found matching your criteria.</p>
          ) : jobs.map(job => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              style={{
                background: selectedJob?.id === job.id ? '#eff6ff' : '#fff',
                border: selectedJob?.id === job.id ? '1.5px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '12px', padding: '16px', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{job.title}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {job.department && <span>{job.department}</span>}
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={12} /> {job.location}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Briefcase size={12} /> {job.workplace_type}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                {job.required_skills?.slice(0, 3).map(s => (
                  <span key={s} style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: '12px', fontSize: '11px', color: '#4b5563' }}>{s}</span>
                ))}
                {job.required_skills?.length > 3 && <span style={{ fontSize: '11px', color: '#9ca3af' }}>+{job.required_skills.length - 3}</span>}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} /> {timeAgo(job.published_at)}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
              <button disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))} style={pageBtnStyle}><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setFilter('page', String(i + 1))} style={{ ...pageBtnStyle, background: page === i + 1 ? '#2563eb' : '#fff', color: page === i + 1 ? '#fff' : '#374151' }}>{i + 1}</button>
              ))}
              <button disabled={page >= totalPages} onClick={() => setFilter('page', String(page + 1))} style={pageBtnStyle}><ChevronRight size={16} /></button>
            </div>
          )}
        </div>

        {/* Right: Job Details */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px', overflowY: 'auto' }}>
          {selectedJob ? (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>{selectedJob.title}</h2>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {selectedJob.department && <span>{selectedJob.department}</span>}
                <span>📍 {selectedJob.location}</span>
                <span>🏢 {selectedJob.workplace_type}</span>
                <span>💼 {selectedJob.job_type.replace('_', '-')}</span>
                <span>📊 {selectedJob.experience_level}</span>
              </div>

              {selectedJob.salary_visible && (selectedJob.salary_min || selectedJob.salary_max) && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: '#15803d' }}>
                  💰 {selectedJob.salary_currency} {selectedJob.salary_min?.toLocaleString()} — {selectedJob.salary_max?.toLocaleString()}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Required Skills</h3>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedJob.required_skills?.map(s => (
                    <span key={s} style={{ padding: '4px 12px', background: '#ede9fe', color: '#6d28d9', borderRadius: '16px', fontSize: '13px', fontWeight: 500 }}>{s}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Job Description</h3>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedJob.description}</p>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', fontSize: '13px', color: '#6b7280' }}>
                <span>📅 Deadline: <b>{new Date(selectedJob.application_deadline).toLocaleDateString()}</b></span>
                <span>👥 Hiring: <b>{selectedJob.hiring_count}</b></span>
              </div>

              <button onClick={() => handleApply(selectedJob.id)} style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                Apply Now →
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '100px' }}>
              <p style={{ fontSize: '16px' }}>👈 Select a job to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = { padding: '8px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' };
const filterStyle: React.CSSProperties = { padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none' };
const pageBtnStyle: React.CSSProperties = { width: '32px', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' };
