import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { ScorecardResult } from "@/lib/scorecard-types";

// Pre-load logo
let logoBuffer: Buffer | null = null;
try {
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
  }
} catch {
  // Logo not available
}

const NAVY = "#0B1A3B";
const RED = "#C0503C";
const CREAM = "#F2E6D9";
const LIGHT_BLUE = "#E8F0FE";
const DARK_TEXT = "#1A1A1A";
const MID_GRAY = "#666666";

const W = 595.27;
const H = 841.89;
const MARGIN = 42.52;
const CONTENT_W = W - MARGIN * 2;

export async function POST(request: NextRequest) {
  try {
    const scorecard: ScorecardResult = await request.json();
    const pdfBuffer = await generateScorecardPDF(scorecard);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Interview Scorecard - ${scorecard.candidateName}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Scorecard PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate scorecard PDF" },
      { status: 500 }
    );
  }
}

async function generateScorecardPDF(data: ScorecardResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `Interview Scorecard - ${data.candidateName}`,
        Author: "Cruise Control Group",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = MARGIN;

    // === HEADER ===
    doc.rect(0, 0, W, 70).fill(NAVY);
    doc.rect(0, 70, W, 4).fill(RED);

    doc.font("Helvetica-Bold").fontSize(20).fillColor("white");
    doc.text("INTERVIEW SCORECARD", MARGIN, 20, { width: CONTENT_W - 70, lineBreak: false });

    doc.font("Helvetica").fontSize(11).fillColor(CREAM);
    doc.text(
      `${data.candidateName} — ${data.clientName} ${data.roleName}`,
      MARGIN,
      46,
      { width: CONTENT_W - 70, lineBreak: false }
    );

    if (logoBuffer) {
      doc.image(logoBuffer, W - MARGIN - 45, 10, { width: 40, height: 40 });
    }

    y = 90;

    // === SCORING TABLE ===
    const colNum = MARGIN;
    const colArea = MARGIN + 30;
    const colScore = MARGIN + CONTENT_W - 110;
    const colNotes = MARGIN + CONTENT_W - 75;
    const areaW = colScore - colArea - 10;
    const notesW = MARGIN + CONTENT_W - colNotes;

    // Table header
    doc.rect(MARGIN, y, CONTENT_W, 22).fill(NAVY);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("white");
    doc.text("#", colNum + 5, y + 6, { lineBreak: false });
    doc.text("Assessment Area", colArea, y + 6, { lineBreak: false });
    doc.text("Score", colScore, y + 6, { lineBreak: false });
    doc.text("Notes", colNotes, y + 6, { lineBreak: false });
    y += 22;

    let currentPillar = "";
    for (let i = 0; i < data.scores.length; i++) {
      const score = data.scores[i];

      // Pillar header
      if (score.pillar !== currentPillar) {
        currentPillar = score.pillar;
        doc.rect(MARGIN, y, CONTENT_W, 18).fill("#E5E5E5");
        doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
        doc.text(currentPillar, colArea, y + 4, { lineBreak: false });
        y += 18;
      }

      // Score row
      const notesH = doc.font("Helvetica").fontSize(8).heightOfString(score.notes, { width: notesW - 5 });
      const rowH = Math.max(24, notesH + 10);

      // Alternating row bg
      if (i % 2 === 0) {
        doc.rect(MARGIN, y, CONTENT_W, rowH).fill("#FAFAFA");
      }

      // Bottom border
      doc.moveTo(MARGIN, y + rowH).lineTo(MARGIN + CONTENT_W, y + rowH).strokeColor("#E0E0E0").lineWidth(0.5).stroke();

      doc.font("Helvetica").fontSize(9).fillColor(DARK_TEXT);
      doc.text(String(i + 1), colNum + 8, y + 7, { lineBreak: false });

      doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK_TEXT);
      doc.text(score.area, colArea, y + 7, { width: areaW, lineBreak: false });

      // Score with color
      const scoreColor = score.score >= 4 ? "#2E7D32" : score.score <= 2 ? RED : NAVY;
      doc.font("Helvetica-Bold").fontSize(12).fillColor(scoreColor);
      doc.text(String(score.score), colScore + 5, y + 5, { lineBreak: false });

      doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY);
      doc.text(score.notes, colNotes, y + 5, { width: notesW - 5 });

      y += rowH;
    }

    // === TOTAL & RESULT ===
    y += 5;
    doc.rect(MARGIN, y, CONTENT_W * 0.6, 30).fill(NAVY);
    doc.rect(MARGIN + CONTENT_W * 0.6, y, CONTENT_W * 0.4, 30).fill(CREAM);

    doc.font("Helvetica-Bold").fontSize(12).fillColor("white");
    doc.text("TOTAL SCORE", MARGIN + 10, y + 8, { lineBreak: false });
    doc.text(`${data.totalScore} / 45`, MARGIN + CONTENT_W * 0.6 - 80, y + 8, { lineBreak: false });

    const resultColor =
      data.result === "STRONG YES" ? "#2E7D32" :
      data.result === "YES" ? NAVY :
      data.result === "MAYBE" ? "#F57F17" : RED;
    doc.font("Helvetica-Bold").fontSize(14).fillColor(resultColor);
    doc.text(data.result, MARGIN + CONTENT_W * 0.6 + 15, y + 7, { lineBreak: false });
    y += 35;

    // === GUT CHECK ===
    y += 5;
    doc.rect(MARGIN, y, CONTENT_W, 20).fill(NAVY);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("white");
    doc.text("GUT CHECK", MARGIN + 10, y + 5, { lineBreak: false });
    y += 20;

    doc.rect(MARGIN, y, CONTENT_W, 28).fill(LIGHT_BLUE);
    doc.font("Helvetica").fontSize(9).fillColor(DARK_TEXT);
    doc.text(`"Would I put this person in the role tomorrow?" — ${data.gutCheck}`, MARGIN + 10, y + 8, {
      width: CONTENT_W - 20,
    });
    y += 32;

    // === OVERALL NOTES ===
    y += 5;
    doc.rect(MARGIN, y, CONTENT_W, 20).fill(NAVY);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("white");
    doc.text("OVERALL NOTES", MARGIN + 10, y + 5, { lineBreak: false });
    y += 20;

    const sections = [
      { label: "Key Strengths", value: data.keyStrengths },
      { label: "Concerns", value: data.concerns },
      { label: "Recommendation", value: data.recommendation },
    ];

    for (const section of sections) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
      doc.text(section.label, MARGIN + 5, y + 5, { lineBreak: false });
      y += 16;

      const valueH = doc.font("Helvetica").fontSize(9).heightOfString(section.value, { width: CONTENT_W - 20 });
      doc.rect(MARGIN, y, CONTENT_W, valueH + 10).fill(LIGHT_BLUE);
      doc.fillColor(DARK_TEXT);
      doc.text(section.value, MARGIN + 10, y + 5, { width: CONTENT_W - 20 });
      y += valueH + 15;
    }

    // === FOOTER on all pages ===
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.rect(0, H - 25, W, 25).fill(NAVY);
      doc.rect(0, H - 27, W, 2).fill(RED);
      doc.font("Helvetica").fontSize(7).fillColor(CREAM);
      const footerText = "Cruise Control Group Pty Ltd  |  ABN 21 356 633 798  |  cruisecontrolgroup.com.au";
      const footerW = doc.widthOfString(footerText);
      doc.text(footerText, (W - footerW) / 2, H - 16, { lineBreak: false });
    }

    doc.end();
  });
}
