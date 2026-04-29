const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDu1ftqx1cyEiKB5FtJzDXSaL6yyIsP8QA";
const URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

async function callGemini(prompt: string) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    if (!res.ok) throw new Error("Gemini API Error");
    
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function generateJobPost(jobTitle: string) {
  const prompt = `Generate a professional job posting for ${jobTitle} in JSON: { "department": "...", "description": "...", "required_skills": ["..."], "experience_level": "...", "job_type": "...", "workplace_type": "..." }. Return ONLY JSON.`;
  const raw = await callGemini(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

export async function matchResumeToJob(resumeText: string, jobTitle: string, jobDescription: string, requiredSkills: string[] = []) {
  const prompt = `Evaluate this resume for ${jobTitle}. 
  Description: ${jobDescription}
  Skills: ${requiredSkills.join(', ')}
  Resume: ${resumeText.substring(0, 4000)}
  Return ONLY JSON: { "score": 0-100, "breakdown": {"skills": 0-100, "experience": 0-100, "education": 0-100}, "summary": "...", "missing_skills": [], "improvement_suggestion": "..." }`;

  const raw = await callGemini(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    console.info("AI Provider: Gemini Real-time Success");
    return JSON.parse(match[0]);
  }
  throw new Error("Invalid AI response");
}

export async function suggestSkills(jobTitle: string, currentSkills: string[]) {
  const prompt = `Suggest 5 skills for ${jobTitle} not in ${currentSkills.join(', ')}. Return JSON array only.`;
  const raw = await callGemini(prompt);
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}
