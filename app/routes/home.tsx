import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import SavedCoverLetterCard from "~/components/SavedCoverLetterCard";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Breezume" },
    { name: "description", content: "Resumes done in a breeze!" },
  ];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterRecord[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<"resumes" | "coverLetters">(
    "resumes",
  );
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) navigate("/auth?next=/");
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const loadLibrary = async () => {
      setLoadingLibrary(true);

      const [resumeItems, coverLetterItems] = await Promise.all([
        kv.list("resume:*", true) as Promise<KVItem[] | undefined>,
        kv.list("cover-letter:*", true) as Promise<KVItem[] | undefined>,
      ]);

      const parsedResumes = resumeItems?.map(
        (resume) => JSON.parse(resume.value) as Resume,
      );
      const parsedCoverLetters = coverLetterItems
        ?.map((item) => JSON.parse(item.value) as CoverLetterRecord)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      setResumes(parsedResumes || []);
      setCoverLetters(parsedCoverLetters || []);
      setLoadingLibrary(false);
    };

    loadLibrary();
  }, []);

  return (
    <main className="bg-[url('/images/bg-main.png')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16 relative">
          <h1>Track Your Applications & Resume Ratings</h1>
          <div className="hero-underline" />
          {!loadingLibrary && resumes.length === 0 && coverLetters.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback.</h2>
          ) : (
            <h2>Review your submissions and check AI-powered feedback.</h2>
          )}
        </div>
        <div className="flex rounded-full bg-white/80 border border-indigo-100 p-1 shadow-sm">
          <button
            onClick={() => setActiveLibrary("resumes")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              activeLibrary === "resumes"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-indigo-50"
            }`}
          >
            Resumes ({resumes.length})
          </button>
          <button
            onClick={() => setActiveLibrary("coverLetters")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              activeLibrary === "coverLetters"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-indigo-50"
            }`}
          >
            Cover Letters ({coverLetters.length})
          </button>
        </div>

        {loadingLibrary && (
          <div className="flex flex-col items-center justify-center relative py-10">
            <div className="glow-blob w-[300px] h-[300px] -z-10" />
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
        )}

        {!loadingLibrary && activeLibrary === "resumes" && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {!loadingLibrary && activeLibrary === "coverLetters" && coverLetters.length > 0 && (
          <div className="flex flex-wrap gap-6 items-start justify-center w-full max-w-[1400px]">
            {coverLetters.map((letter) => (
              <SavedCoverLetterCard key={letter.id} letter={letter} />
            ))}
          </div>
        )}

        {!loadingLibrary && activeLibrary === "resumes" && resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <div className="glow-blob w-[350px] h-[350px] -z-10" />
            <Link
              to="/upload"
              className="primary-button w-fit text-xl font-semibold"
            >
              Upload Resume
            </Link>
          </div>
        )}

        {!loadingLibrary &&
          activeLibrary === "coverLetters" &&
          coverLetters.length === 0 && (
            <div className="flex flex-col items-center text-center justify-center mt-10 gap-3">
              <h2>No saved cover letters yet.</h2>
              <p className="text-gray-500 max-w-lg">
                Open a resume review and choose “Generate Cover Letter” to create one.
              </p>
            </div>
          )}

        <footer className="w-full border-t border-indigo-100/70 mt-12 py-8 text-center">
          <p className="text-sm text-gray-500">
            Curious about the person behind Breezume?{" "}
            <Link
              to="/about"
              className="font-semibold text-indigo-700 underline underline-offset-4 [text-decoration-skip-ink:none] hover:text-indigo-900 transition-colors"
            >
              Meet the developer
            </Link>
            .
          </p>
        </footer>
      </section>
    </main>
  );
}
