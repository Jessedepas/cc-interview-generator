"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SCORING_FRAMEWORK } from "@/lib/types";
import type { InterviewGuide } from "@/lib/types";
import type { ScorecardResult } from "@/lib/scorecard-types";
import {
  Download,
  ArrowLeft,
  FileText,
  ClipboardPaste,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface QuestionnaireViewProps {
  guide: InterviewGuide;
  onBack: () => void;
}

export function QuestionnaireView({ guide, onBack }: QuestionnaireViewProps) {
  const [exporting, setExporting] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null);
  const [scoreError, setScoreError] = useState("");
  const [downloadingScorecard, setDownloadingScorecard] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guide),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Interview Scorecard - ${guide.candidateName}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  async function handleScore() {
    if (!transcript.trim()) return;
    setScoring(true);
    setScoreError("");
    try {
      const res = await fetch("/api/score-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guide, transcript }),
      });
      if (!res.ok) throw new Error("Scoring failed");
      const result: ScorecardResult = await res.json();
      setScorecard(result);
      setQuestionsCollapsed(true);
    } catch (err) {
      console.error(err);
      setScoreError("Failed to score transcript. Please try again.");
    } finally {
      setScoring(false);
    }
  }

  async function handleDownloadPDF(
    endpoint: string,
    filename: string,
    setLoading: (v: boolean) => void
  ) {
    if (!scorecard) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorecard),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const resultColor =
    scorecard?.result === "STRONG YES"
      ? "text-green-700 bg-green-50"
      : scorecard?.result === "YES"
        ? "text-[#0B1A3B] bg-blue-50"
        : scorecard?.result === "MAYBE"
          ? "text-amber-700 bg-amber-50"
          : "text-red-700 bg-red-50";

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="no-print flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> New Interview
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTranscript(!showTranscript)}
            className="gap-2"
          >
            <ClipboardPaste className="h-4 w-4" />
            {showTranscript ? "Hide Transcript" : "Insert Transcript"}
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="gap-2 bg-[#0B1A3B] hover:bg-[#162d5a] text-white"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </div>

      {/* Transcript input panel */}
      {showTranscript && (
        <Card className="no-print border-[#C0503C] border-2">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#0B1A3B]">
                Interview Transcript
              </h3>
              {transcript.trim() && (
                <span className="text-xs text-gray-400">
                  {transcript.length.toLocaleString()} characters
                </span>
              )}
            </div>
            <Textarea
              placeholder="Paste the full interview transcript here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[200px] text-sm font-mono"
            />
            {scoreError && (
              <p className="text-red-600 text-sm">{scoreError}</p>
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleScore}
                disabled={scoring || !transcript.trim()}
                className="gap-2 bg-[#C0503C] hover:bg-[#a04130] text-white"
              >
                {scoring ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Scoring...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" /> Score Transcript
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scorecard Result */}
      {scorecard && (
        <Card className="border-2 border-[#0B1A3B]">
          <CardContent className="p-0">
            {/* Scorecard header */}
            <div className="bg-[#0B1A3B] text-white text-center py-3 rounded-t-lg">
              <h2 className="text-xl font-bold tracking-tight">
                SCORECARD RESULT
              </h2>
            </div>
            <div className="bg-[#F2E6D9] text-center py-2">
              <p className="text-[#C0503C] font-semibold">
                {scorecard.candidateName} &mdash; {scorecard.clientName}{" "}
                {scorecard.roleName}
              </p>
            </div>

            {/* Result banner */}
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                  Overall Result
                </p>
                <p
                  className={`text-2xl font-bold px-4 py-1 rounded mt-1 inline-block ${resultColor}`}
                >
                  {scorecard.result}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">
                  Total Score
                </p>
                <p className="text-3xl font-bold text-[#0B1A3B]">
                  {scorecard.totalScore}{" "}
                  <span className="text-lg text-gray-400">/ 45</span>
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <Separator />

              {/* Scores by pillar */}
              {(["COMMUNICATION", "BEHAVIOUR", "SKILL FIT"] as const).map(
                (pillar) => {
                  const pillarScores = scorecard.scores.filter(
                    (s) => s.pillar === pillar
                  );
                  const pillarTotal = pillarScores.reduce(
                    (sum, s) => sum + s.score,
                    0
                  );
                  return (
                    <div key={pillar}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-[#0B1A3B] uppercase tracking-wide">
                          {pillar}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {pillarTotal} / {pillarScores.length * 5}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {pillarScores.map((score) => (
                          <div
                            key={score.area}
                            className="grid grid-cols-12 gap-3 items-start"
                          >
                            <div className="col-span-3 text-sm font-medium text-[#0B1A3B]">
                              {score.area}
                            </div>
                            <div className="col-span-1">
                              <span
                                className={`inline-block w-8 h-8 rounded text-center leading-8 font-bold text-white text-sm ${
                                  score.score >= 4
                                    ? "bg-green-600"
                                    : score.score <= 2
                                      ? "bg-[#C0503C]"
                                      : "bg-[#0B1A3B]"
                                }`}
                              >
                                {score.score}
                              </span>
                            </div>
                            <div className="col-span-8 text-sm text-gray-600">
                              {score.notes}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}

              <Separator />

              {/* Gut check */}
              <div>
                <h4 className="text-sm font-bold text-[#0B1A3B] uppercase tracking-wide mb-1">
                  Gut Check
                </h4>
                <p className="text-sm text-gray-700 bg-blue-50 rounded px-3 py-2">
                  &ldquo;Would I put this person in the role tomorrow?&rdquo;
                  &mdash; {scorecard.gutCheck}
                </p>
              </div>

              {/* Strengths / Concerns / Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-1">
                    Key Strengths
                  </h4>
                  <p className="text-sm text-gray-700 bg-green-50 rounded px-3 py-2 whitespace-pre-line">
                    {scorecard.keyStrengths}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#C0503C] uppercase tracking-wide mb-1">
                    Concerns
                  </h4>
                  <p className="text-sm text-gray-700 bg-red-50 rounded px-3 py-2 whitespace-pre-line">
                    {scorecard.concerns}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#0B1A3B] uppercase tracking-wide mb-1">
                  Recommendation
                </h4>
                <p className="text-sm text-gray-700 bg-[#F2E6D9] rounded px-3 py-2">
                  {scorecard.recommendation}
                </p>
              </div>

              <Separator />

              {/* PDF Download buttons */}
              <div className="no-print flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    handleDownloadPDF(
                      "/api/generate-scorecard-pdf",
                      `Interview Scorecard - ${scorecard.candidateName}.pdf`,
                      setDownloadingScorecard
                    )
                  }
                  disabled={downloadingScorecard}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {downloadingScorecard
                    ? "Generating..."
                    : "Download Scorecard PDF"}
                </Button>
                <Button
                  onClick={() =>
                    handleDownloadPDF(
                      "/api/generate-summary-pdf",
                      `Interview Summary - ${scorecard.candidateName}.pdf`,
                      setDownloadingSummary
                    )
                  }
                  disabled={downloadingSummary}
                  className="gap-2 bg-[#0B1A3B] hover:bg-[#162d5a] text-white"
                >
                  <Download className="h-4 w-4" />
                  {downloadingSummary
                    ? "Generating..."
                    : "Download Client Summary PDF"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interview Guide — collapsible after scoring */}
      <Card>
        <CardContent className="p-0">
          {/* Title */}
          <div
            className={`bg-[#0B1A3B] text-white text-center py-3 rounded-t-lg ${scorecard ? "cursor-pointer" : ""}`}
            onClick={scorecard ? () => setQuestionsCollapsed(!questionsCollapsed) : undefined}
          >
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                INTERVIEW SCORECARD
              </h2>
              {scorecard && (
                questionsCollapsed ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronUp className="h-5 w-5" />
                )
              )}
            </div>
          </div>
          <div className="bg-[#F2E6D9] text-center py-2">
            <p className="text-[#C0503C] font-semibold">
              {guide.clientName} &mdash; {guide.roleName}
            </p>
          </div>

          {!questionsCollapsed && (
            <div className="p-6 space-y-6">
              {/* Candidate info */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div>
                  <span className="font-semibold text-[#0B1A3B]">
                    Candidate:
                  </span>{" "}
                  {guide.candidateName}
                </div>
                <div>
                  <span className="font-semibold text-[#0B1A3B]">
                    Interviewer:
                  </span>{" "}
                  <span className="text-muted-foreground italic">
                    [your name]
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-[#0B1A3B]">Date:</span>{" "}
                  <span className="text-muted-foreground italic">[date]</span>
                </div>
                <div>
                  <span className="font-semibold text-[#0B1A3B]">
                    Duration:
                  </span>{" "}
                  15 minutes
                </div>
              </div>

              <Separator />

              {/* Opening */}
              <div>
                <div className="bg-[#0B1A3B] text-white px-4 py-2 rounded text-sm font-semibold">
                  OPENING (1 min)
                </div>
                <div className="bg-[#F2E6D9] px-4 py-3 rounded-b text-sm italic text-gray-600">
                  {guide.openingScript}
                </div>
              </div>

              {/* Sections */}
              {guide.sections.map((section, sIdx) => (
                <div key={sIdx}>
                  <div className="bg-[#0B1A3B] text-white px-4 py-2 rounded text-sm font-semibold">
                    {sIdx + 1}. {section.pillar} ({section.timeAllocation})
                  </div>
                  <div className="bg-[#F2E6D9] px-4 py-1.5 text-xs text-gray-500">
                    {section.subtitle}
                  </div>

                  <div className="divide-y">
                    {section.questions.map((q) => (
                      <div
                        key={q.number}
                        className="grid grid-cols-12 gap-3 py-3"
                      >
                        <div className="col-span-1 text-center font-bold text-[#0B1A3B]">
                          {q.number}
                        </div>
                        <div className="col-span-5 text-sm">{q.text}</div>
                        <div className="col-span-6 text-sm text-gray-500 bg-blue-50 rounded px-3 py-2">
                          <span className="font-medium text-[#0B1A3B] text-xs uppercase tracking-wide">
                            Listen for:
                          </span>
                          <br />
                          {q.listenFor}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Close */}
              <div>
                <div className="bg-[#0B1A3B] text-white px-4 py-2 rounded text-sm font-semibold">
                  4. CLOSE (2 min)
                </div>
                <div className="grid grid-cols-12 gap-3 py-3">
                  <div className="col-span-1 text-center font-bold text-[#0B1A3B]">
                    10
                  </div>
                  <div className="col-span-5 text-sm">
                    {guide.closingQuestion.text}
                  </div>
                  <div className="col-span-6 text-sm text-gray-500 bg-blue-50 rounded px-3 py-2">
                    <span className="font-medium text-[#0B1A3B] text-xs uppercase tracking-wide">
                      Listen for:
                    </span>
                    <br />
                    {guide.closingQuestion.listenFor}
                  </div>
                </div>
              </div>

              {/* CV Probes */}
              {guide.cvProbes.length > 0 && (
                <div>
                  <div className="bg-[#C0503C] text-white px-4 py-2 rounded text-sm font-semibold">
                    CV PROBES &mdash; IF TIME PERMITS
                  </div>
                  <div className="space-y-2 py-3">
                    {guide.cvProbes.map((probe, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="font-bold text-[#0B1A3B]">
                          &bull;
                        </span>
                        <div>
                          <span className="font-semibold">{probe.topic}</span>
                          <span className="text-gray-500">
                            {" "}
                            &mdash; {probe.detail}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Scoring Framework Reference */}
              <div>
                <div className="bg-gray-100 px-4 py-2 rounded text-sm font-semibold text-[#0B1A3B]">
                  SCORING FRAMEWORK (9 areas &times; 5 = /45)
                </div>
                <div className="grid grid-cols-3 gap-4 py-3">
                  {SCORING_FRAMEWORK.pillars.map((pillar) => (
                    <div key={pillar.name}>
                      <p className="text-xs font-bold text-[#0B1A3B] uppercase tracking-wide mb-1">
                        {pillar.name}
                      </p>
                      <ul className="text-xs text-gray-600 space-y-0.5">
                        {pillar.areas.map((area) => (
                          <li key={area}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  36+ = STRONG YES &nbsp;|&nbsp; 27-35 = YES &nbsp;|&nbsp;
                  18-26 = MAYBE &nbsp;|&nbsp; &lt;18 = NO
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
