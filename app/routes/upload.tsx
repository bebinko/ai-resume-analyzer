import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import FileUploader from "~/components/FileUploader";
import Navbar from "~/components/Navbar";
import { convertPdfToImage } from "~/lib/pdf2img";
import { usePuterStore } from "~/lib/puter";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";

export const meta = () => [
  { title: "Breezume | Upload" },
  {
    name: "description",
    content: "Upload your resume for AI-powered feedback",
  },
];

// Character limits — keeps prompt size (and token cost) predictable
const LIMITS = {
  companyName: 50,
  jobTitle: 50,
  jobDescription: 4000,
};

const Upload = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const handleFileSelect = (file: File | null) => {
    setFile(file);
  };

  const runWithProgress = <T,>(
    promise: Promise<T>,
    { from, to, label }: { from: number; to: number; label: string },
  ): Promise<T> => {
    setProgress(from);
    setStatusText(label);
    const startedAt = Date.now();

    const tick = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000));
      setProgress((p) => {
        const remaining = to - p;
        // slow asymptotic creep — fast at first, crawls as it nears `to`
        return p + remaining * 0.03;
      });
    }, 300);

    return promise.finally(() => clearInterval(tick));
  };

  const withTimeout = <T,>(
    promise: Promise<T>,
    ms: number,
    message: string,
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(message)), ms),
      ),
    ]);
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);
    setProgress(0);
    setElapsedSeconds(0);

    try {
      const uploadedFile = await runWithProgress(fs.upload([file]), {
        from: 0,
        to: 15,
        label: "Uploading the file...",
      });
      if (!uploadedFile) {
        setStatusText("Error: Failed to upload file");
        return;
      }

      setProgress(15);
      const uuid = generateUUID();
      const data = {
        id: uuid,
        resumePath: uploadedFile.path,
        imagePath: "",
        companyName,
        jobTitle,
        jobDescription,
        feedback: "",
      };
      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      convertPdfToImage(file)
        .then(async (imageFile) => {
          if (!imageFile.file) return;
          const uploadedImage = await fs.upload([imageFile.file]);
          if (!uploadedImage) return;
          data.imagePath = uploadedImage.path;
          await kv.set(`resume:${uuid}`, JSON.stringify(data));
        })
        .catch((err) => console.error("Preview image generation failed:", err));

      // The AI call is the long pole — 90s cap, progress creeps 20% -> 90%
      const feedback = await runWithProgress(
        withTimeout(
          ai.feedback(
            uploadedFile.path,
            prepareInstructions({ jobTitle, jobDescription }),
          ),
          90000,
          "Analysis timed out. The AI service may be slow right now — try again.",
        ),
        { from: 20, to: 90, label: "Analyzing..." },
      );
      if (!feedback) {
        setStatusText("Error: Failed to analyze resume");
        return;
      }

      const feedbackText =
        typeof feedback.message.content === "string"
          ? feedback.message.content
          : feedback.message.content[0].text;
      const cleaned = feedbackText.replace(/^```json\s*|```$/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI feedback JSON:", feedbackText);
        setStatusText("Error: Received an invalid response. Please try again.");
        return;
      }

      setProgress(100);
      data.feedback = parsed;
      await kv.set(`resume:${uuid}`, JSON.stringify(data));
      setStatusText("Analysis complete, redirecting...");
      navigate(`/resume/${uuid}`);
    } catch (err) {
      console.error("Resume analysis failed:", err);
      setStatusText(
        `Error: ${err instanceof Error ? err.message : "Something went wrong."}`,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    handleAnalyze({
      companyName: companyName.slice(0, LIMITS.companyName),
      jobTitle: jobTitle.slice(0, LIMITS.jobTitle),
      jobDescription: jobDescription.slice(0, LIMITS.jobDescription),
      file,
    });
  };

  return (
    <main className="bg-white">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {Math.round(progress)}% • {elapsedSeconds}s elapsed
              </p>
              <img src="/images/resume-scan.gif" className="w-full" />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}
          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <div className="flex flex-row justify-between w-full">
                  <label htmlFor="company-name">Company Name</label>
                  <span className="text-xs text-gray-400">
                    {companyName.length}/{LIMITS.companyName}
                  </span>
                </div>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                  maxLength={LIMITS.companyName}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="form-div">
                <div className="flex flex-row justify-between w-full">
                  <label htmlFor="job-title">Job Title</label>
                  <span className="text-xs text-gray-400">
                    {jobTitle.length}/{LIMITS.jobTitle}
                  </span>
                </div>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                  maxLength={LIMITS.jobTitle}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="form-div">
                <div className="flex flex-row justify-between w-full">
                  <label htmlFor="job-description">Job Description</label>
                  <span className="text-xs text-gray-400">
                    {jobDescription.length}/{LIMITS.jobDescription}
                  </span>
                </div>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                  maxLength={LIMITS.jobDescription}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>
              <button className="primary-button" type="submit">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;
