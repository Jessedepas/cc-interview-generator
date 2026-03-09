import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { ProfileData } from "@/lib/profile-types";

// Pre-load logo at module level
let logoBuffer: Buffer | null = null;
try {
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
  }
} catch {
  // Logo not available — will skip in PDF
}

// Brand colors
const NAVY = "#0B1A3B";
const RED = "#C0503C";
const CREAM = "#F2E6D9";
const DARK_TEXT = "#1A1A1A";
const MID_GRAY = "#666666";
const SEPARATOR = "#E0E0E0";

// Page setup (A4 in points: 595.27 x 841.89)
const W = 595.27;
const H = 841.89;
const MARGIN = 42.52; // 15mm
const LEFT_COL_W = 195;
const RIGHT_COL_X = MARGIN + LEFT_COL_W + 15;
const RIGHT_COL_W = W - RIGHT_COL_X - MARGIN;

export async function POST(request: NextRequest) {
  try {
    const profileData: ProfileData = await request.json();

    const pdfBuffer = await generateProfilePDF(profileData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${profileData.candidateName} - Cruise Control Profile.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

async function generateProfilePDF(data: ProfileData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
      info: {
        Title: `${data.candidateName} - Cruise Control Group Remote Professional Profile`,
        Author: "Cruise Control Group",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // === DRAW HEADER ===
    const headerH = 85;
    const stripeH = 4;

    // Navy header bar
    doc.rect(0, 0, W, headerH).fill(NAVY);

    // Red accent stripe
    doc.rect(0, headerH, W, stripeH).fill(RED);

    // Name
    doc.font("Helvetica-Bold").fontSize(28).fillColor("white");
    doc.text(data.candidateName.toUpperCase(), MARGIN + 5, 25, {
      width: W - MARGIN * 2 - 80,
      lineBreak: false,
    });

    // Subtitle
    doc.font("Helvetica").fontSize(13).fillColor(CREAM);
    doc.text(data.subtitle.toUpperCase(), MARGIN + 5, 55, {
      lineBreak: false,
    });

    // Badge (e.g. CPA)
    if (data.badge) {
      const badgeX = MARGIN + 195;
      const badgeY = 52;
      const badgeW = 35;
      const badgeH2 = 14;
      doc
        .roundedRect(badgeX, badgeY, badgeW, badgeH2, 3)
        .fill(RED);
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("white");
      const badgeTextW = doc.widthOfString(data.badge);
      doc.text(data.badge, badgeX + (badgeW - badgeTextW) / 2, badgeY + 3, {
        lineBreak: false,
      });
    }

    // Logo
    if (logoBuffer) {
      doc.image(logoBuffer, W - MARGIN - 60, 10, {
        width: 55,
        height: 55,
      });
      // Company name under logo
      doc.font("Helvetica").fontSize(7.5).fillColor(CREAM);
      const ccText = "CRUISE CONTROL";
      const ccW = doc.widthOfString(ccText);
      doc.text(ccText, W - MARGIN - 32 - ccW / 2, 68, { lineBreak: false });
      const grpText = "GROUP";
      const grpW = doc.widthOfString(grpText);
      doc.text(grpText, W - MARGIN - 32 - grpW / 2, 76, { lineBreak: false });
    }

    const contentTop = headerH + stripeH + 10;

    // === LEFT COLUMN ===
    let leftY = contentTop;

    // About Me
    leftY = drawSectionHeader(doc, "About Me", MARGIN, leftY, LEFT_COL_W, NAVY);
    leftY += 8;
    doc.font("Helvetica").fontSize(8).fillColor(DARK_TEXT);
    const aboutH = doc.heightOfString(data.aboutMe, {
      width: LEFT_COL_W - 10,
    });
    doc.text(data.aboutMe, MARGIN + 5, leftY, { width: LEFT_COL_W - 10 });
    leftY += aboutH + 5;

    // Education
    if (data.education.length > 0) {
      leftY += 10;
      leftY = drawSectionHeader(doc, "Education", MARGIN, leftY, LEFT_COL_W, NAVY);
      leftY += 8;

      for (const edu of data.education) {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(DARK_TEXT);
        const degreeH = doc.heightOfString(edu.degree.toUpperCase(), {
          width: LEFT_COL_W - 10,
        });
        doc.text(edu.degree.toUpperCase(), MARGIN + 5, leftY, {
          width: LEFT_COL_W - 10,
        });
        leftY += degreeH + 3;

        doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY);
        doc.text(edu.institution, MARGIN + 5, leftY, { lineBreak: false });
        leftY += 12;
        if (edu.details) {
          doc.text(edu.details, MARGIN + 5, leftY, { lineBreak: false });
          leftY += 12;
        }
        leftY += 4;
      }
    }

    // Certifications
    if (data.certifications.length > 0) {
      leftY += 6;
      leftY = drawSectionHeader(
        doc,
        "Certifications",
        MARGIN,
        leftY,
        LEFT_COL_W,
        NAVY
      );
      leftY += 8;
      leftY = drawBulletList(
        doc,
        data.certifications,
        MARGIN + 5,
        leftY,
        LEFT_COL_W - 10,
        8,
        RED
      );
    }

    // Skills & Systems
    if (data.skills.length > 0 || data.systems.length > 0) {
      leftY += 6;
      leftY = drawSectionHeader(
        doc,
        "Skills & Systems",
        MARGIN,
        leftY,
        LEFT_COL_W,
        NAVY
      );
      leftY += 8;

      if (data.skills.length > 0) {
        leftY = drawBulletList(
          doc,
          data.skills,
          MARGIN + 5,
          leftY,
          LEFT_COL_W - 10,
          7.5,
          RED
        );
      }

      if (data.systems.length > 0) {
        leftY += 8;
        doc.font("Helvetica-Bold").fontSize(8).fillColor(NAVY);
        doc.text("Systems:", MARGIN + 5, leftY, { lineBreak: false });
        leftY += 14;
        leftY = drawBulletList(
          doc,
          data.systems,
          MARGIN + 5,
          leftY,
          LEFT_COL_W - 10,
          7.5,
          NAVY
        );
      }
    }

    // Awards
    if (data.awards && data.awards.length > 0) {
      leftY += 6;
      leftY = drawSectionHeader(doc, "Awards", MARGIN, leftY, LEFT_COL_W, NAVY);
      leftY += 8;
      for (const award of data.awards) {
        doc.font("Helvetica").fontSize(7.5).fillColor(DARK_TEXT);
        const awardH = doc.heightOfString(award, { width: LEFT_COL_W - 10 });
        doc.text(award, MARGIN + 5, leftY, { width: LEFT_COL_W - 10 });
        leftY += awardH + 4;
      }
    }

    // === RIGHT COLUMN ===
    let rightY = contentTop;
    rightY = drawSectionHeader(
      doc,
      "Working Experience",
      RIGHT_COL_X,
      rightY,
      RIGHT_COL_W,
      RED
    );
    rightY += 10;

    for (const exp of data.experience) {
      // Company name
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(NAVY);
      doc.text(exp.company.toUpperCase(), RIGHT_COL_X + 2, rightY, {
        width: RIGHT_COL_W - 10,
        lineBreak: false,
      });
      rightY += 14;

      if (exp.location) {
        doc.font("Helvetica").fontSize(7.5).fillColor(MID_GRAY);
        doc.text(exp.location, RIGHT_COL_X + 2, rightY, { lineBreak: false });
        rightY += 13;
      }

      for (const role of exp.roles) {
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(DARK_TEXT);
        doc.text(role.title, RIGHT_COL_X + 2, rightY, {
          width: RIGHT_COL_W - 10,
          lineBreak: false,
        });
        rightY += 12;

        doc.font("Helvetica").fontSize(7.5).fillColor(RED);
        doc.text(role.dates, RIGHT_COL_X + 2, rightY, { lineBreak: false });
        rightY += 12;

        if (role.bullets.length > 0) {
          rightY = drawBulletList(
            doc,
            role.bullets,
            RIGHT_COL_X + 2,
            rightY,
            RIGHT_COL_W - 10,
            7.5,
            RED
          );
        }
        rightY += 6;
      }

      // Separator line
      doc
        .moveTo(RIGHT_COL_X, rightY)
        .lineTo(RIGHT_COL_X + RIGHT_COL_W, rightY)
        .strokeColor(SEPARATOR)
        .lineWidth(0.5)
        .stroke();
      rightY += 8;

      // Check if we're running out of page space — if so, add a new page
      if (rightY > H - 60) {
        // Draw footer on current page before moving to next
        drawFooter(doc, W, H);
        doc.addPage({ size: "A4", margins: { top: 0, bottom: 0, left: 0, right: 0 } });
        rightY = MARGIN + 10;
      }
    }

    // Vertical separator between columns (on first page only)
    const sepX = MARGIN + LEFT_COL_W + 7;
    // Go back to first page for the separator
    doc.switchToPage(0);
    doc
      .moveTo(sepX, contentTop - 5)
      .lineTo(sepX, H - 30)
      .strokeColor(SEPARATOR)
      .lineWidth(0.5)
      .stroke();

    // Draw footer on all pages
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      drawFooter(doc, W, H);
    }

    doc.end();
  });
}

function drawSectionHeader(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  bgColor: string
): number {
  const h = 20;
  doc.rect(x, y, width, h).fill(bgColor);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("white");
  doc.text(text.toUpperCase(), x + 8, y + 5, {
    width: width - 16,
    lineBreak: false,
  });
  return y + h;
}

function drawBulletList(
  doc: PDFKit.PDFDocument,
  items: string[],
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  bulletColor: string
): number {
  for (const item of items) {
    // Bullet dot
    doc.circle(x + 4, y + 4, 2).fill(bulletColor);

    // Text
    doc.font("Helvetica").fontSize(fontSize).fillColor(DARK_TEXT);
    const textH = doc.heightOfString(item, { width: maxWidth - 15 });
    doc.text(item, x + 12, y, { width: maxWidth - 15 });
    y += textH + 3;
  }
  return y;
}

function drawFooter(doc: PDFKit.PDFDocument, w: number, h: number) {
  const footerH = 25;
  // Navy bar
  doc.rect(0, h - footerH, w, footerH).fill(NAVY);
  // Red accent
  doc.rect(0, h - footerH - 2, w, 2).fill(RED);
  // Footer text
  doc.font("Helvetica").fontSize(7).fillColor(CREAM);
  const footerText =
    "Cruise Control Group Pty Ltd  |  ABN 21 356 633 798  |  cruisecontrolgroup.com.au";
  const footerW = doc.widthOfString(footerText);
  doc.text(footerText, (w - footerW) / 2, h - footerH + 9, {
    lineBreak: false,
  });
}
