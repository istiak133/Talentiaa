import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's an error in the hash
    if (window.location.hash.includes('error=')) {
      setError(window.location.hash);
      return;
    }

    const processLogin = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setError(error.message);
          return;
        }
        if (data.session) {
          navigate('/'); // redirect to role checker
        } else {
          setError("No session found. Hash: " + window.location.hash);
        }
      } catch (err: any) {
        setError(err?.message || 'Unknown error');
      }
    };

    processLogin();
  }, [navigate]);

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h2>OAuth Error Debug:</h2>
        <p style={{ wordBreak: 'break-all' }}>{error}</p>
        <button onClick={() => navigate('/login')}>Back to Login</button>
      </div>
    );
  }

  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p>Authenticating Google Login...</p>
    </div>
  );
}
