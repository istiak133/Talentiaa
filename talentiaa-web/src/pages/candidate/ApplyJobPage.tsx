import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { matchResumeToJob } from '../../lib/grok';
import { ArrowLeft, Upload, Loader2, CheckCircle, Briefcase, MapPin, Building, Sparkles, Target, AlertCircle, FileText, ChevronRight, CalendarX2, FileEdit, Calendar } from 'lucide-react';
import type { Job } from '../../types/database';

export default function ApplyJobPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<{ score: number; breakdown: any; summary: string; missing_skills?: string[]; improvement_suggestion?: string } | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');

  // Deadline check
  const isExpired = job ? new Date(job.application_deadline) < new Date(new Date().toDateString()) : false;

  useEffect(() => {
    if (!jobId) return;
    supabase.from('jobs').select('*').eq('id', jobId).single()
      .then(({ data }) => { if (data) setJob(data as Job); });
  }, [jobId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setScore(null);
    setResumeText('');
    setError(null);

    if (file.type === 'application/pdf') {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          extractedText += pageText + '\\n';
        }
        
        setResumeText(extractedText);
      } catch (err) {
        console.error('Failed to parse PDF', err);
        setError('Failed to auto-extract text from PDF. Please paste your resume text manually below for AI Scoring.');
      }
    } else {
      const text = await file.text();
      setResumeText(text);
    }
  };

  const handleScore = async () => {
    if (!job || !resumeText.trim()) {
      setError('দয়া করে আপনার রেজুমে আপলোড করুন অথবা টেক্সট পেস্ট করুন।');
      return;
    }
    setScoring(true);
    setError(null);
    try {
      const skills = job.required_skills || [];
      const result = await matchResumeToJob(resumeText, job.title, job.description, skills);
      setScore(result);
    } catch (err: any) {
      setError(err.message || 'AI scoring failed. You can still apply.');
    } finally {
      setScoring(false);
    }
  };

  const handleApply = async () => {
    if (!profile || !job || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      let fileUrl = '';
      let resumeId: string | null = null;

      if (resumeFile) {
        const filePath = `${profile.id}/${Date.now()}_${resumeFile.name}`;
        const { error: upErr } = await supabase.storage.from('resumes').upload(filePath, resumeFile);
        if (upErr) throw upErr;
        fileUrl = filePath;

        const { data: resumeData, error: resErr } = await supabase.from('resumes').insert([{
          candidate_id: profile.id,
          file_url: fileUrl,
          file_name: resumeFile.name,
          file_type: resumeFile.type,
          file_size_bytes: resumeFile.size,
        }]).select('id').single();
        if (resErr) throw resErr;
        resumeId = resumeData?.id;
      }

      const candidateScore = score?.score || 0;
      const jobThreshold = job.threshold_score || 70;
      const isHiddenPool = candidateScore < jobThreshold;

      const { error: appErr } = await supabase.from('applications').insert([{
        job_id: jobId,
        candidate_id: profile.id,
        resume_id: resumeId,
        score_overall: candidateScore,
        score_breakdown: {
          skills: score?.breakdown?.skills || 0,
          experience: score?.breakdown?.experience || 0,
          education: score?.breakdown?.education || 0,
          missing_skills: score?.missing_skills || [],
          improvement_suggestion: score?.improvement_suggestion || "",
          cover_letter: coverLetter.trim() || null,
        },
        hidden_pool: isHiddenPool,
        threshold_at_apply: jobThreshold,
      }]);
      if (appErr) throw appErr;

      setApplied(true);
    } catch (err: any) {
      setError(err.message || 'Application failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!job) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><span className="loading-spinner-sm" /></div>;

  if (applied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)', padding: '2rem' }}>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '32px', textAlign: 'center', boxShadow: 'var(--shadow-lg)', maxWidth: '500px' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={48} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Application Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>আপনার অ্যাপ্লিকেশনটি সফলভাবে জমা দেওয়া হয়েছে। রিক্রুটার এটি রিভিউ করলে আপনাকে জানানো হবে।</p>
          {score && (
            <div style={{ background: 'var(--bg-body)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>AI Match Score</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{score.score}%</div>
            </div>
          )}
          <button onClick={() => navigate('/candidate')} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page" style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} /> Back to Job Details
        </button>

        {/* Job Summary Card */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', marginBottom: '2rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ width: '60px', height: '60px', background: 'var(--primary-light)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Briefcase size={30} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{job.title}</h1>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building size={16} /> {job.department}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={16} /> {job.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deadline Warning */}
        {isExpired && (
          <div style={{ padding: '1.25rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', background: '#fee2e2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarX2 size={24} color="var(--error)" />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--error)', fontSize: '0.95rem', marginBottom: '0.15rem' }}>Application Deadline Expired</h4>
              <p style={{ fontSize: '0.82rem', color: '#b91c1c' }}>
                এই জবের আবেদনের শেষ তারিখ ছিল <strong>{new Date(job!.application_deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>। আর আবেদন করা যাচ্ছে না।
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: 'var(--error)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* Upload Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--primary)" /> Upload your Resume
            </h3>

            <label style={{ display: 'block', border: '2px dashed var(--border-light)', borderRadius: '16px', padding: '3rem', textAlign: 'center', cursor: 'pointer', background: resumeFile ? 'var(--primary-light)' : 'var(--bg-body)', transition: 'var(--transition)' }} className="upload-zone">
              <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleFileChange} style={{ display: 'none' }} />
              <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: 'var(--shadow-sm)' }}>
                <Upload size={28} color="var(--primary)" />
              </div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{resumeFile ? resumeFile.name : 'Click to upload your resume'}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>PDF, DOCX or TXT (Max 5MB)</p>
            </label>

            <div style={{ marginTop: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.75rem' }}>Or paste resume content:</label>
              <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={6} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid var(--border-light)', outline: 'none', fontSize: '0.9rem' }} placeholder="Paste your resume details here for AI analysis..." />
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleScore} disabled={scoring || isExpired} className="btn btn-primary" style={{ padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: isExpired ? '#94a3b8' : 'var(--secondary)', cursor: isExpired ? 'not-allowed' : 'pointer' }}>
                {scoring ? <span className="loading-spinner-sm" /> : <><Sparkles size={18} /> Analyze with AI</>}
              </button>
            </div>
          </div>

          {/* Cover Letter */}
          <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileEdit size={20} color="var(--primary)" /> Cover Letter <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>(Optional)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              আপনার মোটিভেশন এবং এই পদে কেন আপনি সেরা — সংক্ষেপে লিখুন।
            </p>
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              rows={5}
              maxLength={2000}
              disabled={isExpired}
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              placeholder="Why are you the best fit for this role? Share your motivation..."
            />
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>{coverLetter.length}/2000</div>
          </div>

          {/* AI Score Feedback */}
          {score && (
            <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={20} color="var(--primary)" /> AI Match Analysis
                </h3>
                <div style={{ padding: '0.5rem 1rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50px', fontWeight: 800 }}>
                  {score.score}% Match
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {Object.entries(score.breakdown).map(([key, val]: any) => (
                  <div key={key} style={{ background: 'var(--bg-body)', padding: '1.25rem', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{key}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>{val}%</div>
                  </div>
                ))}
              </div>

              {score.missing_skills && score.missing_skills.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#b45309', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={18} /> Missing Skills
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {score.missing_skills.map(s => <span key={s} style={{ background: 'white', color: '#b45309', padding: '0.3rem 0.8rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #fef3c7' }}>{s}</span>)}
                  </div>
                </div>
              )}

              {score.improvement_suggestion && (
                <div style={{ background: 'var(--primary-light)', padding: '1.5rem', borderRadius: '16px', color: 'var(--primary)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem' }}>💡 AI Improvement Suggestion</h4>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.6, fontWeight: 500 }}>{score.improvement_suggestion}</p>
                </div>
              )}
            </div>
          )}

          <button onClick={handleApply} disabled={loading || isExpired} className="btn btn-primary" style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: isExpired ? '#94a3b8' : undefined, cursor: isExpired ? 'not-allowed' : 'pointer' }}>
            {loading ? <span className="loading-spinner-sm" /> : isExpired ? <>Deadline Expired — Cannot Apply</> : <>Confirm & Submit Application <ChevronRight size={20} /></>}
          </button>
        </div>
      </div>

      <style>{`
        .upload-zone:hover { border-color: var(--primary); background: var(--primary-light); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
