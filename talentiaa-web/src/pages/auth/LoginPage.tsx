import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ChevronRight } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error, profile: userProfile } = await signIn(email, password);
    
    if (error) {
      setError(error);
      setLoading(false);
    } else if (userProfile) {
      // Role-based redirection
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
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Side: Branding */}
        <div className="auth-branding">
          <div className="branding-content">
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Talentiaa</h2>
            <p style={{ marginTop: '1rem', color: '#cbd5e1' }}>
              স্মার্ট রিক্রুটমেন্টের ভবিষ্যৎ এখন আপনার হাতে। এআই-পাওয়ারড টুলস দিয়ে সেরা ট্যালেন্ট খুঁজে নিন।
            </p>
            <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                <span>AI-Powered Resume Match</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                <span>Seamless Candidate Pipeline</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                <span>Analytics Dashboard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo" style={{ color: 'var(--secondary)' }}>স্বাগতম</h1>
            <p className="auth-subtitle">আপনার অ্যাকাউন্টে লগইন করে প্রসেস শুরু করুন</p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">ইমেইল অ্যাড্রেস</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">পাসওয়ার্ড</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="আপনার পাসওয়ার্ড দিন"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link to="#" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>পাসওয়ার্ড ভুলে গেছেন?</Link>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '48px' }}>
              {loading ? (
                <span className="loading-spinner-sm" />
              ) : (
                <>লগইন করুন <ChevronRight size={18} /></>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>অথবা গুগল দিয়ে</span>
          </div>

          <button
            className="btn btn-google"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            style={{ height: '48px' }}
          >
            {googleLoading ? (
              <span className="loading-spinner-sm" style={{ borderColor: '#e2e8f0', borderTopColor: '#64748b' }} />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google দিয়ে কন্টিনিউ করুন
              </span>
            )}
          </button>

          <p className="auth-footer" style={{ marginTop: '2rem' }}>
            অ্যাকাউন্ট নেই? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>রেজিস্ট্রেশন করুন</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
