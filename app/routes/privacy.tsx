import { Link } from "react-router";
import Navbar from "~/components/Navbar";

export const meta = () => [
  { title: "Breezume | Privacy & AI Disclosure" },
  {
    name: "description",
    content: "How Breezume handles resume data and uses artificial intelligence",
  },
];

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="flex flex-col gap-3">
    <h2 className="!text-2xl !text-gray-900 font-bold">{title}</h2>
    <div className="text-sm sm:text-base text-gray-600 leading-7 flex flex-col gap-3">
      {children}
    </div>
  </section>
);

const Privacy = () => (
  <main className="bg-[url('/images/bg-main.png')] bg-cover min-h-screen">
    <Navbar />
    <div className="w-full max-w-4xl mx-auto px-4 py-16">
      <article className="rounded-2xl bg-white/95 border border-indigo-100 shadow-lg p-6 sm:p-10 flex flex-col gap-9">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-indigo-600">
            Last updated August 28, 2026
          </p>
          <h1 className="!text-4xl sm:!text-5xl">Privacy & AI Disclosure</h1>
          <p className="text-gray-600 leading-7">
            Breezume is a personal portfolio project that helps users analyze
            and tailor job-application documents. This page explains what data
            the application processes and the limitations of its AI features.
          </p>
        </header>

        <Section title="Information Breezume processes">
          <p>
            Breezume processes the resume PDFs you upload, generated document
            files, preview images, company names, job titles, job descriptions,
            optional contact information, AI feedback, and saved cover letters.
            Puter also provides the account information needed to authenticate
            you and associate saved documents with your account.
          </p>
          <p>
            Resumes often contain sensitive personal information. Remove
            anything you do not want processed before uploading a file.
          </p>
        </Section>

        <Section title="How information is used">
          <p>
            Your information is used to store and display your documents,
            calculate resume and ATS feedback, suggest relevant job titles,
            create revisions and cover letters, regrade revised resumes, and
            evaluate job descriptions for common scam warning signs.
          </p>
          <p>
            Breezume does not intentionally sell your resume or use it to make
            employment decisions. It is an applicant-assistance tool, not an
            employer or recruiting service.
          </p>
        </Section>

        <Section title="Services involved">
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              <strong>Puter:</strong> authentication, per-user file storage,
              key-value records, and AI requests. AI requests may be handled by
              the model provider made available through Puter.
            </li>
            <li>
              <strong>Adzuna:</strong> job-search queries. Breezume sends the
              selected job title and optional location, not the uploaded resume.
            </li>
            <li>
              <strong>Google Fonts:</strong> the browser may request font files
              when pages load.
            </li>
          </ul>
          <p>
            These services operate under their own privacy terms and data
            practices. Do not use Breezume if you are uncomfortable with those
            services processing the information described above.
          </p>
        </Section>

        <Section title="Storage, retention, and deletion">
          <p>
            Saved resumes, previews, generated Word documents, cover letters,
            and analysis records remain associated with your Puter account until
            you delete them or the service removes them under its own policies.
            You can delete selected resumes and cover letters from Settings.
          </p>
          <p>
            Deletion requests remove Breezume's stored files and records. Copies
            already downloaded to your device are not affected, and third-party
            providers may retain limited information as described by their own
            policies or legal obligations.
          </p>
        </Section>

        <Section title="AI disclosure and limitations">
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>Resume and ATS scores are estimates, not official employer scores.</li>
            <li>
              Suggested edits and generated documents may contain mistakes,
              unsupported claims, or altered facts.
            </li>
            <li>
              Job-title suggestions and job matches do not guarantee eligibility,
              interviews, or employment.
            </li>
            <li>
              The job-legitimacy checker looks for warning signs but cannot prove
              that a posting or company is genuine or fraudulent.
            </li>
          </ul>
          <p>
            Carefully review every generated document. Confirm names, dates,
            employers, education, skills, metrics, and contact details before
            sending an application. Independently research employers before
            providing personal information or money.
          </p>
        </Section>

        <Section title="Security and your choices">
          <p>
            No online system can guarantee absolute security. Use a strong Puter
            account, sign out on shared devices, avoid uploading unnecessary
            sensitive identifiers, and delete documents you no longer need.
          </p>
          <p>
            By uploading a resume or using an AI feature, you acknowledge that
            you have read this disclosure and understand how the feature works.
          </p>
        </Section>

        <div className="border-t border-gray-100 pt-6">
          <Link to="/" className="back-button w-fit hover:bg-gray-50">
            ← Back to Breezume
          </Link>
        </div>
      </article>
    </div>
  </main>
);

export default Privacy;
