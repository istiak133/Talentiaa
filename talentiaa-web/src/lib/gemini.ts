const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

export async function generateJobPost(jobTitle: string): Promise<{
  department: string;
  description: string;
  required_skills: string[];
  experience_level: string;
  job_type: string;
  workplace_type: string;
}> {
  const prompt = `You are an expert HR recruiter. Given the job title "${jobTitle}", generate a complete job posting in JSON format with these exact keys:
{
  "department": "the most relevant department name",
  "description": "a professional 150-200 word job description with responsibilities and what we offer",
  "required_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "experience_level": "one of: junior, mid, senior, lead",
  "job_type": "one of: full_time, part_time, contract, internship",
  "workplace_type": "one of: onsite, hybrid, remote"
}
Return ONLY valid JSON, no markdown, no explanation.`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    })
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error('Gemini API Error:', errorData);
    throw new Error('AI request failed. Check API key or quota.');
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Clean markdown fences if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export async function suggestSkills(jobTitle: string, currentSkills: string[]): Promise<string[]> {
  const prompt = `For the job position "${jobTitle}", suggest 5 additional relevant technical skills that are NOT in this list: [${currentSkills.join(', ')}]. Return ONLY a JSON array of strings like ["skill1","skill2"]. No explanation.`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5 }
    })
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error('Gemini API Error:', errorData);
    throw new Error('AI request failed. Check API key or quota.');
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

export async function matchResumeToJob(resumeText: string, jobTitle: string, jobDescription: string, requiredSkills: string[]): Promise<{
  score: number;
  breakdown: { skills: number; experience: number; education: number };
  summary: string;
  missing_skills: string[];
  improvement_suggestion: string;
}> {
  const prompt = `You are an expert ATS (Applicant Tracking System) and career coach. Compare this resume against the job posting and give a matching score. Also identify which required skills are missing from the resume, and provide a short suggestion on how the candidate can improve their resume or skillset.

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${jobDescription}
REQUIRED SKILLS: ${requiredSkills.join(', ')}

RESUME TEXT:
${resumeText}

Return ONLY valid JSON:
{
  "score": <number 0-100>,
  "breakdown": {"skills": <0-100>, "experience": <0-100>, "education": <0-100>},
  "summary": "<one sentence overview>",
  "missing_skills": ["skill1", "skill2"],
  "improvement_suggestion": "<one sentence advice on what to add or learn>"
}
No markdown, ONLY JSON.`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 }
    })
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error('Gemini API Error:', errorData);
    throw new Error('AI scoring failed. Check API key or quota.');
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned2 = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned2);
}
