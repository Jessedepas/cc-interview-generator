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
const DARK_TEXT = "#1A1A1A";
const MID_GRAY = "#666666";

const W = 595.27;
const H = 841.89;
const MARGIN = 42.52;
const CONTENT_W = W - MARGIN * 2;

export async function POST(request: NextRequest) {
  try {
    const scorecard: ScorecardResult = await request.json();
    const pdfBuffer = await generateSummaryPDF(scorecard);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Interview Summary - ${scorecard.candidateName}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Summary PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary PDF" },
      { status: 500 }
    );
  }
}

async function generateSummaryPDF(data: ScorecardResult): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `Interview Summary - ${data.candidateName}`,
        Author: "Cruise Control Group",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // === HEADER ===
    doc.rect(0, 0, W, 80).fill(NAVY);
    doc.rect(0, 80, W, 4).fill(RED);

    doc.font("Helvetica-Bold").fontSize(22).fillColor("white");
    doc.text("INTERVIEW SUMMARY", MARGIN, 18, { width: CONTENT_W - 70, lineBreak: false });

    doc.font("Helvetica").fontSize(12).fillColor(CREAM);
    doc.text(data.candidateName, MARGIN, 44, { lineBreak: false });

    doc.font("Helvetica").fontSize(10).fillColor(CREAM);
    doc.text(`${data.clientName} — ${data.roleName}`, MARGIN, 60, { lineBreak: false });

    if (logoBuffer) {
      doc.image(logoBuffer, W - MARGIN - 50, 12, { width: 45, height: 45 });
    }

    let y = 100;

    // === RESULT BANNER ===
    const resultColor =
      data.result === "STRONG YES" ? "#2E7D32" :
      data.result === "YES" ? NAVY :
      data.result === "MAYBE" ? "#F57F17" : RED;

    doc.rect(MARGIN, y, CONTENT_W, 40).fill(CREAM);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(MID_GRAY);
    doc.text("OVERALL RESULT", MARGIN + 15, y + 6, { lineBreak: false });

    doc.font("Helvetica-Bold").fontSize(18).fillColor(resultColor);
    doc.text(data.result, MARGIN + 15, y + 19, { lineBreak: false });

    doc.font("Helvetica-Bold").fontSize(16).fillColor(NAVY);
    doc.text(`${data.totalScore} / 45`, MARGIN + CONTENT_W - 80, y + 12, { lineBreak: false });
    y += 50;

    // === PILLAR SCORES (visual bar chart style) ===
    y += 5;
    drawSectionHeader(doc, "ASSESSMENT BREAKDOWN", MARGIN, y, CONTENT_W);
    y += 25;

    const pillars = ["COMMUNICATION", "BEHAVIOUR", "SKILL FIT"] as const;
    for (const pillar of pillars) {
      const pillarScores = data.scores.filter((s) => s.pillar === pillar);
      const pillarTotal = pillarScores.reduce((sum, s) => sum + s.score, 0);
      const pillarMax = pillarScores.length * 5;

      // Pillar label and total
      doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY);
      doc.text(pillar, MARGIN + 5, y, { lineBreak: false });
      doc.font("Helvetica").fontSize(9).fillColor(MID_GRAY);
      doc.text(`${pillarTotal} / ${pillarMax}`, MARGIN + CONTENT_W - 50, y, { lineBreak: false });
      y += 16;

      // Individual scores
      for (const score of pillarScores) {
        // Area name
        doc.font("Helvetica").fontSize(9).fillColor(DARK_TEXT);
        doc.text(score.area, MARGIN + 15, y + 2, { lineBreak: false });

        // Score bar
        const barX = MARGIN + 150;
        const barMaxW = CONTENT_W - 165;
        const barW = (score.score / 5) * barMaxW;
        const barColor = score.score >= 4 ? "#2E7D32" : score.score <= 2 ? RED : NAVY;

        doc.rect(barX, y, barMaxW, 14).fill("#F0F0F0");
        doc.rect(barX, y, barW, 14).fill(barColor);

        doc.font("Helvetica-Bold").fontSize(8).fillColor("white");
        doc.text(String(score.score), barX + barW - 16, y + 3, { lineBreak: false });

        y += 18;
      }
      y += 8;
    }

    // === KEY STRENGTHS ===
    y += 5;
    drawSectionHeader(doc, "KEY STRENGTHS", MARGIN, y, CONTENT_W);
    y += 25;

    doc.rect(MARGIN, y, CONTENT_W, 4).fill("#2E7D32");
    y += 8;

    doc.font("Helvetica").fontSize(10).fillColor(DARK_TEXT);
    const strengthsH = doc.heightOfString(data.keyStrengths, { width: CONTENT_W - 20 });
    doc.text(data.keyStrengths, MARGIN + 10, y, { width: CONTENT_W - 20 });
    y += strengthsH + 15;

    // === CONCERNS ===
    if (data.concerns && data.concerns.trim() !== "") {
      drawSectionHeader(doc, "CONCERNS", MARGIN, y, CONTENT_W);
      y += 25;

      doc.rect(MARGIN, y, CONTENT_W, 4).fill(RED);
      y += 8;

      doc.font("Helvetica").fontSize(10).fillColor(DARK_TEXT);
      const concernsH = doc.heightOfString(data.concerns, { width: CONTENT_W - 20 });
      doc.text(data.concerns, MARGIN + 10, y, { width: CONTENT_W - 20 });
      y += concernsH + 15;
    }

    // === RECOMMENDATION ===
    drawSectionHeader(doc, "RECOMMENDATION", MARGIN, y, CONTENT_W);
    y += 25;

    doc.rect(MARGIN, y, CONTENT_W, 4).fill(NAVY);
    y += 8;

    doc.font("Helvetica").fontSize(10).fillColor(DARK_TEXT);
    doc.text(data.recommendation, MARGIN + 10, y, { width: CONTENT_W - 20 });

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

function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number
) {
  doc.rect(x, y, width, 22).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("white");
  doc.text(text, x + 10, y + 6, { width: width - 20, lineBreak: false });
}
