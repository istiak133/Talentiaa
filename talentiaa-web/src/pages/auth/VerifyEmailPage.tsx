import { useLocation, Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function VerifyEmailPage() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || 'আপনার ইমেইল';

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '600px' }}>
        <div className="auth-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <Mail size={40} color="var(--primary)" />
          </div>
          
          <div className="auth-header" style={{ marginBottom: '2rem' }}>
            <h1 className="auth-logo" style={{ color: 'var(--secondary)', fontSize: '1.75rem' }}>ইমেইল ভেরিফাই করুন</h1>
            <p className="auth-subtitle">আপনার যাত্রা শুরু করার শেষ ধাপ</p>
          </div>

          <div style={{ background: 'var(--bg-body)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', textAlign: 'left', border: '1px solid var(--border-light)' }}>
            <p style={{ color: 'var(--secondary)', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.6 }}>
              আমরা <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{email}</span> এ একটি ভেরিফিকেশন লিংক পাঠিয়েছি। অনুগ্রহ করে আপনার ইনবক্স চেক করুন।
            </p>
            
            <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} /> ইমেইল পাননি?
              </p>
              <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                <li>Spam বা Junk ফোল্ডারটি চেক করুন</li>
                <li>১-২ মিনিট অপেক্ষা করে রিফ্রেশ দিন</li>
                <li>আপনার ইমেইল অ্যাড্রেস সঠিক ছিল কিনা নিশ্চিত করুন</li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem' }}>
              ইনবক্স চেক করেছি, লগইন করুন
            </Link>
            <Link to="/login" className="btn btn-ghost" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <ArrowLeft size={18} /> লগইন পেইজে ফিরে যান
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
