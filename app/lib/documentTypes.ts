export interface ResumedSection {
  heading: string;
  content: string;
}

export interface RevisedResume {
  name: string;
  contactLine: string;
  summary?: string;
  sections: ResumedSection[];
  changeLog: string[];
}

export interface CoverLetterData {
  greeting: string;
  paragraphs: string[];
  closing: string;
}

export interface LoadedResumeData {
  resumePath: string;
  imagePath: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  feedback: Feedback;
}

export interface ScamCheckResult {
  riskLevel: "low" | "medium" | "high";
  flags: {
    signal: string;
    explanation: string;
  }[];
  recommendation: string;
}
