import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, Mail, Shield, ArrowRight, KeyRound, Server } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/database';
import AnimatedBackground from '../../components/AnimatedBackground';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signOut, isAuthenticated, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const getSafeAdminPath = (path: string | undefined) => {
    return (path && path.startsWith('/admin')) ? path : '/admin';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError, profile: signedInProfile } = await signIn(email, password);

    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    if (!signedInProfile || signedInProfile.role !== 'admin') {
      await signOut();
      setError('এই পেজ শুধুমাত্র অ্যাডমিন লগইনের জন্য।');
      setLoading(false);
      return;
    }

    navigate(getSafeAdminPath(from), { replace: true });
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-body)' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (isAuthenticated && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    const dashboardMap: Record<UserRole, string> = { admin: '/admin', recruiter: '/recruiter', candidate: '/candidate' };
    return <Navigate to={dashboardMap[profile.role]} replace />;
  }

  return (
    <div className="auth-page" style={{ background: '#000' }}>
      <AnimatedBackground variant="mesh" particleCount={50} color="94, 92, 230" speed={0.25} connectDistance={120} />
      <div className="auth-container" style={{ border: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }}>
        {/* Branding Sidebar */}
        <div className="auth-branding" style={{ background: 'linear-gradient(180deg, #000, #1d1d1f)' }}>
          <div className="branding-content">
            <div style={{
              width: '56px', height: '56px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '2rem',
              animation: 'pulseGlow 2.5s ease-in-out infinite',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <Shield size={28} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.04em', animation: 'fadeInUp 0.5s var(--ease-apple) 0.3s both' }}>Admin Portal</h2>
            <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.4)', animation: 'fadeInUp 0.5s var(--ease-apple) 0.4s both' }}>
              অ্যাডমিন কন্ট্রোল সেন্টারে প্রবেশ করুন। এখান থেকে পুরো প্ল্যাটফর্মের ইউজার এবং জব মডারেশন নিয়ন্ত্রণ করা হয়।
            </p>
            <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { icon: <Shield size={16} />, text: 'High Security Access' },
                { icon: <KeyRound size={16} />, text: 'Management Dashboard' },
                { icon: <Server size={16} />, text: 'Full System Control' },
              ].map((item, i) => (
                <div key={i} className="feature-pill" style={{ animation: `fadeInUp 0.4s var(--ease-apple) ${0.5 + i * 0.1}s both` }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-card" style={{ background: '#1d1d1f', color: 'white' }}>
          <div className="auth-header">
            <h1 className="auth-logo" style={{ WebkitTextFillColor: 'white' }}>Admin Login</h1>
            <p className="auth-subtitle" style={{ color: 'rgba(255,255,255,0.4)' }}>Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="auth-error" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group" style={{ animation: 'fadeInUp 0.4s var(--ease-apple) 0.1s both' }}>
              <label style={{ color: 'rgba(255,255,255,0.6)' }}>Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input type="email" placeholder="admin@talentiaa.com" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }} />
              </div>
            </div>

            <div className="form-group" style={{ animation: 'fadeInUp 0.4s var(--ease-apple) 0.2s both' }}>
              <label style={{ color: 'rgba(255,255,255,0.6)' }}>Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }} />
                <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{
              height: '48px', marginTop: '1rem',
              animation: 'fadeInUp 0.4s var(--ease-apple) 0.3s both'
            }}>
              {loading ? <span className="loading-spinner-sm" /> : <>Continue <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="auth-footer" style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
            Regular user? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
