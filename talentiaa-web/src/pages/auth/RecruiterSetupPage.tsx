import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Building, Briefcase, Mail, Lock, User, AlertCircle, Award, Network } from 'lucide-react';

export default function RecruiterSetupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp } = useAuth();

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
      } catch (e) {
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
      // 1. Sign up the user (or log them in if they already tried and it failed halfway)
      const { error: signUpError } = await signUp(email, password, fullName);
      if (signUpError) {
        if (signUpError.includes('আগেই অ্যাকাউন্ট তৈরি করা হয়েছে')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) throw new Error("Could not log into existing setup account: " + signInError.message);
        } else {
          throw new Error(signUpError);
        }
      }

      // 2. We use native fetch to completely bypass Supabase-JS Lock issues
      // First, get the session tokens manually without touching the lock
      let jwt = null;
      let userId = null;
      
      // Wait up to 5 seconds to get the token from local storage directly if needed
      for (let i = 0; i < 10; i++) {
        const storageKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (storageKeys.length > 0) {
           const tokenStr = localStorage.getItem(storageKeys[0]);
           if (tokenStr) {
             const data = JSON.parse(tokenStr);
             if (data?.access_token && data?.user?.id) {
               jwt = data.access_token;
               userId = data.user.id;
               break;
             }
           }
        }
        await new Promise(r => setTimeout(r, 500));
      }

      if (!jwt || !userId) throw new Error("Could not acquire auth token. Please try logging in normally.");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Call RPC Native
      const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/accept_recruiter_invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({ token })
      });

      if (!rpcRes.ok) {
        const errText = await rpcRes.text();
        throw new Error("Verification failed (Raw): " + errText);
      }

      // Call Profile Insert Native
      const profRes = await fetch(`${supabaseUrl}/rest/v1/recruiter_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${jwt}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          recruiter_id: userId,
          company_name: companyName,
          company_role: companyRole,
          department: department,
          experience_years: parseFloat(experience) || 0
        })
      });

      if (!profRes.ok) {
        const errText = await profRes.text();
        if (!errText.includes('duplicate key')) {
          console.error("Profile creation error natively:", errText);
        }
      }

      // Success! Force a hard reload to Recruiter Dashboard
      window.location.href = '/recruiter';

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during setup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '900px' }}>
        
        {/* Left/Main Side: Form Card */}
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
              {loading ? <span className="btn-loading"><span className="loading-spinner-sm"/> Setting up...</span> : "Complete Integration"}
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
