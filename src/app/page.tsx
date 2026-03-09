"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { GeneratorForm } from "@/components/generator-form";
import { QuestionnaireView } from "@/components/questionnaire-view";
import { LoginGate } from "@/components/login-gate";
import type { InterviewGuide } from "@/lib/types";

export default function Home() {
  const [guide, setGuide] = useState<InterviewGuide | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if already authenticated (cookie exists)
    fetch("/api/auth/check").then((res) => {
      setAuthenticated(res.ok);
    });
  }, []);

  // Loading state
  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1A3B]">
        <div className="text-white text-sm">Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    return <LoginGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-8">
        {guide ? (
          <QuestionnaireView guide={guide} onBack={() => setGuide(null)} />
        ) : (
          <GeneratorForm onGenerated={setGuide} />
        )}
      </main>
      <footer className="no-print text-center py-4 text-xs text-gray-400">
        Cruise Control Group Pty Ltd &nbsp;|&nbsp; ABN 21 356 633 798
        &nbsp;|&nbsp; cruisecontrolgroup.com.au
      </footer>
    </div>
  );
}
