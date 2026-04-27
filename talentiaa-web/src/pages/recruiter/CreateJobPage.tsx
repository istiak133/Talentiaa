import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Sparkles, Save, Send, Loader2, Wand2 } from 'lucide-react';
import type { JobType, WorkplaceType, ExperienceLevel, JobStatus } from '../../types/database';
import { generateJobPost, suggestSkills } from '../../lib/gemini';

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
    experience_level: 'mid' as ExperienceLevel,
    required_skills: '',
    description: '',
    application_deadline: '',
    threshold_score: '70'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // AI: Generate entire job post from title
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

  // AI: Suggest additional skills
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

  // Add a suggested skill to the form
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
        experience_level: formData.experience_level,
        required_skills: skillsArray,
        description: formData.description,
        application_deadline: formData.application_deadline || null,
        threshold_score: parseFloat(formData.threshold_score),
        status,
        ...(status === 'published' ? { published_at: new Date().toISOString() } : {})
      }]);
      if (insertError) throw insertError;
      alert(`Job ${status === 'published' ? 'Published' : 'Saved as Draft'}!`);
      navigate('/recruiter');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button onClick={() => navigate('/recruiter')} style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
              <ArrowLeft size={20} />
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Create New Job</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => handleSave('draft')} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              <Save size={16} /> Save Draft
            </button>
            <button onClick={() => handleSave('published')} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', border: 'none', borderRadius: '8px', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              <Send size={16} /> Publish Job
            </button>
          </div>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #fca5a5' }}>{error}</div>}

        {/* AI Generate Banner */}
        <div style={{ background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', border: '1.5px solid #a78bfa', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: '#4c1d95', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wand2 size={20} /> AI Auto-Generate
            </div>
            <p style={{ fontSize: '13px', color: '#6b21a8', marginTop: '4px' }}>
              Just type the job title above and click this button — AI will fill the entire form for you!
            </p>
          </div>
          <button
            onClick={handleAIGenerate}
            disabled={aiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {aiLoading ? <><Loader2 size={16} className="spin" /> Generating...</> : <><Sparkles size={16} /> Generate with AI</>}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Main Form */}
          <div style={{ flex: 3 }}>

            {/* Section 1 */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>1. Basic Information</h2>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Job Title *</label>
                <input name="title" value={formData.title} onChange={handleChange} style={inputStyle} placeholder="e.g. Senior Software Engineer" />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Department</label>
                  <input name="department" value={formData.department} onChange={handleChange} style={inputStyle} placeholder="e.g. Engineering" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Experience Level</label>
                  <select name="experience_level" value={formData.experience_level} onChange={handleChange} style={inputStyle}>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid-Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Job Type</label>
                  <select name="job_type" value={formData.job_type} onChange={handleChange} style={inputStyle}>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Workplace</label>
                  <select name="workplace_type" value={formData.workplace_type} onChange={handleChange} style={inputStyle}>
                    <option value="onsite">On-site</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Location *</label>
                <input name="location" value={formData.location} onChange={handleChange} style={inputStyle} placeholder="e.g. Dhaka, Bangladesh" />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>Min Salary (BDT)</label><input type="number" name="salary_min" value={formData.salary_min} onChange={handleChange} style={inputStyle} placeholder="50000" /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>Max Salary (BDT)</label><input type="number" name="salary_max" value={formData.salary_max} onChange={handleChange} style={inputStyle} placeholder="120000" /></div>
              </div>
            </div>

            {/* Section 2 */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>2. Details & Requirements</h2>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={labelStyle}>Required Skills (comma separated)</label>
                  <button onClick={handleSuggestSkills} disabled={skillsLoading} style={{ fontSize: '12px', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {skillsLoading ? <Loader2 size={12} /> : <Sparkles size={12} />} AI Suggest Skills
                  </button>
                </div>
                <input name="required_skills" value={formData.required_skills} onChange={handleChange} style={inputStyle} placeholder="React, Node.js, TypeScript" />
                {suggestedSkills.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {suggestedSkills.map(skill => (
                      <button key={skill} onClick={() => addSkill(skill)} style={{ padding: '4px 10px', background: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', borderRadius: '16px', fontSize: '12px', cursor: 'pointer' }}>
                        + {skill}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Job Description *</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={8} style={{ ...inputStyle, height: 'auto', minHeight: '160px', resize: 'vertical' }} placeholder="Describe responsibilities, requirements, benefits..." />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Application Deadline *</label>
                  <input type="date" name="application_deadline" value={formData.application_deadline} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>AI Threshold Score (%)</label>
                  <input type="number" name="threshold_score" value={formData.threshold_score} onChange={handleChange} style={inputStyle} min="0" max="100" />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Candidates below this score won't pass AI screening.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI Panel */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ position: 'sticky', top: '24px', border: '1.5px dashed #3b82f6', borderRadius: '12px', padding: '20px', background: '#eff6ff' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1d4ed8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> AI Tips
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#1e3a8a' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  💡 Adding salary range increases applications by <b>30%</b>.
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  ✨ Click <b>"Generate with AI"</b> to auto-fill the entire form from just the job title.
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  🎯 Click <b>"AI Suggest Skills"</b> next to the skills field for smart recommendations.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', background: '#fff' };
