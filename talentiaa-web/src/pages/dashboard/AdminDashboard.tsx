import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Shield, Users, Briefcase, Activity, Bell, UserPlus, Mail, Plus, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import emailjs from '@emailjs/browser';

// Helper to generate a random 32-character token
const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Fetch existing invites
  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from('recruiter_invites')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setInvites(data);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!inviteEmail) return;

    // Uncomment the code below later if you want to block Gmail/Yahoo in production
    /* 
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
    const emailDomain = inviteEmail.split('@')[1]?.toLowerCase();
    if (freeDomains.includes(emailDomain)) {
      setMsg({ type: 'error', text: 'কোম্পানির ডোমেইন ইমেইল ব্যবহার করুন (Gmail/Yahoo দিয়ে রিক্রুটার একাউন্ট খোলা যাবে না)।' });
      return;
    }
    */

    setLoading(true);
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // 1. Insert into database
    const { error } = await supabase.from('recruiter_invites').insert({
      invited_email: inviteEmail,
      invited_by: profile?.id,
      token_hash: token,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      setMsg({ type: 'error', text: 'Error creating invite: ' + error.message });
      setLoading(false);
      return;
    }

    // 2. Generate Link to the Custom Recruiter Setup Page
    const b64email = btoa(inviteEmail);
    const inviteLink = `${window.location.origin}/recruiter-setup?invite_token=${token}&e=${b64email}`;

    // 3. Send Email via EmailJS
    try {
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
         setMsg({ type: 'success', text: `Invite link generated, but EmailJS keys are missing! Link: ${inviteLink}` });
         fetchInvites();
         setLoading(false);
         setInviteEmail('');
         return;
      }

      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: inviteEmail,
          invite_link: inviteLink,
          admin_name: profile?.full_name || 'Admin'
        },
        publicKey
      );

      setMsg({ type: 'success', text: 'Invitation successfully created and email sent!' });
    } catch (err: any) {
      console.error("EmailJS Error:", err);
      setMsg({ type: 'error', text: `Saved to DB, but failed to send email. Invite Link: ${inviteLink}` });
    }

    setInviteEmail('');
    fetchInvites();
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="header-logo">Talentiaa</h1>
          <span className="role-badge role-admin">Admin</span>
        </div>
        <div className="header-right">
          <button className="btn-icon" title="Notifications">
            <Bell size={20} />
          </button>
          <div className="user-info">
            <div className="avatar avatar-admin">
              {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="user-name">{profile?.full_name}</span>
          </div>
          <button className="btn btn-ghost" onClick={signOut}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-section">
          <h2>Admin Panel 🛡️</h2>
          <p>প্ল্যাটফর্ম ম্যানেজমেন্ট ড্যাশবোর্ড।</p>
        </div>

        <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
          <div className="dash-card">
            <div className="card-icon card-icon-blue">
              <Users size={24} />
            </div>
            <h3>Total Users</h3>
            <p className="card-count">—</p>
            <p className="card-desc">মোট ব্যবহারকারী</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-green">
              <Shield size={24} />
            </div>
            <h3>Recruiters</h3>
            <p className="card-count">—</p>
            <p className="card-desc">সক্রিয় রিক্রুটার</p>
          </div>

          <div className="dash-card">
            <div className="card-icon card-icon-purple">
              <Briefcase size={24} />
            </div>
            <h3>Active Jobs</h3>
            <p className="card-count">—</p>
            <p className="card-desc">চালু চাকরি</p>
          </div>
        </div>

        {/* Recruiter Management Area */}
        <div className="dashboard-actions" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          
          {/* Invite Form */}
          <div className="auth-card" style={{ flex: '1', minWidth: '300px', margin: 0 }}>
            <div className="auth-header" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <h3><UserPlus size={20} style={{ display: 'inline', marginRight: '8px' }}/> Invite Recruiter</h3>
              <p>নতুন রিক্রুটারকে ইমেইলে ইনভাইটেশন লিঙ্ক পাঠান</p>
            </div>

            {msg && (
              <div className={`auth-error`} style={{ backgroundColor: msg.type === 'error' ? 'var(--error-bg)' : 'rgba(16, 185, 129, 0.1)', color: msg.type === 'error' ? 'var(--error)' : '#10b981', border: 'none' }}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleInviteSubmit}>
              <div className="form-group">
                <label>Recruiter Email</label>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="recruiter@company.com"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                {loading ? <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}/> : <><Plus size={18} /> Send Invitation</>}
              </button>
            </form>
          </div>

          {/* Invites List */}
          <div className="auth-card" style={{ flex: '2', minWidth: '400px', margin: 0, padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Sent Invitations</h3>
            
            {invites.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>কোনো ইনভাইট পাঠানো হয়নি।</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem 0' }}>Email</th>
                      <th style={{ padding: '0.75rem 0' }}>Date</th>
                      <th style={{ padding: '0.75rem 0' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0' }}>{inv.invited_email}</td>
                        <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                          {new Date(inv.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 0' }}>
                          {inv.status === 'pending' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '0.9em' }}>
                              <Clock size={14} /> Pending
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.9em' }}>
                              <CheckCircle size={14} /> Accepted
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
