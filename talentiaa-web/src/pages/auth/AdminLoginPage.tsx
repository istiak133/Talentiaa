import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail, Shield } from 'lucide-react';
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
    if (path && path.startsWith('/admin')) {
      return path;
    }
    return '/admin';
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

    if (!signedInProfile) {
      await signOut();
      setError('লগইন সফল হয়েছে, কিন্তু প্রোফাইল পাওয়া যায়নি। আবার চেষ্টা করুন।');
      setLoading(false);
      return;
    }

    if (signedInProfile.role !== 'admin') {
      await signOut();
      setError('এই পেজ শুধুমাত্র অ্যাডমিন লগইনের জন্য।');
      setLoading(false);
      return;
    }

    navigate(getSafeAdminPath(from), { replace: true });
  };

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated && profile) {
    if (profile.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }

    const dashboardMap: Record<UserRole, string> = {
      admin: '/admin',
      recruiter: '/recruiter',
      candidate: '/candidate',
    };

    return <Navigate to={dashboardMap[profile.role]} replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-center">
        <div className="auth-card verify-card" style={{ maxWidth: '520px', width: '100%' }}>
          <div className="verify-icon" style={{ marginBottom: '1rem' }}>
            <Shield size={40} />
          </div>

          <div className="auth-header" style={{ marginBottom: '1.25rem' }}>
            <h1 className="auth-logo">Admin Login</h1>
            <p className="auth-subtitle">শুধুমাত্র অ্যাডমিন এক্সেস</p>
          </div>

          {error && (
            <div className="auth-error" style={{ marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" style={{ width: '100%' }}>
            <div className="form-group">
              <label htmlFor="admin-email">ইমেইল</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="admin-email"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">পাসওয়ার্ড</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <span className="btn-loading"><span className="loading-spinner-sm" /> লগইন হচ্ছে...</span>
              ) : (
                <span className="btn-content"><LogIn size={18} /> Admin Login</span>
              )}
            </button>
          </form>

          <p className="auth-footer" style={{ marginTop: '1.25rem' }}>
            সাধারণ ইউজার? <Link to="/login">সাধারণ লগইন পেইজে যান</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
