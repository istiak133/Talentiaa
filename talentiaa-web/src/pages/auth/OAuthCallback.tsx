import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processLogin = async () => {
      try {
        // Check if there's an error in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorDescription = hashParams.get('error_description');
        
        if (hashParams.get('error')) {
          setError(`OAuth Error: ${errorDescription || hashParams.get('error')}`);
          return;
        }

        // Get the session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        
        if (data.session?.user) {
          // Wait a moment for the profile to be created by database trigger
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get user profile to determine role
          const { data: profile } = await supabase
            .from('users')
            .select('role, account_status')
            .eq('id', data.session.user.id)
            .single();
          
          if (!profile) {
            setError('Profile not found. Please contact support.');
            return;
          }
          
          // Redirect based on role
          if (profile.role === 'admin') {
            navigate('/admin', { replace: true });
          } else if (profile.role === 'recruiter') {
            if (profile.account_status === 'pending') {
              setError('Your account is pending admin approval.');
              return;
            }
            navigate('/recruiter', { replace: true });
          } else {
            navigate('/candidate', { replace: true });
          }
        } else {
          setError('No session found. Please try logging in again.');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err?.message || 'Authentication failed. Please try again.');
      }
    };

    processLogin();
  }, [navigate]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Authentication Error</h2>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Something went wrong with Google login</p>
          </div>
          
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '24px' }}>
            <p style={{ fontSize: '12px', color: '#991b1b', wordBreak: 'break-all', margin: 0 }}>{error}</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => navigate('/login')} 
              style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
            >
              Back to Login
            </button>
            <button 
              onClick={() => window.location.href = '/'} 
              style={{ width: '100%', padding: '12px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }}></div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Completing Google Login...</h2>
        <p style={{ fontSize: '14px', color: '#64748b' }}>Please wait a moment</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
