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
