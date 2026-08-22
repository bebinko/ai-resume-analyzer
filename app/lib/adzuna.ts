export interface AdzunaJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  redirectUrl: string;
  salaryMin?: number;
  salaryMax?: number;
  created: string;
}

const APP_ID = import.meta.env.VITE_ADZUNA_APP_ID;
const APP_KEY = import.meta.env.VITE_ADZUNA_APP_KEY;

export async function searchAdzunaJobs({
  query,
  location,
  country = "us",
  resultsPerPage = 8,
}: {
  query: string;
  location?: string;
  country?: string;
  resultsPerPage?: number;
}): Promise<AdzunaJob[]> {
  if (!APP_ID || !APP_KEY) {
    throw new Error(
      "Adzuna API credentials are missing. Add VITE_ADZUNA_APP_ID and VITE_ADZUNA_APP_KEY to your .env file.",
    );
  }

  const params = new URLSearchParams({
    app_id: APP_ID,
    app_key: APP_KEY,
    results_per_page: String(resultsPerPage),
    what: query,
    "content-type": "application/json",
  });

  if (location) {
    params.set("where", location);
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Adzuna API request failed (${response.status}). You may have hit the free-tier rate limit.`,
    );
  }

  const data = await response.json();

  return (data.results || []).map((job: any) => ({
    id: job.id,
    title: job.title,
    company: job.company?.display_name || "Unknown Company",
    location: job.location?.display_name || "Location not specified",
    description: job.description || "",
    redirectUrl: job.redirect_url,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    created: job.created,
  }));
}
