import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import Summary from "~/components/Summary";
import JobTitleSuggestions from "~/components/JobTitleSuggestions";
import JobPostings from "~/components/JobPostings";
import TabBar from "~/components/TabBar";
import { usePuterStore } from "~/lib/puter";
import JobLegitimacyCheck from "~/components/JobLegitimacycheck";
import DisclosureNotice from "~/components/DisclosureNotice";
import { prepareInstructions } from "../../constants";

export const meta = () => [
  { title: "Breezume | Review" },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  const { auth, isLoading, fs, kv, ai } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumePath, setResumePath] = useState("");
  const [docxPath, setDocxPath] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hasLoadedRecord, setHasLoadedRecord] = useState(false);
  const [recordMissing, setRecordMissing] = useState(false);
  const [isRevision, setIsRevision] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [hasBeenRegraded, setHasBeenRegraded] = useState(false);

  // Regrading a revised resume — re-runs the same analysis prompt against
  // this resume's own stored job info (or a general analysis if that info
  // wasn't carried over from an older revision made before this feature).
  const [isRegrading, setIsRegrading] = useState(false);
  const [regradeError, setRegradeError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated)
      navigate(`/auth?next=/resume/${id}`);
  }, [isLoading]);

  useEffect(() => {
    const loadResume = async () => {
      setHasLoadedRecord(false);
      setRecordMissing(false);

      const resume = await kv.get(`resume:${id}`);
      if (!resume) {
        setRecordMissing(true);
        setHasLoadedRecord(true);
        return;
      }

      const data = JSON.parse(resume);
      setResumePath(data.resumePath || "");
      setDocxPath(data.docxPath || "");

      try {
        const resumeBlob = await fs.read(data.resumePath);
        if (resumeBlob) {
          const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
          setResumeUrl(URL.createObjectURL(pdfBlob));
        }
      } catch (err) {
        console.error("Failed to load resume PDF:", err);
      }

      if (data.imagePath) {
        try {
          const imageBlob = await fs.read(data.imagePath);
          if (imageBlob) setImageUrl(URL.createObjectURL(imageBlob));
        } catch (err) {
          console.error("Failed to load preview image:", err);
        }
      }

      setFeedback(data.feedback || null);
      setIsRevision(Boolean(data.isRevision));
      setCompanyName(data.companyName || "");
      setJobTitle(data.jobTitle || "");
      setJobDescription(data.jobDescription || "");
      setHasLoadedRecord(true);
      setHasBeenRegraded(Boolean(data.hasBeenRegraded));
    };
    loadResume();
  }, [id]);

  const handleDownload = async (format: "pdf" | "docx") => {
    const path = format === "pdf" ? resumePath : docxPath;
    if (!path) return;
    setDownloading(format);
    setDownloadError(null);
    try {
      const blob = await fs.read(path);
      if (!blob) throw new Error("The saved file could not be found.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${isRevision ? "revised-" : ""}resume-${id?.slice(0, 8)}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "The download failed.",
      );
    } finally {
      setDownloading(null);
    }
  };

  const handleRegrade = async () => {
    setIsRegrading(true);
    setRegradeError(null);

    try {
      const raw = await kv.get(`resume:${id}`);
      if (!raw)
        throw new Error("Resume not found. Please go back and try again.");
      const data = JSON.parse(raw);

      const result = await ai.feedback(
        data.resumePath,
        prepareInstructions({
          jobTitle: data.jobTitle || "",
          jobDescription: data.jobDescription || "",
        }),
      );

      if (!result)
        throw new Error("The AI returned an empty response. Please try again.");

      const rawText: string =
        typeof result.message.content === "string"
          ? result.message.content
          : result.message.content[0].text;

      const cleaned = rawText.replace(/^```json\s*|```$/g, "").trim();

      let parsed: Feedback;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error("Received an invalid response. Please try again.");
      }

      data.feedback = parsed;
      data.hasBeenRegraded = true;
      await kv.set(`resume:${id}`, JSON.stringify(data));
      setFeedback(parsed);
      setHasBeenRegraded(true);
    } catch (err) {
      setRegradeError(
        err instanceof Error
          ? err.message
          : "Something went wrong regrading this resume.",
      );
    } finally {
      setIsRegrading(false);
    }
  };

  const tabs = feedback
    ? [
        {
          id: "overview",
          label: "Overview",
          badge: feedback.overallScore < 70 ? ("dot" as const) : undefined,
        },
        { id: "improve", label: "Improve My Resume" },
        {
          id: "jobsearch",
          label: "Job Search",
          badge: feedback.suggestedJobTitles?.length || 0,
        },
      ]
    : [];

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">
            Back to Homepage
          </span>
        </Link>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-4xl text-black font-bold">
              {isRevision ? "AI-Revised Resume" : "Resume Review"}
            </h2>
            {hasLoadedRecord && !recordMissing && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleDownload("pdf")}
                  disabled={!resumePath || downloading !== null}
                  className="primary-button w-fit text-sm disabled:opacity-50"
                >
                  {downloading === "pdf" ? "Downloading..." : "Download PDF"}
                </button>
                <button
                  onClick={() => handleDownload("docx")}
                  disabled={!docxPath || downloading !== null}
                  title={
                    docxPath
                      ? "Download Word document"
                      : "DOCX is available for newly generated AI resumes"
                  }
                  className="back-button w-fit text-sm cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  {downloading === "docx" ? "Downloading..." : "Download DOCX"}
                </button>
              </div>
            )}
          </div>
          {downloadError && (
            <p className="text-sm text-red-600">{downloadError}</p>
          )}
          {feedback ? (
            <div className="flex flex-col gap-6 animate-in fade-in duration-1000">
              <TabBar
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === "overview" && (
                <div className="flex flex-col gap-8">
                  {isRevision && !hasBeenRegraded && (
                    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 flex flex-row items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">
                          This score reflects the resume before revisions.
                        </p>
                        <p className="text-xs text-indigo-700 mt-0.5">
                          Regrade to see how the changes affected your score.
                        </p>
                      </div>
                      <button
                        onClick={handleRegrade}
                        disabled={isRegrading}
                        className="text-sm font-medium px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {isRegrading ? "Regrading..." : "Regrade This Resume"}
                      </button>
                    </div>
                  )}
                  {regradeError && (
                    <p className="text-sm text-red-600 -mt-4">{regradeError}</p>
                  )}
                  <Summary feedback={feedback} />
                  <ATS
                    score={feedback.ATS.score || 0}
                    suggestions={feedback.ATS.tips || []}
                  />
                  <Details feedback={feedback} />
                </div>
              )}

              {activeTab === "improve" && (
                <div className="flex flex-col gap-6">
                  {!isRevision && (
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 shadow-md p-6 flex flex-col gap-4">
                      <div className="flex flex-row gap-3 items-center">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                          {/* Sparkle icon (Heroicons) */}
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">
                            Apply AI Revisions
                          </p>
                          <p className="text-sm text-gray-500">
                            Let Claude rewrite your resume based on all the
                            feedback above.
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Claude will apply every improvement suggestion —
                        stronger action verbs, better ATS keyword density,
                        cleaner structure — and produce a ready-to-download
                        revised PDF.
                      </p>
                      <Link
                        to={`/revise/${id}`}
                        className="primary-button w-fit flex items-center gap-2 text-base"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                          />
                        </svg>
                        Apply AI Revisions
                      </Link>
                    </div>
                  )}

                  <div className="rounded-2xl bg-gradient-to-br from-green-50 to-blue-50 border border-green-100 shadow-md p-6 flex flex-col gap-4">
                    <div className="flex flex-row gap-3 items-center">
                      <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
                        {/* Pencil/edit icon (Heroicons) */}
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">
                          Have Your Own Ideas?
                        </p>
                        <p className="text-sm text-gray-500">
                          Tell Claude exactly what you want changed on your
                          resume.
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/custom-revise/${id}`}
                      className="primary-button w-fit flex items-center gap-2 text-base bg-green-600 hover:bg-green-700"
                    >
                      Suggest My Own Revisions
                    </Link>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-indigo-50 border border-pink-100 shadow-md p-6 flex flex-col gap-4">
                    <div className="flex flex-row gap-3 items-center">
                      <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center flex-shrink-0">
                        {/* Briefcase icon (Heroicons) */}
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">
                          Just Need a Cover Letter?
                        </p>
                        <p className="text-sm text-gray-500">
                          Already happy with your resume? Skip the revision and
                          generate a tailored cover letter only.
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/revise/${id}?mode=cover-letter`}
                      className="primary-button w-fit flex items-center gap-2 text-base bg-pink-500 hover:bg-pink-600"
                    >
                      Generate Cover Letter
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === "jobsearch" && (
                <div className="flex flex-col gap-6">
                  <JobTitleSuggestions
                    titles={feedback.suggestedJobTitles || []}
                  />
                  <JobPostings titles={feedback.suggestedJobTitles || []} />
                  <JobLegitimacyCheck
                    companyName={companyName}
                    jobTitle={jobTitle}
                    jobDescription={jobDescription}
                  />
                </div>
              )}
            </div>
          ) : hasLoadedRecord && recordMissing ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Resume not found.
              </p>
              <p className="text-sm text-gray-500 max-w-sm">
                This resume may have already been deleted, or the link is
                incorrect.
              </p>
              <Link to="/" className="primary-button w-fit">
                Back to Homepage
              </Link>
            </div>
          ) : hasLoadedRecord && !feedback ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-lg font-semibold text-gray-800">
                This analysis never finished.
              </p>
              <p className="text-sm text-gray-500 max-w-sm">
                It looks like the page was closed before the AI response came
                back. You'll need to delete this and re-upload your resume.
              </p>
              <div className="flex gap-3">
                <Link to="/settings" className="primary-button w-fit">
                  Go to Settings to delete it
                </Link>
                <Link
                  to="/upload"
                  className="text-sm font-medium px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Upload again
                </Link>
              </div>
            </div>
          ) : (
            <img
              src="/images/resume-scan-2.gif"
              alt="Loading resume analysis"
              className="w-36 sm:w-44 h-auto mx-auto"
            />
          )}
          {feedback && <DisclosureNotice context="ai" />}
        </section>
        <section className="feedback-section bg-[url('/images/bg-small.png')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 w-fit max-w-full">
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-fit max-w-full"
              >
                <img
                  src={imageUrl}
                  className="block w-auto max-w-full max-h-[78vh] object-contain rounded-2xl"
                  title="resume"
                />
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
export default Resume;
