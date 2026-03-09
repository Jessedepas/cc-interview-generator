"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, RefreshCw } from "lucide-react";
import type { ProfileData } from "@/lib/profile-types";

export function ProfileCreator() {
  const [cvText, setCvText] = useState("");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    if (!cvText.trim()) return;
    setExtracting(true);
    setError(null);

    try {
      const res = await fetch("/api/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText }),
      });

      if (!res.ok) throw new Error("Extraction failed");

      const data = await res.json();
      setProfileData(data);
    } catch {
      setError("Failed to extract profile data. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleDownload() {
    if (!profileData) return;
    setDownloading(true);

    try {
      const res = await fetch("/api/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) throw new Error("PDF generation failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${profileData.candidateName} - Cruise Control Profile.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function handleReset() {
    setProfileData(null);
    setCvText("");
    setError(null);
  }

  // Preview / edit mode
  if (profileData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0B1A3B]">
            Profile Preview
          </h2>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Start Over
            </Button>
            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="gap-2 bg-[#C0503C] hover:bg-[#a84433] text-white"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        </div>

        <ProfilePreview data={profileData} onChange={setProfileData} />
      </div>
    );
  }

  // Input mode
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#0B1A3B]">
          Create Candidate Profile
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Paste the candidate&apos;s CV below. The AI will extract their details
          and generate a branded Cruise Control profile PDF.
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExtract();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cv-text">Candidate CV</Label>
            <Textarea
              id="cv-text"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste the full CV text here..."
              className="min-h-[400px] text-sm font-mono"
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
            disabled={extracting || !cvText.trim()}
            className="w-full bg-[#0B1A3B] hover:bg-[#162d5a] text-white"
          >
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Extracting profile data...
              </>
            ) : (
              "Extract & Preview"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Editable preview of extracted data
function ProfilePreview({
  data,
  onChange,
}: {
  data: ProfileData;
  onChange: (d: ProfileData) => void;
}) {
  function updateField(field: keyof ProfileData, value: string) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left column - personal details */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0B1A3B]">
              Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <EditableField
              label="Name"
              value={data.candidateName}
              onChange={(v) => updateField("candidateName", v)}
            />
            <EditableField
              label="Badge"
              value={data.badge || ""}
              onChange={(v) =>
                onChange({ ...data, badge: v || undefined })
              }
              placeholder="e.g. CPA (optional)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0B1A3B]">
              About Me
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.aboutMe}
              onChange={(e) => updateField("aboutMe", e.target.value)}
              className="text-sm min-h-[100px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0B1A3B]">
              Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.education.map((edu, i) => (
              <div key={i} className="text-sm space-y-1 border-l-2 border-[#C0503C] pl-3">
                <div className="font-semibold">{edu.degree}</div>
                <div className="text-muted-foreground">{edu.institution}</div>
                <div className="text-muted-foreground text-xs">
                  {edu.details}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0B1A3B]">
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableList
              items={data.certifications}
              onChange={(items) =>
                onChange({ ...data, certifications: items })
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0B1A3B]">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <EditableList
              items={data.skills}
              onChange={(items) => onChange({ ...data, skills: items })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0B1A3B]">Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <EditableList
              items={data.systems}
              onChange={(items) => onChange({ ...data, systems: items })}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right column - experience */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#0B1A3B]">
              Working Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.experience.map((exp, i) => (
              <div
                key={i}
                className="border-l-2 border-[#0B1A3B] pl-3 space-y-2"
              >
                <div className="font-semibold text-sm text-[#0B1A3B]">
                  {exp.company}
                </div>
                {exp.location && (
                  <div className="text-xs text-muted-foreground">
                    {exp.location}
                  </div>
                )}
                {exp.roles.map((role, j) => (
                  <div key={j} className="ml-2 space-y-1">
                    <div className="text-sm font-medium">{role.title}</div>
                    <div className="text-xs text-[#C0503C]">{role.dates}</div>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {role.bullets.map((b, k) => (
                        <li key={k} className="flex gap-1.5">
                          <span className="text-[#C0503C] mt-0.5">&#8226;</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        {data.awards && data.awards.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#0B1A3B]">
                Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EditableList
                items={data.awards}
                onChange={(items) => onChange({ ...data, awards: items })}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0B1A3B]"
      />
    </div>
  );
}

function EditableList({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-[#C0503C] mt-1.5 text-xs">&#8226;</span>
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const updated = [...items];
              updated[i] = e.target.value;
              onChange(updated);
            }}
            className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0B1A3B]"
          />
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="text-xs text-red-400 hover:text-red-600 mt-1"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ""])}
        className="text-xs text-[#0B1A3B] hover:underline"
      >
        + Add item
      </button>
    </div>
  );
}
