export const buildCustomRevisionPrompt = (
  feedback: Feedback,
  jobTitle: string,
  jobDescription: string,
  userSuggestions: string,
) => `
You are an expert resume editor. Using the ORIGINAL RESUME (attached as a PDF), apply the SPECIFIC CHANGES 
requested by the candidate below. Use the existing feedback and job context only as supporting context — 
the candidate's own requested changes take priority.

CANDIDATE'S REQUESTED CHANGES:
${userSuggestions}

EXISTING FEEDBACK CONTEXT (for reference only):
- Overall Score: ${feedback.overallScore}/100
- ATS Issues: ${feedback.ATS.tips
  .filter((t) => t.type === "improve")
  .map((t) => t.tip)
  .join("; ")}

TARGET ROLE: ${jobTitle || "Not specified"}
JOB DESCRIPTION: ${jobDescription || "Not provided"}

INSTRUCTIONS:
1. Read the original resume text from the attached PDF carefully.
2. Apply the candidate's requested changes as precisely as possible.
3. Preserve ALL real facts (names, dates, companies, degrees, actual achievements) except where the candidate explicitly asked to change them.
4. Do NOT invent facts, employers, titles, dates, or accomplishments the candidate didn't provide or confirm.
5. If a requested change is ambiguous or you're unsure how to apply it, make your best reasonable interpretation rather than ignoring it.
6. Keep the rest of the resume's formatting and quality consistent with a professional resume.
7. Return ONLY valid JSON in this exact shape — no markdown, no backticks, no explanation:

{
  "name": "Candidate Full Name",
  "contactLine": "email | phone | linkedin | location",
  "summary": "Optional 2-3 sentence professional summary (omit key if not applicable)",
  "sections": [
    {
      "heading": "EXPERIENCE",
      "content": "Company Name — Job Title | Date Range\\nBullet one\\nBullet two\\n\\nCompany 2 — Title | Date Range\\nBullet"
    },
    {
      "heading": "EDUCATION",
      "content": "University Name — Degree, Field | Year"
    },
    {
      "heading": "SKILLS",
      "content": "Category: skill1, skill2\\nCategory2: skill3"
    }
  ],
  "changeLog": [
    "Added AWS certification to Skills section as requested",
    "Updated job title to Senior Software Engineer as requested",
    "Rephrased summary to emphasize leadership experience"
  ]
}
`;
export const buildScamCheckPrompt = (
  companyName: string,
  jobTitle: string,
  jobDescription: string,
) => `
You are an expert at spotting fraudulent and fake job postings. Analyze the following job posting details 
for common red flags associated with job scams.

COMPANY: ${companyName || "Not provided"}
JOB TITLE: ${jobTitle || "Not provided"}
JOB DESCRIPTION: ${jobDescription || "Not provided"}

Look for these kinds of red flags specifically:
- Salary that seems unrealistic for the role, experience level, or location
- Pressure/urgency language ("apply now", "limited spots", "start immediately")
- Any mention of upfront payment, purchasing equipment, providing bank details, or paying for training/certification
- Vague, generic, or copy-pasted-sounding descriptions lacking real specifics about duties
- Requests for sensitive personal information (SSN, bank account) as part of the application itself
- Interviews conducted only through chat apps (Telegram, WhatsApp) rather than normal channels
- Job title/description mismatch or inconsistency
- No specifics about company location, team, or manager

If the company name or job description is missing or too sparse to analyze meaningfully, note that in your 
recommendation rather than inventing details.

Return ONLY valid JSON in this exact shape — no markdown, no backticks, no explanation:

{
  "riskLevel": "low" | "medium" | "high",
  "flags": [
    {
      "signal": "Short label for the red flag",
      "explanation": "1-2 sentence explanation of why this is concerning"
    }
  ],
  "recommendation": "1-2 sentence overall guidance for the candidate"
}

If no red flags are found, return an empty "flags" array and set "riskLevel" to "low".
`;
