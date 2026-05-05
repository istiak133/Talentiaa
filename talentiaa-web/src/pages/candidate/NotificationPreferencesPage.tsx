import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Bell, Mail, TrendingUp, Newspaper, Megaphone, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface NotifPrefs {
  status_email_opt_in: boolean;
  high_score_alert_opt_in: boolean;
  daily_digest_opt_in: boolean;
  marketing_opt_in: boolean;
}

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>({
    status_email_opt_in: true,
    high_score_alert_opt_in: true,
    daily_digest_opt_in: false,
    marketing_opt_in: false,
  });

  useEffect(() => {
    if (!profile) return;
    const fetchPrefs = async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          status_email_opt_in: data.status_email_opt_in,
          high_score_alert_opt_in: data.high_score_alert_opt_in,
          daily_digest_opt_in: data.daily_digest_opt_in,
          marketing_opt_in: data.marketing_opt_in,
        });
      }
      setLoading(false);
    };
    fetchPrefs();
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      // Upsert: insert if not exists, update if exists
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          { user_id: profile.id, ...prefs },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      setMessage({ text: 'নোটিফিকেশন সেটিংস সফলভাবে আপডেট হয়েছে!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save preferences', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleItems: { key: keyof NotifPrefs; icon: any; title: string; desc: string }[] = [
    {
      key: 'status_email_opt_in',
      icon: <Mail size={20} color="var(--primary)" />,
      title: 'Application Status Emails',
      desc: 'আপনার আবেদনের স্ট্যাটাস পরিবর্তন হলে ইমেইল পাবেন (Interview, Offer, Hired ইত্যাদি)।',
    },
    {
      key: 'high_score_alert_opt_in',
      icon: <TrendingUp size={20} color="#34c759" />,
      title: 'High Score Alerts',
      desc: 'AI ম্যাচ স্কোর ৮০%+ হলে বিশেষ নোটিফিকেশন পাবেন।',
    },
    {
      key: 'daily_digest_opt_in',
      icon: <Newspaper size={20} color="#5ac8fa" />,
      title: 'Daily Digest',
      desc: 'প্রতিদিন নতুন জবের সারসংক্ষেপ ইমেইলে পাবেন।',
    },
    {
      key: 'marketing_opt_in',
      icon: <Megaphone size={20} color="#ff9f0a" />,
      title: 'Product Updates & Tips',
      desc: 'Talentiaa এর নতুন ফিচার ও ক্যারিয়ার টিপস সম্পর্কে জানুন।',
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-body)' }}>
        <span className="loading-spinner-sm" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost"
          style={{ marginBottom: '1.5rem', padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
          {/* Header */}
          <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--primary-light)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={24} color="var(--primary)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>Notification Preferences</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>কোন নোটিফিকেশন পেতে চান সেটি নির্ধারণ করুন।</p>
            </div>
          </div>

          <div style={{ padding: '2rem 2.5rem' }}>
            {message && (
              <div style={{
                padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                fontSize: '0.9rem', fontWeight: 600,
                background: message.type === 'success' ? 'var(--primary-light)' : '#fee2e2',
                color: message.type === 'success' ? 'var(--primary)' : 'var(--error)'
              }}>
                {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                {message.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {toggleItems.map(item => (
                <div
                  key={item.key}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)',
                    background: prefs[item.key] ? 'var(--bg-body)' : 'white',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'white', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--secondary)' }}>{item.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>{item.desc}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPrefs(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    style={{
                      width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: prefs[item.key] ? 'var(--primary)' : '#d1d5db',
                      position: 'relative', transition: 'background 0.3s ease',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%', background: 'white',
                      position: 'absolute', top: '3px',
                      left: prefs[item.key] ? '25px' : '3px',
                      transition: 'left 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '2rem', marginTop: '2rem' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: '0.8rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                {saving ? <span className="loading-spinner-sm" /> : <><Save size={18} /> Save Preferences</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
