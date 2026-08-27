interface Job {
  title: string;
  description: string;
  location: string;
  requiredSkills: string[];
}

interface Resume {
  id: string;
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  imagePath: string;
  resumePath: string;
  docxPath?: string;
  feedback: Feedback;
  isRevision?: boolean;
  originalResumeId?: string;
  hasBeenRegraded?: boolean;
}

interface CoverLetterRecord {
  id: string;
  resumeId: string;
  companyName?: string;
  jobTitle?: string;
  candidateName: string;
  candidateContact: string;
  coverLetter: {
    greeting: string;
    paragraphs: string[];
    closing: string;
  };
  pdfPath: string;
  docxPath: string;
  createdAt: string;
}

interface Feedback {
  overallScore: number;
  ATS: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
    }[];
  };
  toneAndStyle: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  content: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  structure: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  skills: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  suggestedJobTitles?: string[];
}
