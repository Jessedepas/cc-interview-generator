import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { InterviewGuide } from "@/lib/types";
import type { ScorecardResult } from "@/lib/scorecard-types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a senior recruitment assessor for Cruise Control Group — Australia's first offshoring company specialising exclusively in automotive dealerships. You score interview transcripts against a structured 9-area framework.

Your output must be valid JSON matching the ScorecardResult schema exactly. No markdown, no code fences, no explanation — just the JSON object.

Scoring framework — 9 areas across 3 pillars, each scored 1-5:

COMMUNICATION:
1. English clarity — articulation, sentence structure, pace, grammar
2. Charisma — warmth, personality, rapport-building, energy
3. AU experience — familiarity with Australian workplace culture, accents, norms

BEHAVIOUR:
4. Discipline — reliability, routine, process adherence, self-management
5. Initiative — proactiveness, ownership, problem-solving without being told
6. Professionalism — composure, work ethic, presentation, handling difficult situations

SKILL FIT:
7. Technical depth — domain knowledge specific to the role
8. Role experience — relevant prior experience matching the JD
9. Software proficiency — knowledge of tools/systems from JD and CV

Scoring guide:
1 = Poor — significant concern, likely deal-breaker
2 = Below Average — noticeable weakness, needs development
3 = Adequate — meets minimum expectations
4 = Strong — above expectations, confident in this area
5 = Excellent — standout, exceeds what's needed for the role

Thresholds:
36+ = STRONG YES | 27-35 = YES | 18-26 = MAYBE | <18 = NO

Rules:
- Score based ONLY on what the transcript reveals. If an area wasn't tested, score 3 (adequate) and note "Not directly assessed in interview"
- Notes should be 1-2 sentences with specific evidence from the transcript
- Key Strengths: 2-3 bullet points, specific examples
- Concerns: 1-3 bullet points, be honest about red flags or gaps
- Recommendation: 2-3 sentences — would you proceed? What conditions?
- Gut Check: One sentence — "Would I put this person in the role tomorrow?" Yes/No and why
- Be calibrated — don't inflate scores. A 3 is fine. Reserve 5 for genuinely exceptional performance
- Australian business context: direct, practical assessment. No fluff.`;

export async function POST(request: NextRequest) {
  try {
    const { guide, transcript }: { guide: InterviewGuide; transcript: string } =
      await request.json();

    if (!guide || !transcript) {
      return NextResponse.json(
        { error: "Missing guide or transcript" },
        { status: 400 }
      );
    }

    // Build the questions context so Claude knows what was asked
    const questionsContext = guide.sections
      .flatMap((s) =>
        s.questions.map(
          (q) => `Q${q.number} (${s.pillar} — ${q.listenFor.substring(0, 80)}): ${q.text}`
        )
      )
      .join("\n");

    const userPrompt = `Score this interview transcript against the interview questions that were asked.

CANDIDATE: ${guide.candidateName}
CLIENT: ${guide.clientName}
ROLE: ${guide.roleName}

INTERVIEW QUESTIONS ASKED:
${questionsContext}
Q10 (CLOSE): ${guide.closingQuestion.text}

INTERVIEW TRANSCRIPT:
${transcript}

Return a JSON object with this exact structure:
{
  "candidateName": "${guide.candidateName}",
  "clientName": "${guide.clientName}",
  "roleName": "${guide.roleName}",
  "scores": [
    { "area": "English clarity", "pillar": "COMMUNICATION", "score": 4, "notes": "..." },
    { "area": "Charisma", "pillar": "COMMUNICATION", "score": 3, "notes": "..." },
    { "area": "AU experience", "pillar": "COMMUNICATION", "score": 3, "notes": "..." },
    { "area": "Discipline", "pillar": "BEHAVIOUR", "score": 4, "notes": "..." },
    { "area": "Initiative", "pillar": "BEHAVIOUR", "score": 3, "notes": "..." },
    { "area": "Professionalism", "pillar": "BEHAVIOUR", "score": 4, "notes": "..." },
    { "area": "Technical depth", "pillar": "SKILL FIT", "score": 3, "notes": "..." },
    { "area": "Role experience", "pillar": "SKILL FIT", "score": 4, "notes": "..." },
    { "area": "Software proficiency", "pillar": "SKILL FIT", "score": 3, "notes": "..." }
  ],
  "totalScore": 31,
  "result": "YES",
  "gutCheck": "...",
  "keyStrengths": "...",
  "concerns": "...",
  "recommendation": "..."
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: userPrompt }],
      system: SYSTEM_PROMPT,
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const scorecard: ScorecardResult = JSON.parse(cleaned);

    // Validate total
    const calculatedTotal = scorecard.scores.reduce(
      (sum, s) => sum + s.score,
      0
    );
    scorecard.totalScore = calculatedTotal;

    // Validate result
    if (calculatedTotal >= 36) scorecard.result = "STRONG YES";
    else if (calculatedTotal >= 27) scorecard.result = "YES";
    else if (calculatedTotal >= 18) scorecard.result = "MAYBE";
    else scorecard.result = "NO";

    return NextResponse.json(scorecard);
  } catch (error) {
    console.error("Score transcript error:", error);
    return NextResponse.json(
      { error: "Failed to score transcript" },
      { status: 500 }
    );
  }
}
