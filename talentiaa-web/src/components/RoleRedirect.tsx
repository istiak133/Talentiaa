import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/database';

export function RoleRedirect() {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="loading-screen" style={{color: 'red'}}>
        <div className="loading-spinner" style={{borderColor: 'red', borderTopColor: 'transparent'}} />
        <p>লগইন সফল হয়েছে, কিন্তু প্রোফাইল ডাটা পাওয়া যাচ্ছে না।</p>
        <p style={{fontSize: '0.8rem', opacity: 0.7}}>এটা ডাটাবেস RLS বা Trigger Error হতে পারে।</p>
        <button onClick={() => window.location.href='/login'} className="btn btn-secondary" style={{marginTop: '1rem'}}>
          ফিরে যান
        </button>
      </div>
    );
  }

  const dashboardMap: Record<UserRole, string> = {
    admin: '/admin',
    recruiter: '/recruiter',
    candidate: '/candidate',
  };

  return <Navigate to={dashboardMap[profile.role]} replace />;
}
