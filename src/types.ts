export type DayOfWeek = "Mo" | "Di" | "Mi" | "Do" | "Fr";

export type LessonStatus = "regular" | "cancelled" | "substituted" | "room_changed" | "exam";

export interface TimetableEntry {
  id: string;
  day: DayOfWeek;
  period: number; // 1-8
  time: string;
  subject: string;
  teacher: string;
  room: string;
  targetClass: string; // e.g. "10A", "11B", "Q12", "Privat", "Uni"
  status: LessonStatus;
  color?: string; // Hex color code for lesson card
  substituteTeacher?: string;
  substituteRoom?: string;
  note?: string;
}

export type SubstitutionType = "Entfall" | "Vertretung" | "Raumänderung" | "Selbststudium" | "Klausur";

export interface SubstitutionNotice {
  id: string;
  date: string;
  period: number;
  targetClass: string;
  subject: string;
  originalTeacher: string;
  substituteTeacher: string;
  room: string;
  type: SubstitutionType;
  info: string;
  timestamp: string;
}

export interface AuthUser {
  id: string;
  email: string;
  planType: "free" | "premium";
  role?: "admin" | "user";
  banned?: boolean;
  createdAt: string;
}

export interface UserConfig {
  planType: "free" | "premium";
  organizationName?: string;
  customLogoUrl?: string;
  showWatermark?: boolean;
  primaryColor?: string;
  liveSyncIntervalSeconds: number;
  webhookUrl: string;
  notifyOnSubstitutions: boolean;
}

export type ActiveTab = "timetable" | "school_hub" | "homework" | "grades" | "ai" | "freemium" | "admin" | "impressum" | "datenschutz";

export type TaskCategory = "homework" | "exam" | "short_test" | "presentation" | "project" | "other";

export interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  description?: string;
  dueDate: string;
  targetClass?: string;
  category?: TaskCategory; // "homework" | "exam" | "short_test" | "presentation" | "project"
  priority: "low" | "medium" | "high";
  completed: boolean;
  createdAt: string;
}

export type GradeType = "exam" | "short_test" | "oral" | "presentation" | "homework" | "custom";

export interface UserSubject {
  id: string;
  name: string;
  code?: string;
  color?: string;
  targetGrade?: number; // e.g. 2.0
  oralRatio?: number; // percentage of oral grade (e.g. 50%)
  teacher?: string;
  room?: string;
}

export interface GradeEntry {
  id: string;
  subject: string;
  title: string;
  value: number; // 1.0 - 6.0
  weight: number; // e.g. 2.0 for Schulaufgabe, 1.0 for Ex/Mündlich
  type: GradeType;
  date?: string;
  note?: string;
  isPending?: boolean; // Für noch nicht benotete / offene Arbeiten "?"
}

export interface SubjectGradeSummary {
  subject: string;
  subjectInfo?: UserSubject;
  grades: GradeEntry[];
  average: number | null;
  totalWeight: number;
  trend?: "up" | "down" | "neutral";
}

export interface RegisteredSchool {
  id: string;
  name: string;
  city: string;
  schoolType: string;
  contactPerson: string;
  email: string;
  createdAt: string;
}

export interface SchoolPlanTemplate {
  id: string;
  title: string;
  schoolId?: string;
  schoolName: string;
  schoolCity?: string;
  targetClass: string;
  uploadedBy: string;
  ownerId?: string;
  ownerEmail?: string;
  createdAt: string;
  description?: string;
  entriesCount: number;
  entries: TimetableEntry[];
}
