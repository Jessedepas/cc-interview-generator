import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import type { InterviewGuide } from "@/lib/types";
import { SCORING_FRAMEWORK } from "@/lib/types";

const NAVY = "0B1A3B";
const RED = "C0503C";
const CREAM = "F2E6D9";
const LIGHT_BLUE = "E8F0FE";
const GREY = "D9D9D9";
const BODY_COLOR = "404040";
const MUTED = "808080";

function navyFill(): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
}
function creamFill(): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
}
function greyFill(): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: GREY } };
}
function inputFill(): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE } };
}
function redFill(): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
}

export async function POST(request: NextRequest) {
  try {
    const guide: InterviewGuide = await request.json();
    const wb = new ExcelJS.Workbook();

    // ─── SHEET 1: INTERVIEW GUIDE ───
    const ws = wb.addWorksheet("Interview Guide");
    ws.columns = [
      { width: 16 },
      { width: 45 },
      { width: 45 },
      { width: 6 },
    ];

    // Title
    ws.mergeCells("A1:D1");
    const titleCell = ws.getCell("A1");
    titleCell.value = "INTERVIEW SCORECARD";
    titleCell.font = { name: "Aptos", size: 14, bold: true, color: { argb: "FFFFFF" } };
    titleCell.fill = navyFill();
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 36;
    for (let c = 2; c <= 4; c++) ws.getCell(1, c).fill = navyFill();

    // Subtitle
    ws.mergeCells("A2:D2");
    const subCell = ws.getCell("A2");
    subCell.value = `${guide.clientName} \u2014 ${guide.roleName}`;
    subCell.font = { name: "Aptos", size: 11, bold: true, color: { argb: RED } };
    subCell.fill = creamFill();
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 24;
    for (let c = 2; c <= 4; c++) ws.getCell(2, c).fill = creamFill();

    // Candidate info
    const infoRows = [
      { label: "Candidate:", value: guide.candidateName },
      { label: "Date:", value: "" },
      { label: "Interviewer:", value: "" },
      { label: "Call Duration:", value: "15 minutes" },
    ];
    infoRows.forEach((item, i) => {
      const r = 4 + i;
      ws.getCell(r, 1).value = item.label;
      ws.getCell(r, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: NAVY } };
      ws.getCell(r, 1).alignment = { horizontal: "right", vertical: "middle" };
      ws.mergeCells(r, 2, r, 3);
      ws.getCell(r, 2).value = item.value;
      ws.getCell(r, 2).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
      ws.getCell(r, 2).fill = inputFill();
    });

    // Opening
    let row = 10;
    ws.mergeCells(`A${row}:D${row}`);
    ws.getCell(row, 1).value = "OPENING (1 min)";
    ws.getCell(row, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
    ws.getCell(row, 1).fill = navyFill();
    ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    ws.getRow(row).height = 24;
    for (let c = 2; c <= 4; c++) ws.getCell(row, c).fill = navyFill();

    row++;
    ws.mergeCells(`A${row}:D${row}`);
    ws.getCell(row, 1).value = guide.openingScript;
    ws.getCell(row, 1).font = { name: "Aptos", size: 9, italic: true, color: { argb: MUTED } };
    ws.getCell(row, 1).fill = creamFill();
    ws.getCell(row, 1).alignment = { wrapText: true, vertical: "top" };
    ws.getRow(row).height = 40;
    for (let c = 2; c <= 4; c++) ws.getCell(row, c).fill = creamFill();

    row += 2;

    // Sections
    for (const section of guide.sections) {
      // Section header
      ws.mergeCells(`A${row}:D${row}`);
      const sIdx = guide.sections.indexOf(section) + 1;
      ws.getCell(row, 1).value = `${sIdx}. ${section.pillar}  (${section.timeAllocation})`;
      ws.getCell(row, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
      ws.getCell(row, 1).fill = navyFill();
      ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      ws.getRow(row).height = 24;
      for (let c = 2; c <= 4; c++) ws.getCell(row, c).fill = navyFill();
      row++;

      // Subtitle
      ws.mergeCells(`A${row}:D${row}`);
      ws.getCell(row, 1).value = section.subtitle;
      ws.getCell(row, 1).font = { name: "Aptos", size: 9, color: { argb: MUTED } };
      ws.getCell(row, 1).fill = creamFill();
      ws.getCell(row, 1).alignment = { wrapText: true, vertical: "top" };
      ws.getRow(row).height = 20;
      for (let c = 2; c <= 4; c++) ws.getCell(row, c).fill = creamFill();
      row++;

      // Column headers
      ["#", "Question", "Listen For / Notes"].forEach((text, i) => {
        const c = i + 1;
        ws.getCell(row, c).value = text;
        ws.getCell(row, c).font = { name: "Aptos", size: 9, bold: true, color: { argb: NAVY } };
        ws.getCell(row, c).fill = greyFill();
        ws.getCell(row, c).alignment = { horizontal: i === 0 ? "center" : "left", vertical: "middle" };
      });
      row++;

      // Questions
      for (const q of section.questions) {
        ws.getCell(row, 1).value = q.number;
        ws.getCell(row, 1).font = { name: "Aptos", size: 10, bold: true, color: { argb: BODY_COLOR } };
        ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell(row, 2).value = q.text;
        ws.getCell(row, 2).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
        ws.getCell(row, 2).alignment = { wrapText: true, vertical: "top" };
        ws.getCell(row, 3).value = q.listenFor;
        ws.getCell(row, 3).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
        ws.getCell(row, 3).fill = inputFill();
        ws.getCell(row, 3).alignment = { wrapText: true, vertical: "top" };
        ws.getRow(row).height = 55;
        row++;
      }
      row++;
    }

    // Close section
    ws.mergeCells(`A${row}:D${row}`);
    ws.getCell(row, 1).value = "4. CLOSE  (2 min)";
    ws.getCell(row, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
    ws.getCell(row, 1).fill = navyFill();
    ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    ws.getRow(row).height = 24;
    for (let c = 2; c <= 4; c++) ws.getCell(row, c).fill = navyFill();
    row++;

    ws.getCell(row, 1).value = 10;
    ws.getCell(row, 1).font = { name: "Aptos", size: 10, bold: true, color: { argb: BODY_COLOR } };
    ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell(row, 2).value = guide.closingQuestion.text;
    ws.getCell(row, 2).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
    ws.getCell(row, 2).alignment = { wrapText: true, vertical: "top" };
    ws.getCell(row, 3).value = guide.closingQuestion.listenFor;
    ws.getCell(row, 3).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
    ws.getCell(row, 3).fill = inputFill();
    ws.getCell(row, 3).alignment = { wrapText: true, vertical: "top" };
    ws.getRow(row).height = 55;
    row += 2;

    // CV Probes
    ws.mergeCells(`A${row}:D${row}`);
    ws.getCell(row, 1).value = "CV PROBES \u2014 IF TIME PERMITS";
    ws.getCell(row, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
    ws.getCell(row, 1).fill = redFill();
    ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    ws.getRow(row).height = 24;
    for (let c = 2; c <= 4; c++) ws.getCell(row, c).fill = redFill();
    row++;

    for (const probe of guide.cvProbes) {
      ws.getCell(row, 1).value = "\u2022";
      ws.getCell(row, 1).font = { name: "Aptos", size: 10, bold: true, color: { argb: BODY_COLOR } };
      ws.getCell(row, 1).alignment = { horizontal: "center", vertical: "middle" };
      ws.getCell(row, 2).value = probe.topic;
      ws.getCell(row, 2).font = { name: "Aptos", size: 10, bold: true, color: { argb: BODY_COLOR } };
      ws.getCell(row, 2).alignment = { wrapText: true, vertical: "top" };
      ws.getCell(row, 3).value = probe.detail;
      ws.getCell(row, 3).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
      ws.getCell(row, 3).alignment = { wrapText: true, vertical: "top" };
      ws.getRow(row).height = 30;
      row++;
    }

    // ─── SHEET 2: SCORECARD ───
    const ws2 = wb.addWorksheet("Scorecard");
    ws2.columns = [{ width: 4 }, { width: 35 }, { width: 10 }, { width: 45 }];

    // Title
    ws2.mergeCells("A1:D1");
    ws2.getCell("A1").value = "INTERVIEW SCORECARD";
    ws2.getCell("A1").font = { name: "Aptos", size: 14, bold: true, color: { argb: "FFFFFF" } };
    ws2.getCell("A1").fill = navyFill();
    ws2.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    ws2.getRow(1).height = 36;
    for (let c = 2; c <= 4; c++) ws2.getCell(1, c).fill = navyFill();

    // Subtitle
    ws2.mergeCells("A2:D2");
    ws2.getCell("A2").value = `${guide.candidateName} \u2014 ${guide.clientName} ${guide.roleName}`;
    ws2.getCell("A2").font = { name: "Aptos", size: 11, bold: true, color: { argb: RED } };
    ws2.getCell("A2").fill = creamFill();
    ws2.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
    ws2.getRow(2).height = 24;
    for (let c = 2; c <= 4; c++) ws2.getCell(2, c).fill = creamFill();

    // Column headers
    ["#", "Assessment Area", "Score (1-5)", "Notes"].forEach((text, i) => {
      const c = i + 1;
      ws2.getCell(4, c).value = text;
      ws2.getCell(4, c).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
      ws2.getCell(4, c).fill = navyFill();
      ws2.getCell(4, c).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    ws2.getRow(4).height = 24;

    // Score rows
    let sRow = 5;
    const scoreRows: number[] = [];
    for (const pillar of SCORING_FRAMEWORK.pillars) {
      // Section header
      ws2.mergeCells(`A${sRow}:D${sRow}`);
      ws2.getCell(sRow, 1).value = pillar.name;
      ws2.getCell(sRow, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: NAVY } };
      ws2.getCell(sRow, 1).fill = greyFill();
      ws2.getRow(sRow).height = 20;
      for (let c = 2; c <= 4; c++) ws2.getCell(sRow, c).fill = greyFill();
      sRow++;

      for (const area of pillar.areas) {
        const areaIdx = scoreRows.length + 1;
        ws2.getCell(sRow, 1).value = areaIdx;
        ws2.getCell(sRow, 1).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
        ws2.getCell(sRow, 1).alignment = { horizontal: "center", vertical: "middle" };
        ws2.getCell(sRow, 2).value = area;
        ws2.getCell(sRow, 2).font = { name: "Aptos", size: 10, bold: true, color: { argb: BODY_COLOR } };
        ws2.getCell(sRow, 2).alignment = { wrapText: true, vertical: "top" };
        ws2.getCell(sRow, 3).fill = inputFill();
        ws2.getCell(sRow, 3).font = { name: "Aptos", size: 12, bold: true, color: { argb: NAVY } };
        ws2.getCell(sRow, 3).alignment = { horizontal: "center", vertical: "middle" };
        ws2.getCell(sRow, 4).fill = inputFill();
        ws2.getCell(sRow, 4).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
        ws2.getCell(sRow, 4).alignment = { wrapText: true, vertical: "top" };
        ws2.getRow(sRow).height = 30;
        scoreRows.push(sRow);
        sRow++;
      }
    }

    // Total score
    sRow++;
    ws2.mergeCells(`A${sRow}:B${sRow}`);
    ws2.getCell(sRow, 1).value = "TOTAL SCORE";
    ws2.getCell(sRow, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
    ws2.getCell(sRow, 1).fill = navyFill();
    ws2.getCell(sRow, 1).alignment = { horizontal: "right", vertical: "middle" };
    ws2.getCell(sRow, 2).fill = navyFill();

    const sumFormula = scoreRows.map((r) => `C${r}`).join("+");
    ws2.getCell(sRow, 3).value = { formula: sumFormula };
    ws2.getCell(sRow, 3).font = { name: "Aptos", size: 14, bold: true, color: { argb: "FFFFFF" } };
    ws2.getCell(sRow, 3).fill = navyFill();
    ws2.getCell(sRow, 3).alignment = { horizontal: "center", vertical: "middle" };
    ws2.getCell(sRow, 4).value = "/ 45";
    ws2.getCell(sRow, 4).font = { name: "Aptos", size: 14, bold: true, color: { argb: "FFFFFF" } };
    ws2.getCell(sRow, 4).fill = navyFill();
    ws2.getRow(sRow).height = 30;

    const totalRow = sRow;
    sRow++;

    // Result
    ws2.mergeCells(`A${sRow}:B${sRow}`);
    ws2.getCell(sRow, 1).value = "RESULT";
    ws2.getCell(sRow, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
    ws2.getCell(sRow, 1).fill = redFill();
    ws2.getCell(sRow, 1).alignment = { horizontal: "right", vertical: "middle" };
    ws2.getCell(sRow, 2).fill = redFill();
    ws2.mergeCells(`C${sRow}:D${sRow}`);
    ws2.getCell(sRow, 3).value = {
      formula: `IF(C${totalRow}="","",IF(C${totalRow}>=36,"STRONG YES",IF(C${totalRow}>=27,"YES",IF(C${totalRow}>=18,"MAYBE","NO"))))`,
    };
    ws2.getCell(sRow, 3).font = { name: "Aptos", size: 14, bold: true, color: { argb: RED } };
    ws2.getCell(sRow, 3).fill = creamFill();
    ws2.getCell(sRow, 3).alignment = { horizontal: "center", vertical: "middle" };
    ws2.getCell(sRow, 4).fill = creamFill();
    ws2.getRow(sRow).height = 30;
    sRow += 2;

    // Gut check
    ws2.mergeCells(`A${sRow}:D${sRow}`);
    ws2.getCell(sRow, 1).value = "GUT CHECK";
    ws2.getCell(sRow, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
    ws2.getCell(sRow, 1).fill = navyFill();
    ws2.getCell(sRow, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 2; c <= 4; c++) ws2.getCell(sRow, c).fill = navyFill();
    ws2.getRow(sRow).height = 24;
    sRow++;

    ws2.mergeCells(`A${sRow}:B${sRow}`);
    ws2.getCell(sRow, 1).value = "Would I put this person in the role tomorrow?";
    ws2.getCell(sRow, 1).font = { name: "Aptos", size: 10, bold: true, color: { argb: BODY_COLOR } };
    ws2.getCell(sRow, 1).alignment = { wrapText: true, vertical: "top" };
    ws2.getCell(sRow, 3).fill = inputFill();
    ws2.getCell(sRow, 3).alignment = { horizontal: "center", vertical: "middle" };
    ws2.getCell(sRow, 4).fill = inputFill();
    ws2.getCell(sRow, 4).alignment = { wrapText: true, vertical: "top" };
    ws2.getRow(sRow).height = 30;
    sRow += 2;

    // Overall notes
    ws2.mergeCells(`A${sRow}:D${sRow}`);
    ws2.getCell(sRow, 1).value = "OVERALL NOTES";
    ws2.getCell(sRow, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFF" } };
    ws2.getCell(sRow, 1).fill = navyFill();
    ws2.getCell(sRow, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 2; c <= 4; c++) ws2.getCell(sRow, c).fill = navyFill();
    ws2.getRow(sRow).height = 24;
    sRow++;

    for (const label of ["Key Strengths:", "Concerns:", "Recommendation:"]) {
      ws2.getCell(sRow, 1).value = label;
      ws2.getCell(sRow, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: NAVY } };
      ws2.getCell(sRow, 1).alignment = { horizontal: "right", vertical: "top" };
      ws2.mergeCells(`B${sRow}:D${sRow}`);
      ws2.getCell(sRow, 2).fill = inputFill();
      ws2.getCell(sRow, 2).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
      ws2.getCell(sRow, 2).alignment = { wrapText: true, vertical: "top" };
      ws2.getRow(sRow).height = 50;
      sRow++;
    }

    sRow++;
    // Scoring guide
    ws2.mergeCells(`A${sRow}:D${sRow}`);
    ws2.getCell(sRow, 1).value = "SCORING GUIDE";
    ws2.getCell(sRow, 1).font = { name: "Aptos", size: 11, bold: true, color: { argb: NAVY } };
    ws2.getCell(sRow, 1).fill = greyFill();
    ws2.getCell(sRow, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 2; c <= 4; c++) ws2.getCell(sRow, c).fill = greyFill();
    sRow++;

    const guideItems = [
      "1 = Poor \u2014 significant concern, likely deal-breaker",
      "2 = Below Average \u2014 noticeable weakness, needs development",
      "3 = Adequate \u2014 meets minimum expectations",
      "4 = Strong \u2014 above expectations, confident in this area",
      "5 = Excellent \u2014 standout, exceeds what's needed for the role",
    ];
    for (const item of guideItems) {
      ws2.mergeCells(`A${sRow}:D${sRow}`);
      ws2.getCell(sRow, 1).value = item;
      ws2.getCell(sRow, 1).font = { name: "Aptos", size: 10, color: { argb: BODY_COLOR } };
      ws2.getCell(sRow, 1).alignment = { wrapText: true, vertical: "top" };
      sRow++;
    }

    sRow++;
    ws2.mergeCells(`A${sRow}:D${sRow}`);
    ws2.getCell(sRow, 1).value =
      "36+ = STRONG YES  |  27-35 = YES  |  18-26 = MAYBE  |  <18 = NO";
    ws2.getCell(sRow, 1).font = { name: "Aptos", size: 10, bold: true, color: { argb: BODY_COLOR } };
    ws2.getCell(sRow, 1).fill = creamFill();
    ws2.getCell(sRow, 1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let c = 2; c <= 4; c++) ws2.getCell(sRow, c).fill = creamFill();

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Interview Scorecard - ${guide.candidateName}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel file" },
      { status: 500 }
    );
  }
}
