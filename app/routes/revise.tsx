import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import Navbar from "~/components/Navbar";
import ProgressSteps from "~/components/ProgressSteps";
import CoverLetterCard from "~/components/CoverLetterCard";
import { usePuterStore } from "~/lib/puter";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { buildRevisionPrompt, buildCoverLetterPrompt } from "~/lib/prompts";
import {
  buildPdf,
  buildResumeDocx,
  buildCoverLetterPdf,
  buildCoverLetterDocx,
} from "~/lib/documentBuilders";
import type {
  RevisedResume,
  CoverLetterData,
  LoadedResumeData,
} from "~/lib/documentTypes";

export const meta = () => [
  { title: "Breezume | AI Revisions" },
  { name: "description", content: "Apply AI-powered revisions to your resume" },
];

const revisionSteps = [
  { id: "loading", label: "Loading your resume" },
  { id: "revising", label: "Claude is rewriting your resume" },
  { id: "building", label: "Building revised PDF" },
  { id: "rendering", label: "Rendering preview" },
  { id: "storing", label: "Saving to your dashboard" },
  { id: "done", label: "Done!" },
];

const coverLetterOnlySteps = [
  { id: "loading", label: "Loading your resume" },
  { id: "ready", label: "Ready to generate" },
];

// This route serves two modes from one component: a full resume revision
// (default), or a cover-letter-only flow reached via ?mode=cover-letter
// from the review page's "Just Need a Cover Letter?" CTA. The mode changes
// which steps run, which UI sections render, and what "done" means.
const Revise = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const coverLetterOnly = searchParams.get("mode") === "cover-letter";
  const navigate = useNavigate();

  const steps = coverLetterOnly ? coverLetterOnlySteps : revisionSteps;

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [resumeData, setResumeData] = useState<LoadedResumeData | null>(null);
  const [revisedData, setRevisedData] = useState<RevisedResume | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [changeLog, setChangeLog] = useState<string[]>([]);
  const [revisedResumeId, setRevisedResumeId] = useState<string | null>(null);

  const [coverLetterData, setCoverLetterData] =
    useState<CoverLetterData | null>(null);
  const [coverLetterPdfBlob, setCoverLetterPdfBlob] = useState<Blob | null>(
    null,
  );
  const [coverLetterDocxBlob, setCoverLetterDocxBlob] = useState<Blob | null>(
    null,
  );
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [coverLetterError, setCoverLetterError] = useState<string | null>(null);
  const [isCoverLetterSaved, setIsCoverLetterSaved] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateContact, setCandidateContact] = useState("");

  // Prevents the fetch effect below from firing twice (e.g. React strict
  // mode double-invoke in dev, or auth state settling after a re-render).
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/revise/${id}`);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || !auth.isAuthenticated || hasFetched.current) return;
    hasFetched.current = true;
    if (coverLetterOnly) {
      loadResumeOnly();
    } else {
      runRevision();
    }
  }, [isLoading, auth.isAuthenticated]);

  // Cover-letter-only mode just needs the stored resume data — no AI call,
  // no PDF rebuild, since the resume itself isn't being changed.
  const loadResumeOnly = async () => {
    try {
      setCurrentStep(0);
      const raw = await kv.get(`resume:${id}`);
      if (!raw)
        throw new Error("Resume not found. Please go back and try again.");
      const data = JSON.parse(raw) as LoadedResumeData;

      if (!data.feedback) throw new Error("No feedback found for this resume.");
      setResumeData(data);
      setCurrentStep(1);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    }
  };

  const runRevision = async () => {
    try {
      setCurrentStep(0);
      const raw = await kv.get(`resume:${id}`);
      if (!raw)
        throw new Error("Resume not found. Please go back and try again.");
      const data = JSON.parse(raw) as LoadedResumeData;

      if (!data.feedback) throw new Error("No feedback found for this resume.");
      setResumeData(data);

      setCurrentStep(1);
      const prompt = buildRevisionPrompt(
        data.feedback,
        data.jobTitle,
        data.jobDescription,
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
          ai.feedback(data.resumePath, prompt),
          timeoutPromise,
        ]);
      } catch (aiErr: any) {
        // Rewrite known failure types into clearer messages; anything else
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
        if (
          msg.toLowerCase().includes("auth") ||
          msg.toLowerCase().includes("unauthorized") ||
          msg.toLowerCase().includes("403")
        ) {
          throw new Error(
            "Puter authentication error. Try signing out and back in, then retry.",
          );
        }
        throw aiErr;
      }

      if (!result)
        throw new Error(
          "The AI returned an empty response. The free-tier quota may be exhausted — please try again shortly.",
        );

      let rawText: string;
      try {
        rawText =
          typeof result.message.content === "string"
            ? result.message.content
            : result.message.content[0].text;
      } catch {
        throw new Error(
          "Unexpected response format from AI. Please try again.",
        );
      }

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
          "The AI response could not be parsed — it may have been interrupted mid-response. Please try again.",
        );
      }

      setRevisedData(revised);
      setChangeLog(revised.changeLog || []);

      setCurrentStep(2);
      const blob = await buildPdf(revised);
      setPdfBlob(blob);
      const resumeDocx = await buildResumeDocx(revised);
      setDocxBlob(resumeDocx);

      setCurrentStep(3);
      const pdfFile = new File([blob], "revised-resume.pdf", {
        type: "application/pdf",
      });
      const imgResult = await convertPdfToImage(pdfFile);
      if (imgResult.file) {
        const url = URL.createObjectURL(imgResult.file);
        setPreviewUrl(url);
      }

      setCurrentStep(4);
      // Storage failure is non-fatal — the user still gets their preview and
      // download either way, they just won't see a "saved" confirmation.
      try {
        const uploadedRevisedResume = await fs.upload([pdfFile]);
        if (!uploadedRevisedResume)
          throw new Error("Failed to upload revised resume PDF.");

        const resumeDocxFile = new File(
          [resumeDocx],
          "revised-resume.docx",
          {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          },
        );
        const uploadedResumeDocx = await fs.upload([resumeDocxFile]);

        let uploadedRevisedImagePath: string | null = null;
        if (imgResult.file) {
          const uploadedRevisedImage = await fs.upload([imgResult.file]);
          if (uploadedRevisedImage)
            uploadedRevisedImagePath = uploadedRevisedImage.path;
        }

        const newId = generateUUID();
        const revisedRecord: Resume = {
          id: newId,
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          jobDescription: data.jobDescription,
          imagePath: uploadedRevisedImagePath ?? data.imagePath,
          resumePath: uploadedRevisedResume.path,
          docxPath: uploadedResumeDocx?.path,
          feedback: data.feedback,
          isRevision: true,
          originalResumeId: id,
        };

        await kv.set(`resume:${newId}`, JSON.stringify(revisedRecord));
        setRevisedResumeId(newId);
      } catch (storeErr) {
        console.error("Failed to store revised resume:", storeErr);
      }

      setCurrentStep(5);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    }
  };

  const generateCoverLetter = async () => {
    if (!resumeData) return;
    setIsGeneratingCoverLetter(true);
    setCoverLetterError(null);
    setIsCoverLetterSaved(false);

    try {
      const prompt = buildCoverLetterPrompt(
        resumeData.companyName,
        resumeData.jobTitle,
        resumeData.jobDescription,
      );

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

      const result: any = await Promise.race([
        ai.feedback(resumeData.resumePath, prompt),
        timeoutPromise,
      ]);

      if (!result)
        throw new Error(
          "The AI returned an empty response. Please try again shortly.",
        );

      const rawText: string =
        typeof result.message.content === "string"
          ? result.message.content
          : result.message.content[0].text;

      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const coverLetter: CoverLetterData = JSON.parse(cleaned);
      setCoverLetterData(coverLetter);

      // If a full revision already ran, reuse the name/contact info Claude
      // extracted from the resume; otherwise fall back to what the user
      // typed into the cover-letter-only form.
      const nameForLetter = revisedData?.name || candidateName;
      const contactForLetter = revisedData?.contactLine || candidateContact;

      const pdf = await buildCoverLetterPdf(
        coverLetter,
        nameForLetter,
        contactForLetter,
      );
      setCoverLetterPdfBlob(pdf);

      const docx = await buildCoverLetterDocx(
        coverLetter,
        nameForLetter,
        contactForLetter,
      );
      setCoverLetterDocxBlob(docx);

      const coverLetterId = generateUUID();
      const pdfFile = new File([pdf], `cover-letter-${coverLetterId}.pdf`, {
        type: "application/pdf",
      });
      const docxFile = new File([docx], `cover-letter-${coverLetterId}.docx`, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const [uploadedPdf, uploadedDocx] = await Promise.all([
        fs.upload([pdfFile]),
        fs.upload([docxFile]),
      ]);

      if (!uploadedPdf || !uploadedDocx) {
        throw new Error("The cover letter was created but could not be saved.");
      }

      const record: CoverLetterRecord = {
        id: coverLetterId,
        resumeId: id || "",
        companyName: resumeData.companyName,
        jobTitle: resumeData.jobTitle,
        candidateName: nameForLetter,
        candidateContact: contactForLetter,
        coverLetter,
        pdfPath: uploadedPdf.path,
        docxPath: uploadedDocx.path,
        createdAt: new Date().toISOString(),
      };
      await kv.set(`cover-letter:${coverLetterId}`, JSON.stringify(record));
      setIsCoverLetterSaved(true);
    } catch (err: any) {
      console.error(err);
      setCoverLetterError(
        err?.message || "Something went wrong generating the cover letter.",
      );
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revised-resume-${id?.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadResumeDocx = () => {
    if (!docxBlob) return;
    const url = URL.createObjectURL(docxBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revised-resume-${id?.slice(0, 8)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCoverLetterPdf = () => {
    if (!coverLetterPdfBlob) return;
    const url = URL.createObjectURL(coverLetterPdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${id?.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCoverLetterDocx = () => {
    if (!coverLetterDocxBlob) return;
    const url = URL.createObjectURL(coverLetterDocxBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${id?.slice(0, 8)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // "Done" means something different per mode: for a full revision it's the
  // last numbered step (5); for cover-letter-only it's just having loaded
  // the resume data (step 1), since there's nothing else to build first.
  const isDone = coverLetterOnly
    ? currentStep === 1 && !error
    : currentStep === 5 && !error;

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-10">
          <Link to={`/resume/${id}`} className="back-button mb-4 inline-flex">
            <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
            <span className="text-gray-800 text-sm font-semibold">
              Back to Review
            </span>
          </Link>
          <h1>
            {coverLetterOnly ? "Cover Letter Generator" : "AI Resume Revision"}
          </h1>
          <h2>
            {coverLetterOnly
              ? "Claude will write a tailored cover letter based on your resume and the job description."
              : "Claude will rewrite your resume based on the feedback it provided."}
          </h2>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 flex flex-col gap-4 max-w-xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                {/* Warning triangle icon (Heroicons) */}
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-red-700 font-semibold text-lg">
                  Something went wrong
                </p>
                <p className="text-red-600 text-sm mt-1 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                className="primary-button w-fit text-sm"
                onClick={() => {
                  setError(null);
                  setCurrentStep(0);
                  hasFetched.current = false;
                  if (coverLetterOnly) loadResumeOnly();
                  else runRevision();
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

        {!error && !isDone && (
          <ProgressSteps steps={steps} currentStep={currentStep} />
        )}

        {isDone && (
          <div className="flex flex-col gap-8 pb-16 animate-in fade-in duration-700">
            {!coverLetterOnly && (
              <>
                <div className="flex flex-row flex-wrap gap-4 items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Revised Resume
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Claude applied {changeLog.length} improvement
                      {changeLog.length !== 1 ? "s" : ""} to your resume.
                      {revisedResumeId && " Saved to your dashboard."}
                    </p>
                  </div>
                  <div className="flex gap-3">
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
                    <button
                      onClick={handleDownload}
                      className="primary-button w-fit flex items-center gap-2"
                    >
                      <img src="/icons/check.svg" alt="" className="w-4 h-4" />
                      Download Revised PDF
                    </button>
                    <button
                      onClick={handleDownloadResumeDocx}
                      className="back-button w-fit flex items-center gap-2"
                    >
                      Download Revised DOCX
                    </button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
                  <div className="flex-1 min-w-0 flex justify-center">
                    {previewUrl ? (
                      <div className="gradient-border animate-in fade-in duration-1000 w-full max-w-2xl">
                        <img
                          src={previewUrl}
                          alt="Revised resume preview"
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
                      onClick={handleDownload}
                      className="primary-button w-full flex items-center justify-center gap-2"
                    >
                      Download Revised PDF
                    </button>
                    <button
                      onClick={handleDownloadResumeDocx}
                      className="back-button w-full flex items-center justify-center gap-2"
                    >
                      Download Revised DOCX
                    </button>
                  </div>
                </div>
              </>
            )}

            {coverLetterOnly && (
              <div className="flex justify-end">
                <Link to={`/resume/${id}`} className="back-button">
                  ← Back to Review
                </Link>
              </div>
            )}

            <CoverLetterCard
              coverLetterData={coverLetterData}
              candidateName={candidateName}
              setCandidateName={setCandidateName}
              candidateContact={candidateContact}
              setCandidateContact={setCandidateContact}
              hasRevisedData={Boolean(revisedData)}
              displayName={revisedData?.name || candidateName || "Your Name"}
              isGenerating={isGeneratingCoverLetter}
              error={coverLetterError}
              isSaved={isCoverLetterSaved}
              onGenerate={generateCoverLetter}
              onDownloadPdf={handleDownloadCoverLetterPdf}
              onDownloadDocx={handleDownloadCoverLetterDocx}
            />
          </div>
        )}
      </section>
    </main>
  );
};

export default Revise;
