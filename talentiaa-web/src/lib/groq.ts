const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const URL = `https://api.groq.com/openai/v1/chat/completions`;

async function callGroq(prompt: string) {
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are an AI assistant for a recruitment platform called Talentiaa. Always return pure JSON when asked, without markdown code blocks." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });
    
    if (!res.ok) {
      const errorData = await res.text();
      console.error("Groq API Error:", errorData);
      throw new Error(`Groq API Error: ${res.status}`);
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
  const raw = await callGroq(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

export async function matchResumeToJob(resumeText: string, jobTitle: string, jobDescription: string, requiredSkills: string[] = []) {
  const prompt = `Evaluate this resume for ${jobTitle}. 
  Description: ${jobDescription}
  Skills: ${requiredSkills.join(', ')}
  Resume: ${resumeText.substring(0, 4000)}
  Return ONLY pure JSON (no markdown formatting): { "score": 0, "breakdown": {"skills": 0, "experience": 0, "education": 0}, "summary": "...", "missing_skills": [], "improvement_suggestion": "..." }`;

  const raw = await callGroq(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    console.info("AI Provider: Groq Real-time Success");
    return JSON.parse(match[0]);
  }
  throw new Error("Invalid AI response");
}

export async function suggestSkills(jobTitle: string, currentSkills: string[]) {
  const prompt = `Suggest 5 skills for ${jobTitle} not in [${currentSkills.join(', ')}]. Return a pure JSON object containing an array of strings in a key "skills" like {"skills": ["skill1", "skill2"]}.`;
  const raw = await callGroq(prompt);
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]).skills || [] : [];
}
