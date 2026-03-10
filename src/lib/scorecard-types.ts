export interface ScoreArea {
  area: string;
  pillar: "COMMUNICATION" | "BEHAVIOUR" | "SKILL FIT";
  score: number; // 1-5
  notes: string;
}

export interface ScorecardResult {
  candidateName: string;
  clientName: string;
  roleName: string;
  scores: ScoreArea[];
  totalScore: number;
  result: "STRONG YES" | "YES" | "MAYBE" | "NO";
  gutCheck: string;
  keyStrengths: string;
  concerns: string;
  recommendation: string;
}
