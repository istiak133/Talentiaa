import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading profile...</p>
      </div>
    );
  }

  // Check account status
  if (profile.account_status === 'pending' && !profile.email_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  // Check role access
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect to their correct dashboard
    const dashboardMap: Record<UserRole, string> = {
      admin: '/admin',
      recruiter: '/recruiter',
      candidate: '/candidate',
    };
    return <Navigate to={dashboardMap[profile.role]} replace />;
  }

  return <>{children}</>;
}
