export interface ProfileData {
  candidateName: string;
  subtitle: string; // e.g. "REMOTE PROFESSIONAL"
  badge?: string; // e.g. "CPA" — optional credential badge
  aboutMe: string;
  education: {
    degree: string;
    institution: string;
    details: string; // e.g. "2008 – 2012, Cum Laude"
  }[];
  certifications: string[];
  skills: string[];
  systems: string[];
  awards?: string[];
  experience: {
    company: string;
    location?: string;
    roles: {
      title: string;
      dates: string;
      bullets: string[];
    }[];
  }[];
}
