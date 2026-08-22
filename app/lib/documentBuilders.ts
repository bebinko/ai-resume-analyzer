import type { RevisedResume, CoverLetterData } from "./documentTypes";

// ─── Resume PDF builder (pdf-lib) ─────────────────────────────────────────────

export async function buildPdf(revised: RevisedResume): Promise<Blob> {
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

// ─── Cover letter PDF builder (pdf-lib) ───────────────────────────────────────

export async function buildCoverLetterPdf(
  coverLetter: CoverLetterData,
  candidateName: string,
  contactLine: string,
): Promise<Blob> {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 60;
  const COL_W = PAGE_W - MARGIN * 2;

  const cDark = rgb(0.1, 0.1, 0.17);
  const cMuted = rgb(0.25, 0.25, 0.28);

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

  const drawParagraph = (
    text: string,
    size = 11,
    gap = 6,
    font = fontRegular,
  ) => {
    const lines = wrapText(text, font, size, COL_W);
    for (const line of lines) {
      checkY(size + 4);
      page.drawText(line, { x: MARGIN, y, size, font, color: cMuted });
      y -= size + 4;
    }
    y -= gap;
  };

  page.drawText(candidateName, {
    x: MARGIN,
    y,
    size: 16,
    font: fontBold,
    color: cDark,
  });
  y -= 20;
  page.drawText(contactLine, {
    x: MARGIN,
    y,
    size: 9,
    font: fontRegular,
    color: cMuted,
  });
  y -= 30;

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(today, {
    x: MARGIN,
    y,
    size: 10,
    font: fontRegular,
    color: cMuted,
  });
  y -= 30;

  drawParagraph(coverLetter.greeting, 11, 12, fontRegular);

  for (const para of coverLetter.paragraphs) {
    drawParagraph(para, 11, 12);
  }

  drawParagraph(coverLetter.closing, 11, 4);
  page.drawText(candidateName, {
    x: MARGIN,
    y,
    size: 11,
    font: fontRegular,
    color: cMuted,
  });

  const pdfBytes = await doc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}

// ─── Cover letter Word doc builder (docx) ─────────────────────────────────────

export async function buildCoverLetterDocx(
  coverLetter: CoverLetterData,
  candidateName: string,
  contactLine: string,
): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import("docx");

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: candidateName, bold: true, size: 32 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: contactLine, size: 18, color: "555555" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: today }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: coverLetter.greeting }),
          new Paragraph({ text: "" }),
          ...coverLetter.paragraphs.flatMap((para) => [
            new Paragraph({ text: para }),
            new Paragraph({ text: "" }),
          ]),
          new Paragraph({ text: coverLetter.closing }),
          new Paragraph({ text: candidateName }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
