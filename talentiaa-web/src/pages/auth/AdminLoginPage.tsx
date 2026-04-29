import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, Mail, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/database';

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
    <div className="auth-page">
      <div className="auth-container">
        {/* Branding Sidebar */}
        <div className="auth-branding" style={{ background: 'var(--secondary)' }}>
          <div className="branding-content">
            <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Shield size={32} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Admin Portal</h2>
            <p style={{ marginTop: '1rem', color: '#94a3b8' }}>
              অ্যাডমিন কন্ট্রোল সেন্টারে প্রবেশ করুন। এখান থেকে পুরো প্ল্যাটফর্মের ইউজার এবং জব মডারেশন নিয়ন্ত্রণ করা হয়।
            </p>
            <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="feature-pill"><Shield size={18} /> High Security Access</div>
              <div className="feature-pill"><Shield size={18} /> Management Dashboard</div>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo" style={{ color: 'var(--secondary)' }}>অ্যাডমিন লগইন</h1>
            <p className="auth-subtitle">আপনার ক্রেডেনশিয়াল ব্যবহার করে প্রবেশ করুন</p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>অ্যাডমিন ইমেইল</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input type="email" placeholder="admin@talentiaa.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label>পাসওয়ার্ড</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '50px', marginTop: '1rem' }}>
              {loading ? <span className="loading-spinner-sm" /> : <>অ্যাডমিন লগইন <ChevronRight size={18} /></>}
            </button>
          </form>

          <p className="auth-footer" style={{ marginTop: '2rem' }}>
            সাধারণ ইউজার? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>সাধারণ লগইন পেইজে যান</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
