import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import Summary from "~/components/Summary";
import JobTitleSuggestions from "~/components/JobTitleSuggestions";
import JobPostings from "~/components/JobPostings";
import JobLegitimacyCheck from "~/components/JobLegitimacycheck";
import { usePuterStore } from "~/lib/puter";

export const meta = () => [
  { title: "Breezume | Review" },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  const { auth, isLoading, fs, kv } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isRevision, setIsRevision] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated)
      navigate(`/auth?next=/resume/${id}`);
  }, [isLoading]);

  useEffect(() => {
    const loadResume = async () => {
      const resume = await kv.get(`resume:${id}`);
      if (!resume) return;
      const data = JSON.parse(resume);
      const resumeBlob = await fs.read(data.resumePath);
      if (!resumeBlob) return;
      const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
      const resumeUrl = URL.createObjectURL(pdfBlob);
      setResumeUrl(resumeUrl);
      const imageBlob = await fs.read(data.imagePath);
      if (!imageBlob) return;
      const imageUrl = URL.createObjectURL(imageBlob);
      setImageUrl(imageUrl);
      setFeedback(data.feedback);
      setIsRevision(Boolean(data.isRevision));
      setCompanyName(data.companyName || "");
      setJobTitle(data.jobTitle || "");
      setJobDescription(data.jobDescription || "");
    };
    loadResume();
  }, [id]);

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
          <h2 className="text-4xl text-black font-bold">
            {isRevision ? "AI-Revised Resume" : "Resume Review"}
          </h2>
          {feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />
              <JobTitleSuggestions titles={feedback.suggestedJobTitles || []} />
              <JobPostings titles={feedback.suggestedJobTitles || []} />
              <ATS
                score={feedback.ATS.score || 0}
                suggestions={feedback.ATS.tips || []}
              />
              <Details feedback={feedback} />
              <JobLegitimacyCheck
                companyName={companyName}
                jobTitle={jobTitle}
                jobDescription={jobDescription}
              />

              {/* ── AI Revision CTA — hidden for resumes that are already revisions ── */}
              {!isRevision && (
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 shadow-md p-6 flex flex-col gap-4">
                  <div className="flex flex-row gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
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
                        Let Claude rewrite your resume based on all the feedback
                        above.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Claude will apply every improvement suggestion — stronger
                    action verbs, better ATS keyword density, cleaner structure
                    — and produce a ready-to-download revised PDF.
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
              {/* ── Cover Letter Only CTA ─────────────────────────────────── */}
              <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-indigo-50 border border-pink-100 shadow-md p-6 flex flex-col gap-4">
                <div className="flex flex-row gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center flex-shrink-0">
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
              {/* ─────────────────────────────────────────────────────────── */}
              {/* ── Custom Revision CTA ───────────────────────────────────── */}
              <div className="rounded-2xl bg-gradient-to-br from-green-50 to-blue-50 border border-green-100 shadow-md p-6 flex flex-col gap-4">
                <div className="flex flex-row gap-3 items-center">
                  <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center flex-shrink-0">
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
                      Tell Claude exactly what you want changed on your resume.
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
              {/* ─────────────────────────────────────────────────────────── */}
              {/* ─────────────────────────────────────────────────────────── */}
            </div>
          ) : (
            <img src="/images/resume-scan-2.gif" className="w-full" />
          )}
        </section>
        <section className="feedback-section bg-[url('/images/bg-small.png')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
          {imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
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
