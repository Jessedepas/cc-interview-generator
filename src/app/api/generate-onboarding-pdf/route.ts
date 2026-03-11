import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { OnboardingProgram, OnboardingTask } from "@/lib/onboarding-types";

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
const GREEN = "#2E7D32";

// Page setup (A4)
const W = 595.27;
const H = 841.89;
const MARGIN = 42.52;
const CONTENT_W = W - MARGIN * 2;
const FOOTER_H = 25;

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function POST(request: NextRequest) {
  try {
    const data: OnboardingProgram = await request.json();
    const pdfBuffer = await generateOnboardingPDF(data);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${data.clientName} - ${data.rpName} Onboarding Program.pdf"`,
      },
    });
  } catch (error) {
    console.error("Onboarding PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

async function generateOnboardingPDF(
  data: OnboardingProgram
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: MARGIN,
        bottom: FOOTER_H + 15,
        left: MARGIN,
        right: MARGIN,
      },
      bufferPages: true,
      info: {
        Title: `${data.clientName} - ${data.rpName} Onboarding Program`,
        Author: "Cruise Control Group",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = MARGIN;

    // === PAGE 1: COVER / OVERVIEW ===

    // Header bar
    const headerH = 85;
    doc.rect(0, 0, W, headerH).fill(NAVY);
    doc.rect(0, headerH, W, 3).fill(RED);

    if (logoBuffer) {
      doc.image(logoBuffer, MARGIN, 12, { width: 55, height: 55 });
    }

    const titleX = logoBuffer ? MARGIN + 70 : MARGIN + 5;
    doc.font("Helvetica-Bold").fontSize(22).fillColor("white");
    doc.text("Onboarding Program", titleX, 18, { lineBreak: false });

    doc.font("Helvetica").fontSize(12).fillColor(CREAM);
    doc.text(
      `${data.rpName} — ${data.roleTitle}`,
      titleX,
      45,
      { lineBreak: false }
    );

    doc.font("Helvetica").fontSize(10).fillColor(CREAM);
    doc.text(data.clientName, titleX, 62, { lineBreak: false });

    y = headerH + 3 + 25;

    // Overview details
    const overviewPairs: [string, string][] = [
      ["Remote Professional", data.rpName],
      ["Role Title", data.roleTitle],
      ["Client", data.clientName],
      ["Start Date", data.startDate],
      ["Total Tasks", String(data.totalTasks)],
      ["Program Duration", "90 Days (12 Weeks)"],
    ];

    y = drawSectionTitle(doc, "Program Overview", y);
    y += 8;

    for (const [label, value] of overviewPairs) {
      y = checkPageBreak(doc, y, 16);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
      doc.text(label + ":", MARGIN, y, { continued: true, width: CONTENT_W });
      doc.font("Helvetica").fontSize(9).fillColor(DARK_TEXT);
      doc.text("  " + value, { lineBreak: true });
      y = doc.y + 3;
    }

    // Check-in cadence summary
    y += 10;
    y = checkPageBreak(doc, y, 60);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
    doc.text("Check-in Cadence:", MARGIN, y);
    y = doc.y + 5;

    const cadence = [
      { period: "Weeks 1-4", frequency: "Weekly check-ins (4 sessions)" },
      { period: "Weeks 5-8", frequency: "Fortnightly check-ins (2 sessions)" },
      { period: "Weeks 9-12", frequency: "Monthly check-ins (2 sessions)" },
    ];

    for (const item of cadence) {
      y = checkPageBreak(doc, y, 14);
      doc.circle(MARGIN + 8, y + 4, 2.5).fill(RED);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(DARK_TEXT);
      doc.text(item.period + ": ", MARGIN + 16, y, {
        continued: true,
        width: CONTENT_W - 16,
      });
      doc.font("Helvetica").fontSize(8.5).fillColor(MID_GRAY);
      doc.text(item.frequency);
      y = doc.y + 3;
    }

    // === PAGE 2: DAY 1 CHECKLIST + SYSTEM ACCESS ===
    doc.addPage();
    y = MARGIN;

    y = drawSectionTitle(doc, "Day 1 Checklist", y);
    y += 8;

    for (const item of data.dayOneChecklist) {
      y = checkPageBreak(doc, y, 16);
      doc.circle(MARGIN + 8, y + 4, 2.5).fill(GREEN);
      doc.font("Helvetica").fontSize(8.5).fillColor(DARK_TEXT);
      doc.text(item, MARGIN + 16, y, { width: CONTENT_W - 20 });
      y = doc.y + 3;
    }

    y += 15;
    y = drawSectionTitle(doc, "System Access Checklist", y);
    y += 8;

    if (data.systemAccessChecklist.length > 0) {
      const sysCols = [
        { label: "System", width: CONTENT_W * 0.6 },
        { label: "Status", width: CONTENT_W * 0.4 },
      ];
      y = drawTableHeader(doc, sysCols, MARGIN, y);

      for (const sys of data.systemAccessChecklist) {
        const rowH = Math.max(
          doc.heightOfString(sys.system, { width: sysCols[0].width - 10 }),
          14
        );
        y = checkPageBreak(doc, y, rowH + 6);

        let cx = MARGIN;
        doc.font("Helvetica").fontSize(8.5).fillColor(DARK_TEXT);
        doc.text(sys.system, cx + 5, y + 3, { width: sysCols[0].width - 10 });
        cx += sysCols[0].width;

        const statusColor =
          sys.status === "Ready"
            ? GREEN
            : sys.status === "Pending"
            ? RED
            : MID_GRAY;
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(statusColor);
        doc.text(sys.status, cx + 5, y + 3, { width: sysCols[1].width - 10 });
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

    // === PAGES 3+: 12-WEEK PLAN ===
    doc.addPage();
    y = MARGIN;

    y = drawSectionTitle(doc, "12-Week Plan", y);
    y += 8;

    for (const week of data.weeklyPlan) {
      // Determine phase
      let phaseLabel = "";
      let phaseColor = NAVY;
      if (week.weekNumber <= 4) {
        phaseLabel = "Weekly";
        phaseColor = NAVY;
      } else if (week.weekNumber <= 8) {
        phaseLabel = "Fortnightly";
        phaseColor = RED;
      } else {
        phaseLabel = "Monthly";
        phaseColor = MID_GRAY;
      }

      // Calculate dates for this week
      const weekStart = addDays(data.startDate, (week.weekNumber - 1) * 7);
      const weekEnd = addDays(data.startDate, week.weekNumber * 7 - 1);

      // Week header
      y = checkPageBreak(doc, y, 80);
      doc.rect(MARGIN, y, CONTENT_W, 20).fill(phaseColor);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("white");
      doc.text(
        `WEEK ${week.weekNumber} — ${week.focus}`,
        MARGIN + 8,
        y + 5,
        { width: CONTENT_W - 80, lineBreak: false }
      );
      doc.font("Helvetica").fontSize(7).fillColor(CREAM);
      doc.text(
        `${formatDate(weekStart)} – ${formatDate(weekEnd)}  |  ${phaseLabel}`,
        MARGIN + 8,
        y + 5,
        { width: CONTENT_W - 16, align: "right", lineBreak: false }
      );
      y += 22;

      // Tasks for this week
      const weekTasks = data.tasks.filter(
        (t) => t.targetWeek === week.weekNumber
      );

      if (weekTasks.length > 0) {
        for (const task of weekTasks) {
          y = checkPageBreak(doc, y, 40);

          // Task name + priority
          doc.font("Helvetica-Bold").fontSize(8).fillColor(DARK_TEXT);
          doc.text(task.taskName, MARGIN + 10, y, {
            continued: true,
            width: CONTENT_W - 60,
          });

          const priorityColor =
            task.priority === "High"
              ? RED
              : task.priority === "Medium"
              ? NAVY
              : MID_GRAY;
          doc.font("Helvetica").fontSize(7).fillColor(priorityColor);
          doc.text(`  [${task.priority}]`);
          y = doc.y + 2;

          // Description
          doc.font("Helvetica").fontSize(7.5).fillColor(MID_GRAY);
          doc.text(task.description, MARGIN + 10, y, {
            width: CONTENT_W - 20,
          });
          y = doc.y + 2;

          // Green criteria
          doc.font("Helvetica-Bold").fontSize(7).fillColor(GREEN);
          doc.text("Green: ", MARGIN + 10, y, { continued: true });
          doc.font("Helvetica").fontSize(7).fillColor(GREEN);
          doc.text(task.greenCriteria, { width: CONTENT_W - 50 });
          y = doc.y + 2;

          // Training method + hours
          doc.font("Helvetica").fontSize(7).fillColor(MID_GRAY);
          doc.text(
            `Method: ${task.trainingMethod}  |  Est. ${task.estimatedHours}h`,
            MARGIN + 10,
            y
          );
          y = doc.y + 5;

          // Separator
          doc
            .moveTo(MARGIN + 10, y)
            .lineTo(MARGIN + CONTENT_W - 10, y)
            .strokeColor("#E0E0E0")
            .lineWidth(0.3)
            .stroke();
          y += 4;
        }
      } else {
        doc.font("Helvetica").fontSize(7.5).fillColor(MID_GRAY);
        doc.text("No specific tasks assigned", MARGIN + 10, y);
        y = doc.y + 5;
      }

      // Check-in agenda
      if (week.checkInAgenda.length > 0) {
        y = checkPageBreak(doc, y, 25);
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(NAVY);
        doc.text("Check-in Agenda:", MARGIN + 10, y);
        y = doc.y + 3;

        for (const item of week.checkInAgenda) {
          y = checkPageBreak(doc, y, 12);
          doc.circle(MARGIN + 14, y + 3, 1.5).fill(RED);
          doc.font("Helvetica").fontSize(7).fillColor(DARK_TEXT);
          doc.text(item, MARGIN + 20, y, { width: CONTENT_W - 30 });
          y = doc.y + 2;
        }
      }

      y += 10;
    }

    // === LAST PAGE: COMPLETE TASK LIST ===
    doc.addPage();
    y = MARGIN;

    y = drawSectionTitle(doc, "Complete Task List", y);
    y += 8;

    // Group by function
    const tasksByFunction = new Map<string, OnboardingTask[]>();
    for (const task of data.tasks) {
      if (!tasksByFunction.has(task.functionName)) {
        tasksByFunction.set(task.functionName, []);
      }
      tasksByFunction.get(task.functionName)!.push(task);
    }

    for (const [fnName, tasks] of Array.from(tasksByFunction.entries())) {
      y = checkPageBreak(doc, y, 30);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY);
      doc.text(fnName, MARGIN + 5, y);
      y = doc.y + 5;

      const taskCols = [
        { label: "Task", width: CONTENT_W * 0.2 },
        { label: "Green Criteria", width: CONTENT_W * 0.25 },
        { label: "Priority", width: CONTENT_W * 0.1 },
        { label: "Week", width: CONTENT_W * 0.08 },
        { label: "Method", width: CONTENT_W * 0.22 },
        { label: "Hours", width: CONTENT_W * 0.15 },
      ];
      y = drawTableHeader(doc, taskCols, MARGIN, y);

      for (const task of tasks) {
        const rowH = Math.max(
          doc.heightOfString(task.taskName, { width: taskCols[0].width - 10 }),
          doc.heightOfString(task.greenCriteria, {
            width: taskCols[1].width - 10,
          }),
          14
        );
        y = checkPageBreak(doc, y, rowH + 6);

        let cx = MARGIN;

        // Task name
        doc.font("Helvetica-Bold").fontSize(7).fillColor(DARK_TEXT);
        doc.text(task.taskName, cx + 5, y + 3, {
          width: taskCols[0].width - 10,
        });
        cx += taskCols[0].width;

        // Green criteria
        doc.font("Helvetica").fontSize(7).fillColor(GREEN);
        doc.text(task.greenCriteria, cx + 5, y + 3, {
          width: taskCols[1].width - 10,
        });
        cx += taskCols[1].width;

        // Priority
        const priorityColor =
          task.priority === "High"
            ? RED
            : task.priority === "Medium"
            ? NAVY
            : MID_GRAY;
        doc.font("Helvetica").fontSize(7).fillColor(priorityColor);
        doc.text(task.priority, cx + 5, y + 3, {
          width: taskCols[2].width - 10,
        });
        cx += taskCols[2].width;

        // Week
        doc.font("Helvetica").fontSize(7).fillColor(DARK_TEXT);
        doc.text(String(task.targetWeek), cx + 5, y + 3, {
          width: taskCols[3].width - 10,
        });
        cx += taskCols[3].width;

        // Method
        doc.text(task.trainingMethod, cx + 5, y + 3, {
          width: taskCols[4].width - 10,
        });
        cx += taskCols[4].width;

        // Hours
        doc.text(`${task.estimatedHours}h`, cx + 5, y + 3, {
          width: taskCols[5].width - 10,
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

      y += 8;
    }

    // Date generated
    y += 10;
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

  doc
    .moveTo(x, y + 16)
    .lineTo(x + totalW, y + 16)
    .strokeColor(NAVY)
    .lineWidth(0.75)
    .stroke();

  return y + 18;
}

function checkPageBreak(
  doc: PDFKit.PDFDocument,
  y: number,
  needed: number
): number {
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
