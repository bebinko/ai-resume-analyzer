import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import Navbar from "~/components/Navbar";
import ProgressSteps from "~/components/ProgressSteps";
import DisclosureNotice from "~/components/DisclosureNotice";
import { usePuterStore } from "~/lib/puter";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { buildCustomRevisionPrompt } from "~/lib/prompts";
import { buildPdf, buildResumeDocx } from "~/lib/documentBuilders";
import type { RevisedResume, LoadedResumeData } from "~/lib/documentTypes";

export const meta = () => [
  { title: "Breezume | Custom Revisions" },
  { name: "description", content: "Suggest your own resume revisions" },
];

const steps = [
  { id: "loading", label: "Loading your resume" },
  { id: "revising", label: "Claude is applying your changes" },
  { id: "building", label: "Building revised PDF" },
  { id: "rendering", label: "Rendering preview" },
  { id: "storing", label: "Saving to your dashboard" },
  { id: "done", label: "Done!" },
];

const CustomRevise = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const { id } = useParams();
  const navigate = useNavigate();

  const [resumeData, setResumeData] = useState<LoadedResumeData | null>(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState("");
  const MAX_SUGGESTIONS_LENGTH = 1000;

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [revisedData, setRevisedData] = useState<RevisedResume | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [changeLog, setChangeLog] = useState<string[]>([]);
  const [revisedResumeId, setRevisedResumeId] = useState<string | null>(null);

  // Guards against double-submission (e.g. rapid double-click), since this
  // isn't tied to route mount timing the way the other revise flows are.
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/custom-revise/${id}`);
    }
  }, [isLoading]);

  useEffect(() => {
    const loadResume = async () => {
      try {
        const raw = await kv.get(`resume:${id}`);
        if (!raw)
          throw new Error("Resume not found. Please go back and try again.");
        const data = JSON.parse(raw) as LoadedResumeData;
        if (!data.feedback)
          throw new Error("No feedback found for this resume.");
        setResumeData(data);
      } catch (err: any) {
        setLoadError(
          err?.message || "Something went wrong loading your resume.",
        );
      } finally {
        setLoadingResume(false);
      }
    };

    if (auth.isAuthenticated) loadResume();
  }, [auth.isAuthenticated]);

  const runCustomRevision = async () => {
    if (!resumeData || !suggestions.trim() || hasStarted.current) return;
    hasStarted.current = true;
    setIsProcessing(true);
    setError(null);

    try {
      setCurrentStep(0);

      setCurrentStep(1);
      const prompt = buildCustomRevisionPrompt(
        resumeData.feedback,
        resumeData.jobTitle,
        resumeData.jobDescription,
        suggestions.trim(),
      );

      // Puter's free-tier AI can hang indefinitely under load, so race it
      // against a timeout rather than leaving the user stuck on this step.
      const AI_TIMEOUT_MS = 60_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "The AI took too long to respond. This may be due to a Puter free-tier rate limit. Please wait a moment and try again.",
              ),
            ),
          AI_TIMEOUT_MS,
        ),
      );

      let result: any;
      try {
        result = await Promise.race([
          ai.feedback(resumeData.resumePath, prompt),
          timeoutPromise,
        ]);
      } catch (aiErr: any) {
        // Rewrite rate-limit errors into a clearer message; anything else
        // gets re-thrown as-is to the outer catch below.
        const msg: string = aiErr?.message ?? "";
        if (
          msg.toLowerCase().includes("rate") ||
          msg.toLowerCase().includes("quota") ||
          msg.toLowerCase().includes("limit")
        ) {
          throw new Error(
            "Puter AI rate limit reached. You may have exceeded the free-tier quota. Try again in a few minutes.",
          );
        }
        throw aiErr;
      }

      if (!result)
        throw new Error(
          "The AI returned an empty response. Please try again shortly.",
        );

      const rawText: string =
        typeof result.message.content === "string"
          ? result.message.content
          : result.message.content[0].text;

      // The model is instructed to return raw JSON but sometimes wraps it
      // in a markdown code fence anyway — strip that before parsing.
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      let revised: RevisedResume;
      try {
        revised = JSON.parse(cleaned);
      } catch {
        throw new Error(
          "The AI response could not be parsed. Please try again.",
        );
      }

      setRevisedData(revised);
      setChangeLog(revised.changeLog || []);

      setCurrentStep(2);
      const pdf = await buildPdf(revised);
      setPdfBlob(pdf);
      const docx = await buildResumeDocx(revised);
      setDocxBlob(docx);

      setCurrentStep(3);
      const pdfFile = new File([pdf], "custom-revised-resume.pdf", {
        type: "application/pdf",
      });
      const imgResult = await convertPdfToImage(pdfFile);
      if (imgResult.file) {
        setPreviewUrl(URL.createObjectURL(imgResult.file));
      }

      setCurrentStep(4);
      // Storage failure is treated as non-fatal — the user still gets their
      // download either way, they just won't see a "saved" confirmation.
      try {
        const uploadedResume = await fs.upload([pdfFile]);
        if (!uploadedResume)
          throw new Error("Failed to upload revised resume.");

        const docxFile = new File([docx], "custom-revised-resume.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        const uploadedDocx = await fs.upload([docxFile]);

        let uploadedImagePath: string | null = null;
        if (imgResult.file) {
          const uploadedImage = await fs.upload([imgResult.file]);
          if (uploadedImage) uploadedImagePath = uploadedImage.path;
        }

        const newId = generateUUID();
        const revisedRecord: Resume = {
          id: newId,
          companyName: resumeData.companyName,
          jobTitle: resumeData.jobTitle,
          jobDescription: resumeData.jobDescription,
          imagePath: uploadedImagePath ?? resumeData.imagePath,
          resumePath: uploadedResume.path,
          docxPath: uploadedDocx?.path,
          feedback: resumeData.feedback,
          isRevision: true,
          originalResumeId: id,
        };

        await kv.set(`resume:${newId}`, JSON.stringify(revisedRecord));
        setRevisedResumeId(newId);
      } catch (storeErr) {
        console.error("Failed to store custom revision:", storeErr);
      }

      setCurrentStep(5);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-revised-resume-${id?.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDocx = () => {
    if (!docxBlob) return;
    const url = URL.createObjectURL(docxBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom-revised-resume-${id?.slice(0, 8)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDone = currentStep === 5 && !error;

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-10">
          {!isDone && (
            <Link to={`/resume/${id}`} className="back-button mb-4 inline-flex">
              <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
              <span className="text-gray-800 text-sm font-semibold">
                Back to Review
              </span>
            </Link>
          )}
          <h1>Suggest Your Own Revisions</h1>
          <h2>
            Tell Claude exactly what you want changed, and it'll apply it to
            your resume.
          </h2>
          <DisclosureNotice context="ai" />
        </div>

        {loadingResume && (
          <p className="text-center text-gray-400">Loading your resume...</p>
        )}

        {loadError && (
          <p className="text-center text-red-600 text-sm">{loadError}</p>
        )}

        {!loadingResume && !loadError && !isProcessing && !isDone && (
          <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
            <div className="form-div">
              <div className="flex flex-row justify-between w-full">
                <label htmlFor="suggestions">
                  What would you like Claude to change?
                </label>
                <span className="text-xs text-gray-400">
                  {suggestions.length}/{MAX_SUGGESTIONS_LENGTH}
                </span>
              </div>
              <textarea
                id="suggestions"
                rows={6}
                maxLength={MAX_SUGGESTIONS_LENGTH}
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                placeholder={
                  'e.g. "Add my AWS certification to the Skills section", ' +
                  '"Change my most recent job title to Senior Developer", ' +
                  '"Make my summary focus more on leadership experience"'
                }
              />
            </div>
            <button
              onClick={runCustomRevision}
              disabled={!suggestions.trim()}
              className="primary-button w-fit disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply My Revisions
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 flex flex-col gap-4 max-w-xl mx-auto">
            <div>
              <p className="text-red-700 font-semibold text-lg">
                Something went wrong
              </p>
              <p className="text-red-600 text-sm mt-1 leading-relaxed">
                {error}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                className="primary-button w-fit text-sm"
                onClick={() => {
                  setError(null);
                  setCurrentStep(0);
                  hasStarted.current = false;
                  runCustomRevision();
                }}
              >
                ↺ Retry
              </button>
              <Link to={`/resume/${id}`} className="back-button text-sm">
                ← Back to Review
              </Link>
            </div>
          </div>
        )}

        {isProcessing && !error && !isDone && (
          <ProgressSteps steps={steps} currentStep={currentStep} />
        )}

        {isDone && (
          <div className="flex flex-col gap-8 pb-16 animate-in fade-in duration-700">
            <div className="flex flex-row flex-wrap gap-4 items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Custom Revision
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Claude applied {changeLog.length} change
                  {changeLog.length !== 1 ? "s" : ""} based on your request.
                  {revisedResumeId && " Saved to your dashboard."}
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link to={`/resume/${id}`} className="back-button">
                  ← Back to Review
                </Link>
                {revisedResumeId && (
                  <Link
                    to={`/resume/${revisedResumeId}`}
                    className="back-button"
                  >
                    View Saved Revision
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
              <div className="flex-1 min-w-0 flex justify-center">
                {previewUrl ? (
                  <div className="gradient-border animate-in fade-in duration-1000 w-full max-w-2xl">
                    <img
                      src={previewUrl}
                      alt="Custom revised resume preview"
                      className="w-full h-auto object-contain rounded-2xl"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 h-64 flex items-center justify-center">
                    <p className="text-gray-400">Preview unavailable</p>
                  </div>
                )}
              </div>

              <div className="lg:w-80 flex-shrink-0 flex flex-col gap-4">
                <div className="rounded-2xl shadow-md bg-white p-6 flex flex-col gap-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    What Claude Changed
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {changeLog.map((change, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <img
                            src="/icons/check.svg"
                            alt=""
                            className="w-3 h-3"
                          />
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {change}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleDownloadPdf}
                  className="primary-button w-full flex items-center justify-center gap-2"
                >
                  Download as PDF
                </button>
                <button
                  onClick={handleDownloadDocx}
                  className="back-button w-full flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  Download as Word (.docx)
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default CustomRevise;
