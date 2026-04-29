import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, BookOpen, MapPin, Award, Camera, ArrowLeft, Building, GraduationCap, Save, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

export default function CandidateProfilePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    university: '',
    major: '',
    cgpa: '',
    hometown: '',
    study_program: '',
    profile_pic_url: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        university: profile.university || '',
        major: profile.major || '',
        cgpa: profile.cgpa ? String(profile.cgpa) : '',
        hometown: profile.hometown || '',
        study_program: profile.study_program || '',
        profile_pic_url: profile.profile_pic_url || ''
      });
      setLoading(false);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    try {
      setUploadingAvatar(true);
      setMessage(null);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_pic_url: data.publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, profile_pic_url: data.publicUrl }));
      setMessage({ text: 'Profile picture updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Error uploading image', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      setMessage(null);

      const updates = {
        full_name: formData.full_name,
        university: formData.university,
        major: formData.major,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
        hometown: formData.hometown,
        study_program: formData.study_program,
      };

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
      setMessage({ text: 'আপনার প্রোফাইল সফলভাবে আপডেট করা হয়েছে!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-body)' }}>
        <span className="loading-spinner-sm" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="profile-page" style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/candidate')} 
          className="btn btn-ghost"
          style={{ marginBottom: '1.5rem', padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid var(--border-light)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
          {/* Decorative Header */}
          <div style={{ height: '160px', background: 'linear-gradient(135deg, var(--secondary), #1e293b)', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: '-50px', left: '40px', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '30px', background: 'white', border: '6px solid white', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {formData.profile_pic_url ? (
                    <img src={formData.profile_pic_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={60} color="var(--border-light)" />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  style={{ position: 'absolute', bottom: '8px', right: '-12px', background: 'var(--primary)', color: 'white', border: '4px solid white', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }}
                  title="Update Photo"
                >
                  <Camera size={18} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" style={{ display: 'none' }} />
              </div>
              <div style={{ paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)' }}>{formData.full_name || 'Your Name'}</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{profile?.email}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '80px 40px 40px' }}>
            {message && (
              <div style={{ padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 600, background: message.type === 'success' ? 'var(--primary-light)' : '#fee2e2', color: message.type === 'success' ? 'var(--primary)' : 'var(--error)' }}>
                {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} color="var(--primary)" /> Personal Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="e.g. Istiak Ahmed" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Hometown</label>
                    <div className="input-wrapper">
                      <MapPin size={18} className="input-icon" />
                      <input type="text" value={formData.hometown} onChange={e => setFormData({...formData, hometown: e.target.value})} placeholder="e.g. Dhaka, Bangladesh" />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GraduationCap size={20} color="var(--primary)" /> Educational Background
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label>University / College</label>
                    <div className="input-wrapper">
                      <Building size={18} className="input-icon" />
                      <input type="text" value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} placeholder="e.g. BRAC University" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Study Program</label>
                    <div className="input-wrapper">
                      <BookOpen size={18} className="input-icon" />
                      <input type="text" value={formData.study_program} onChange={e => setFormData({...formData, study_program: e.target.value})} placeholder="e.g. B.Sc. in CSE" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Major / Subject</label>
                    <div className="input-wrapper">
                      <Award size={18} className="input-icon" />
                      <input type="text" value={formData.major} onChange={e => setFormData({...formData, major: e.target.value})} placeholder="e.g. Computer Science" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>CGPA</label>
                    <div className="input-wrapper">
                      <TrendingUp size={18} className="input-icon" />
                      <input type="number" step="0.01" max="4.00" value={formData.cgpa} onChange={e => setFormData({...formData, cgpa: e.target.value})} placeholder="e.g. 3.85" />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
                <button 
                  type="submit" 
                  disabled={saving || uploadingAvatar}
                  className="btn btn-primary"
                  style={{ padding: '0.8rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  {saving ? <span className="loading-spinner-sm" /> : <><Save size={18} /> Save Profile Updates</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
