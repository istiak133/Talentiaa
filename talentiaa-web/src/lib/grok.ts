const API_KEY = import.meta.env.VITE_GROK_API_KEY || "sk-cJftIQMYGz6yM8vPCM2Z63V8DyngBamsU7aqsO09ziJ58DIM";
const URL = `https://api.x.ai/v1/chat/completions`;

async function callGrok(prompt: string) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { role: "system", content: "You are an AI assistant for a recruitment platform called Talentiaa. Always return pure JSON when asked, without markdown code blocks." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      })
    });
    
    if (!res.ok) {
      const errorData = await res.text();
      console.error("Grok API Error:", errorData);
      throw new Error(`Grok API Error: ${res.status}`);
    }
    
    const data = await res.json();
    return data.choices?.[0]?.message?.content;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function generateJobPost(jobTitle: string) {
  const prompt = `Generate a professional job posting for ${jobTitle} in JSON: { "department": "...", "description": "...", "required_skills": ["..."], "experience_level": "...", "job_type": "...", "workplace_type": "..." }. Return ONLY pure JSON, no markdown formatting.`;
  const raw = await callGrok(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

export async function matchResumeToJob(resumeText: string, jobTitle: string, jobDescription: string, requiredSkills: string[] = []) {
  const prompt = `Evaluate this resume for ${jobTitle}. 
  Description: ${jobDescription}
  Skills: ${requiredSkills.join(', ')}
  Resume: ${resumeText.substring(0, 4000)}
  Return ONLY pure JSON (no markdown formatting): { "score": 0-100, "breakdown": {"skills": 0-100, "experience": 0-100, "education": 0-100}, "summary": "...", "missing_skills": [], "improvement_suggestion": "..." }`;

  const raw = await callGrok(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    console.info("AI Provider: Grok Real-time Success");
    return JSON.parse(match[0]);
  }
  throw new Error("Invalid AI response");
}

export async function suggestSkills(jobTitle: string, currentSkills: string[]) {
  const prompt = `Suggest 5 skills for ${jobTitle} not in [${currentSkills.join(', ')}]. Return a pure JSON array of strings only (no markdown formatting).`;
  const raw = await callGrok(prompt);
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}
