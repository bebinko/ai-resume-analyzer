import { useState } from "react";
import { usePuterStore } from "~/lib/puter";
import { buildScamCheckPrompt } from "~/lib/prompts";
import type { ScamCheckResult } from "~/lib/documentTypes";
import {
  buildCompanySearchUrl,
  buildCompanyLinkedInUrl,
  buildCompanyGlassdoorUrl,
  buildCompanyScamCheckUrl,
} from "~/lib/jobSearchLinks";

const RATE_LIMIT_MAX = 5;

const getRateLimitKey = () => {
  const today = new Date().toISOString().slice(0, 10);
  return `scam-check-usage:${today}`;
};

const riskStyles: Record<ScamCheckResult["riskLevel"], string> = {
  low: "bg-green-50 text-green-700 border-green-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const riskLabel: Record<ScamCheckResult["riskLevel"], string> = {
  low: "Low Risk",
  medium: "Some Concerns",
  high: "High Risk",
};

const JobLegitimacyCheck = ({
  companyName,
  jobTitle,
  jobDescription,
}: {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
}) => {
  const { ai, kv } = usePuterStore();

  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScamCheckResult | null>(null);
  const [searchesUsed, setSearchesUsed] = useState(0);

  if (!companyName && !jobDescription) return null;

  const loadUsage = async () => {
    const raw = await kv.get(getRateLimitKey());
    setSearchesUsed(raw ? parseInt(raw, 10) : 0);
  };

  const incrementUsage = async () => {
    const key = getRateLimitKey();
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;

    await kv.set(key, String(count + 1));
    setSearchesUsed(count + 1);
  };

  const handleStart = async () => {
    setStarted(true);
    await loadUsage();
  };

  const runCheck = async () => {
    const raw = await kv.get(getRateLimitKey());
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= RATE_LIMIT_MAX) {
      setError(
        `You've reached today's limit of ${RATE_LIMIT_MAX} checks. Try again tomorrow, or use the manual verification links below.`,
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const prompt = buildScamCheckPrompt(
        companyName,
        jobTitle,
        jobDescription,
      );

      const response = await ai.chat(prompt);

      if (!response) {
        throw new Error("The AI returned an empty response. Please try again.");
      }

      const rawText: string =
        typeof response.message.content === "string"
          ? response.message.content
          : response.message.content[0].text;

      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const parsed: ScamCheckResult = JSON.parse(cleaned);

      setResult(parsed);
      await incrementUsage();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong checking this posting.",
      );
    } finally {
      setLoading(false);
    }
  };

  const remaining = Math.max(RATE_LIMIT_MAX - searchesUsed, 0);
  const limitReached = remaining === 0;

  return (
    <div className="rounded-2xl bg-white shadow-md p-6 flex flex-col gap-4">
      <div className="flex flex-row justify-between items-start gap-2">
        <div>
          <p className="text-xl font-bold text-gray-900">
            Is This Job Posting Legit?
          </p>

          <p className="text-sm text-gray-500 mt-1">
            Scan for common red flags associated with fake job postings.
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
            {remaining}/{RATE_LIMIT_MAX} checks left today
          </span>
        )}
      </div>

      {!started && (
        <button onClick={handleStart} className="primary-button w-fit">
          Check This Job Posting
        </button>
      )}

      {started && !result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            Claude will scan the company name and job description you provided
            for common scam warning signs.
          </p>

          <button
            onClick={runCheck}
            disabled={loading || limitReached}
            className="primary-button w-fit disabled:opacity-50"
          >
            {loading ? "Scanning..." : "Run Scan"}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div
            className={`rounded-xl border p-4 flex flex-col gap-2 ${
              riskStyles[result.riskLevel]
            }`}
          >
            <p className="font-bold">{riskLabel[result.riskLevel]}</p>

            <p className="text-sm">{result.recommendation}</p>
          </div>

          {result.flags.length > 0 && (
            <div className="flex flex-col gap-3">
              {result.flags.map((flag, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex flex-col gap-1"
                >
                  <p className="font-semibold text-yellow-800 text-sm">
                    {flag.signal}
                  </p>

                  <p className="text-sm text-yellow-700">{flag.explanation}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400">
            This is an automated heuristic check, not a guarantee. Always verify
            independently before sharing personal information.
          </p>
        </div>
      )}

      {/* Manual verification links — always shown */}
      <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
        <p className="text-xs text-gray-400 font-medium">
          Verify the company yourself
        </p>

        <div className="flex gap-2 flex-wrap">
          <a
            href={buildCompanySearchUrl(companyName)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-700 text-white hover:opacity-90"
          >
            Official Site
          </a>

          <a
            href={buildCompanyLinkedInUrl(companyName)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#0A66C2] text-white hover:opacity-90"
          >
            LinkedIn
          </a>

          <a
            href={buildCompanyGlassdoorUrl(companyName)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-700 text-white hover:opacity-90"
          >
            Glassdoor
          </a>

          <a
            href={buildCompanyScamCheckUrl(companyName)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-600 text-white hover:opacity-90"
          >
            Scam Reports
          </a>
        </div>
      </div>
    </div>
  );
};

export default JobLegitimacyCheck;
