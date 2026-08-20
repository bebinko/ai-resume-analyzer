import { Link } from "react-router";
import ScoreCircle from "./ScoreCircle";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";

const scoreAccentColor = (score: number) => {
  if (score > 69) return "linear-gradient(to right, #34d399, #10b981)"; // green
  if (score > 39) return "linear-gradient(to right, #fbbf24, #f59e0b)"; // yellow
  return "linear-gradient(to right, #f87171, #ef4444)"; // red
};

const ResumeCard = ({
  resume: { id, companyName, jobTitle, feedback, imagePath },
}: {
  resume: Resume;
}) => {
  const { fs } = usePuterStore();
  const [resumeUrl, setResumeUrl] = useState("");

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadResume = async () => {
      const blob = await fs.read(imagePath);
      if (!blob) return;
      objectUrl = URL.createObjectURL(blob);
      setResumeUrl(objectUrl);
    };
    loadResume();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath]);

  return (
    <Link
      to={`/resume/${id}`}
      className="resume-card animate-in fade-in duration-1000"
    >
      <div
        className="resume-card-accent"
        style={{ background: scoreAccentColor(feedback.overallScore) }}
      />

      <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          {companyName && (
            <h2 className="!text-black font-bold break-words">{companyName}</h2>
          )}
          {jobTitle && (
            <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>
          )}
          {!companyName && !jobTitle && (
            <h2 className="!text-black font-bold">Resume</h2>
          )}
        </div>
        <div className="flex-shrink-0">
          <ScoreCircle score={feedback.overallScore} />
        </div>
      </div>
      {resumeUrl && (
        <div className="gradient-border animate-in fade-in duration-1000">
          <div className="w-full h-full">
            <img
              src={resumeUrl}
              alt="resume"
              className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
            />
          </div>
        </div>
      )}
    </Link>
  );
};

export default ResumeCard;
