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
