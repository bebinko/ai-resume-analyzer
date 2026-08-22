export const buildRevisionPrompt = (
  feedback: Feedback,
  jobTitle: string,
  jobDescription: string,
) => `
You are an expert resume editor. You have already analyzed a resume and produced structured feedback. 
Now, using the ORIGINAL RESUME (attached as a PDF) and the feedback below, produce a fully revised resume.

FEEDBACK SUMMARY:
- Overall Score: ${feedback.overallScore}/100
- Tone & Style (${feedback.toneAndStyle.score}/100): ${feedback.toneAndStyle.tips.map((t) => t.tip).join("; ")}
- Content (${feedback.content.score}/100): ${feedback.content.tips.map((t) => t.tip).join("; ")}
- Structure (${feedback.structure.score}/100): ${feedback.structure.tips.map((t) => t.tip).join("; ")}
- Skills (${feedback.skills.score}/100): ${feedback.skills.tips.map((t) => t.tip).join("; ")}
- ATS Issues: ${feedback.ATS.tips
  .filter((t) => t.type === "improve")
  .map((t) => t.tip)
  .join("; ")}

TARGET ROLE: ${jobTitle || "Not specified"}
JOB DESCRIPTION: ${jobDescription || "Not provided"}

INSTRUCTIONS:
1. Read the original resume text from the attached PDF carefully.
2. Apply ALL "improve" feedback suggestions.
3. Preserve ALL real facts (names, dates, companies, degrees, actual achievements).
4. Strengthen bullet points with action verbs and quantified results where the original has them or implies them.
5. Tailor language toward the target role and job description if provided.
6. Improve ATS keyword density based on the job description.
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
    "Strengthened action verbs in Experience section",
    "Added ATS keywords: project management, agile, stakeholder",
    "Reformatted Skills into categories for ATS readability"
  ]
}
`;

export const buildCoverLetterPrompt = (
  companyName: string,
  jobTitle: string,
  jobDescription: string,
) => `
You are an expert career coach and cover letter writer. Using the ORIGINAL RESUME (attached as a PDF), 
write a tailored, professional cover letter for this specific job.

COMPANY: ${companyName || "Not specified"}
TARGET ROLE: ${jobTitle || "Not specified"}
JOB DESCRIPTION: ${jobDescription || "Not provided"}

INSTRUCTIONS:
1. Read the resume carefully and pull out the candidate's real, specific experience, skills, and achievements.
2. Write a cover letter that connects the candidate's actual background to the requirements in the job description.
3. Keep it to 3-4 paragraphs: an opening hook, one or two body paragraphs with concrete evidence from the resume, and a closing paragraph with a call to action.
4. Do NOT invent facts, employers, titles, or accomplishments that aren't supported by the resume.
5. Keep tone professional but not stiff — confident, specific, no generic filler like "I am a hard worker."
6. Do not include a return address, date, or the employer's mailing address block — just the letter content itself.
7. Return ONLY valid JSON in this exact shape — no markdown, no backticks, no explanation:

{
  "greeting": "Dear Hiring Manager,",
  "paragraphs": [
    "Opening paragraph...",
    "Body paragraph...",
    "Closing paragraph..."
  ],
  "closing": "Sincerely,"
}
`;

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
