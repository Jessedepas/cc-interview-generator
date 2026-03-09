export interface Question {
  number: number;
  text: string;
  listenFor: string;
}

export interface QuestionSection {
  pillar: "COMMUNICATION" | "BEHAVIOUR" | "SKILL FIT";
  timeAllocation: string;
  subtitle: string;
  questions: Question[];
}

export interface CvProbe {
  topic: string;
  detail: string;
}

export interface InterviewGuide {
  roleName: string;
  clientName: string;
  candidateName: string;
  openingScript: string;
  sections: QuestionSection[];
  closingQuestion: Question;
  cvProbes: CvProbe[];
}

export interface GenerateRequest {
  jobDescription: string;
  candidateCV: string;
  candidateName: string;
  clientName: string;
  roleName: string;
}

export const SCORING_FRAMEWORK = {
  pillars: [
    {
      name: "COMMUNICATION" as const,
      areas: ["English clarity", "Charisma", "AU experience"],
    },
    {
      name: "BEHAVIOUR" as const,
      areas: ["Discipline", "Initiative", "Professionalism"],
    },
    {
      name: "SKILL FIT" as const,
      areas: ["Technical depth", "Role experience", "Software proficiency"],
    },
  ],
  thresholds: {
    strongYes: 36,
    yes: 27,
    maybe: 18,
  },
} as const;
