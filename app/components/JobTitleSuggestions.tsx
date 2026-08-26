const buildLinkedInUrl = (title: string) =>
  `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title)}`;

const buildIndeedUrl = (title: string) =>
  `https://www.indeed.com/jobs?q=${encodeURIComponent(title)}`;

const JobTitleSuggestions = ({ titles }: { titles: string[] }) => {
  // Older resumes analyzed before suggestedJobTitles was added to the AI
  // prompt won't have this field — render nothing rather than an empty card.
  if (!titles || titles.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-md p-6 flex flex-col gap-4">
      <div>
        <p className="text-xl font-bold text-gray-900">
          Job Titles You'd Fit Well
        </p>

        <p className="text-sm text-gray-500 mt-1">
          Based on your skills and experience, try searching these roles.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {titles.map((title, i) => (
          <div
            key={i}
            className="flex flex-row items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3"
          >
            <p className="font-semibold text-gray-800">{title}</p>

            <div className="flex gap-2 flex-shrink-0">
              <a
                href={buildLinkedInUrl(title)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#0A66C2] text-white hover:opacity-90 transition-opacity"
              >
                LinkedIn
              </a>

              <a
                href={buildIndeedUrl(title)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#003A9B] text-white hover:opacity-90 transition-opacity"
              >
                Indeed
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobTitleSuggestions;
