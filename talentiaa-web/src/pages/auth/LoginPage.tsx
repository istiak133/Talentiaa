import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import AnimatedBackground from '../../components/AnimatedBackground';

function useTypewriter(words: string[], speed = 80, pause = 2200) {
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const current = words[wordIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(current.substring(0, text.length + 1));
        if (text.length === current.length) {
          setTimeout(() => setIsDeleting(true), pause);
          return;
        }
      } else {
        setText(current.substring(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, speed, pause]);

  return text;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = new URLSearchParams(location.search).get('redirect')
    || (location.state as { from?: { pathname: string } })?.from?.pathname
    || '/';

  const typedText = useTypewriter(['স্মার্ট রিক্রুটমেন্ট', 'AI-Powered Hiring', 'ক্যারিয়ার গ্রোথ', 'Top Talent Match'], 90, 2500);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error, profile: userProfile } = await signIn(email, password);
    
    if (error) {
      setError(error);
      setLoading(false);
    } else if (userProfile) {
      if (userProfile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (userProfile.role === 'recruiter') {
        navigate('/recruiter', { replace: true });
      } else {
        navigate('/candidate', { replace: true });
      }
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
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
      <AnimatedBackground variant="mesh" particleCount={70} color="0, 113, 227" speed={0.3} connectDistance={150} />
      <div className="auth-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Left: Branding */}
        <div className="auth-branding">
          <div className="branding-content">
            <div style={{ marginBottom: '2rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Welcome to</span>
              <h2 style={{ fontSize: '2.8rem', fontWeight: 700, marginTop: '0.25rem', letterSpacing: '-0.04em' }}>Talentiaa</h2>
            </div>
            
            {/* Typewriter */}
            <div style={{ minHeight: '2.5rem', marginBottom: '2.5rem' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                {typedText}
              </span>
              <span style={{ display: 'inline-block', width: '2px', height: '1.4em', background: 'var(--primary)', marginLeft: '2px', verticalAlign: 'text-bottom', animation: 'typing-cursor 1s step-end infinite' }} />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: '320px' }}>
              বাংলাদেশের সবচেয়ে অ্যাডভান্সড AI-পাওয়ার্ড রিক্রুটমেন্ট প্ল্যাটফর্ম।
            </p>

            <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {['AI Resume Scoring', 'Smart Pipeline Management', 'Real-time Analytics'].map((item, i) => (
                <div key={i} className="feature-pill" style={{ animation: `fadeInUp 0.5s var(--ease-apple) ${0.5 + i * 0.1}s both` }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo">Sign in</h1>
            <p className="auth-subtitle">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group" style={{ animation: 'fadeInUp 0.5s var(--ease-apple) 0.1s both' }}>
              <label>Email</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="form-group" style={{ animation: 'fadeInUp 0.5s var(--ease-apple) 0.15s both' }}>
              <label>Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '48px', fontSize: '0.95rem', animation: 'fadeInUp 0.5s var(--ease-apple) 0.2s both' }}>
              {loading ? <span className="loading-spinner-sm" /> : <>Continue <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="auth-divider" style={{ animation: 'fadeIn 0.5s var(--ease-apple) 0.3s both' }}>
            <span>or</span>
          </div>

          <button className="btn btn-google" onClick={handleGoogleLogin} disabled={googleLoading}
            style={{ width: '100%', height: '48px', animation: 'fadeInUp 0.5s var(--ease-apple) 0.35s both' }}>
            {googleLoading ? (
              <span className="loading-spinner-sm" style={{ borderColor: '#e2e8f0', borderTopColor: '#64748b' }} />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </span>
            )}
          </button>

          <p className="auth-footer" style={{ marginTop: '2rem', textAlign: 'center', animation: 'fadeIn 0.5s var(--ease-apple) 0.4s both' }}>
            Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
