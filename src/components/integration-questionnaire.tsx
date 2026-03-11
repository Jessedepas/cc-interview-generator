"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Download,
  Rocket,
  Pencil,
} from "lucide-react";
import type {
  IntegrationQuestionnaire,
  KeyFunction,
  SystemSoftware,
  KPI,
  TrainingResource,
  OnboardingProgram,
} from "@/lib/onboarding-types";
import {
  TIMEZONES,
  WORKING_DAYS,
  generateTimeSlots,
  createEmptyQuestionnaire,
  generateId,
} from "@/lib/onboarding-types";
import { OnboardingProgramView } from "@/components/onboarding-program-view";

const STEPS = [
  "Client & Role Details",
  "Position Description & Functions",
  "Systems & Software",
  "KPIs & Performance Expectations",
  "Training & Resources",
  "Review & Generate",
];

const TIME_SLOTS = generateTimeSlots();

export function IntegrationQuestionnaire() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntegrationQuestionnaire>(
    createEmptyQuestionnaire()
  );
  const [pdfLoading, setPdfLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [program, setProgram] = useState<OnboardingProgram | null>(null);

  function update<K extends keyof IntegrationQuestionnaire>(
    key: K,
    value: IntegrationQuestionnaire[K]
  ) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }
  function goTo(s: number) {
    setStep(s);
  }

  // Key Functions helpers
  function addFunction() {
    const fn: KeyFunction = {
      id: generateId(),
      name: "",
      description: "",
      priority: "Medium",
    };
    update("keyFunctions", [...data.keyFunctions, fn]);
  }
  function updateFunction(id: string, patch: Partial<KeyFunction>) {
    update(
      "keyFunctions",
      data.keyFunctions.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }
  function removeFunction(id: string) {
    update(
      "keyFunctions",
      data.keyFunctions.filter((f) => f.id !== id)
    );
    // Also remove associated KPIs
    update(
      "kpis",
      data.kpis.filter((k) => k.functionId !== id)
    );
  }

  // Systems helpers
  function addSystem() {
    const sys: SystemSoftware = {
      id: generateId(),
      name: "",
      purpose: "",
      accessProvidedBy: "Client",
      loginDetailsReady: "No",
    };
    update("systems", [...data.systems, sys]);
  }
  function updateSystem(id: string, patch: Partial<SystemSoftware>) {
    update(
      "systems",
      data.systems.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }
  function removeSystem(id: string) {
    update(
      "systems",
      data.systems.filter((s) => s.id !== id)
    );
  }

  // KPI helpers
  function addKPI(functionId: string) {
    const kpi: KPI = {
      id: generateId(),
      functionId,
      name: "",
      targetValue: "",
      measurementMethod: "",
      thirtyDayTarget: "",
      ninetyDayTarget: "",
    };
    update("kpis", [...data.kpis, kpi]);
  }
  function updateKPI(id: string, patch: Partial<KPI>) {
    update(
      "kpis",
      data.kpis.map((k) => (k.id === id ? { ...k, ...patch } : k))
    );
  }
  function removeKPI(id: string) {
    update(
      "kpis",
      data.kpis.filter((k) => k.id !== id)
    );
  }

  // Training Resource helpers
  function addResource() {
    const res: TrainingResource = {
      id: generateId(),
      name: "",
      type: "Document",
      url: "",
      status: "Ready",
    };
    update("trainingResources", [...data.trainingResources, res]);
  }
  function updateResource(id: string, patch: Partial<TrainingResource>) {
    update(
      "trainingResources",
      data.trainingResources.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      )
    );
  }
  function removeResource(id: string) {
    update(
      "trainingResources",
      data.trainingResources.filter((r) => r.id !== id)
    );
  }

  // Toggle working day
  function toggleDay(day: string) {
    const days = data.workingDays.includes(day)
      ? data.workingDays.filter((d) => d !== day)
      : [...data.workingDays, day];
    update("workingDays", days);
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-integration-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Integration Summary - ${data.clientName} - ${data.rpName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerateLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Onboarding generation failed");
      }
      const result: OnboardingProgram = await res.json();
      setProgram(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerateLoading(false);
    }
  }

  if (program) {
    return (
      <OnboardingProgramView
        program={program}
        onBack={() => {
          setProgram(null);
          setStep(STEPS.length - 1); // Return to review step
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => goTo(i)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
                i === step
                  ? "bg-[#0B1A3B] text-white"
                  : i < step
                  ? "bg-[#0B1A3B]/10 text-[#0B1A3B] hover:bg-[#0B1A3B]/20"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === step
                    ? "bg-white text-[#0B1A3B]"
                    : i < step
                    ? "bg-[#0B1A3B] text-white"
                    : "bg-gray-300 text-white"
                }`}
              >
                {i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="w-4 h-px bg-gray-300 hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#0B1A3B]">
            Step {step + 1}: {STEPS[step]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && renderStep1()}
          {step === 1 && renderStep2()}
          {step === 2 && renderStep3()}
          {step === 3 && renderStep4()}
          {step === 4 && renderStep5()}
          {step === 5 && renderStep6()}

          {error && (
            <div className="mt-4 text-sm text-[#C0503C] bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          {step < 5 && (
            <div className="flex justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={back}
                disabled={step === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={next}
                className="bg-[#0B1A3B] hover:bg-[#162d5a] text-white"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ─── Step 1: Client & Role Details ───
  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Client Name</Label>
            <Input
              value={data.clientName}
              onChange={(e) => update("clientName", e.target.value)}
              placeholder="e.g. Craig Burgess Motor Group"
            />
          </div>
          <div className="space-y-1.5">
            <Label>RP Name</Label>
            <Input
              value={data.rpName}
              onChange={(e) => update("rpName", e.target.value)}
              placeholder="e.g. Maricar Mascarina"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Client Contact Name</Label>
            <Input
              value={data.clientContactName}
              onChange={(e) => update("clientContactName", e.target.value)}
              placeholder="Primary contact for onboarding"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Client Contact Email</Label>
            <Input
              type="email"
              value={data.clientContactEmail}
              onChange={(e) => update("clientContactEmail", e.target.value)}
              placeholder="email@client.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Role Title</Label>
            <Input
              value={data.roleTitle}
              onChange={(e) => update("roleTitle", e.target.value)}
              placeholder="e.g. Accounts Receivable Officer"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={data.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Working Hours Start</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={data.workingHoursStart}
              onChange={(e) => update("workingHoursStart", e.target.value)}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Working Hours End</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={data.workingHoursEnd}
              onChange={(e) => update("workingHoursEnd", e.target.value)}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={data.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Working Days</Label>
          <div className="flex flex-wrap gap-2">
            {WORKING_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  data.workingDays.includes(day)
                    ? "bg-[#0B1A3B] text-white border-[#0B1A3B]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 2: Position Description & Functions ───
  function renderStep2() {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Position Description</Label>
          <Textarea
            value={data.positionDescription}
            onChange={(e) => update("positionDescription", e.target.value)}
            placeholder="Paste the full position description here..."
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Key Functions</Label>
            <Button variant="outline" size="sm" onClick={addFunction}>
              <Plus className="mr-1 h-3 w-3" />
              Add Function
            </Button>
          </div>

          {data.keyFunctions.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              No functions added yet. Click &quot;Add Function&quot; to begin.
            </p>
          )}

          {data.keyFunctions.map((fn, idx) => (
            <div
              key={fn.id}
              className="border rounded-lg p-4 space-y-3 relative"
            >
              <button
                onClick={() => removeFunction(fn.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-[#C0503C] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-xs font-medium text-gray-400 uppercase">
                Function {idx + 1}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Function Name</Label>
                  <Input
                    value={fn.name}
                    onChange={(e) =>
                      updateFunction(fn.id, { name: e.target.value })
                    }
                    placeholder="e.g. Invoice Processing"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <Label>Priority</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={fn.priority}
                    onChange={(e) =>
                      updateFunction(fn.id, {
                        priority: e.target.value as KeyFunction["priority"],
                      })
                    }
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={fn.description}
                  onChange={(e) =>
                    updateFunction(fn.id, { description: e.target.value })
                  }
                  placeholder="Brief description of this function"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Step 3: Systems & Software ───
  function renderStep3() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Systems & Software</Label>
          <Button variant="outline" size="sm" onClick={addSystem}>
            <Plus className="mr-1 h-3 w-3" />
            Add System
          </Button>
        </div>

        {data.systems.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            No systems added yet. Click &quot;Add System&quot; to begin.
          </p>
        )}

        {data.systems.map((sys, idx) => (
          <div
            key={sys.id}
            className="border rounded-lg p-4 space-y-3 relative"
          >
            <button
              onClick={() => removeSystem(sys.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-[#C0503C] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-xs font-medium text-gray-400 uppercase">
              System {idx + 1}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>System / Software Name</Label>
                <Input
                  value={sys.name}
                  onChange={(e) =>
                    updateSystem(sys.id, { name: e.target.value })
                  }
                  placeholder="e.g. Xero, Pentana DMS, Outlook"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Purpose</Label>
                <Input
                  value={sys.purpose}
                  onChange={(e) =>
                    updateSystem(sys.id, { purpose: e.target.value })
                  }
                  placeholder="What it's used for in this role"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Access Provided By</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={sys.accessProvidedBy}
                  onChange={(e) =>
                    updateSystem(sys.id, {
                      accessProvidedBy:
                        e.target.value as SystemSoftware["accessProvidedBy"],
                    })
                  }
                >
                  <option value="Client">Client</option>
                  <option value="CC">CC</option>
                  <option value="RP already has access">
                    RP already has access
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Login Details Ready</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={sys.loginDetailsReady}
                  onChange={(e) =>
                    updateSystem(sys.id, {
                      loginDetailsReady:
                        e.target.value as SystemSoftware["loginDetailsReady"],
                    })
                  }
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Step 4: KPIs & Performance Expectations ───
  function renderStep4() {
    return (
      <div className="space-y-6">
        {data.keyFunctions.length === 0 ? (
          <div className="text-sm text-gray-400 italic border rounded-lg p-6 text-center">
            No functions defined yet. Go back to Step 2 to add key functions
            before setting KPIs.
          </div>
        ) : (
          data.keyFunctions.map((fn) => {
            const fnKpis = data.kpis.filter((k) => k.functionId === fn.id);
            return (
              <div key={fn.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#0B1A3B]">
                      {fn.name || "Unnamed Function"}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        fn.priority === "High"
                          ? "bg-red-100 text-red-700"
                          : fn.priority === "Medium"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {fn.priority} Priority
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addKPI(fn.id)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add KPI
                  </Button>
                </div>

                {fnKpis.length === 0 && (
                  <p className="text-sm text-gray-400 italic pl-2">
                    No KPIs defined for this function.
                  </p>
                )}

                {fnKpis.map((kpi, idx) => (
                  <div
                    key={kpi.id}
                    className="border rounded-lg p-4 space-y-3 relative ml-4"
                  >
                    <button
                      onClick={() => removeKPI(kpi.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-[#C0503C] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="text-xs font-medium text-gray-400 uppercase">
                      KPI {idx + 1}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>KPI Name</Label>
                        <Input
                          value={kpi.name}
                          onChange={(e) =>
                            updateKPI(kpi.id, { name: e.target.value })
                          }
                          placeholder="e.g. Invoices processed per hour"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Target Value</Label>
                        <Input
                          value={kpi.targetValue}
                          onChange={(e) =>
                            updateKPI(kpi.id, { targetValue: e.target.value })
                          }
                          placeholder="e.g. 15/hour, 95%, etc."
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Measurement Method</Label>
                      <Input
                        value={kpi.measurementMethod}
                        onChange={(e) =>
                          updateKPI(kpi.id, {
                            measurementMethod: e.target.value,
                          })
                        }
                        placeholder="e.g. DMS report, manual count, ActivTrak"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>30-Day Target</Label>
                        <Input
                          value={kpi.thirtyDayTarget}
                          onChange={(e) =>
                            updateKPI(kpi.id, {
                              thirtyDayTarget: e.target.value,
                            })
                          }
                          placeholder="What 'good' looks like at 30 days"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>90-Day Target</Label>
                        <Input
                          value={kpi.ninetyDayTarget}
                          onChange={(e) =>
                            updateKPI(kpi.id, {
                              ninetyDayTarget: e.target.value,
                            })
                          }
                          placeholder="What 'green/stable' looks like"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
              </div>
            );
          })
        )}
      </div>
    );
  }

  // ─── Step 5: Training & Resources ───
  function renderStep5() {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Primary Trainer</Label>
          <Input
            value={data.primaryTrainer}
            onChange={(e) => update("primaryTrainer", e.target.value)}
            placeholder="Name of person who will train the RP"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">
              Training Resources
            </Label>
            <Button variant="outline" size="sm" onClick={addResource}>
              <Plus className="mr-1 h-3 w-3" />
              Add Resource
            </Button>
          </div>

          {data.trainingResources.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              No resources added yet.
            </p>
          )}

          {data.trainingResources.map((res, idx) => (
            <div
              key={res.id}
              className="border rounded-lg p-4 space-y-3 relative"
            >
              <button
                onClick={() => removeResource(res.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-[#C0503C] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-xs font-medium text-gray-400 uppercase">
                Resource {idx + 1}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Resource Name</Label>
                  <Input
                    value={res.name}
                    onChange={(e) =>
                      updateResource(res.id, { name: e.target.value })
                    }
                    placeholder="e.g. Invoice Processing SOP"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={res.type}
                    onChange={(e) =>
                      updateResource(res.id, {
                        type: e.target.value as TrainingResource["type"],
                      })
                    }
                  >
                    <option value="Loom">Loom</option>
                    <option value="Scribe">Scribe</option>
                    <option value="Document">Document</option>
                    <option value="Video">Video</option>
                    <option value="Live Training">Live Training</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={res.status}
                    onChange={(e) =>
                      updateResource(res.id, {
                        status: e.target.value as TrainingResource["status"],
                      })
                    }
                  >
                    <option value="Ready">Ready</option>
                    <option value="To be created">To be created</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>URL or Location (optional)</Label>
                <Input
                  value={res.url}
                  onChange={(e) =>
                    updateResource(res.id, { url: e.target.value })
                  }
                  placeholder="https://... or file path"
                />
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Communication Preferences
          </Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Primary Channel</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={data.primaryChannel}
                onChange={(e) =>
                  update(
                    "primaryChannel",
                    e.target.value as IntegrationQuestionnaire["primaryChannel"]
                  )
                }
              >
                <option value="Teams">Teams</option>
                <option value="Slack">Slack</option>
                <option value="Email">Email</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Escalation Contact Name</Label>
              <Input
                value={data.escalationContactName}
                onChange={(e) =>
                  update("escalationContactName", e.target.value)
                }
                placeholder="Who the RP escalates issues to"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Escalation Contact Email</Label>
              <Input
                type="email"
                value={data.escalationContactEmail}
                onChange={(e) =>
                  update("escalationContactEmail", e.target.value)
                }
                placeholder="escalation@client.com"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step 6: Review & Generate ───
  function renderStep6() {
    return (
      <div className="space-y-6">
        {/* Section 1: Client & Role */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#0B1A3B]">
              Client & Role Details
            </h3>
            <Button variant="ghost" size="sm" onClick={() => goTo(0)}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <ReviewField label="Client" value={data.clientName} />
            <ReviewField label="RP Name" value={data.rpName} />
            <ReviewField label="Contact" value={data.clientContactName} />
            <ReviewField label="Contact Email" value={data.clientContactEmail} />
            <ReviewField label="Role" value={data.roleTitle} />
            <ReviewField label="Start Date" value={data.startDate} />
            <ReviewField
              label="Hours"
              value={`${data.workingHoursStart} - ${data.workingHoursEnd}`}
            />
            <ReviewField label="Timezone" value={data.timezone} />
            <ReviewField
              label="Days"
              value={data.workingDays.map((d) => d.slice(0, 3)).join(", ")}
            />
          </div>
        </div>

        <Separator />

        {/* Section 2: PD & Functions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#0B1A3B]">
              Position Description & Functions
            </h3>
            <Button variant="ghost" size="sm" onClick={() => goTo(1)}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
            <div>
              <span className="text-gray-500 text-xs uppercase font-medium">
                Position Description
              </span>
              <p className="mt-1 whitespace-pre-wrap line-clamp-4">
                {data.positionDescription || (
                  <span className="text-gray-400 italic">Not provided</span>
                )}
              </p>
            </div>
            {data.keyFunctions.length > 0 && (
              <div>
                <span className="text-gray-500 text-xs uppercase font-medium">
                  Key Functions
                </span>
                <ul className="mt-1 space-y-1">
                  {data.keyFunctions.map((fn) => (
                    <li key={fn.id} className="flex items-center gap-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          fn.priority === "High"
                            ? "bg-red-100 text-red-700"
                            : fn.priority === "Medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {fn.priority}
                      </span>
                      <span className="font-medium">{fn.name}</span>
                      {fn.description && (
                        <span className="text-gray-500">
                          — {fn.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Section 3: Systems */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#0B1A3B]">
              Systems & Software
            </h3>
            <Button variant="ghost" size="sm" onClick={() => goTo(2)}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            {data.systems.length === 0 ? (
              <span className="text-gray-400 italic">No systems added</span>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="pb-1">System</th>
                    <th className="pb-1">Purpose</th>
                    <th className="pb-1">Access By</th>
                    <th className="pb-1">Login Ready</th>
                  </tr>
                </thead>
                <tbody>
                  {data.systems.map((sys) => (
                    <tr key={sys.id} className="border-t border-gray-200">
                      <td className="py-1 font-medium">{sys.name}</td>
                      <td className="py-1 text-gray-600">{sys.purpose}</td>
                      <td className="py-1">{sys.accessProvidedBy}</td>
                      <td className="py-1">{sys.loginDetailsReady}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <Separator />

        {/* Section 4: KPIs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#0B1A3B]">
              KPIs & Performance
            </h3>
            <Button variant="ghost" size="sm" onClick={() => goTo(3)}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
            {data.kpis.length === 0 ? (
              <span className="text-gray-400 italic">No KPIs defined</span>
            ) : (
              data.keyFunctions.map((fn) => {
                const fnKpis = data.kpis.filter(
                  (k) => k.functionId === fn.id
                );
                if (fnKpis.length === 0) return null;
                return (
                  <div key={fn.id}>
                    <span className="font-medium">{fn.name}</span>
                    <ul className="mt-1 ml-4 space-y-1">
                      {fnKpis.map((kpi) => (
                        <li key={kpi.id}>
                          <span className="font-medium">{kpi.name}</span>
                          {kpi.targetValue && (
                            <span className="text-gray-500">
                              {" "}
                              — Target: {kpi.targetValue}
                            </span>
                          )}
                          {kpi.thirtyDayTarget && (
                            <span className="text-gray-500">
                              {" "}
                              | 30d: {kpi.thirtyDayTarget}
                            </span>
                          )}
                          {kpi.ninetyDayTarget && (
                            <span className="text-gray-500">
                              {" "}
                              | 90d: {kpi.ninetyDayTarget}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <Separator />

        {/* Section 5: Training */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#0B1A3B]">
              Training & Resources
            </h3>
            <Button variant="ghost" size="sm" onClick={() => goTo(4)}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <ReviewField label="Primary Trainer" value={data.primaryTrainer} />
            <ReviewField
              label="Communication"
              value={data.primaryChannel}
            />
            <ReviewField
              label="Escalation"
              value={
                data.escalationContactName
                  ? `${data.escalationContactName} (${data.escalationContactEmail})`
                  : ""
              }
            />
            {data.trainingResources.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-500 text-xs uppercase font-medium">
                  Resources
                </span>
                <ul className="mt-1 space-y-1">
                  {data.trainingResources.map((res) => (
                    <li key={res.id} className="flex items-center gap-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                        {res.type}
                      </span>
                      <span>{res.name}</span>
                      <span
                        className={`text-xs ${
                          res.status === "Ready"
                            ? "text-green-600"
                            : res.status === "To be created"
                            ? "text-yellow-600"
                            : "text-gray-400"
                        }`}
                      >
                        ({res.status})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => goTo(0)}
            className="flex-none"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Start
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="border-[#0B1A3B] text-[#0B1A3B] hover:bg-[#0B1A3B]/5"
          >
            {pdfLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Integration Summary
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateLoading}
            className="bg-[#0B1A3B] hover:bg-[#162d5a] text-white"
          >
            {generateLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            Generate Onboarding Program
          </Button>
        </div>
      </div>
    );
  }
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500 text-xs uppercase font-medium">
        {label}
      </span>
      <p className="font-medium">
        {value || <span className="text-gray-400 italic">Not provided</span>}
      </p>
    </div>
  );
}
