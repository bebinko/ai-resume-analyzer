import { useState } from "react";
import { usePuterStore } from "~/lib/puter";

const SavedCoverLetterCard = ({ letter }: { letter: CoverLetterRecord }) => {
  const { fs } = usePuterStore();
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);

  const download = async (format: "pdf" | "docx") => {
    setDownloading(format);
    try {
      const path = format === "pdf" ? letter.pdfPath : letter.docxPath;
      const blob = await fs.read(path);
      if (!blob) throw new Error("File not found");

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `cover-letter-${letter.companyName || letter.id}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <article className="w-full max-w-md rounded-2xl bg-white border border-indigo-100 shadow-md p-6 flex flex-col gap-5 animate-in fade-in duration-500">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
          CL
        </div>
        <div className="min-w-0">
          <h2 className="!text-xl !text-gray-900 font-bold truncate">
            {letter.companyName || "Cover Letter"}
          </h2>
          <p className="text-sm text-gray-500 truncate">
            {letter.jobTitle || "Tailored application"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(letter.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 leading-relaxed">
        <p className="line-clamp-4">
          {letter.coverLetter.greeting} {letter.coverLetter.paragraphs[0]}
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => download("pdf")}
          disabled={downloading !== null}
          className="primary-button w-fit text-sm disabled:opacity-50"
        >
          {downloading === "pdf" ? "Downloading..." : "Download PDF"}
        </button>
        <button
          onClick={() => download("docx")}
          disabled={downloading !== null}
          className="back-button w-fit text-sm disabled:opacity-50"
        >
          {downloading === "docx" ? "Downloading..." : "Download DOCX"}
        </button>
      </div>
    </article>
  );
};

export default SavedCoverLetterCard;
