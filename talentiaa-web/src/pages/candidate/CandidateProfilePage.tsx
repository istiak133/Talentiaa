import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, BookOpen, MapPin, Award, Camera, ArrowLeft } from 'lucide-react';

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
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      
      // Optionally trigger auth context reload if needed, or rely on next refresh.
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
      <button 
        onClick={() => navigate('/candidate')} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        
        {/* Profile Header Background */}
        <div style={{ height: '120px', background: 'linear-gradient(to right, #4f46e5, #3b82f6)' }}></div>
        
        <div style={{ padding: '0 32px 32px 32px' }}>
          
          {/* Avatar Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-40px', marginBottom: '32px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', border: '4px solid #fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {formData.profile_pic_url ? (
                  <img src={formData.profile_pic_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={48} color="#94a3b8" />
                )}
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{ position: 'absolute', bottom: '0', right: '0', background: '#2563eb', color: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                <Camera size={16} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>
            
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0' }}>{formData.full_name || 'Your Name'}</h1>
              <p style={{ color: '#64748b', margin: '4px 0 0 0' }}>{profile?.email}</p>
            </div>
          </div>

          {message && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500, background: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#15803d' : '#b91c1c' }}>
              {message.text}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <div style={inputContainerStyle}>
                  <User size={16} color="#94a3b8" />
                  <input style={inputStyle} value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="e.g. Istiak Ahmed" required />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Hometown</label>
                <div style={inputContainerStyle}>
                  <MapPin size={16} color="#94a3b8" />
                  <input style={inputStyle} value={formData.hometown} onChange={e => setFormData({...formData, hometown: e.target.value})} placeholder="e.g. Dhaka, Bangladesh" />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={labelStyle}>University</label>
                <div style={inputContainerStyle}>
                  <BookOpen size={16} color="#94a3b8" />
                  <input style={inputStyle} value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} placeholder="e.g. BRAC University" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Current Study Program</label>
                <div style={inputContainerStyle}>
                  <BookOpen size={16} color="#94a3b8" />
                  <input style={inputStyle} value={formData.study_program} onChange={e => setFormData({...formData, study_program: e.target.value})} placeholder="e.g. B.Sc. in CSE" />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Major / Subject</label>
                <div style={inputContainerStyle}>
                  <Award size={16} color="#94a3b8" />
                  <input style={inputStyle} value={formData.major} onChange={e => setFormData({...formData, major: e.target.value})} placeholder="e.g. Computer Science" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>CGPA (Current/Final)</label>
                <div style={inputContainerStyle}>
                  <Award size={16} color="#94a3b8" />
                  <input style={inputStyle} type="number" step="0.01" max="4.00" value={formData.cgpa} onChange={e => setFormData({...formData, cgpa: e.target.value})} placeholder="e.g. 3.85" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
              <button 
                type="submit" 
                disabled={saving || uploadingAvatar}
                style={{ padding: '12px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '15px', cursor: 'pointer', opacity: (saving || uploadingAvatar) ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' };
const inputContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc' };
const inputStyle: React.CSSProperties = { flex: 1, padding: '12px 0', border: 'none', background: 'transparent', fontSize: '14px', outline: 'none', color: '#0f172a' };
