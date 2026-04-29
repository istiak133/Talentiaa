import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, profile, loading, refreshProfile } = useAuth();
  const location = useLocation();
  const retryCount = useRef(0);
  const adminOnlyRoute = allowedRoles?.length === 1 && allowedRoles[0] === 'admin';

  // If authenticated but no profile, keep retrying
  useEffect(() => {
    if (isAuthenticated && !profile && !loading && retryCount.current < 5) {
      const timer = setTimeout(() => {
        retryCount.current++;
        refreshProfile();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, profile, loading, refreshProfile]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={adminOnlyRoute ? '/admin/login' : '/login'}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!profile) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading profile...</p>
      </div>
    );
  }

  // Check account status — Recruiter pending approval
  if (profile.account_status === 'pending' && profile.role === 'recruiter') {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
        <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <span style={{ fontSize: '2rem' }}>⏳</span>
        </div>
        <h2 style={{ fontWeight: 800 }}>অ্যাডমিন অ্যাপ্রুভালের জন্য অপেক্ষা করুন</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>আপনার রিক্রুটার অ্যাকাউন্টটি এখনো অ্যাডমিন দ্বারা যাচাই করা হয়নি। অনুগ্রহ করে অপেক্ষা করুন।</p>
      </div>
    );
  }

  // Check role access
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const dashboardMap: Record<UserRole, string> = {
      admin: '/admin',
      recruiter: '/recruiter',
      candidate: '/candidate',
    };
    return <Navigate to={dashboardMap[profile.role]} replace />;
  }

  return <>{children}</>;
}
