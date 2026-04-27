import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, AlertCircle, Building, Briefcase, Award, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SignupPage() {
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Recruiter extra fields
  const [companyName, setCompanyName] = useState('');
  const [companyRole, setCompanyRole] = useState('');
  const [department, setDepartment] = useState('');
  const [experience, setExperience] = useState('');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // If there's an invite token in the URL, ignore it or save it (we are deprecating invites)
  useEffect(() => {
    const token = searchParams.get('invite_token');
    if (token) {
      localStorage.setItem('recruiter_invite_token', token);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না।');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে।');
      return;
    }

    if (role === 'recruiter') {
      if (!companyName || !companyRole || !experience) {
        setError('কোম্পানির সকল তথ্য প্রদান করুন।');
        return;
      }
      if (!idCardFile) {
        setError('দয়া করে আপনার কোম্পানির আইডি কার্ড আপলোড করুন।');
        return;
      }
    }

    setLoading(true);

    let uploadedIdCardUrl = '';

    if (role === 'recruiter' && idCardFile) {
      const fileExt = idCardFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('id_cards')
        .upload(fileName, idCardFile);

      if (uploadError) {
        setError('আইডি কার্ড আপলোড করতে সমস্যা হয়েছে: ' + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('id_cards')
        .getPublicUrl(fileName);
        
      uploadedIdCardUrl = publicUrlData.publicUrl;
    }

    const { error: signUpError } = await signUp(email, password, fullName, role, role === 'recruiter' ? companyName : undefined, uploadedIdCardUrl || undefined);

    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }

    // Signup successful! Navigate to login page.
    navigate('/login', { state: { email, message: 'Signup successful! Please log in.' } });
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-logo">Talentiaa</h1>
            <p className="auth-subtitle">নতুন অ্যাকাউন্ট তৈরি করুন</p>
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="role-selector" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`btn ${role === 'candidate' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
              onClick={() => setRole('candidate')}
            >
              আমি ক্যান্ডিডেট
            </button>
            <button
              type="button"
              className={`btn ${role === 'recruiter' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
              onClick={() => setRole('recruiter')}
            >
              আমি রিক্রুটার
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="fullName">পুরো নাম</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="fullName"
                  type="text"
                  placeholder="আপনার নাম"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">ইমেইল</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {role === 'recruiter' && (
              <>
                <div className="form-group">
                  <label htmlFor="companyName">কোম্পানির নাম</label>
                  <div className="input-wrapper">
                    <Building size={18} className="input-icon" />
                    <input
                      id="companyName"
                      type="text"
                      placeholder="কোম্পানির নাম"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyRole">আপনার পদবি (Role)</label>
                  <div className="input-wrapper">
                    <Briefcase size={18} className="input-icon" />
                    <input
                      id="companyRole"
                      type="text"
                      placeholder="উদাঃ HR Manager"
                      value={companyRole}
                      onChange={(e) => setCompanyRole(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="department">ডিপার্টমেন্ট</label>
                  <div className="input-wrapper">
                    <UserPlus size={18} className="input-icon" />
                    <input
                      id="department"
                      type="text"
                      placeholder="উদাঃ Human Resources"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="experience">অভিজ্ঞতা (বছর)</label>
                  <div className="input-wrapper">
                    <Award size={18} className="input-icon" />
                    <input
                      id="experience"
                      type="number"
                      placeholder="উদাঃ 3"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      required
                      min="0"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="idCard">কোম্পানির আইডি কার্ড (ছবি)</label>
                  <div className="input-wrapper" style={{ padding: '8px', border: '1px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} className="input-icon" style={{ position: 'static', transform: 'none', color: '#64748b' }} />
                    <input
                      id="idCard"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
                      required
                      style={{ paddingLeft: '8px', height: 'auto', background: 'transparent' }}
                    />
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>অ্যাডমিন ম্যানুয়ালি ভেরিফাই করার জন্য এটি ব্যবহার করবেন।</p>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="password">পাসওয়ার্ড</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="আবার পাসওয়ার্ড দিন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <span className="btn-loading"><span className="loading-spinner-sm" /> অ্যাকাউন্ট তৈরি হচ্ছে...</span>
              ) : (
                <span className="btn-content"><UserPlus size={18} /> সাইন আপ</span>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>অথবা</span>
          </div>

          <button
            className="btn btn-google"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <span className="btn-loading"><span className="loading-spinner-sm" /> সংযুক্ত হচ্ছে...</span>
            ) : (
              <span className="btn-content">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google দিয়ে সাইন আপ
              </span>
            )}
          </button>

          <p className="auth-footer">
            আগেই অ্যাকাউন্ট আছে? <Link to="/login">লগইন করুন</Link>
          </p>
        </div>

        <div className="auth-branding">
          <div className="branding-content">
            <h2>Join Talentiaa</h2>
            <p>বাংলাদেশের প্রথম AI-পাওয়ার্ড রিক্রুটমেন্ট প্ল্যাটফর্মে যোগ দিন। আপনার ক্যারিয়ারের পরবর্তী ধাপ শুরু হোক এখানে।</p>
            <div className="branding-features">
              <div className="feature-pill">✨ Easy Apply</div>
              <div className="feature-pill">📈 Track Progress</div>
              <div className="feature-pill">🎯 AI Matching</div>
              <div className="feature-pill">🔔 Real-time Updates</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
