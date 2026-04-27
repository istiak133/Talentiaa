import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { matchResumeToJob } from '../../lib/gemini';
import { ArrowLeft, Upload, Loader2, CheckCircle } from 'lucide-react';
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
  const [score, setScore] = useState<{ score: number; breakdown: any; summary: string } | null>(null);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch job details
  useEffect(() => {
    if (!jobId) return;
    supabase.from('jobs').select('*').eq('id', jobId).single()
      .then(({ data }) => { if (data) setJob(data as Job); });
  }, [jobId]);

  // Read file as text (for PDF we extract what we can, for txt/docx we read directly)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFile(file);
    setScore(null);

    // Read as text — works for .txt files. For PDF the user can paste text manually.
    const text = await file.text();
    setResumeText(text);
  };

  // AI Score the resume against job
  const handleScore = async () => {
    if (!job || !resumeText.trim()) {
      setError('Please upload or paste your resume first.');
      return;
    }
    setScoring(true);
    setError(null);
    try {
      const result = await matchResumeToJob(resumeText, job.title, job.description, job.required_skills);
      setScore(result);
    } catch {
      setError('AI scoring failed. You can still apply.');
    } finally {
      setScoring(false);
    }
  };

  // Submit application
  const handleApply = async () => {
    if (!profile || !job || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Upload resume file to Supabase storage
      let fileUrl = '';
      let resumeId: string | null = null;

      if (resumeFile) {
        const filePath = `${profile.id}/${Date.now()}_${resumeFile.name}`;
        const { error: upErr } = await supabase.storage.from('resumes').upload(filePath, resumeFile);
        if (upErr) throw upErr;
        fileUrl = filePath;

        // 2. Insert resume record
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

      // 3. Insert application
      const { error: appErr } = await supabase.from('applications').insert([{
        job_id: jobId,
        candidate_id: profile.id,
        resume_id: resumeId,
        score_overall: score?.score ?? null,
        score_breakdown: score?.breakdown ?? {},
      }]);
      if (appErr) throw appErr;

      setApplied(true);
    } catch (err: any) {
      setError(err.message || 'Application failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!job) return <div style={{ padding: '60px', textAlign: 'center' }}>Loading job...</div>;

  if (applied) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
        <div style={{ textAlign: 'center' }}>
          <CheckCircle size={64} color="#16a34a" />
          <h2 style={{ marginTop: '16px', fontSize: '24px' }}>Application Submitted!</h2>
          {score && <p style={{ fontSize: '18px', color: '#4b5563', marginTop: '8px' }}>Your Match Score: <b>{score.score}%</b></p>}
          <button onClick={() => navigate('/candidate')} style={{ marginTop: '24px', padding: '12px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
          <ArrowLeft size={18} /> Back
        </button>

        {/* Job Info Card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{job.title}</h1>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>{job.department} · {job.location} · {job.workplace_type}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {job.required_skills.map(s => (
              <span key={s} style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '16px', fontSize: '12px' }}>{s}</span>
            ))}
          </div>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fca5a5' }}>{error}</div>}

        {/* Resume Upload */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px' }}>Upload Resume</h2>

          <label style={{ display: 'block', border: '2px dashed #d1d5db', borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer', background: resumeFile ? '#f0fdf4' : '#fafafa' }}>
            <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleFileChange} style={{ display: 'none' }} />
            <Upload size={32} color="#9ca3af" />
            <p style={{ marginTop: '8px', fontWeight: 600 }}>{resumeFile ? resumeFile.name : 'Click to upload or drag file here'}</p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>PDF, TXT, DOC (Max 5MB)</p>
          </label>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Or paste your resume text:</label>
            <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={6} style={{ width: '100%', padding: '10px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} placeholder="Paste your resume content here..." />
          </div>
        </div>

        {/* AI Score Section */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700 }}>AI Match Score</h2>
            <button onClick={handleScore} disabled={scoring} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
              {scoring ? <><Loader2 size={14} className="spin" /> Scoring...</> : '🎯 Check Score'}
            </button>
          </div>

          {score && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: score.score >= 70 ? '#dcfce7' : score.score >= 50 ? '#fef9c3' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800, color: score.score >= 70 ? '#16a34a' : score.score >= 50 ? '#ca8a04' : '#dc2626' }}>
                  {score.score}%
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '16px' }}>{score.score >= 70 ? 'Great Match!' : score.score >= 50 ? 'Fair Match' : 'Low Match'}</p>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>{score.summary}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {Object.entries(score.breakdown).map(([key, val]) => (
                  <div key={key} style={{ flex: 1, padding: '12px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{key}</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{val as number}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button onClick={handleApply} disabled={loading} style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}
