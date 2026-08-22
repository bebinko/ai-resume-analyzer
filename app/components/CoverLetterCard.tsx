import type { CoverLetterData } from "~/lib/documentTypes";

interface CoverLetterCardProps {
  coverLetterData: CoverLetterData | null;
  candidateName: string;
  setCandidateName: (v: string) => void;
  candidateContact: string;
  setCandidateContact: (v: string) => void;
  hasRevisedData: boolean;
  displayName: string;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onDownloadPdf: () => void;
  onDownloadDocx: () => void;
}

const CoverLetterCard = ({
  coverLetterData,
  candidateName,
  setCandidateName,
  candidateContact,
  setCandidateContact,
  hasRevisedData,
  displayName,
  isGenerating,
  error,
  onGenerate,
  onDownloadPdf,
  onDownloadDocx,
}: CoverLetterCardProps) => {
  const canGenerate =
    hasRevisedData || (candidateName.trim() && candidateContact.trim());

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-pink-50 border border-indigo-100 shadow-md p-6 flex flex-col gap-4">
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
              d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
            />
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">Cover Letter</p>
          <p className="text-sm text-gray-500">
            Let Claude write a tailored cover letter for this role.
          </p>
        </div>
      </div>

      {!coverLetterData && (
        <>
          <p className="text-sm text-gray-600 leading-relaxed">
            Claude will pull real details from your resume and match them
            against the job description to write a cover letter ready to
            download as a PDF or Word document.
          </p>

          {!hasRevisedData && (
            <div className="flex flex-col gap-3 max-w-sm">
              <div className="form-div">
                <label htmlFor="candidate-name" className="text-sm">
                  Your Full Name
                </label>
                <input
                  type="text"
                  id="candidate-name"
                  placeholder="Jane Doe"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="form-div">
                <label htmlFor="candidate-contact" className="text-sm">
                  Contact Line
                </label>
                <input
                  type="text"
                  id="candidate-contact"
                  placeholder="jane@email.com | (555) 123-4567 | linkedin.com/in/janedoe"
                  value={candidateContact}
                  onChange={(e) => setCandidateContact(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
          )}

          <button
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
            className="primary-button w-fit flex items-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? "Writing your cover letter..."
              : "Generate Cover Letter"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </>
      )}

      {coverLetterData && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4 text-sm text-gray-700 leading-relaxed max-h-96 overflow-y-auto">
            <p>{coverLetterData.greeting}</p>
            {coverLetterData.paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <p>{coverLetterData.closing}</p>
            <p className="font-semibold">{displayName}</p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={onDownloadPdf}
              className="primary-button w-fit flex items-center gap-2 text-sm"
            >
              Download as PDF
            </button>
            <button
              onClick={onDownloadDocx}
              className="back-button w-fit flex items-center gap-2 text-sm"
            >
              Download as Word (.docx)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverLetterCard;
