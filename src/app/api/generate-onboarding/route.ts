import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type {
  IntegrationQuestionnaire,
  OnboardingProgram,
} from "@/lib/onboarding-types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const data: IntegrationQuestionnaire = await request.json();
    const program = await generateOnboardingProgram(data);

    return NextResponse.json(program);
  } catch (error) {
    console.error("Onboarding generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate onboarding program" },
      { status: 500 }
    );
  }
}

async function generateOnboardingProgram(
  data: IntegrationQuestionnaire
): Promise<OnboardingProgram> {
  const functionsText = data.keyFunctions
    .map(
      (f) =>
        `- ${f.name} (${f.priority} priority): ${f.description}`
    )
    .join("\n");

  const systemsText = data.systems
    .map(
      (s) =>
        `- ${s.name}: ${s.purpose} (access by: ${s.accessProvidedBy}, login ready: ${s.loginDetailsReady})`
    )
    .join("\n");

  const kpisText = data.kpis
    .map((k) => {
      const fn = data.keyFunctions.find((f) => f.id === k.functionId);
      const fnName = fn ? fn.name : "General";
      return `- [${fnName}] ${k.name}: target=${k.targetValue}, measurement=${k.measurementMethod}, 30-day=${k.thirtyDayTarget}, 90-day=${k.ninetyDayTarget}`;
    })
    .join("\n");

  const resourcesText = data.trainingResources
    .map(
      (r) =>
        `- ${r.name} (${r.type}): ${r.url || "no URL"} — ${r.status}`
    )
    .join("\n");

  const prompt = `You are building a 12-week onboarding program for a Remote Professional (RP) being placed at an automotive dealership client by Cruise Control Group, an Australian offshoring company.

## Role Details
- RP Name: ${data.rpName}
- Role Title: ${data.roleTitle}
- Client: ${data.clientName}
- Start Date: ${data.startDate}
- Working Hours: ${data.workingHoursStart} – ${data.workingHoursEnd} (${data.timezone})
- Working Days: ${data.workingDays.join(", ")}
- Primary Trainer: ${data.primaryTrainer}
- Communication Channel: ${data.primaryChannel}

## Position Description
${data.positionDescription}

## Key Functions
${functionsText}

## Systems & Software
${systemsText}

## KPIs & Performance Targets
${kpisText}

## Available Training Resources
${resourcesText}

## Instructions

Analyze the position description thoroughly and produce a complete onboarding program. You must:

1. **Extract every discrete task/skill** the RP needs to learn from the PD and key functions. Be granular — don't group multiple skills into one task.

2. **Cross-reference with KPIs** to ensure high-priority, measurable tasks are trained early and given more time.

3. **Create clear "green criteria"** for each task — what "competent" looks like in practical terms. Not a number or percentage, but a behavioral description (e.g., "Can process end-of-day reconciliation independently, flagging discrepancies rather than guessing").

4. **Build a 12-week plan** that sequences training logically:
   - Weeks 1–2: Foundations — system access, basic navigation, simple tasks, team introductions
   - Weeks 3–4: Core functions — the most frequent daily tasks
   - Weeks 5–8: Intermediate — complex workflows, edge cases, cross-functional tasks
   - Weeks 9–12: Mastery — independent handling, speed/accuracy targets, advanced scenarios

5. **Generate check-in agendas** for each week referencing specific tasks being learned that week. Include questions the client trainer should ask to verify progress.

6. **Reference available training resources** where applicable — match resources to tasks.

7. **Create a day-one checklist** covering: system access verification, team introductions, workspace setup, expectations review, first-day orientation tasks.

8. **Create a system access checklist** based on the systems list, noting current readiness status.

Return ONLY valid JSON matching this exact TypeScript interface:

\`\`\`typescript
interface OnboardingProgram {
  rpName: string;
  roleTitle: string;
  clientName: string;
  startDate: string;
  totalTasks: number;
  tasks: {
    id: string;           // e.g. "task-1", "task-2"
    functionName: string; // which key function this relates to
    taskName: string;
    description: string;
    greenCriteria: string;
    priority: "High" | "Medium" | "Low";
    targetWeek: number;   // 1-12
    trainingMethod: string;
    estimatedHours: number;
  }[];
  weeklyPlan: {           // exactly 12 entries
    weekNumber: number;   // 1-12
    focus: string;        // theme for the week
    tasks: string[];      // task IDs
    checkInAgenda: string[];
  }[];
  dayOneChecklist: string[];
  systemAccessChecklist: {
    system: string;
    status: string;
  }[];
}
\`\`\`

Return ONLY the JSON object. No markdown fences, no explanation, no preamble.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonText = textBlock.text.trim();

  // Strip markdown fences if present (safety measure)
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  const program: OnboardingProgram = JSON.parse(jsonText);

  // Validate required fields
  if (
    !program.tasks ||
    !program.weeklyPlan ||
    !program.dayOneChecklist ||
    !program.systemAccessChecklist
  ) {
    throw new Error("Invalid onboarding program structure returned from Claude");
  }

  // Ensure totalTasks is accurate
  program.totalTasks = program.tasks.length;

  return program;
}
