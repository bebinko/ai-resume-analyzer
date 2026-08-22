import { useState } from "react";
import { usePuterStore } from "~/lib/puter";
import { searchAdzunaJobs, type AdzunaJob } from "~/lib/adzuna";
import {
  buildLinkedInJobUrl,
  buildIndeedJobUrl,
  buildGoogleJobsUrl,
} from "~/lib/jobSearchLinks";

const RATE_LIMIT_MAX = 5; // max job searches per user per day

const getRateLimitKey = () => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `job-search-usage:${today}`;
};

const formatSalary = (min?: number, max?: number) => {
  if (!min && !max) return null;

  const fmt = (n: number) => `$${Math.round(n / 1000)}k`;

  if (min && max) return `${fmt(min)} - ${fmt(max)}`;

  return fmt(min || max || 0);
};

const JobPostings = ({ titles }: { titles: string[] }) => {
  const { kv } = usePuterStore();

  const [started, setStarted] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState(titles[0] || "");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<AdzunaJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchesUsed, setSearchesUsed] = useState(0);

  const loadUsage = async () => {
    const raw = await kv.get(getRateLimitKey());
    setSearchesUsed(raw ? parseInt(raw, 10) : 0);
  };

  const incrementUsage = async () => {
    const key = getRateLimitKey();
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    const next = count + 1;

    await kv.set(key, String(next));
    setSearchesUsed(next);
  };

  const runSearch = async () => {
    if (!selectedTitle) return;

    const raw = await kv.get(getRateLimitKey());
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= RATE_LIMIT_MAX) {
      setError(
        `You've reached today's limit of ${RATE_LIMIT_MAX} job searches. Try again tomorrow, or search directly on LinkedIn/Indeed/Google Jobs below.`,
      );
      setHasSearched(true);
      setJobs([]);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await searchAdzunaJobs({
        query: selectedTitle,
        location: location.trim() || undefined,
      });

      setJobs(results);
      await incrementUsage();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong searching for jobs.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setStarted(true);
    loadUsage();
  };

  if (!titles || titles.length === 0) return null;

  const remaining = Math.max(RATE_LIMIT_MAX - searchesUsed, 0);
  const limitReached = remaining === 0;

  return (
    <div className="rounded-2xl bg-white shadow-md p-6 flex flex-col gap-4">
      <div className="flex flex-row justify-between items-start gap-2">
        <div>
          <p className="text-xl font-bold text-gray-900">
            Job Postings For You
          </p>

          <p className="text-sm text-gray-500 mt-1">
            Real listings pulled based on your skills and experience.
          </p>
        </div>

        {started && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
              limitReached
                ? "bg-red-50 text-red-600"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {remaining}/{RATE_LIMIT_MAX} searches left today
          </span>
        )}
      </div>

      {!started && (
        <button
          onClick={handleStart}
          className="primary-button w-fit flex items-center gap-2"
        >
          Find Job Postings
        </button>
      )}

      {started && (
        <>
          {/* Search controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedTitle}
              onChange={(e) => setSelectedTitle(e.target.value)}
              disabled={limitReached}
              className="!w-full sm:!w-auto flex-1 p-3 rounded-2xl inset-shadow focus:outline-none bg-white disabled:opacity-50"
            >
              {titles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="City, state, or 'Remote' (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={limitReached}
              className="flex-1 disabled:opacity-50"
            />

            <button
              onClick={runSearch}
              disabled={loading || limitReached}
              className="primary-button w-full sm:w-fit whitespace-nowrap disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </p>
          )}

          {/* No results */}
          {hasSearched && !loading && !error && jobs.length === 0 && (
            <p className="text-sm text-gray-400">
              No postings found for this search. Try a different title or
              location.
            </p>
          )}

          {/* Results */}
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <a
                key={job.id}
                href={job.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors p-4 flex flex-col gap-1"
              >
                <div className="flex flex-row justify-between items-start gap-2">
                  <p className="font-semibold text-gray-800">{job.title}</p>

                  {formatSalary(job.salaryMin, job.salaryMax) && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                      {formatSalary(job.salaryMin, job.salaryMax)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600">
                  {job.company} · {job.location}
                </p>
              </a>
            ))}
          </div>

          {/* Cross-links to other boards */}
          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
            <p className="text-xs text-gray-400 font-medium">
              Also try searching on
            </p>

            <div className="flex gap-2 flex-wrap">
              <a
                href={buildLinkedInJobUrl(selectedTitle, location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#0A66C2] text-white hover:opacity-90"
              >
                LinkedIn
              </a>

              <a
                href={buildIndeedJobUrl(selectedTitle, location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#003A9B] text-white hover:opacity-90"
              >
                Indeed
              </a>

              <a
                href={buildGoogleJobsUrl(selectedTitle, location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-700 text-white hover:opacity-90"
              >
                Google Jobs
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default JobPostings;
