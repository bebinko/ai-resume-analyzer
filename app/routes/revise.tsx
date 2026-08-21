import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import Navbar from "~/components/Navbar";
import { usePuterStore } from "~/lib/puter";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";

export const meta = () => [
  { title: "Breezume | AI Revisions" },
  { name: "description", content: "Apply AI-powered revisions to your resume" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumedSection {
  heading: string;
  content: string;
}

interface RevisedResume {
  name: string;
  contactLine: string;
  summary?: string;
  sections: ResumedSection[];
  changeLog: string[];
}

// ─── AI prompt ────────────────────────────────────────────────────────────────

const buildRevisionPrompt = (
  feedback: Feedback,
  jobTitle: string,
  jobDescription: string,
) => `
You are an expert resume editor. You have already analyzed a resume and produced structured feedback. 
Now, using the ORIGINAL RESUME (attached as a PDF) and the feedback below, produce a fully revised resume.

FEEDBACK SUMMARY:
- Overall Score: ${feedback.overallScore}/100
- Tone & Style (${feedback.toneAndStyle.score}/100): ${feedback.toneAndStyle.tips.map((t) => t.tip).join("; ")}
- Content (${feedback.content.score}/100): ${feedback.content.tips.map((t) => t.tip).join("; ")}
- Structure (${feedback.structure.score}/100): ${feedback.structure.tips.map((t) => t.tip).join("; ")}
- Skills (${feedback.skills.score}/100): ${feedback.skills.tips.map((t) => t.tip).join("; ")}
- ATS Issues: ${feedback.ATS.tips
  .filter((t) => t.type === "improve")
  .map((t) => t.tip)
  .join("; ")}

TARGET ROLE: ${jobTitle || "Not specified"}
JOB DESCRIPTION: ${jobDescription || "Not provided"}

INSTRUCTIONS:
1. Read the original resume text from the attached PDF carefully.
2. Apply ALL "improve" feedback suggestions.
3. Preserve ALL real facts (names, dates, companies, degrees, actual achievements).
4. Strengthen bullet points with action verbs and quantified results where the original has them or implies them.
5. Tailor language toward the target role and job description if provided.
6. Improve ATS keyword density based on the job description.
7. Return ONLY valid JSON in this exact shape — no markdown, no backticks, no explanation:

{
  "name": "Candidate Full Name",
  "contactLine": "email | phone | linkedin | location",
  "summary": "Optional 2-3 sentence professional summary (omit key if not applicable)",
  "sections": [
    {
      "heading": "EXPERIENCE",
      "content": "Company Name — Job Title | Date Range\\nBullet one\\nBullet two\\n\\nCompany 2 — Title | Date Range\\nBullet"
    },
    {
      "heading": "EDUCATION",
      "content": "University Name — Degree, Field | Year"
    },
    {
      "heading": "SKILLS",
      "content": "Category: skill1, skill2\\nCategory2: skill3"
    }
  ],
  "changeLog": [
    "Strengthened action verbs in Experience section",
    "Added ATS keywords: project management, agile, stakeholder",
    "Reformatted Skills into categories for ATS readability"
  ]
}
`;

// ─── PDF builder (pdf-lib) ─────────────────────────────────────────────────────

async function buildPdf(revised: RevisedResume): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 50;
  const LINE_H = 14;
  const COL_W = PAGE_W - MARGIN * 2;

  const cDark = rgb(0.1, 0.1, 0.17);
  const cMuted = rgb(0.33, 0.33, 0.33);
  const cDivider = rgb(0.82, 0.84, 0.86);
  const cAccent = rgb(0.25, 0.32, 0.71);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const checkY = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  const wrapText = (
    text: string,
    font: typeof fontRegular,
    size: number,
    maxW: number,
  ): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxW) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  const drawText = (
    text: string,
    opts: {
      font?: typeof fontRegular;
      size?: number;
      color?: ReturnType<typeof rgb>;
      indent?: number;
      gap?: number;
    },
  ) => {
    const font = opts.font ?? fontRegular;
    const size = opts.size ?? 10;
    const color = opts.color ?? cMuted;
    const indent = opts.indent ?? 0;
    const gap = opts.gap ?? 3;
    const maxW = COL_W - indent;

    const lines = wrapText(text, font, size, maxW);
    for (const line of lines) {
      checkY(size + gap);
      page.drawText(line, { x: MARGIN + indent, y, size, font, color });
      y -= size + gap;
    }
  };

  const drawDivider = (gap = 8) => {
    checkY(gap * 2);
    y -= gap / 2;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: cDivider,
    });
    y -= gap;
  };

  drawText(revised.name, { font: fontBold, size: 20, color: cDark, gap: 5 });
  drawText(revised.contactLine, { size: 9, color: cMuted, gap: 4 });
  drawDivider(10);

  if (revised.summary) {
    drawText("PROFESSIONAL SUMMARY", {
      font: fontBold,
      size: 9,
      color: cAccent,
      gap: 4,
    });
    drawText(revised.summary, { size: 10, color: cMuted, gap: 4 });
    drawDivider(8);
  }

  for (const section of revised.sections) {
    drawText(section.heading.toUpperCase(), {
      font: fontBold,
      size: 9,
      color: cAccent,
      gap: 5,
    });

    const lines = section.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        y -= 4;
        continue;
      }

      if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
        checkY(LINE_H);
        page.drawText("•", {
          x: MARGIN + 8,
          y,
          size: 10,
          font: fontRegular,
          color: cMuted,
        });
        const bulletText = trimmed.replace(/^[-•]\s*/, "");
        const wrapped = wrapText(bulletText, fontRegular, 10, COL_W - 20);
        for (let i = 0; i < wrapped.length; i++) {
          checkY(LINE_H);
          page.drawText(wrapped[i], {
            x: MARGIN + 20,
            y,
            size: 10,
            font: fontRegular,
            color: cMuted,
          });
          y -= LINE_H;
        }
      } else {
        const isSectionHead = /[|—–]/.test(trimmed);
        drawText(trimmed, {
          font: isSectionHead ? fontBold : fontRegular,
          size: 10,
          color: isSectionHead ? cDark : cMuted,
          gap: isSectionHead ? 2 : 3,
        });
      }
    }
    drawDivider(8);
  }

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}

// ─── Steps UI helper ──────────────────────────────────────────────────────────

const steps = [
  { id: "loading", label: "Loading your resume" },
  { id: "revising", label: "Claude is rewriting your resume" },
  { id: "building", label: "Building revised PDF" },
  { id: "rendering", label: "Rendering preview" },
  { id: "storing", label: "Saving to your dashboard" },
  { id: "done", label: "Done!" },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Revise = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [revisedData, setRevisedData] = useState<RevisedResume | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [changeLog, setChangeLog] = useState<string[]>([]);
  const [revisedResumeId, setRevisedResumeId] = useState<string | null>(null);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/revise/${id}`);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading || !auth.isAuthenticated || hasFetched.current) return;
    hasFetched.current = true;
    runRevision();
  }, [isLoading, auth.isAuthenticated]);

  const runRevision = async () => {
    try {
      // ── Step 0: Load resume metadata ──────────────────────────────────────
      setCurrentStep(0);
      const raw = await kv.get(`resume:${id}`);
      if (!raw)
        throw new Error("Resume not found. Please go back and try again.");
      const data = JSON.parse(raw) as {
        resumePath: string;
        imagePath: string;
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        feedback: Feedback;
      };

      if (!data.feedback) throw new Error("No feedback found for this resume.");

      // ── Step 1: Call Claude to revise ─────────────────────────────────────
      setCurrentStep(1);
      const prompt = buildRevisionPrompt(
        data.feedback,
        data.jobTitle,
        data.jobDescription,
      );

      const AI_TIMEOUT_MS = 60_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "The AI took too long to respond. This may be due to a Puter free-tier rate limit. Please wait a moment and try again.",
              ),
            ),
          AI_TIMEOUT_MS,
        ),
      );

      let result: any;
      try {
        result = await Promise.race([
          ai.feedback(data.resumePath, prompt),
          timeoutPromise,
        ]);
      } catch (aiErr: any) {
        const msg: string = aiErr?.message ?? "";
        if (
          msg.toLowerCase().includes("rate") ||
          msg.toLowerCase().includes("quota") ||
          msg.toLowerCase().includes("limit")
        ) {
          throw new Error(
            "Puter AI rate limit reached. You may have exceeded the free-tier quota. Try again in a few minutes.",
          );
        }
        if (
          msg.toLowerCase().includes("auth") ||
          msg.toLowerCase().includes("unauthorized") ||
          msg.toLowerCase().includes("403")
        ) {
          throw new Error(
            "Puter authentication error. Try signing out and back in, then retry.",
          );
        }
        throw aiErr;
      }

      if (!result)
        throw new Error(
          "The AI returned an empty response. The free-tier quota may be exhausted — please try again shortly.",
        );

      let rawText: string;
      try {
        rawText =
          typeof result.message.content === "string"
            ? result.message.content
            : result.message.content[0].text;
      } catch {
        throw new Error(
          "Unexpected response format from AI. Please try again.",
        );
      }

      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      let revised: RevisedResume;
      try {
        revised = JSON.parse(cleaned);
      } catch {
        throw new Error(
          "The AI response could not be parsed — it may have been interrupted mid-response. Please try again.",
        );
      }

      setRevisedData(revised);
      setChangeLog(revised.changeLog || []);

      // ── Step 2: Build PDF ─────────────────────────────────────────────────
      setCurrentStep(2);
      const blob = await buildPdf(revised);
      setPdfBlob(blob);

      // ── Step 3: Render preview image ──────────────────────────────────────
      setCurrentStep(3);
      const pdfFile = new File([blob], "revised-resume.pdf", {
        type: "application/pdf",
      });
      const imgResult = await convertPdfToImage(pdfFile);
      if (imgResult.file) {
        const url = URL.createObjectURL(imgResult.file);
        setPreviewUrl(url);
      }

      // ── Step 4: Store the revised resume so it shows on the home page ─────
      setCurrentStep(4);
      try {
        const uploadedRevisedResume = await fs.upload([pdfFile]);
        if (!uploadedRevisedResume)
          throw new Error("Failed to upload revised resume PDF.");

        let uploadedRevisedImagePath: string | null = null;
        if (imgResult.file) {
          const uploadedRevisedImage = await fs.upload([imgResult.file]);
          if (uploadedRevisedImage)
            uploadedRevisedImagePath = uploadedRevisedImage.path;
        }

        const newId = generateUUID();
        const revisedRecord: Resume = {
          id: newId,
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          imagePath: uploadedRevisedImagePath ?? data.imagePath,
          resumePath: uploadedRevisedResume.path,
          feedback: data.feedback,
          isRevision: true,
          originalResumeId: id,
        };

        await kv.set(`resume:${newId}`, JSON.stringify(revisedRecord));
        setRevisedResumeId(newId);
      } catch (storeErr) {
        // Don't fail the whole flow if storage fails — the user can still
        // preview/download the revision, they just won't see it saved.
        console.error("Failed to store revised resume:", storeErr);
      }

      setCurrentStep(5);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revised-resume-${id?.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDone = currentStep === 5 && !error;

  return (
    <main className="bg-white min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-10">
          <Link to={`/resume/${id}`} className="back-button mb-4 inline-flex">
            <img src="/icons/back.svg" alt="back" className="w-2.5 h-2.5" />
            <span className="text-gray-800 text-sm font-semibold">
              Back to Review
            </span>
          </Link>
          <h1>AI Resume Revision</h1>
          <h2>
            Claude will rewrite your resume based on the feedback it provided.
          </h2>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 flex flex-col gap-4 max-w-xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-red-700 font-semibold text-lg">
                  Something went wrong
                </p>
                <p className="text-red-600 text-sm mt-1 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                className="primary-button w-fit text-sm"
                onClick={() => {
                  setError(null);
                  setCurrentStep(0);
                  hasFetched.current = false;
                  runRevision();
                }}
              >
                ↺ Retry
              </button>
              <Link to={`/resume/${id}`} className="back-button text-sm">
                ← Back to Review
              </Link>
            </div>
          </div>
        )}

        {!error && !isDone && (
          <div className="flex flex-col items-center gap-8 py-10">
            <img
              src="/images/resume-scan.gif"
              className="w-[220px]"
              alt="scanning"
            />
            <div className="flex flex-col gap-3 w-full max-w-sm">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300 ${
                      i < currentStep
                        ? "bg-green-500 text-white"
                        : i === currentStep
                          ? "bg-blue-500 text-white animate-pulse"
                          : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i < currentStep ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors duration-300 ${
                      i < currentStep
                        ? "text-green-600"
                        : i === currentStep
                          ? "text-blue-600"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isDone && (
          <div className="flex flex-col gap-8 pb-16 animate-in fade-in duration-700">
            <div className="flex flex-row flex-wrap gap-4 items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Revised Resume
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Claude applied {changeLog.length} improvement
                  {changeLog.length !== 1 ? "s" : ""} to your resume.
                  {revisedResumeId && " Saved to your dashboard."}
                </p>
              </div>
              <div className="flex gap-3">
                <Link to={`/resume/${id}`} className="back-button">
                  ← Back to Review
                </Link>
                {revisedResumeId && (
                  <Link
                    to={`/resume/${revisedResumeId}`}
                    className="back-button"
                  >
                    View Saved Revision
                  </Link>
                )}
                <button
                  onClick={handleDownload}
                  className="primary-button w-fit flex items-center gap-2"
                >
                  <img src="/icons/check.svg" alt="" className="w-4 h-4" />
                  Download Revised PDF
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
              <div className="flex-1 min-w-0">
                {previewUrl ? (
                  <div className="gradient-border animate-in fade-in duration-1000">
                    <img
                      src={previewUrl}
                      alt="Revised resume preview"
                      className="w-full h-auto object-contain rounded-2xl"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 h-64 flex items-center justify-center">
                    <p className="text-gray-400">Preview unavailable</p>
                  </div>
                )}
              </div>

              <div className="lg:w-80 flex-shrink-0 flex flex-col gap-4">
                <div className="rounded-2xl shadow-md bg-white p-6 flex flex-col gap-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    What Claude Changed
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {changeLog.map((change, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <img
                            src="/icons/check.svg"
                            alt=""
                            className="w-3 h-3"
                          />
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {change}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={handleDownload}
                  className="primary-button w-full flex items-center justify-center gap-2"
                >
                  Download Revised PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Revise;
