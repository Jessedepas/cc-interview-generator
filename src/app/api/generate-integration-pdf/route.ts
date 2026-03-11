import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { IntegrationQuestionnaire } from "@/lib/onboarding-types";

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
const LIGHT_BG = "#F7F5F2";

// Page setup (A4)
const W = 595.27;
const H = 841.89;
const MARGIN = 42.52;
const CONTENT_W = W - MARGIN * 2;
const FOOTER_H = 25;

export async function POST(request: NextRequest) {
  try {
    const data: IntegrationQuestionnaire = await request.json();
    const pdfBuffer = await generateIntegrationPDF(data);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${data.clientName} - ${data.rpName} Integration Summary.pdf"`,
      },
    });
  } catch (error) {
    console.error("Integration PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

async function generateIntegrationPDF(
  data: IntegrationQuestionnaire
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: FOOTER_H + 15, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `${data.clientName} - ${data.rpName} Integration Meeting Summary`,
        Author: "Cruise Control Group",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = MARGIN;

    // === HEADER ===
    const headerH = 70;
    doc.rect(0, 0, W, headerH).fill(NAVY);
    doc.rect(0, headerH, W, 3).fill(RED);

    if (logoBuffer) {
      doc.image(logoBuffer, MARGIN, 10, { width: 50, height: 50 });
    }

    const titleX = logoBuffer ? MARGIN + 60 : MARGIN + 5;
    doc.font("Helvetica-Bold").fontSize(20).fillColor("white");
    doc.text("Integration Meeting Summary", titleX, 18, { lineBreak: false });

    doc.font("Helvetica").fontSize(11).fillColor(CREAM);
    doc.text(
      `${data.clientName} — ${data.rpName} (${data.roleTitle})`,
      titleX,
      43,
      { lineBreak: false }
    );

    y = headerH + 3 + 20;

    // === SECTION 1: Client & Role Details ===
    y = drawSectionTitle(doc, "Client & Role Details", y);
    y += 8;

    const detailPairs: [string, string][] = [
      ["Client", data.clientName],
      ["Client Contact", `${data.clientContactName} (${data.clientContactEmail})`],
      ["Remote Professional", data.rpName],
      ["Role Title", data.roleTitle],
      ["Start Date", data.startDate],
      [
        "Working Hours",
        `${data.workingHoursStart} – ${data.workingHoursEnd} (${data.timezone})`,
      ],
      ["Working Days", data.workingDays.join(", ")],
    ];

    for (const [label, value] of detailPairs) {
      y = checkPageBreak(doc, y, 16);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
      doc.text(label + ":", MARGIN, y, { continued: true, width: CONTENT_W });
      doc.font("Helvetica").fontSize(9).fillColor(DARK_TEXT);
      doc.text("  " + value, { lineBreak: true });
      y = doc.y + 3;
    }

    // Position description
    if (data.positionDescription) {
      y += 5;
      y = checkPageBreak(doc, y, 40);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
      doc.text("Position Description:", MARGIN, y);
      y = doc.y + 3;
      doc.font("Helvetica").fontSize(8.5).fillColor(DARK_TEXT);
      doc.text(data.positionDescription, MARGIN + 10, y, {
        width: CONTENT_W - 10,
      });
      y = doc.y + 5;
    }

    // === SECTION 2: Key Functions ===
    y += 10;
    y = drawSectionTitle(doc, "Key Functions", y);
    y += 8;

    if (data.keyFunctions.length > 0) {
      const fnCols = [
        { label: "Function", width: CONTENT_W * 0.25 },
        { label: "Description", width: CONTENT_W * 0.55 },
        { label: "Priority", width: CONTENT_W * 0.2 },
      ];
      y = drawTableHeader(doc, fnCols, MARGIN, y);

      for (const fn of data.keyFunctions) {
        const rowH = Math.max(
          doc.heightOfString(fn.name, { width: fnCols[0].width - 10 }),
          doc.heightOfString(fn.description, { width: fnCols[1].width - 10 }),
          14
        );
        y = checkPageBreak(doc, y, rowH + 6);
        let cx = MARGIN;
        doc.font("Helvetica-Bold").fontSize(8).fillColor(DARK_TEXT);
        doc.text(fn.name, cx + 5, y + 3, { width: fnCols[0].width - 10 });
        cx += fnCols[0].width;
        doc.font("Helvetica").fontSize(8).fillColor(DARK_TEXT);
        doc.text(fn.description, cx + 5, y + 3, { width: fnCols[1].width - 10 });
        cx += fnCols[1].width;
        doc.font("Helvetica").fontSize(8).fillColor(
          fn.priority === "High" ? RED : MID_GRAY
        );
        doc.text(fn.priority, cx + 5, y + 3, { width: fnCols[2].width - 10 });
        y += rowH + 6;

        // Row separator
        doc
          .moveTo(MARGIN, y)
          .lineTo(MARGIN + CONTENT_W, y)
          .strokeColor("#E0E0E0")
          .lineWidth(0.5)
          .stroke();
        y += 1;
      }
    }

    // === SECTION 3: Systems & Software ===
    y += 10;
    y = drawSectionTitle(doc, "Systems & Software", y);
    y += 8;

    if (data.systems.length > 0) {
      const sysCols = [
        { label: "System", width: CONTENT_W * 0.22 },
        { label: "Purpose", width: CONTENT_W * 0.36 },
        { label: "Access By", width: CONTENT_W * 0.22 },
        { label: "Login Ready", width: CONTENT_W * 0.2 },
      ];
      y = drawTableHeader(doc, sysCols, MARGIN, y);

      for (const sys of data.systems) {
        const rowH = Math.max(
          doc.heightOfString(sys.name, { width: sysCols[0].width - 10 }),
          doc.heightOfString(sys.purpose, { width: sysCols[1].width - 10 }),
          14
        );
        y = checkPageBreak(doc, y, rowH + 6);
        let cx = MARGIN;
        doc.font("Helvetica-Bold").fontSize(8).fillColor(DARK_TEXT);
        doc.text(sys.name, cx + 5, y + 3, { width: sysCols[0].width - 10 });
        cx += sysCols[0].width;
        doc.font("Helvetica").fontSize(8).fillColor(DARK_TEXT);
        doc.text(sys.purpose, cx + 5, y + 3, { width: sysCols[1].width - 10 });
        cx += sysCols[1].width;
        doc.text(sys.accessProvidedBy, cx + 5, y + 3, {
          width: sysCols[2].width - 10,
        });
        cx += sysCols[2].width;
        const loginColor =
          sys.loginDetailsReady === "Yes"
            ? "#2E7D32"
            : sys.loginDetailsReady === "No"
              ? RED
              : MID_GRAY;
        doc.font("Helvetica").fontSize(8).fillColor(loginColor);
        doc.text(sys.loginDetailsReady, cx + 5, y + 3, {
          width: sysCols[3].width - 10,
        });
        y += rowH + 6;

        doc
          .moveTo(MARGIN, y)
          .lineTo(MARGIN + CONTENT_W, y)
          .strokeColor("#E0E0E0")
          .lineWidth(0.5)
          .stroke();
        y += 1;
      }
    }

    // === SECTION 4: KPI Targets ===
    y += 10;
    y = drawSectionTitle(doc, "KPI Targets", y);
    y += 8;

    if (data.kpis.length > 0) {
      // Group KPIs by function
      const kpisByFunction = new Map<string, typeof data.kpis>();
      for (const kpi of data.kpis) {
        const fn = data.keyFunctions.find((f) => f.id === kpi.functionId);
        const fnName = fn ? fn.name : "General";
        if (!kpisByFunction.has(fnName)) {
          kpisByFunction.set(fnName, []);
        }
        kpisByFunction.get(fnName)!.push(kpi);
      }

      for (const [fnName, kpis] of Array.from(kpisByFunction.entries())) {
        y = checkPageBreak(doc, y, 30);
        doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
        doc.text(fnName, MARGIN + 5, y);
        y = doc.y + 5;

        const kpiCols = [
          { label: "KPI", width: CONTENT_W * 0.2 },
          { label: "Target", width: CONTENT_W * 0.15 },
          { label: "Measurement", width: CONTENT_W * 0.25 },
          { label: "30-Day", width: CONTENT_W * 0.2 },
          { label: "90-Day", width: CONTENT_W * 0.2 },
        ];
        y = drawTableHeader(doc, kpiCols, MARGIN, y);

        for (const kpi of kpis) {
          const rowH = Math.max(
            doc.heightOfString(kpi.name, { width: kpiCols[0].width - 10 }),
            doc.heightOfString(kpi.measurementMethod, {
              width: kpiCols[2].width - 10,
            }),
            14
          );
          y = checkPageBreak(doc, y, rowH + 6);

          let cx = MARGIN;
          doc.font("Helvetica-Bold").fontSize(7.5).fillColor(DARK_TEXT);
          doc.text(kpi.name, cx + 5, y + 3, { width: kpiCols[0].width - 10 });
          cx += kpiCols[0].width;
          doc.font("Helvetica").fontSize(7.5).fillColor(DARK_TEXT);
          doc.text(kpi.targetValue, cx + 5, y + 3, {
            width: kpiCols[1].width - 10,
          });
          cx += kpiCols[1].width;
          doc.text(kpi.measurementMethod, cx + 5, y + 3, {
            width: kpiCols[2].width - 10,
          });
          cx += kpiCols[2].width;
          doc.text(kpi.thirtyDayTarget, cx + 5, y + 3, {
            width: kpiCols[3].width - 10,
          });
          cx += kpiCols[3].width;
          doc.text(kpi.ninetyDayTarget, cx + 5, y + 3, {
            width: kpiCols[4].width - 10,
          });
          y += rowH + 6;

          doc
            .moveTo(MARGIN, y)
            .lineTo(MARGIN + CONTENT_W, y)
            .strokeColor("#E0E0E0")
            .lineWidth(0.5)
            .stroke();
          y += 1;
        }
        y += 5;
      }
    }

    // === SECTION 5: Training & Resources ===
    y += 10;
    y = drawSectionTitle(doc, "Training & Resources", y);
    y += 8;

    y = checkPageBreak(doc, y, 16);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
    doc.text("Primary Trainer:", MARGIN, y, { continued: true });
    doc.font("Helvetica").fontSize(9).fillColor(DARK_TEXT);
    doc.text("  " + data.primaryTrainer);
    y = doc.y + 8;

    if (data.trainingResources.length > 0) {
      const trCols = [
        { label: "Resource", width: CONTENT_W * 0.3 },
        { label: "Type", width: CONTENT_W * 0.15 },
        { label: "URL / Location", width: CONTENT_W * 0.35 },
        { label: "Status", width: CONTENT_W * 0.2 },
      ];
      y = drawTableHeader(doc, trCols, MARGIN, y);

      for (const tr of data.trainingResources) {
        const rowH = Math.max(
          doc.heightOfString(tr.name, { width: trCols[0].width - 10 }),
          doc.heightOfString(tr.url || "—", { width: trCols[2].width - 10 }),
          14
        );
        y = checkPageBreak(doc, y, rowH + 6);

        let cx = MARGIN;
        doc.font("Helvetica-Bold").fontSize(8).fillColor(DARK_TEXT);
        doc.text(tr.name, cx + 5, y + 3, { width: trCols[0].width - 10 });
        cx += trCols[0].width;
        doc.font("Helvetica").fontSize(8).fillColor(DARK_TEXT);
        doc.text(tr.type, cx + 5, y + 3, { width: trCols[1].width - 10 });
        cx += trCols[1].width;
        doc.text(tr.url || "—", cx + 5, y + 3, { width: trCols[2].width - 10 });
        cx += trCols[2].width;
        const statusColor =
          tr.status === "Ready"
            ? "#2E7D32"
            : tr.status === "To be created"
              ? RED
              : MID_GRAY;
        doc.font("Helvetica").fontSize(8).fillColor(statusColor);
        doc.text(tr.status, cx + 5, y + 3, { width: trCols[3].width - 10 });
        y += rowH + 6;

        doc
          .moveTo(MARGIN, y)
          .lineTo(MARGIN + CONTENT_W, y)
          .strokeColor("#E0E0E0")
          .lineWidth(0.5)
          .stroke();
        y += 1;
      }
    }

    // === SECTION 6: Communication ===
    y += 10;
    y = drawSectionTitle(doc, "Communication", y);
    y += 8;

    const commPairs: [string, string][] = [
      ["Primary Channel", data.primaryChannel],
      [
        "Escalation Contact",
        `${data.escalationContactName} (${data.escalationContactEmail})`,
      ],
    ];

    for (const [label, value] of commPairs) {
      y = checkPageBreak(doc, y, 16);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
      doc.text(label + ":", MARGIN, y, { continued: true, width: CONTENT_W });
      doc.font("Helvetica").fontSize(9).fillColor(DARK_TEXT);
      doc.text("  " + value, { lineBreak: true });
      y = doc.y + 3;
    }

    // === SECTION 7: Check-in Schedule ===
    y += 10;
    y = drawSectionTitle(doc, "Check-in Schedule", y);
    y += 8;

    const cadence = [
      { period: "Weeks 1–4", frequency: "Weekly check-ins" },
      { period: "Weeks 5–8", frequency: "Fortnightly check-ins" },
      { period: "Weeks 9–12", frequency: "Monthly check-ins" },
    ];

    for (const item of cadence) {
      y = checkPageBreak(doc, y, 16);
      doc.circle(MARGIN + 8, y + 4, 2.5).fill(RED);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(DARK_TEXT);
      doc.text(item.period + ": ", MARGIN + 16, y, {
        continued: true,
        width: CONTENT_W - 16,
      });
      doc.font("Helvetica").fontSize(9).fillColor(MID_GRAY);
      doc.text(item.frequency);
      y = doc.y + 4;
    }

    y += 5;
    y = checkPageBreak(doc, y, 30);
    doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY);
    doc.text(
      "Check-ins are conducted by Cruise Control's Client Success Manager and include the RP, client contact, and CC representative. Agenda covers task progress, blockers, and upcoming milestones.",
      MARGIN + 5,
      y,
      { width: CONTENT_W - 10 }
    );
    y = doc.y + 10;

    // === Date generated ===
    y = checkPageBreak(doc, y, 20);
    doc.font("Helvetica").fontSize(8).fillColor(MID_GRAY);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`,
      MARGIN,
      y
    );

    // === FOOTER on all pages ===
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      drawFooter(doc);
    }

    doc.end();
  });
}

function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  text: string,
  y: number
): number {
  y = checkPageBreak(doc, y, 25);
  doc.rect(MARGIN, y, CONTENT_W, 22).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("white");
  doc.text(text.toUpperCase(), MARGIN + 10, y + 6, {
    width: CONTENT_W - 20,
    lineBreak: false,
  });
  return y + 22;
}

function drawTableHeader(
  doc: PDFKit.PDFDocument,
  cols: { label: string; width: number }[],
  x: number,
  y: number
): number {
  y = checkPageBreak(doc, y, 18);
  const totalW = cols.reduce((sum, c) => sum + c.width, 0);
  doc.rect(x, y, totalW, 16).fill(LIGHT_BG);

  let cx = x;
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(NAVY);
  for (const col of cols) {
    doc.text(col.label, cx + 5, y + 4, {
      width: col.width - 10,
      lineBreak: false,
    });
    cx += col.width;
  }

  // Bottom border
  doc
    .moveTo(x, y + 16)
    .lineTo(x + totalW, y + 16)
    .strokeColor(NAVY)
    .lineWidth(0.75)
    .stroke();

  return y + 18;
}

function checkPageBreak(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > H - FOOTER_H - 15) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawFooter(doc: PDFKit.PDFDocument) {
  doc.rect(0, H - FOOTER_H, W, FOOTER_H).fill(NAVY);
  doc.rect(0, H - FOOTER_H - 2, W, 2).fill(RED);
  doc.font("Helvetica").fontSize(7).fillColor(CREAM);
  const footerText =
    "Cruise Control Group Pty Ltd  |  ABN 21 356 633 798  |  cruisecontrolgroup.com.au";
  const footerW = doc.widthOfString(footerText);
  doc.text(footerText, (W - footerW) / 2, H - FOOTER_H + 9, {
    lineBreak: false,
  });
}
