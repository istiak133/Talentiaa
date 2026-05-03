import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, Building, Briefcase, Award, CheckCircle2, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AnimatedBackground from '../../components/AnimatedBackground';

export default function SignupPage() {
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Recruiter extra fields
  const [companyName, setCompanyName] = useState('');
  const [companyRole, setCompanyRole] = useState('');
  const [experience, setExperience] = useState('');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // For recruiter: show pending screen after signup
  const [recruiterPending, setRecruiterPending] = useState(false);
  // For candidate: show success screen after signup
  const [candidateSuccess, setCandidateSuccess] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('invite_token');
    if (token) {
      localStorage.setItem('recruiter_invite_token', token);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না।');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে।');
      return;
    }

    if (role === 'recruiter') {
      if (!companyName || !companyRole || !experience) {
        setError('কোম্পানির সকল তথ্য প্রদান করুন।');
        return;
      }
      if (!idCardFile) {
        setError('দয়া করে আপনার কোম্পানির আইডি কার্ড আপলোড করুন।');
        return;
      }
    }

    setLoading(true);

    let uploadedIdCardUrl = '';

    if (role === 'recruiter' && idCardFile) {
      const fileExt = idCardFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('id_cards')
        .upload(fileName, idCardFile);

      if (uploadError) {
        setError('আইডি কার্ড আপলোড করতে সমস্যা হয়েছে: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('id_cards')
        .getPublicUrl(fileName);
        
      uploadedIdCardUrl = publicUrlData.publicUrl;
    }

    // Sign up the user — Supabase will auto-confirm (no OTP needed)
    const { error: signUpError } = await signUp(
      email, password, fullName, role,
      role === 'recruiter' ? companyName : undefined,
      uploadedIdCardUrl || undefined
    );

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (role === 'recruiter') {
      // Show "Wait for Admin Approval" screen
      setRecruiterPending(true);
    } else {
      // Candidate: show success and redirect to login
      setCandidateSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { email, message: 'Account created! Please login.' } });
      }, 2500);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ background: '#000' }}>
      <AnimatedBackground variant="mesh" particleCount={55} color="94, 92, 230" speed={0.3} connectDistance={130} />
      <div className="auth-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Branding Sidebar */}
        <div className="auth-branding">
          <div className="branding-content">
            <div style={{ marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Get Started</span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginTop: '0.25rem', letterSpacing: '-0.04em', animation: 'fadeInUp 0.5s var(--ease-apple) 0.3s both' }}>Join Talentiaa</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem', lineHeight: 1.7, animation: 'fadeInUp 0.5s var(--ease-apple) 0.4s both' }}>
              বাংলাদেশের প্রথম AI-পাওয়ার্ড রিক্রুটমেন্ট প্ল্যাটফর্মে যোগ দিন।
            </p>
            <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {['Easy Apply in Seconds', 'Real-time Tracking', 'Smart Skill Matching'].map((item, i) => (
                <div key={i} className="feature-pill" style={{ animation: `fadeInUp 0.4s var(--ease-apple) ${0.5 + i * 0.1}s both` }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-card" style={{ flex: 1.5, maxHeight: '95vh', overflowY: 'auto' }}>
          <div className="auth-header">
            <h1 className="auth-logo">রেজিস্ট্রেশন</h1>
            <p className="auth-subtitle">আপনার প্রোফাইল তৈরি করে যাত্রা শুরু করুন</p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* RECRUITER PENDING APPROVAL SCREEN */}
          {recruiterPending ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', animation: 'scaleIn 0.5s ease-out' }}>
              <div style={{ width: '90px', height: '90px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', animation: 'pulse 2s ease-in-out infinite', boxShadow: '0 8px 25px rgba(245,158,11,0.2)' }}>
                <Clock size={40} color="#f59e0b" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.75rem' }}>আপনার আবেদন জমা হয়েছে!</h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                আপনার রিক্রুটার অ্যাকাউন্টটি এখন <b>অ্যাডমিন রিভিউ</b>-এর জন্য অপেক্ষমাণ। অ্যাডমিন আপনার কোম্পানি আইডি কার্ড যাচাই করে আপনার অ্যাকাউন্ট অ্যাক্টিভেট করবেন। 
              </p>
              <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
                  📧 অ্যাকাউন্ট অ্যাপ্রুভ হলে আপনি ইমেইলে নোটিফিকেশন পাবেন।
                </p>
              </div>
              <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                লগইন পেজে যান
              </button>
            </div>

          /* CANDIDATE SUCCESS SCREEN */
          ) : candidateSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem', animation: 'scaleIn 0.5s ease-out' }}>
              <div style={{ width: '90px', height: '90px', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', animation: 'checkmark 0.6s ease-out', boxShadow: '0 8px 25px rgba(16,185,129,0.2)' }}>
                <CheckCircle2 size={48} color="#10b981" />
              </div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.4rem' }}>অভিনন্দন!</h3>
              <p style={{ color: 'var(--text-muted)' }}>আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! আপনি এখন লগইন করতে পারবেন।</p>
            </div>

          /* SIGNUP FORM */
          ) : (
            <>
              {/* Role Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', padding: '4px', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setRole('candidate')}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.9rem',
                    transition: 'var(--transition-smooth)',
                    background: role === 'candidate' ? 'white' : 'transparent',
                    color: role === 'candidate' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: role === 'candidate' ? 'var(--shadow-md)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}
                >
                  <User size={16} /> Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setRole('recruiter')}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.9rem',
                    transition: 'var(--transition-smooth)',
                    background: role === 'recruiter' ? 'white' : 'transparent',
                    color: role === 'recruiter' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: role === 'recruiter' ? 'var(--shadow-md)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}
                >
                  <Building size={16} /> Recruiter
                </button>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group" style={{ animation: 'fadeInUp 0.4s ease-out 0.05s both' }}>
                    <label>পুরো নাম</label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input type="text" placeholder="আপনার নাম" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group" style={{ animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>
                    <label>ইমেইল অ্যাড্রেস</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" />
                      <input type="email" placeholder="name@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                  </div>
                </div>

                {role === 'recruiter' && (
                  <div style={{
                    background: 'linear-gradient(135deg, var(--bg-body), #eef2ff)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-light)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.25rem',
                    marginTop: '0.5rem',
                    animation: 'fadeInUp 0.4s ease-out'
                  }}>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '-0.25rem' }}>
                      <ShieldCheck size={16} /> কোম্পানির তথ্য
                    </div>
                    <div className="form-group">
                      <label>কোম্পানির নাম</label>
                      <div className="input-wrapper">
                        <Building size={18} className="input-icon" />
                        <input type="text" placeholder="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>পদবি (Role)</label>
                      <div className="input-wrapper">
                        <Briefcase size={18} className="input-icon" />
                        <input type="text" placeholder="e.g. HR Lead" value={companyRole} onChange={e => setCompanyRole(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>অভিজ্ঞতা (বছর)</label>
                      <div className="input-wrapper">
                        <Award size={18} className="input-icon" />
                        <input type="number" placeholder="Years" value={experience} onChange={e => setExperience(e.target.value)} required min="0" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>কোম্পানি আইডি কার্ড</label>
                      <div style={{ border: '1.5px dashed var(--border-light)', background: 'white', borderRadius: 'var(--radius-sm)', padding: '6px', transition: 'var(--transition-smooth)' }}>
                        <input type="file" accept="image/*" onChange={e => setIdCardFile(e.target.files?.[0] || null)} required style={{ border: 'none', paddingLeft: '8px', fontSize: '0.85rem' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group" style={{ animation: 'fadeInUp 0.4s ease-out 0.15s both' }}>
                    <label>পাসওয়ার্ড</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" />
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                      <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-group" style={{ animation: 'fadeInUp 0.4s ease-out 0.2s both' }}>
                    <label>পাসওয়ার্ড নিশ্চিত করুন</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" />
                      <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '48px', marginTop: '1rem', animation: 'fadeInUp 0.4s var(--ease-apple) 0.25s both' }}>
                  {loading ? <span className="loading-spinner-sm" /> : <>{role === 'recruiter' ? 'Submit Application' : 'Create Account'} <ArrowRight size={16} /></>}
                </button>
              </form>

              {role === 'candidate' && (
                <>
                  <div className="auth-divider"><span>অথবা</span></div>
                  <button className="btn btn-google" onClick={handleGoogleSignup} disabled={googleLoading} style={{ height: '50px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      গুগল দিয়ে সাইন আপ
                    </span>
                  </button>
                </>
              )}

              <p className="auth-footer" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                আগেই অ্যাকাউন্ট আছে? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>লগইন করুন</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
