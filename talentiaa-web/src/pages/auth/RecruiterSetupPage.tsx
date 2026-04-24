import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building, Briefcase, Mail, Lock, User, AlertCircle, Award, Network } from 'lucide-react';

/**
 * RecruiterSetupPage — completely bypasses Supabase JS client for auth + RPC
 * to avoid the notorious "Lock was released because another request stole it" bug.
 * 
 * Instead, we use raw fetch() calls to the Supabase Auth and REST APIs directly.
 */
export default function RecruiterSetupPage() {
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  
  // Fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyRole, setCompanyRole] = useState('');
  const [department, setDepartment] = useState('');
  const [experience, setExperience] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    const t = searchParams.get('invite_token');
    if (!t) {
      setError('Invalid or Missing Invite Token. Ask your administrator for a new link.');
      return;
    }
    setToken(t);

    const b64email = searchParams.get('e');
    if (b64email) {
      try {
        setEmail(atob(b64email));
      } catch {
        // ignore invalid b64
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) return;

    if (password !== confirmPassword) {
      setError('Password does not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      // ── Step 1: Sign Up via Supabase Auth REST API (bypasses JS client entirely) ──
      let jwt: string;
      let userId: string;

      const signUpRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({
          email,
          password,
          data: { full_name: fullName },
        }),
      });

      const signUpData = await signUpRes.json();

      if (!signUpRes.ok) {
        // If user already exists, try signing in instead
        if (signUpData?.msg?.includes('already been registered') || signUpData?.error_description?.includes('already been registered')) {
          const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
            },
            body: JSON.stringify({ email, password }),
          });

          const signInData = await signInRes.json();
          if (!signInRes.ok) {
            throw new Error(signInData?.error_description || signInData?.msg || 'Login failed');
          }

          jwt = signInData.access_token;
          userId = signInData.user.id;
        } else {
          throw new Error(signUpData?.msg || signUpData?.error_description || 'Signup failed');
        }
      } else {
        jwt = signUpData.access_token;
        userId = signUpData.user?.id;

        if (!jwt || !userId) {
          throw new Error('Account created but email confirmation may be required. Check your email.');
        }
      }

      // ── Step 2: Call RPC to accept invite and upgrade role to recruiter ──
      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/accept_recruiter_invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!rpcRes.ok) {
        const errBody = await rpcRes.text();
        throw new Error('Invite verification failed: ' + errBody);
      }

      // ── Step 3: Insert recruiter profile ──
      const profRes = await fetch(`${supabaseUrl}/rest/v1/recruiter_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${jwt}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          recruiter_id: userId,
          company_name: companyName,
          company_role: companyRole,
          department: department,
          experience_years: parseFloat(experience) || 0,
        }),
      });

      if (!profRes.ok) {
        const errText = await profRes.text();
        if (!errText.includes('duplicate key')) {
          console.warn('Profile insert warning:', errText);
        }
      }

      // ── Step 4: Store session in localStorage so Supabase JS picks it up on next load ──
      // We need to sign in via Supabase JS client once to establish the session properly
      // But we do it via setting the session in localStorage directly
      const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
      
      // Get a fresh session via sign-in to store properly
      const freshSignIn = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      if (freshSignIn.ok) {
        const sessionData = await freshSignIn.json();
        localStorage.setItem(storageKey, JSON.stringify(sessionData));
      }

      setSuccess(true);

      // Redirect after a brief moment
      setTimeout(() => {
        window.location.href = '/recruiter';
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during setup.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <h1 className="auth-logo" style={{ marginBottom: '1rem' }}>Talentiaa</h1>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: 'var(--color-success, #10b981)', marginBottom: '0.5rem' }}>Setup Complete!</h2>
            <p style={{ opacity: 0.7 }}>Redirecting to your Recruiter Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '900px' }}>
        
        {/* Form Card */}
        <div className="auth-card" style={{ padding: '2.5rem' }}>
          <div className="auth-header" style={{ alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h1 className="auth-logo">Talentiaa</h1>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginTop: '0.5rem' }}>Company Account Setup</p>
          </div>

          {error && (
            <div className="auth-error" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Company Name</label>
                <div className="input-wrapper">
                  <Building size={18} className="input-icon" />
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Experience (Years)</label>
                <div className="input-wrapper">
                  <Briefcase size={18} className="input-icon" />
                  <input type="number" step="0.5" value={experience} onChange={e => setExperience(e.target.value)} required />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Role in Company</label>
                <div className="input-wrapper">
                  <Award size={18} className="input-icon" />
                  <input type="text" placeholder="e.g. HR Manager" value={companyRole} onChange={e => setCompanyRole(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Department</label>
                <div className="input-wrapper">
                  <Network size={18} className="input-icon" />
                  <input type="text" placeholder="e.g. Technical" value={department} onChange={e => setDepartment(e.target.value)} required />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Company Email (Locked to Invitation)</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input type="email" value={email} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || !token} style={{ marginTop: '1rem' }}>
              {loading ? <span className="btn-loading"><span className="loading-spinner-sm"/> Setting up...</span> : "Complete Setup"}
            </button>
          </form>
        </div>

        {/* Right Side Branding */}
        <div className="auth-branding">
          <div className="branding-content">
            <h2>Recruiter Access</h2>
            <p>Welcome to Talentiaa! Finalize your company profile to start discovering top candidates effortlessly.</p>
            <div className="branding-features">
              <div className="feature-pill"><Building size={14}/> Verified Company</div>
              <div className="feature-pill"><Network size={14}/> Top AI Candidates</div>
              <div className="feature-pill"><Award size={14}/> Instant Access</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
