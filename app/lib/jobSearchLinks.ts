export const buildLinkedInJobUrl = (title: string, location?: string) =>
  `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}${
    location ? `&location=${encodeURIComponent(location)}` : ""
  }`;

export const buildIndeedJobUrl = (title: string, location?: string) =>
  `https://www.indeed.com/jobs?q=${encodeURIComponent(title)}${
    location ? `&l=${encodeURIComponent(location)}` : ""
  }`;

export const buildGoogleJobsUrl = (title: string, location?: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(
    `${title} jobs${location ? ` near ${location}` : ""}`,
  )}&ibp=htl;jobs`;

export const buildCompanySearchUrl = (companyName: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`"${companyName}" official website`)}`;

export const buildCompanyLinkedInUrl = (companyName: string) =>
  `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;

export const buildCompanyGlassdoorUrl = (companyName: string) =>
  `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(companyName)}`;

export const buildCompanyScamCheckUrl = (companyName: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`"${companyName}" scam reviews complaints`)}`;

export const buildCompanyIndeedUrl = (companyName: string) =>
  `https://www.indeed.com/cmp/${encodeURIComponent(
    companyName.trim().replace(/\s+/g, "-"),
  )}/reviews`;
