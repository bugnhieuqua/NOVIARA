export type DiscType = 'D' | 'I' | 'S' | 'C';

export interface DiscProfile {
  dominant: DiscType;
  secondary?: DiscType;
  scores: {
    D: number; // 0 - 100
    I: number;
    S: number;
    C: number;
  };
}

export type SkillKey = 
  | 'frontend' 
  | 'backend' 
  | 'database' 
  | 'uiux' 
  | 'mobile' 
  | 'devops' 
  | 'aiml' 
  | 'qa' 
  | 'presentation'
  | 'management'
  | (string & {});

export interface Student {
  id: string; // e.g. "SV2024001"
  name: string;
  email: string;
  gender: 'Nam' | 'Nữ';
  gpa: number; // Scale 4.0
  classId?: string;
  skills: Record<string, number>; // 1-5
  primarySkill: string;
  secondarySkill: string;
  disc: DiscProfile;
  isLeaderCandidate: boolean;
  avatar?: string;
  preferredTeammates?: string[]; // student ids
  avoidTeammates?: string[]; // student ids
  phone?: string;
  notes?: string;
}

export interface GroupMetrics {
  avgGpa: number;
  gpaVariance: number;
  skillCoverage: Record<SkillKey, number>;
  skillBalanceScore: number; // 0-100
  discProfile: { D: number; I: number; S: number; C: number };
  discDiversityScore: number; // 0-100
  genderRatio: { male: number; female: number };
  constraintViolations: string[];
  compatibilityScore: number; // 0-100%
}

export interface GroupExplanation {
  summary: string;
  synergyHighlights: string[];
  potentialRisks: string[];
  recommendations: string[];
  leadershipAnalysis: string;
  discSynergy: string;
  skillCoverageSummary: string;
}

export interface Group {
  id: string; // e.g. "GRP-01"
  groupNumber: number;
  name: string; // e.g. "Nhóm 1: EcoTrack Platform"
  topic?: string;
  members: Student[];
  leaderId?: string;
  metrics: GroupMetrics;
  explanation: GroupExplanation;
}

export interface FitnessWeights {
  skillBalance: number; // e.g. 35%
  discDiversity: number; // e.g. 25%
  gpaBalance: number; // e.g. 20%
  genderBalance: number; // e.g. 10%
  constraintSatisfaction: number; // e.g. 10%
}

export interface GroupingConstraints {
  requireLeaderPerGroup: boolean;
  minFrontendPerGroup: number;
  minBackendPerGroup: number;
  minDesignPerGroup: number;
  balanceGender: boolean;
  maxGpaSpread: number; // Maximum allowed GPA difference between team averages
  respectPreferences: boolean;
  forceNoPairingClashes: boolean;
}

export interface GAHyperparameters {
  populationSize: number;
  generations: number;
  mutationRate: number; // e.g. 0.05
  crossoverRate: number; // e.g. 0.85
  selectionMethod: 'tournament' | 'roulette' | 'rank';
  tournamentSize: number;
  elitismCount: number;
}

export interface GroupingConfig {
  targetGroupCount: number;
  minMembers: number;
  maxMembers: number;
  fitnessWeights: FitnessWeights;
  constraints: GroupingConstraints;
  gaHyperparameters: GAHyperparameters;
}

export interface GenerationStep {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  diversity: number;
  violations: number;
  timestamp?: number;
}

export interface GroupingSession {
  id: string;
  title: string;
  classId?: string;
  className?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'running' | 'completed' | 'published';
  config: GroupingConfig;
  groups: Group[];
  totalStudents: number;
  overallFitness: number;
  convergenceHistory: GenerationStep[];
  executionTimeMs: number;
  googleSheetsUrl?: string;
}

export interface ClassCohort {
  id: string;
  code: string;
  name: string;
  semester: string;
  studentCount: number;
  description: string;
  lecturerId?: string;
  lecturerName?: string;
  department?: string;
  isSurveyActive?: boolean;
  surveyTitle?: string;
  surveyStudentCount?: number;
  createdAt?: string;
}

export interface SurveySubmission {
  id: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  email: string;
  gender: 'Nam' | 'Nữ';
  gpa: number;
  phone?: string;
  primarySkill: string;
  secondarySkill: string;
  isLeaderCandidate: boolean;
  disc: DiscProfile;
  submittedAt: string;
}

export interface DiscQuestion {
  id: number;
  title: string;
  options: {
    type: DiscType;
    text: string;
    description: string;
  }[];
}

export type UserRole = 'admin' | 'lecturer' | 'user';

export interface LecturerAccount {
  id: string; // e.g. "GV-NAU001"
  name: string;
  email: string; // e.g. "thang.dt@nau.edu.vn"
  username: string; // e.g. "thang.dt"
  department: string; // e.g. "Khoa Công Nghệ Thông Tin"
  phone?: string;
  password?: string;
  isDefaultPassword: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  role: 'lecturer' | 'admin';
}

export type AppView = 
  | 'user-home'
  | 'user-lookup'
  | 'student-portal'
  | 'student-survey'
  | 'lecturer-login'
  | 'admin-login'
  | 'admin-dashboard' 
  | 'admin-lecturers'
  | 'admin-students' 
  | 'admin-new-session' 
  | 'admin-results' 
  | 'admin-history' 
  | 'admin-settings'
  | 'admin-lecturer-ai-agent'
  | 'lecturer-classes';

