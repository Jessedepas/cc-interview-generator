"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InterviewGuide, GenerateRequest } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface GeneratorFormProps {
  onGenerated: (guide: InterviewGuide) => void;
}

export function GeneratorForm({ onGenerated }: GeneratorFormProps) {
  const [candidateName, setCandidateName] = useState("");
  const [clientName, setClientName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [candidateCV, setCandidateCV] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: GenerateRequest = {
        candidateName,
        clientName,
        roleName,
        jobDescription,
        candidateCV,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const guide: InterviewGuide = await res.json();
      onGenerated(guide);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#0B1A3B]">Generate Interview</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="candidateName">Candidate Name</Label>
              <Input
                id="candidateName"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Maricar Mascariña"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Client</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Parramatta Motor Group"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roleName">Role</Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Accounts Receivable"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="jd">Job Description</Label>
            <Textarea
              id="jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[160px] font-mono text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cv">Candidate CV</Label>
            <Textarea
              id="cv"
              value={candidateCV}
              onChange={(e) => setCandidateCV(e.target.value)}
              placeholder="Paste the candidate's CV here..."
              className="min-h-[160px] font-mono text-sm"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-[#C0503C] bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B1A3B] hover:bg-[#162d5a] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Interview...
              </>
            ) : (
              "Generate Interview Guide"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
