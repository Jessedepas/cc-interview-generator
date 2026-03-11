"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  ListChecks,
  Target,
  Monitor,
} from "lucide-react";
import type { OnboardingProgram, OnboardingTask } from "@/lib/onboarding-types";

interface OnboardingProgramViewProps {
  program: OnboardingProgram;
  onBack: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  High: "bg-[#C0503C] text-white",
  Medium: "bg-[#0B1A3B] text-white",
  Low: "bg-gray-200 text-gray-700",
};

const WEEK_PHASE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  weekly: {
    bg: "bg-[#0B1A3B]/5",
    border: "border-[#0B1A3B]/30",
    label: "Weekly Check-ins",
  },
  fortnightly: {
    bg: "bg-[#C0503C]/5",
    border: "border-[#C0503C]/30",
    label: "Fortnightly Check-ins",
  },
  monthly: {
    bg: "bg-[#F2E6D9]/50",
    border: "border-[#F2E6D9]",
    label: "Monthly Check-ins",
  },
};

function getWeekPhase(weekNumber: number): "weekly" | "fortnightly" | "monthly" {
  if (weekNumber <= 4) return "weekly";
  if (weekNumber <= 8) return "fortnightly";
  return "monthly";
}

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

function getCheckInSchedule(startDate: string): { week: number; date: Date; cadence: string }[] {
  const schedule: { week: number; date: Date; cadence: string }[] = [];
  // Weeks 1-4: weekly (4 check-ins)
  for (let w = 1; w <= 4; w++) {
    schedule.push({
      week: w,
      date: addDays(startDate, w * 7 - 1), // end of each week
      cadence: "Weekly",
    });
  }
  // Weeks 5-8: fortnightly (2 check-ins)
  schedule.push({ week: 6, date: addDays(startDate, 6 * 7 - 1), cadence: "Fortnightly" });
  schedule.push({ week: 8, date: addDays(startDate, 8 * 7 - 1), cadence: "Fortnightly" });
  // Weeks 9-12: monthly (2 check-ins)
  schedule.push({ week: 10, date: addDays(startDate, 10 * 7 - 1), cadence: "Monthly" });
  schedule.push({ week: 12, date: addDays(startDate, 12 * 7 - 1), cadence: "Monthly" });
  return schedule;
}

export function OnboardingProgramView({ program, onBack }: OnboardingProgramViewProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkInSchedule = getCheckInSchedule(program.startDate);

  // Group tasks by function
  const tasksByFunction = new Map<string, OnboardingTask[]>();
  for (const task of program.tasks) {
    if (!tasksByFunction.has(task.functionName)) {
      tasksByFunction.set(task.functionName, []);
    }
    tasksByFunction.get(task.functionName)!.push(task);
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-onboarding-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(program),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Onboarding Program - ${program.clientName} - ${program.rpName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPdfLoading(false);
    }
  }

  function toggleWeek(weekNumber: number) {
    setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0B1A3B]">
              Onboarding Program
            </h2>
            <p className="text-gray-500 mt-1">
              {program.rpName} &mdash; {program.roleTitle} at {program.clientName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Questionnaire
            </Button>
            <Button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="bg-[#0B1A3B] hover:bg-[#162d5a] text-white"
            >
              {pdfLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download Onboarding Program PDF
            </Button>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-[#0B1A3B]/5 px-3 py-1.5 rounded-md">
            <Calendar className="h-4 w-4 text-[#0B1A3B]" />
            <span className="text-sm font-medium text-[#0B1A3B]">
              Start: {program.startDate}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#0B1A3B]/5 px-3 py-1.5 rounded-md">
            <ListChecks className="h-4 w-4 text-[#0B1A3B]" />
            <span className="text-sm font-medium text-[#0B1A3B]">
              {program.totalTasks} Tasks
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#0B1A3B]/5 px-3 py-1.5 rounded-md">
            <Target className="h-4 w-4 text-[#0B1A3B]" />
            <span className="text-sm font-medium text-[#0B1A3B]">
              90-Day Program (12 Weeks)
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-md text-sm">
            <AlertCircle className="h-4 w-4 flex-none" />
            {error}
          </div>
        )}
      </div>

      <Separator />

      {/* Day 1 Checklist */}
      <section>
        <h3 className="text-lg font-semibold text-[#0B1A3B] mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#C0503C]" />
          Day 1 Checklist
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Day One Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0B1A3B]">
                First Day Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {program.dayOneChecklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-none" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* System Access */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0B1A3B] flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System Access Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {program.systemAccessChecklist.map((sys, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{sys.system}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        sys.status === "Ready"
                          ? "bg-green-100 text-green-700"
                          : sys.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {sys.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* 12-Week Plan Overview */}
      <section>
        <h3 className="text-lg font-semibold text-[#0B1A3B] mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#C0503C]" />
          12-Week Plan Overview
        </h3>

        {/* Phase labels */}
        <div className="flex gap-4 mb-4 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#0B1A3B]/20" />
            Weeks 1-4: Weekly Check-ins
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#C0503C]/20" />
            Weeks 5-8: Fortnightly Check-ins
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#F2E6D9]" />
            Weeks 9-12: Monthly Check-ins
          </span>
        </div>

        {/* Week cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {program.weeklyPlan.map((week) => {
            const phase = getWeekPhase(week.weekNumber);
            const colors = WEEK_PHASE_COLORS[phase];
            const isExpanded = expandedWeek === week.weekNumber;
            const weekTasks = program.tasks.filter(
              (t) => t.targetWeek === week.weekNumber
            );

            return (
              <div key={week.weekNumber} className="flex flex-col">
                <button
                  onClick={() => toggleWeek(week.weekNumber)}
                  className={`text-left p-3 rounded-lg border ${colors.bg} ${colors.border} hover:shadow-sm transition-shadow`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#0B1A3B]">
                      Week {week.weekNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-gray-500">
                        {weekTasks.length} tasks
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {week.focus}
                  </p>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <Card className="mt-2 border-l-2 border-l-[#C0503C]">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h4 className="text-xs font-semibold text-[#0B1A3B] uppercase mb-2">
                          Tasks
                        </h4>
                        {weekTasks.length > 0 ? (
                          <ul className="space-y-2">
                            {weekTasks.map((task) => (
                              <li key={task.id} className="text-xs">
                                <div className="flex items-start gap-2">
                                  <span
                                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}
                                  >
                                    {task.priority}
                                  </span>
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {task.taskName}
                                    </p>
                                    <p className="text-gray-500 mt-0.5">
                                      {task.description}
                                    </p>
                                    <p className="text-green-700 mt-0.5 italic">
                                      Green: {task.greenCriteria}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            No tasks assigned to this week
                          </p>
                        )}
                      </div>

                      {week.checkInAgenda.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-[#0B1A3B] uppercase mb-2">
                            Check-in Agenda
                          </h4>
                          <ul className="space-y-1">
                            {week.checkInAgenda.map((item, i) => (
                              <li
                                key={i}
                                className="text-xs text-gray-600 flex items-start gap-1.5"
                              >
                                <span className="text-[#C0503C] mt-0.5">&#8226;</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Task List by Function */}
      <section>
        <h3 className="text-lg font-semibold text-[#0B1A3B] mb-4 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-[#C0503C]" />
          Task List by Function
        </h3>

        <div className="space-y-6">
          {Array.from(tasksByFunction.entries()).map(([fnName, tasks]) => (
            <Card key={fnName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#0B1A3B]">
                  {fnName}
                  <span className="text-gray-400 font-normal ml-2">
                    ({tasks.length} task{tasks.length !== 1 ? "s" : ""})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase">
                          Task
                        </th>
                        <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase">
                          Green Criteria
                        </th>
                        <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase">
                          Priority
                        </th>
                        <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase">
                          Week
                        </th>
                        <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase">
                          Method
                        </th>
                        <th className="pb-2 text-xs font-semibold text-gray-500 uppercase">
                          Hours
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-3">
                            <p className="font-medium text-gray-800">
                              {task.taskName}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {task.description}
                            </p>
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-green-700">
                            {task.greenCriteria}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-gray-600">
                            {task.targetWeek}
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-gray-600">
                            {task.trainingMethod}
                          </td>
                          <td className="py-2.5 text-xs text-gray-600">
                            {task.estimatedHours}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Check-in Schedule */}
      <section>
        <h3 className="text-lg font-semibold text-[#0B1A3B] mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#C0503C]" />
          Check-in Schedule
        </h3>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {checkInSchedule.map((checkIn, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        checkIn.cadence === "Weekly"
                          ? "bg-[#0B1A3B]"
                          : checkIn.cadence === "Fortnightly"
                          ? "bg-[#C0503C]"
                          : "bg-[#F2E6D9] border border-gray-300"
                      }`}
                    />
                    <span className="font-medium text-[#0B1A3B]">
                      Week {checkIn.week}
                    </span>
                  </div>
                  <span className="text-gray-600">
                    {formatDate(checkIn.date)}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      checkIn.cadence === "Weekly"
                        ? "bg-[#0B1A3B]/10 text-[#0B1A3B]"
                        : checkIn.cadence === "Fortnightly"
                        ? "bg-[#C0503C]/10 text-[#C0503C]"
                        : "bg-[#F2E6D9] text-gray-700"
                    }`}
                  >
                    {checkIn.cadence}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              {checkInSchedule.length} check-ins over 90 days. Conducted by Cruise
              Control&apos;s Client Success Manager with the RP, client contact, and CC
              representative.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Bottom actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Questionnaire
        </Button>
        <Button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="bg-[#0B1A3B] hover:bg-[#162d5a] text-white"
        >
          {pdfLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download Onboarding Program PDF
        </Button>
      </div>
    </div>
  );
}
