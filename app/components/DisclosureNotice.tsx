import { Link } from "react-router";

const DisclosureNotice = ({ context }: { context: "upload" | "ai" }) => (
  <aside
    className="w-full rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-left"
    aria-label={context === "upload" ? "Privacy notice" : "AI disclosure"}
  >
    <p className="text-sm text-indigo-950 leading-relaxed">
      <span className="font-semibold">
        {context === "upload" ? "Privacy notice: " : "AI-generated content: "}
      </span>
      {context === "upload"
        ? "Your resume and job details are processed by Puter services to store your files and generate AI feedback. Only upload information you are comfortable processing through these services."
        : "Scores, recommendations, rewrites, and cover letters may be incomplete or inaccurate. Review every result and verify all facts before submitting an application."}{" "}
      <Link
        to="/privacy"
        className="font-semibold text-indigo-700 underline underline-offset-2 [text-decoration-skip-ink:none] hover:text-indigo-900"
      >
        Read the Privacy & AI Disclosure
      </Link>
      .
    </p>
  </aside>
);

export default DisclosureNotice;
