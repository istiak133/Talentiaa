import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Sparkles, Save, Send, Loader2, Wand2, Briefcase, MapPin, DollarSign, Calendar, Target, CheckCircle2, AlertCircle, Eye, EyeOff, Users, Sliders } from 'lucide-react';
import type { JobType, WorkplaceType, ExperienceLevel, JobStatus } from '../../types/database';
import { generateJobPost, suggestSkills } from '../../lib/groq';

export default function CreateJobPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    job_type: 'full_time' as JobType,
    workplace_type: 'remote' as WorkplaceType,
    location: '',
    salary_min: '',
    salary_max: '',
    salary_visible: true,
    experience_level: 'mid' as ExperienceLevel,
    required_skills: '',
    description: '',
    application_deadline: '',
    hiring_count: '1',
    threshold_score: '70',
    scoring_skills: 50,
    scoring_experience: 35,
    scoring_education: 15,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAIGenerate = async () => {
    if (!formData.title.trim()) {
      setError('Please enter a Job Title first.');
      return;
    }
    setAiLoading(true);
    setError(null);
    try {
      const result = await generateJobPost(formData.title);
      setFormData(prev => ({
        ...prev,
        department: result.department || prev.department,
        description: result.description || prev.description,
        required_skills: (result.required_skills || []).join(', '),
        experience_level: (result.experience_level as ExperienceLevel) || prev.experience_level,
        job_type: (result.job_type as JobType) || prev.job_type,
        workplace_type: (result.workplace_type as WorkplaceType) || prev.workplace_type,
      }));
    } catch (err: any) {
      setError('AI generation failed. You can fill the form manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSuggestSkills = async () => {
    if (!formData.title.trim()) return;
    setSkillsLoading(true);
    try {
      const currentSkills = formData.required_skills.split(',').map(s => s.trim()).filter(Boolean);
      const suggestions = await suggestSkills(formData.title, currentSkills);
      setSuggestedSkills(suggestions);
    } catch {
      setSuggestedSkills([]);
    } finally {
      setSkillsLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    const current = formData.required_skills;
    const updated = current ? `${current}, ${skill}` : skill;
    setFormData(prev => ({ ...prev, required_skills: updated }));
    setSuggestedSkills(prev => prev.filter(s => s !== skill));
  };

  const handleSave = async (status: JobStatus) => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      if (status === 'published' && (!formData.title || !formData.description || !formData.location || !formData.application_deadline)) {
        throw new Error('Title, Location, Description, and Deadline are required to publish.');
      }
      const skillsArray = formData.required_skills.split(',').map(s => s.trim()).filter(Boolean);
      const scoringSum = formData.scoring_skills + formData.scoring_experience + formData.scoring_education;
      if (scoringSum !== 100) {
        throw new Error(`Scoring weights must sum to 100 (currently ${scoringSum}).`);
      }
      const { error: insertError } = await supabase.from('jobs').insert([{
        recruiter_id: profile.id,
        title: formData.title,
        department: formData.department || null,
        job_type: formData.job_type,
        workplace_type: formData.workplace_type,
        location: formData.location,
        salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
        salary_currency: 'BDT',
        salary_visible: formData.salary_visible,
        experience_level: formData.experience_level,
        required_skills: skillsArray,
        description: formData.description,
        application_deadline: formData.application_deadline || null,
        hiring_count: parseInt(formData.hiring_count) || 1,
        threshold_score: parseFloat(formData.threshold_score),
        scoring_config: {
          skillsWeight: formData.scoring_skills,
          experienceWeight: formData.scoring_experience,
          educationWeight: formData.scoring_education,
        },
        status,
        ...(status === 'published' ? { published_at: new Date().toISOString() } : {})
      }]);
      if (insertError) throw insertError;
      navigate('/recruiter');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page" style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={() => navigate('/recruiter')} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create New Job</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fill in the details to post a new opening.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => handleSave('draft')} disabled={loading} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>
              <Save size={18} /> Save Draft
            </button>
            <button onClick={() => handleSave('published')} disabled={loading} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
              <Send size={18} /> Publish Job
            </button>
          </div>
        </header>

        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: 'var(--error)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {/* AI Magic Banner */}
        <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '20px', padding: '1.5rem 2rem', marginBottom: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="white" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>AI Smart Fill</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
              জব টাইটেল লিখে নিচের বাটনে ক্লিক করুন, AI আপনার জন্য পুরো ফর্মটি তৈরি করে দেবে।
            </p>
          </div>
          <button 
            onClick={handleAIGenerate} 
            disabled={aiLoading} 
            className="btn btn-primary" 
            style={{ background: 'white', color: 'var(--primary)', fontWeight: 800, padding: '0.75rem 1.5rem', border: 'none' }}
          >
            {aiLoading ? <span className="loading-spinner-sm" /> : <><Wand2 size={18} /> Generate with AI</>}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          {/* Main Form Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <FormSection icon={<Briefcase size={20} color="var(--primary)" />} title="1. Basic Details">
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Job Title *</label>
                <div className="input-wrapper">
                  <Briefcase size={18} className="input-icon" />
                  <input name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Senior Frontend Developer" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Department</label>
                  <div className="input-wrapper">
                    <input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Technology" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Experience Level</label>
                  <select name="experience_level" value={formData.experience_level} onChange={handleChange} className="select-field">
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Job Type</label>
                  <select name="job_type" value={formData.job_type} onChange={handleChange} className="select-field">
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Workplace</label>
                  <select name="workplace_type" value={formData.workplace_type} onChange={handleChange} className="select-field">
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
              </div>
            </FormSection>

            <FormSection icon={<Target size={20} color="var(--primary)" />} title="2. Requirements & AI Screening">
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Required Skills</label>
                  <button onClick={handleSuggestSkills} disabled={skillsLoading} style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {skillsLoading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} AI Suggest Skills
                  </button>
                </div>
                <div className="input-wrapper">
                  <input name="required_skills" value={formData.required_skills} onChange={handleChange} placeholder="Comma separated: React, Node.js, TypeScript" />
                </div>
                {suggestedSkills.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {suggestedSkills.map(skill => (
                      <button key={skill} onClick={() => addSkill(skill)} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid rgba(79,70,229,0.2)', padding: '0.3rem 0.75rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                        + {skill}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Job Description *</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={6} placeholder="Describe responsibilities, requirements, and benefits..." style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid var(--border-light)', fontSize: '0.9rem', outline: 'none' }} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Application Deadline *</label>
                  <div className="input-wrapper">
                    <Calendar size={18} className="input-icon" />
                    <input type="date" name="application_deadline" value={formData.application_deadline} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>AI Match Threshold (%)</label>
                  <div className="input-wrapper">
                    <Target size={18} className="input-icon" />
                    <input type="number" name="threshold_score" value={formData.threshold_score} onChange={handleChange} min="0" max="100" />
                  </div>
                </div>
              </div>
            </FormSection>

          </div>

          {/* Right Sidebar: Additional Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <FormSection icon={<DollarSign size={20} color="var(--primary)" />} title="Compensation">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Min Salary (BDT)</label>
                <div className="input-wrapper">
                  <input type="number" name="salary_min" value={formData.salary_min} onChange={handleChange} placeholder="e.g. 50000" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Max Salary (BDT)</label>
                <div className="input-wrapper">
                  <input type="number" name="salary_max" value={formData.salary_max} onChange={handleChange} placeholder="e.g. 100000" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--bg-body)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {formData.salary_visible ? <Eye size={16} color="var(--primary)" /> : <EyeOff size={16} color="var(--text-muted)" />}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--secondary)' }}>Salary Visible</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, salary_visible: !prev.salary_visible }))}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: formData.salary_visible ? 'var(--primary)' : '#d1d5db',
                    position: 'relative', transition: 'background 0.3s ease',
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                    position: 'absolute', top: '3px',
                    left: formData.salary_visible ? '23px' : '3px',
                    transition: 'left 0.3s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            </FormSection>

            <FormSection icon={<MapPin size={20} color="var(--primary)" />} title="Location">
              <div className="form-group">
                <label>Work Location *</label>
                <div className="input-wrapper">
                  <MapPin size={18} className="input-icon" />
                  <input name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Dhaka, Bangladesh" required />
                </div>
              </div>
            </FormSection>

            <FormSection icon={<Users size={20} color="var(--primary)" />} title="Hiring">
              <div className="form-group">
                <label>How many people to hire?</label>
                <div className="input-wrapper">
                  <Users size={18} className="input-icon" />
                  <input type="number" name="hiring_count" value={formData.hiring_count} onChange={handleChange} min="1" max="100" placeholder="1" />
                </div>
              </div>
            </FormSection>

            <FormSection icon={<Sliders size={20} color="var(--primary)" />} title="AI Scoring Weights">
              {(() => {
                const sum = formData.scoring_skills + formData.scoring_experience + formData.scoring_education;
                const isValid = sum === 100;
                return (
                  <>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                      AI ক্যান্ডিডেট স্কোরিং এ প্রতিটি ক্যাটাগরির ওয়েট সেট করুন। মোট <b>100</b> হতে হবে।
                    </p>
                    {[{key: 'scoring_skills', label: 'Skills', color: '#0071e3'}, {key: 'scoring_experience', label: 'Experience', color: '#5ac8fa'}, {key: 'scoring_education', label: 'Education', color: '#34c759'}].map(item => (
                      <div key={item.key} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                            {item.label}
                          </label>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: item.color }}>{(formData as any)[item.key]}%</span>
                        </div>
                        <input
                          type="range" min="0" max="100" step="5"
                          value={(formData as any)[item.key]}
                          onChange={e => setFormData(prev => ({ ...prev, [item.key]: parseInt(e.target.value) }))}
                          style={{ width: '100%', accentColor: item.color, height: '6px', cursor: 'pointer' }}
                        />
                      </div>
                    ))}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.65rem 1rem', borderRadius: '10px', marginTop: '0.5rem',
                      background: isValid ? 'rgba(52,199,89,0.08)' : 'rgba(255,59,48,0.08)',
                      border: `1px solid ${isValid ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)'}`,
                    }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isValid ? 'var(--success)' : 'var(--error)' }}>
                        Total: {sum}%
                      </span>
                      {isValid
                        ? <CheckCircle2 size={16} color="var(--success)" />
                        : <AlertCircle size={16} color="var(--error)" />
                      }
                    </div>
                  </>
                );
              })()}
            </FormSection>

            <div style={{ background: 'var(--secondary)', borderRadius: '20px', padding: '1.5rem', color: 'white' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} color="var(--success)" /> Publishing Note
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                একবার পাবলিশ করলে ক্যান্ডিডেটরা এটি জব বোর্ডে দেখতে পাবে। আপনি পরবর্তীতে ড্রাফট হিসেবে সেভ করে রাখতে পারেন।
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .select-field { width: 100%; padding: 0.75rem 1rem; border: 1.5px solid var(--border-light); border-radius: 12px; outline: none; background: white; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function FormSection({ icon, title, children }: { icon: any, title: string, children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-light)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--secondary)' }}>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}
