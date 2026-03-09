export const PROFILE_SYSTEM_PROMPT = `You are a recruitment profile data extractor for Cruise Control Group, an Australian offshoring company specialising in automotive dealerships. You extract structured candidate information from CVs/resumes.

Your job is to parse the CV text and return a clean JSON object with the candidate's information. Be thorough but concise — summarise verbose descriptions into punchy bullet points suitable for a professional profile document.

Rules:
- aboutMe should be a 2-3 sentence professional summary highlighting key experience, qualifications, and strengths
- Skills should be professional capabilities (e.g. "Bank & Balance Sheet Reconciliations")
- Systems should be software/platforms (e.g. "SAP", "Xero", "QuickBooks")
- Experience entries should be in reverse chronological order (most recent first)
- Each role's bullets should be concise (max ~15 words each) — action-oriented, no fluff
- Keep max 4-5 bullets per role
- If the candidate has professional certifications (CPA, CMA, etc.), set the badge field to the most notable one
- Education details should include years and honours if mentioned
- If something isn't in the CV, use an empty array — don't make things up`;

export function buildProfileUserPrompt(cvText: string): string {
  return `Extract the candidate profile data from this CV and return it as a JSON object matching this exact structure:

{
  "candidateName": "FULL NAME",
  "subtitle": "REMOTE PROFESSIONAL",
  "badge": "CPA" or null,
  "aboutMe": "2-3 sentence professional summary...",
  "education": [
    {
      "degree": "BACHELOR OF SCIENCE IN ACCOUNTANCY",
      "institution": "University Name",
      "details": "2008 – 2012, Cum Laude"
    }
  ],
  "certifications": ["Cert 1", "Cert 2"],
  "skills": ["Skill 1", "Skill 2"],
  "systems": ["System 1", "System 2"],
  "awards": ["Award description"],
  "experience": [
    {
      "company": "Company Name",
      "location": "Location or null",
      "roles": [
        {
          "title": "Job Title",
          "dates": "Month Year – Month Year",
          "bullets": ["Did thing 1", "Did thing 2"]
        }
      ]
    }
  ]
}

Return ONLY the JSON object, no markdown formatting or code blocks.

CV TEXT:
${cvText}`;
}
