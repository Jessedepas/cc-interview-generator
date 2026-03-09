"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SCORING_FRAMEWORK } from "@/lib/types";
import type { InterviewGuide } from "@/lib/types";
import { Download, Printer, ArrowLeft } from "lucide-react";

interface QuestionnaireViewProps {
  guide: InterviewGuide;
  onBack: () => void;
}

export function QuestionnaireView({ guide, onBack }: QuestionnaireViewProps) {
  const [exporting, setExporting] = useState(false);

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
            onClick={() => window.print()}
            className="gap-2"
          >
            <Printer className="h-4 w-4" /> Print
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

      {/* Interview Guide */}
      <Card>
        <CardContent className="p-0">
          {/* Title */}
          <div className="bg-[#0B1A3B] text-white text-center py-3 rounded-t-lg">
            <h2 className="text-xl font-bold tracking-tight">
              INTERVIEW SCORECARD
            </h2>
          </div>
          <div className="bg-[#F2E6D9] text-center py-2">
            <p className="text-[#C0503C] font-semibold">
              {guide.clientName} &mdash; {guide.roleName}
            </p>
          </div>

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
                <span className="font-semibold text-[#0B1A3B]">Duration:</span>{" "}
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
                    <div key={q.number} className="grid grid-cols-12 gap-3 py-3">
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
                      <span className="font-bold text-[#0B1A3B]">&bull;</span>
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
                36+ = STRONG YES &nbsp;|&nbsp; 27-35 = YES &nbsp;|&nbsp; 18-26
                = MAYBE &nbsp;|&nbsp; &lt;18 = NO
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
