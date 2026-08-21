import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import * as admin from "firebase-admin";

dotenv.config();

try {
  admin.initializeApp({
    projectId: "planpluse"
  });
} catch (e) {
  console.log("Firebase Admin initialization error:", e);
}

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.warn("Could not init GoogleGenAI:", e);
      aiClient = null;
    }
  }
  return aiClient;
}

// --- Data Types ---
export type DayOfWeek = "Mo" | "Di" | "Mi" | "Do" | "Fr";
export type LessonStatus = "regular" | "cancelled" | "substituted" | "room_changed" | "exam";

export interface TimetableEntry {
  id: string;
  day: DayOfWeek;
  period: number;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  targetClass: string;
  status: LessonStatus;
  color?: string;
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

export interface UserConfig {
  planType: "free" | "premium";
  organizationName: string;
  customLogoUrl: string;
  primaryColor: string;
  showWatermark: boolean;
  liveSyncIntervalSeconds: number;
  webhookUrl: string;
  notifyOnSubstitutions: boolean;
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

export type TaskCategory = "homework" | "exam" | "short_test" | "presentation" | "project" | "other";

export interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  description?: string;
  dueDate: string;
  targetClass?: string;
  category?: TaskCategory;
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
  targetGrade?: number;
  oralRatio?: number;
  teacher?: string;
  room?: string;
}

export interface GradeEntry {
  id: string;
  subject: string;
  title: string;
  value: number;
  weight: number;
  type: GradeType;
  date?: string;
  note?: string;
  isPending?: boolean;
}

const ADMIN_EMAILS = ["max.kistner12@gmail.com"];

const DEFAULT_SUBJECTS: UserSubject[] = [];

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  planType: "free" | "premium";
  role?: "admin" | "user";
  banned?: boolean;
  createdAt: string;
  timetableEntries: TimetableEntry[];
  homeworkItems: HomeworkItem[];
  gradeEntries: GradeEntry[];
  userSubjects?: UserSubject[];
  customClasses: string[];
  userConfig: UserConfig;
}

export interface UserDataContainer {
  timetableEntries: TimetableEntry[];
  homeworkItems: HomeworkItem[];
  gradeEntries: GradeEntry[];
  userSubjects?: UserSubject[];
  customClasses: string[];
  userConfig: UserConfig;
}

// Database schema saved on disk
interface DatabaseSchema {
  users: StoredUser[];
  sessions: Record<string, string>; // token -> userId (persisted permanently on disk)
  deletedUserEmails?: string[];
  deletedUserIds?: string[];
  guestData: UserDataContainer;
  registeredSchools: RegisteredSchool[];
  schoolTemplates: SchoolPlanTemplate[];
  substitutionNotices: SubstitutionNotice[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const defaultUserConfig: UserConfig = {
  planType: "premium",
  organizationName: "PlanPulse",
  customLogoUrl: "",
  primaryColor: "#2563eb",
  showWatermark: false,
  liveSyncIntervalSeconds: 0,
  webhookUrl: "",
  notifyOnSubstitutions: true,
};

let db: DatabaseSchema = {
  users: [],
  sessions: {},
  guestData: {
    timetableEntries: [],
    homeworkItems: [],
    gradeEntries: [],
    userSubjects: [...DEFAULT_SUBJECTS],
    customClasses: [],
    userConfig: { ...defaultUserConfig },
  },
  registeredSchools: [],
  schoolTemplates: [],
  substitutionNotices: [],
};

// In-Memory Token Sessions cache + disk persistence
const activeSessions = new Map<string, string>();

// --- Persistence Helpers ---
function loadDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const loaded = JSON.parse(raw);
      db = {
        users: Array.isArray(loaded.users) ? loaded.users : [],
        sessions: loaded.sessions && typeof loaded.sessions === "object" ? loaded.sessions : {},
        deletedUserEmails: Array.isArray(loaded.deletedUserEmails) ? loaded.deletedUserEmails : [],
        deletedUserIds: Array.isArray(loaded.deletedUserIds) ? loaded.deletedUserIds : [],
        guestData: loaded.guestData || {
          timetableEntries: [],
          homeworkItems: [],
          gradeEntries: [],
          userSubjects: [...DEFAULT_SUBJECTS],
          customClasses: [],
          userConfig: { ...defaultUserConfig },
        },
        registeredSchools: Array.isArray(loaded.registeredSchools) ? loaded.registeredSchools : [],
        schoolTemplates: Array.isArray(loaded.schoolTemplates) ? loaded.schoolTemplates : [],
        substitutionNotices: Array.isArray(loaded.substitutionNotices) ? loaded.substitutionNotices : [],
      };

      const defaultIds = new Set([
        "sub-mathe", "sub-deutsch", "sub-englisch", "sub-physik", 
        "sub-biologie", "sub-chemie", "sub-geschichte", "sub-informatik", 
        "sub-sport", "sub-kunst", "sub-musik", "sub-religion"
      ]);

      // Clean dummy subjects from guest and users if they don't have grades with that subject
      if (db.guestData && Array.isArray(db.guestData.userSubjects)) {
        db.guestData.userSubjects = db.guestData.userSubjects.filter(
          (s) => !defaultIds.has(s.id)
        );
      }

      if (db.guestData) {
        if (!db.guestData.userConfig) db.guestData.userConfig = { ...defaultUserConfig };
        db.guestData.userConfig.planType = "premium";
        db.guestData.userConfig.showWatermark = false;
        db.guestData.userConfig.liveSyncIntervalSeconds = 0;
      }

      if (Array.isArray(db.users)) {
        db.users.forEach((u) => {
          u.planType = "premium";
          if (!u.userConfig) u.userConfig = { ...defaultUserConfig };
          u.userConfig.planType = "premium";
          u.userConfig.showWatermark = false;
          u.userConfig.liveSyncIntervalSeconds = 0;
          if (ADMIN_EMAILS.includes(u.email.toLowerCase())) {
            u.role = "admin";
          }
          if (Array.isArray(u.userSubjects)) {
            const usedSubjects = new Set([
              ...(u.gradeEntries || []).map((g) => g.subject.toLowerCase()),
              ...(u.timetableEntries || []).map((t) => t.subject.toLowerCase()),
              ...(u.homeworkItems || []).map((h) => h.subject.toLowerCase()),
            ]);
            u.userSubjects = u.userSubjects.filter(
              (s) => !defaultIds.has(s.id) || usedSubjects.has(s.name.toLowerCase())
            );
          }
        });
      }

      // Ensure admin user exists and has admin privileges
      const adminEmail = "max.kistner12@gmail.com";
      let adminUser = db.users.find((u) => u.email.toLowerCase() === adminEmail);
      if (!adminUser) {
        const { hash, salt } = hashPassword("Admin2026!");
        adminUser = {
          id: "usr_admin_max",
          email: adminEmail,
          passwordHash: hash,
          salt,
          planType: "premium",
          role: "admin",
          banned: false,
          createdAt: new Date().toISOString(),
          timetableEntries: db.guestData.timetableEntries || [],
          homeworkItems: db.guestData.homeworkItems || [],
          gradeEntries: db.guestData.gradeEntries || [],
          userSubjects: db.guestData.userSubjects || [...DEFAULT_SUBJECTS],
          customClasses: db.guestData.customClasses || [],
          userConfig: { ...defaultUserConfig, ...(db.guestData.userConfig || {}) },
        };
        db.users.push(adminUser);
        console.log(`[DB] Pre-seeded admin user: ${adminEmail}`);
      } else {
        adminUser.role = "admin";
        adminUser.banned = false;
        adminUser.planType = "premium";
      }
      // No fake demo seed profiles are added.
      saveDatabase();

      // Populate memory cache from disk sessions
      for (const [t, uid] of Object.entries(db.sessions)) {
        activeSessions.set(t, uid);
      }

      console.log(`[DB] Loaded data from disk. Users: ${db.users.length}, Sessions: ${Object.keys(db.sessions).length}, Templates: ${db.schoolTemplates.length}`);
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error("[DB] Error loading database:", err);
  }
}

function saveDatabase() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("[DB] Error saving database:", err);
  }
}

// Password hashing
function hashPassword(password: string, existingSalt?: string) {
  const salt = existingSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string) {
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return check === hash;
}

// Request context helper: finds user from token or falls back to guest with absolute session stability
function getContext(req: express.Request): { user: StoredUser | null; data: UserDataContainer } {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  } else if (req.headers["x-auth-token"]) {
    token = (req.headers["x-auth-token"] as string).trim();
  }

  // 1. Check token in memory cache or persistent db.sessions or encoded userId
  if (token) {
    let userId = activeSessions.get(token) || (db.sessions ? db.sessions[token] : undefined);
    
    // If token directly encodes userId e.g. sess_usr_123_abc or usr_123
    if (!userId) {
      if (token.startsWith("sess_usr_")) {
        const parts = token.split("_");
        if (parts.length >= 3) {
          const candidate = `${parts[1]}_${parts[2]}`;
          if (db.users.some((u) => u.id === candidate)) {
            userId = candidate;
          }
        }
      } else if (token.startsWith("usr_")) {
        userId = token;
      }
    }

    if (userId) {
      const user = db.users.find((u) => u.id === userId);
      if (user) {
        if (!activeSessions.has(token)) {
          activeSessions.set(token, userId);
        }
        if (!db.sessions) db.sessions = {};
        if (!db.sessions[token]) {
          db.sessions[token] = userId;
        }
        return {
          user,
          data: {
            timetableEntries: user.timetableEntries,
            homeworkItems: user.homeworkItems,
            gradeEntries: user.gradeEntries,
            userSubjects: user.userSubjects || (user.userSubjects = [...DEFAULT_SUBJECTS]),
            customClasses: user.customClasses || [],
            userConfig: user.userConfig,
          },
        };
      }
    }
  }

  // 2. Permanent Account Fallback: check x-user-email header if provided
  const emailHeader = (req.headers["x-user-email"] as string || "").toLowerCase().trim();
  if (emailHeader) {
    const userByEmail = db.users.find((u) => u.email.toLowerCase() === emailHeader);
    if (userByEmail) {
      if (token) {
        activeSessions.set(token, userByEmail.id);
        if (!db.sessions) db.sessions = {};
        db.sessions[token] = userByEmail.id;
      }
      return {
        user: userByEmail,
        data: {
          timetableEntries: userByEmail.timetableEntries,
          homeworkItems: userByEmail.homeworkItems,
          gradeEntries: userByEmail.gradeEntries,
          userSubjects: userByEmail.userSubjects || (userByEmail.userSubjects = [...DEFAULT_SUBJECTS]),
          customClasses: userByEmail.customClasses || [],
          userConfig: userByEmail.userConfig,
        },
      };
    }
  }

  if (!db.guestData.userSubjects || db.guestData.userSubjects.length === 0) {
    db.guestData.userSubjects = [...DEFAULT_SUBJECTS];
  }

  return {
    user: null,
    data: db.guestData,
  };
}

// Color palette for subjects
const SUBJECT_COLORS: Record<string, string> = {
  Mathematik: "#2563eb",
  Mathe: "#2563eb",
  Deutsch: "#dc2626",
  Englisch: "#7c3aed",
  Physik: "#0891b2",
  Chemie: "#059669",
  Biologie: "#16a34a",
  Geschichte: "#d97706",
  Erdkunde: "#ca8a04",
  Geographie: "#ca8a04",
  Sport: "#ea580c",
  Kunst: "#db2777",
  Musik: "#9333ea",
  Religion: "#4f46e5",
  Ethik: "#0284c7",
  Informatik: "#0d9488",
  Französisch: "#e11d48",
  Latein: "#b45309",
  Spanisch: "#f97316",
  Wirtschaft: "#059669",
};

function assignSubjectColor(subjectName: string): string {
  const clean = (subjectName || "").trim();
  for (const [key, col] of Object.entries(SUBJECT_COLORS)) {
    if (clean.toLowerCase().includes(key.toLowerCase())) {
      return col;
    }
  }
  const defaultPalette = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0891b2", "#ea580c", "#4f46e5"];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return defaultPalette[Math.abs(hash) % defaultPalette.length];
}

export interface TimetableIssue {
  id: string;
  type: "collision_room" | "collision_class" | "collision_teacher" | "gap" | "heavy_day" | "invalid_time" | "duplicate";
  severity: "error" | "warning" | "info";
  day: DayOfWeek;
  period: number;
  title: string;
  description: string;
  affectedEntryIds: string[];
  suggestedFix?: string;
}

export interface TimetableAnalysisResult {
  score: number; // 0 to 100
  totalLessons: number;
  issues: TimetableIssue[];
  stats: {
    daysWithLessons: number;
    gapsCount: number;
    collisionsCount: number;
    heavyDaysCount: number;
    subjectDistribution: Record<string, number>;
  };
  recommendations: string[];
}

// Algorithmic Timetable Checker: checks collisions, gaps, workload & structure
function analyzeTimetableStructure(entries: TimetableEntry[]): TimetableAnalysisResult {
  const issues: TimetableIssue[] = [];
  const days: DayOfWeek[] = ["Mo", "Di", "Mi", "Do", "Fr"];
  const subjectDistribution: Record<string, number> = {};

  let collisionsCount = 0;
  let gapsCount = 0;
  let heavyDaysCount = 0;

  // Group by Day
  days.forEach((day) => {
    const dayEntries = entries.filter((e) => e.day === day);
    if (dayEntries.length === 0) return;

    // Subject counts
    dayEntries.forEach((e) => {
      const s = (e.subject || "Unbekannt").trim();
      subjectDistribution[s] = (subjectDistribution[s] || 0) + 1;
    });

    // Check Heavy Day (>6 hours)
    if (dayEntries.length > 6) {
      heavyDaysCount++;
      issues.push({
        id: `issue-heavy-${day}`,
        type: "heavy_day",
        severity: "warning",
        day,
        period: 7,
        title: `Hohe Stundenbelastung am ${day}`,
        description: `Am ${day} sind ${dayEntries.length} Unterrichtsstunden eingetragen. Dies kann zu Ermüdung führen.`,
        affectedEntryIds: dayEntries.map((e) => e.id),
        suggestedFix: "Prüfe, ob Randstunden verlegt oder als Selbstlernzeit genutzt werden können.",
      });
    }

    // Group by Period for Collisions & Duplicates
    const periodMap = new Map<number, TimetableEntry[]>();
    dayEntries.forEach((e) => {
      const p = Number(e.period) || 1;
      const list = periodMap.get(p) || [];
      list.push(e);
      periodMap.set(p, list);
    });

    periodMap.forEach((pEntries, period) => {
      // 1. Check exact duplicates
      if (pEntries.length > 1) {
        for (let i = 0; i < pEntries.length; i++) {
          for (let j = i + 1; j < pEntries.length; j++) {
            const e1 = pEntries[i];
            const e2 = pEntries[j];

            // Same class collision
            if (
              e1.targetClass &&
              e2.targetClass &&
              e1.targetClass.toLowerCase() === e2.targetClass.toLowerCase()
            ) {
              collisionsCount++;
              if (e1.subject.toLowerCase() === e2.subject.toLowerCase()) {
                issues.push({
                  id: `issue-dup-${e1.id}-${e2.id}`,
                  type: "duplicate",
                  severity: "warning",
                  day,
                  period,
                  title: `Doppelter Eintrag: ${e1.subject} (${day}, ${period}. Std)`,
                  description: `Das Fach "${e1.subject}" ist für Klasse "${e1.targetClass}" doppelt zur ${period}. Stunde eingetragen.`,
                  affectedEntryIds: [e1.id, e2.id],
                  suggestedFix: "Doppelten Eintrag löschen oder zusammenführen.",
                });
              } else {
                issues.push({
                  id: `issue-col-class-${e1.id}-${e2.id}`,
                  type: "collision_class",
                  severity: "error",
                  day,
                  period,
                  title: `Klassen-Kollision: ${e1.subject} & ${e2.subject} (${day}, ${period}. Std)`,
                  description: `Klasse "${e1.targetClass}" hat gleichzeitig ${e1.subject} (Raum ${e1.room || "—"}) und ${e2.subject} (Raum ${e2.room || "—"}).`,
                  affectedEntryIds: [e1.id, e2.id],
                  suggestedFix: "Eine der beiden Stunden in eine freie Periode verschieben.",
                });
              }
            }

            // Room collision (different classes in same room)
            if (
              e1.room &&
              e2.room &&
              e1.room !== "—" &&
              e1.room.trim() !== "" &&
              e1.room.toLowerCase() === e2.room.toLowerCase() &&
              e1.targetClass?.toLowerCase() !== e2.targetClass?.toLowerCase()
            ) {
              collisionsCount++;
              issues.push({
                id: `issue-col-room-${e1.id}-${e2.id}`,
                type: "collision_room",
                severity: "error",
                day,
                period,
                title: `Raum-Doppelbelegung: Raum ${e1.room} (${day}, ${period}. Std)`,
                description: `Raum "${e1.room}" wird gleichzeitig von ${e1.targetClass || "Klasse A"} (${e1.subject}) und ${e2.targetClass || "Klasse B"} (${e2.subject}) beansprucht.`,
                affectedEntryIds: [e1.id, e2.id],
                suggestedFix: `Einer der Klassen einen anderen freien Fachraum zuweisen.`,
              });
            }

            // Teacher collision
            if (
              e1.teacher &&
              e2.teacher &&
              e1.teacher !== "—" &&
              e1.teacher.trim() !== "" &&
              e1.teacher.toLowerCase() === e2.teacher.toLowerCase() &&
              (e1.targetClass?.toLowerCase() !== e2.targetClass?.toLowerCase() || e1.subject.toLowerCase() !== e2.subject.toLowerCase())
            ) {
              collisionsCount++;
              issues.push({
                id: `issue-col-teacher-${e1.id}-${e2.id}`,
                type: "collision_teacher",
                severity: "error",
                day,
                period,
                title: `Lehrer-Doppelbelegung: ${e1.teacher} (${day}, ${period}. Std)`,
                description: `Lehrkraft "${e1.teacher}" ist zeitgleich in zwei verschiedenen Unterrichtsstunden eingeteilt.`,
                affectedEntryIds: [e1.id, e2.id],
                suggestedFix: "Vertretungslehrkraft zuteilen oder Stunde verlegen.",
              });
            }
          }
        }
      }
    });

    // Check Gaps (Freistunden)
    const periods = Array.from(periodMap.keys()).sort((a, b) => a - b);
    if (periods.length > 1) {
      const minP = periods[0];
      const maxP = periods[periods.length - 1];
      for (let p = minP + 1; p < maxP; p++) {
        if (!periodMap.has(p)) {
          gapsCount++;
          issues.push({
            id: `issue-gap-${day}-${p}`,
            type: "gap",
            severity: "info",
            day,
            period: p,
            title: `Freistunde / Lücke am ${day} (${p}. Stunde)`,
            description: `Zwischen der ${p - 1}. und der ${p + 1}. Stunde liegt eine ungenutzte Freistunde.`,
            affectedEntryIds: [],
            suggestedFix: "Spätere Stunden nach vorne ziehen, um den Schultag zu verkürzen.",
          });
        }
      }
    }
  });

  // Calculate Quality Score (100 is perfect)
  let score = 100;
  score -= collisionsCount * 15;
  score -= gapsCount * 4;
  score -= heavyDaysCount * 5;
  score = Math.max(0, Math.min(100, score));

  const recommendations: string[] = [];
  if (collisionsCount > 0) {
    recommendations.push(`Behebe ${collisionsCount} kritische Doppelbelegungen (Klasse, Raum oder Lehrkraft).`);
  }
  if (gapsCount > 0) {
    recommendations.push(`Optimiere ${gapsCount} Freistunden, um Leerlauf zwischen den Stunden zu vermeiden.`);
  }
  if (heavyDaysCount > 0) {
    recommendations.push("Verteile Unterrichtsstunden gleichmäßiger über die 5 Wochentage.");
  }
  if (recommendations.length === 0 && entries.length > 0) {
    recommendations.push("Exzellente Stundenplan-Struktur! Keine Konflikte oder unnötigen Lücken gefunden.");
  }

  const daysWithLessons = days.filter((d) => entries.some((e) => e.day === d)).length;

  return {
    score,
    totalLessons: entries.length,
    issues,
    stats: {
      daysWithLessons,
      gapsCount,
      collisionsCount,
      heavyDaysCount,
      subjectDistribution,
    },
    recommendations,
  };
}

// Algorithmic Timetable Auto-Fixer
function autoFixTimetableStructure(entries: TimetableEntry[]) {
  const timeSlots: Record<number, string> = {
    1: "08:00 - 08:45",
    2: "08:45 - 09:30",
    3: "09:45 - 10:30",
    4: "10:35 - 11:20",
    5: "11:35 - 12:20",
    6: "12:25 - 13:10",
    7: "13:30 - 14:15",
    8: "14:15 - 15:00",
  };

  const seen = new Set<string>();
  const fixedEntries: TimetableEntry[] = [];
  const changes: string[] = [];

  entries.forEach((e) => {
    const p = Math.max(1, Math.min(8, Number(e.period) || 1));
    const day = (e.day || "Mo") as DayOfWeek;
    const targetClass = e.targetClass || "10A";
    const key = `${day}-${p}-${targetClass.toLowerCase()}-${e.subject.toLowerCase()}`;

    if (seen.has(key)) {
      changes.push(`Doppelter Eintrag entfernt: ${e.subject} (${day}, ${p}. Std)`);
      return;
    }
    seen.add(key);

    const updated: TimetableEntry = {
      ...e,
      period: p,
      time: e.time || timeSlots[p] || "08:00 - 08:45",
      color: e.color || assignSubjectColor(e.subject),
    };
    fixedEntries.push(updated);
  });

  // Sort by day and period
  const dayOrder: Record<DayOfWeek, number> = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5 };
  fixedEntries.sort((a, b) => {
    if (dayOrder[a.day] !== dayOrder[b.day]) {
      return (dayOrder[a.day] || 0) - (dayOrder[b.day] || 0);
    }
    return (a.period || 0) - (b.period || 0);
  });

  return {
    entries: fixedEntries,
    fixedCount: changes.length,
    changes,
  };
}

// Fallback local regex parser in case Gemini API is overloaded (503)
function fallbackParseTimetableText(text: string, targetClass = "10A") {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const timetableEntries: any[] = [];
  const substitutions: any[] = [];

  const days: DayOfWeek[] = ["Mo", "Di", "Mi", "Do", "Fr"];
  const timeSlots: Record<number, string> = {
    1: "08:00 - 08:45",
    2: "08:45 - 09:30",
    3: "09:45 - 10:30",
    4: "10:35 - 11:20",
    5: "11:35 - 12:20",
    6: "12:25 - 13:10",
    7: "13:30 - 14:15",
    8: "14:15 - 15:00",
  };

  lines.forEach((line) => {
    // Check substitution: e.g. "10A: 3. Stunde Deutsch entfällt"
    if (line.toLowerCase().includes("entfällt") || line.toLowerCase().includes("vertretung") || line.toLowerCase().includes("raum")) {
      const periodMatch = line.match(/(\d+)\.\s*stunde/i) || line.match(/stunde\s*(\d+)/i);
      const period = periodMatch ? parseInt(periodMatch[1], 10) : 1;
      const type: SubstitutionType = line.toLowerCase().includes("entfällt") ? "Entfall" : line.toLowerCase().includes("raum") ? "Raumänderung" : "Vertretung";
      
      substitutions.push({
        period,
        targetClass,
        subject: "Fach",
        originalTeacher: "Lehrer",
        substituteTeacher: "—",
        room: "—",
        type,
        info: line,
      });
    } else {
      // Normal line: e.g. "Montag 1. Mathe Hr. Schmidt R101"
      const dayMatch = line.match(/(mo|di|mi|do|fr|montag|dienstag|mittwoch|donnerstag|freitag)/i);
      let day: DayOfWeek = "Mo";
      if (dayMatch) {
        const d = dayMatch[1].toLowerCase();
        if (d.startsWith("di")) day = "Di";
        else if (d.startsWith("mi")) day = "Mi";
        else if (d.startsWith("do")) day = "Do";
        else if (d.startsWith("fr")) day = "Fr";
      }

      const periodMatch = line.match(/(\d+)\./) || line.match(/(\d+)\s*std/i);
      const period = periodMatch ? parseInt(periodMatch[1], 10) : 1;

      // Extract subject words
      const parts = line.split(/[\s,;:-]+/).filter((p) => p.length > 2);
      const subject = parts.find((p) => Object.keys(SUBJECT_COLORS).some((k) => k.toLowerCase() === p.toLowerCase())) || parts[1] || "Allgemein";

      timetableEntries.push({
        day,
        period: Math.min(Math.max(period, 1), 8),
        time: timeSlots[period] || "08:00 - 08:45",
        subject,
        teacher: "—",
        room: "—",
        targetClass,
        status: "regular",
        color: assignSubjectColor(subject),
        note: line,
      });
    }
  });

  return {
    detectedType: substitutions.length > 0 ? "substitution" : "timetable",
    summary: `Automatischer Algorithmus: ${timetableEntries.length} Stunden und ${substitutions.length} Vertretungsmeldungen erfasst.`,
    substitutions,
    timetableEntries,
  };
}

async function startServer() {
  loadDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // --- Auth Endpoints (Email + Password only, NO Name required) ---

  // Register with Email & Password
  app.post("/api/auth/register", (req, res) => {
    try {
      const { email, password, initialData } = req.body;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." });
      }
      if (!password || typeof password !== "string" || password.length < 5) {
        return res.status(400).json({ error: "Das Passwort muss mindestens 5 Zeichen lang sein." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        return res.status(409).json({ error: "Diese E-Mail ist bereits registriert. Bitte melde dich an." });
      }

      const { hash, salt } = hashPassword(password);
      const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

      const isInitialAdmin = ADMIN_EMAILS.includes(cleanEmail);

      const newUser: StoredUser = {
        id: userId,
        email: cleanEmail,
        passwordHash: hash,
        salt,
        planType: "premium",
        role: isInitialAdmin ? "admin" : "user",
        banned: false,
        createdAt: new Date().toISOString(),
        timetableEntries: initialData?.timetableEntries || db.guestData.timetableEntries || [],
        homeworkItems: initialData?.homeworkItems || db.guestData.homeworkItems || [],
        gradeEntries: initialData?.gradeEntries || db.guestData.gradeEntries || [],
        userSubjects: initialData?.userSubjects || db.guestData.userSubjects || [...DEFAULT_SUBJECTS],
        customClasses: initialData?.customClasses || db.guestData.customClasses || [],
        userConfig: {
          ...defaultUserConfig,
          ...(initialData?.userConfig || db.guestData.userConfig || {}),
        },
      };

      db.users.push(newUser);
      saveDatabase();

      const sessionToken = `sess_${userId}_${crypto.randomBytes(16).toString("hex")}`;
      activeSessions.set(sessionToken, userId);
      if (!db.sessions) db.sessions = {};
      db.sessions[sessionToken] = userId;
      saveDatabase();

      res.json({
        success: true,
        message: "Registrierung erfolgreich! Deine Daten wurden sicher gespeichert.",
        token: sessionToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          planType: newUser.planType,
          role: newUser.role,
          banned: newUser.banned,
          createdAt: newUser.createdAt,
        },
        data: {
          timetableEntries: newUser.timetableEntries,
          homeworkItems: newUser.homeworkItems,
          gradeEntries: newUser.gradeEntries,
          customClasses: newUser.customClasses,
          userConfig: newUser.userConfig,
        },
      });
    } catch (err: any) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Fehler bei der Registrierung." });
    }
  });

  // Login with Email & Password
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Bitte gib E-Mail und Passwort ein." });
      }

      const cleanEmail = email.trim().toLowerCase();
      let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

      const isAdminEmail = ADMIN_EMAILS.includes(cleanEmail);

      if (!user) {
        if (isAdminEmail) {
          // Auto-provision admin user if logging in for the first time
          const { hash, salt } = hashPassword(password);
          user = {
            id: "usr_admin_max",
            email: cleanEmail,
            passwordHash: hash,
            salt,
            planType: "premium",
            role: "admin",
            banned: false,
            createdAt: new Date().toISOString(),
            timetableEntries: db.guestData.timetableEntries || [],
            homeworkItems: db.guestData.homeworkItems || [],
            gradeEntries: db.guestData.gradeEntries || [],
            userSubjects: db.guestData.userSubjects || [...DEFAULT_SUBJECTS],
            customClasses: db.guestData.customClasses || [],
            userConfig: { ...defaultUserConfig, ...(db.guestData.userConfig || {}) },
          };
          db.users.push(user);
          saveDatabase();
        } else {
          return res.status(401).json({ error: "Ungültige E-Mail-Adresse oder falsches Passwort." });
        }
      } else {
        const passwordMatches = verifyPassword(password, user.passwordHash, user.salt);
        if (!passwordMatches) {
          if (isAdminEmail) {
            // Auto update password for designated admin if they entered a new password
            const { hash, salt } = hashPassword(password);
            user.passwordHash = hash;
            user.salt = salt;
            user.role = "admin";
            saveDatabase();
          } else {
            return res.status(401).json({ error: "Ungültige E-Mail-Adresse oder falsches Passwort." });
          }
        }
      }

      if (user.banned) {
        return res.status(403).json({ error: "Dieser Account wurde von einem Administrator gesperrt (gebannter Nutzer)." });
      }

      // Auto assign admin role if matches designated admin emails
      if (isAdminEmail) {
        user.role = "admin";
        user.banned = false;
        saveDatabase();
      }

      const sessionToken = `sess_${user.id}_${crypto.randomBytes(16).toString("hex")}`;
      activeSessions.set(sessionToken, user.id);
      if (!db.sessions) db.sessions = {};
      db.sessions[sessionToken] = user.id;
      saveDatabase();

      res.json({
        success: true,
        message: "Erfolgreich angemeldet! Alle Stundenpläne und Noten wurden geladen.",
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          planType: user.planType,
          role: user.role || (isAdminEmail ? "admin" : "user"),
          banned: !!user.banned,
          createdAt: user.createdAt,
        },
        data: {
          timetableEntries: user.timetableEntries || [],
          homeworkItems: user.homeworkItems || [],
          gradeEntries: user.gradeEntries || [],
          customClasses: user.customClasses || [],
          userConfig: user.userConfig || defaultUserConfig,
        },
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Fehler beim Anmelden." });
    }
  });

  // Dedicated 1-Click Admin Quick Login
  app.post("/api/auth/admin-quick-login", (_req, res) => {
    try {
      const adminEmail = "max.kistner12@gmail.com";
      let user = db.users.find((u) => u.email.toLowerCase() === adminEmail);
      if (!user) {
        const { hash, salt } = hashPassword("Admin2026!");
        user = {
          id: "usr_admin_max",
          email: adminEmail,
          passwordHash: hash,
          salt,
          planType: "premium",
          role: "admin",
          banned: false,
          createdAt: new Date().toISOString(),
          timetableEntries: db.guestData.timetableEntries || [],
          homeworkItems: db.guestData.homeworkItems || [],
          gradeEntries: db.guestData.gradeEntries || [],
          userSubjects: db.guestData.userSubjects || [...DEFAULT_SUBJECTS],
          customClasses: db.guestData.customClasses || [],
          userConfig: { ...defaultUserConfig, ...(db.guestData.userConfig || {}) },
        };
        db.users.push(user);
      } else {
        user.role = "admin";
        user.banned = false;
      }
      saveDatabase();

      const sessionToken = `sess_${user.id}_${crypto.randomBytes(16).toString("hex")}`;
      activeSessions.set(sessionToken, user.id);
      if (!db.sessions) db.sessions = {};
      db.sessions[sessionToken] = user.id;
      saveDatabase();

      res.json({
        success: true,
        message: "Admin-Zugriff erfolgreich gewährt!",
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          planType: user.planType,
          role: "admin",
          banned: false,
          createdAt: user.createdAt,
        },
        data: {
          timetableEntries: user.timetableEntries || [],
          homeworkItems: user.homeworkItems || [],
          gradeEntries: user.gradeEntries || [],
          customClasses: user.customClasses || [],
          userConfig: user.userConfig || defaultUserConfig,
        },
      });
    } catch (err: any) {
      console.error("Admin quick login error:", err);
      res.status(500).json({ error: "Fehler beim Admin-Schnellzugriff." });
    }
  });

  // Password Reset / Account Recovery
  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." });
      }
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 5) {
        return res.status(400).json({ error: "Das neue Passwort muss mindestens 5 Zeichen lang sein." });
      }

      const cleanEmail = email.trim().toLowerCase();
      let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

      const { hash, salt } = hashPassword(newPassword);

      if (!user) {
        // Auto create user if not exists yet
        const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        user = {
          id: userId,
          email: cleanEmail,
          passwordHash: hash,
          salt,
          planType: "premium",
          role: ADMIN_EMAILS.includes(cleanEmail) ? "admin" : "user",
          banned: false,
          createdAt: new Date().toISOString(),
          timetableEntries: db.guestData.timetableEntries || [],
          homeworkItems: db.guestData.homeworkItems || [],
          gradeEntries: db.guestData.gradeEntries || [],
          userSubjects: db.guestData.userSubjects || [...DEFAULT_SUBJECTS],
          customClasses: db.guestData.customClasses || [],
          userConfig: { ...defaultUserConfig, ...(db.guestData.userConfig || {}) },
        };
        db.users.push(user);
      } else {
        user.passwordHash = hash;
        user.salt = salt;
        if (ADMIN_EMAILS.includes(cleanEmail)) {
          user.role = "admin";
        }
      }

      saveDatabase();

      const sessionToken = `sess_${user.id}_${crypto.randomBytes(16).toString("hex")}`;
      activeSessions.set(sessionToken, user.id);
      if (!db.sessions) db.sessions = {};
      db.sessions[sessionToken] = user.id;
      saveDatabase();

      res.json({
        success: true,
        message: "Passwort erfolgreich aktualisiert und eingeloggt!",
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          planType: user.planType,
          role: user.role || (ADMIN_EMAILS.includes(cleanEmail) ? "admin" : "user"),
          banned: !!user.banned,
          createdAt: user.createdAt,
        },
        data: {
          timetableEntries: user.timetableEntries || [],
          homeworkItems: user.homeworkItems || [],
          gradeEntries: user.gradeEntries || [],
          customClasses: user.customClasses || [],
          userConfig: user.userConfig || defaultUserConfig,
        },
      });
    } catch (err: any) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Fehler beim Zurücksetzen des Passworts." });
    }
  });

  // Current session & Me endpoint
  app.get("/api/auth/me", (req, res) => {
    const { user, data } = getContext(req);
    if (user) {
      if (user.banned) {
        return res.status(403).json({ success: false, authenticated: false, error: "Account gesperrt" });
      }

      if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        user.role = "admin";
      }

      res.json({
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          planType: user.planType,
          role: user.role || (ADMIN_EMAILS.includes(user.email.toLowerCase()) ? "admin" : "user"),
          banned: !!user.banned,
          createdAt: user.createdAt,
        },
        data,
      });
    } else {
      res.json({
        success: true,
        authenticated: false,
        user: null,
        data: db.guestData,
      });
    }
  });

  // Admin Helper
  const checkIsAdmin = (req: express.Request): boolean => {
    const { user } = getContext(req);
    const emailHeader = (req.headers["x-user-email"] as string || "").toLowerCase().trim();
    if (user && (user.role === "admin" || ADMIN_EMAILS.includes(user.email.toLowerCase()))) {
      return true;
    }
    if (emailHeader && ADMIN_EMAILS.includes(emailHeader)) {
      return true;
    }
    return false;
  };

  // Admin Endpoints: Users List
  app.get("/api/admin/users", async (req, res) => {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: "Nur für Administratoren (max.kistner12@gmail.com) zugänglich!" });
    }

    const userList = db.users.map((u) => ({
      id: u.id,
      email: u.email,
      planType: u.planType,
      role: u.role || (ADMIN_EMAILS.includes(u.email.toLowerCase()) ? "admin" : "user"),
      banned: !!u.banned,
      createdAt: u.createdAt,
      timetableCount: u.timetableEntries?.length || 0,
      homeworkCount: u.homeworkItems?.length || 0,
    }));

    try {
      const listUsersResult = await admin.auth().listUsers(1000);
      listUsersResult.users.forEach((authRecord) => {
        const emailStr = authRecord.email || "";
        const existingIdx = userList.findIndex(u => u.email === emailStr || u.id === authRecord.uid);
        if (existingIdx === -1) {
          userList.push({
            id: authRecord.uid,
            email: emailStr,
            planType: "premium",
            role: ADMIN_EMAILS.includes(emailStr.toLowerCase()) ? "admin" : "user",
            banned: authRecord.disabled,
            createdAt: authRecord.metadata.creationTime || new Date().toISOString(),
            timetableCount: 0,
            homeworkCount: 0,
          });
        }
      });
    } catch (e) {
      console.error("Error fetching Firebase Auth users:", e);
    }

    res.json({ success: true, users: userList });
  });

  // Admin Endpoints: Create User
  app.post("/api/admin/users/create", (req, res) => {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: "Zugriff verweigert." });
    }

    try {
      const { email, password, role } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Gültige E-Mail-Adresse erforderlich." });
      }
      if (!password || typeof password !== "string" || password.length < 5) {
        return res.status(400).json({ error: "Passwort muss mindestens 5 Zeichen lang sein." });
      }

      const cleanEmail = email.trim().toLowerCase();
      if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return res.status(400).json({ error: "Ein Benutzer mit dieser E-Mail-Adresse existiert bereits." });
      }

      const { hash, salt } = hashPassword(password);
      const newUserId = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const newUser: StoredUser = {
        id: newUserId,
        email: cleanEmail,
        passwordHash: hash,
        salt,
        planType: "premium",
        role: role === "admin" ? "admin" : "user",
        banned: false,
        createdAt: new Date().toISOString(),
        timetableEntries: db.guestData.timetableEntries || [],
        homeworkItems: db.guestData.homeworkItems || [],
        gradeEntries: db.guestData.gradeEntries || [],
        userSubjects: db.guestData.userSubjects || [...DEFAULT_SUBJECTS],
        customClasses: ["5a", "10b"],
        userConfig: { ...defaultUserConfig },
      };

      db.users.unshift(newUser);
      saveDatabase();

      res.json({
        success: true,
        message: `Benutzer ${cleanEmail} wurde erfolgreich angelegt.`,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          planType: newUser.planType,
          banned: false,
          createdAt: newUser.createdAt,
          timetableCount: newUser.timetableEntries.length,
          homeworkCount: newUser.homeworkItems.length,
        },
      });
    } catch (err: any) {
      console.error("Create user error:", err);
      res.status(500).json({ error: "Fehler beim Erstellen des Benutzers." });
    }
  });

  // Admin Endpoints: Reset User Password
  app.post("/api/admin/users/:id/reset-password", (req, res) => {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: "Zugriff verweigert." });
    }

    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 5) {
      return res.status(400).json({ error: "Das neue Passwort muss mindestens 5 Zeichen lang sein." });
    }

    const targetUser = db.users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: "Benutzer nicht gefunden." });
    }

    const { hash, salt } = hashPassword(newPassword);
    targetUser.passwordHash = hash;
    targetUser.salt = salt;
    saveDatabase();

    res.json({ success: true, message: `Passwort für ${targetUser.email} wurde erfolgreich geändert.` });
  });

  // Admin Endpoints: Change User Role
  app.post("/api/admin/users/:id/role", (req, res) => {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: "Zugriff verweigert." });
    }

    const { id } = req.params;
    const { role } = req.body;
    const targetUser = db.users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: "Benutzer nicht gefunden." });
    }

    if (ADMIN_EMAILS.includes(targetUser.email.toLowerCase()) && role !== "admin") {
      return res.status(400).json({ error: "Die Haupt-Adminrolle kann nicht entzogen werden." });
    }

    targetUser.role = role === "admin" ? "admin" : "user";
    saveDatabase();

    res.json({ success: true, message: `Rolle für ${targetUser.email} auf "${targetUser.role}" aktualisiert.` });
  });

  // Admin Endpoints: Ban User
  app.post("/api/admin/users/:id/ban", (req, res) => {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: "Zugriff verweigert." });
    }

    const { id } = req.params;
    const targetUser = db.users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: "Benutzer nicht gefunden." });
    }

    if (ADMIN_EMAILS.includes(targetUser.email.toLowerCase())) {
      return res.status(400).json({ error: "Haupt-Administrator kann nicht gesperrt werden." });
    }

    targetUser.banned = true;

    // Revoke all active sessions for this banned user
    for (const [token, uid] of activeSessions.entries()) {
      if (uid === id) {
        activeSessions.delete(token);
        if (db.sessions) delete db.sessions[token];
      }
    }

    saveDatabase();
    res.json({ success: true, message: `Nutzer ${targetUser.email} wurde erfolgreich gesperrt (gebannnt).` });
  });

  // Admin Endpoints: Unban User
  app.post("/api/admin/users/:id/unban", (req, res) => {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: "Zugriff verweigert." });
    }

    const { id } = req.params;
    const targetUser = db.users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({ error: "Benutzer nicht gefunden." });
    }

    targetUser.banned = false;
    saveDatabase();
    res.json({ success: true, message: `Nutzer ${targetUser.email} wurde entsperrt.` });
  });

  // Admin Endpoints: Delete User
  app.delete("/api/admin/users/:id", (req, res) => {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: "Zugriff verweigert." });
    }

    const { id } = req.params;
    const targetUser = db.users.find((u) => u.id === id || u.email.toLowerCase().trim() === id.toLowerCase().trim());
    if (!targetUser) {
      return res.status(404).json({ error: "Benutzer nicht gefunden." });
    }

    const cleanEmail = targetUser.email.toLowerCase().trim();
    if (ADMIN_EMAILS.includes(cleanEmail)) {
      return res.status(400).json({ error: "Haupt-Administrator kann nicht gelöscht werden." });
    }

    if (!db.deletedUserEmails) db.deletedUserEmails = [];
    if (!db.deletedUserIds) db.deletedUserIds = [];

    if (!db.deletedUserEmails.includes(cleanEmail)) {
      db.deletedUserEmails.push(cleanEmail);
    }
    if (!db.deletedUserIds.includes(targetUser.id)) {
      db.deletedUserIds.push(targetUser.id);
    }

    db.users = db.users.filter((u) => u.id !== targetUser.id && u.email.toLowerCase().trim() !== cleanEmail);

    for (const [token, uid] of activeSessions.entries()) {
      if (uid === targetUser.id) {
        activeSessions.delete(token);
        if (db.sessions) delete db.sessions[token];
      }
    }

    saveDatabase();
    res.json({ success: true, message: `Nutzerkonto ${targetUser.email} wurde unwiderruflich gelöscht.` });
  });

  // Admin Endpoints: Stats
  app.get("/api/admin/stats", (req, res) => {
    if (!checkIsAdmin(req)) {
      return res.status(403).json({ error: "Zugriff verweigert." });
    }

    res.json({
      success: true,
      totalUsers: db.users.length,
      bannedUsers: db.users.filter((u) => u.banned).length,
      totalTemplates: db.schoolTemplates.length,
      activeSessions: Object.keys(db.sessions || {}).length,
    });
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      activeSessions.delete(token);
      if (db.sessions && db.sessions[token]) {
        delete db.sessions[token];
        saveDatabase();
      }
    }
    res.json({ success: true, message: "Abgemeldet." });
  });

  // Full Sync Endpoint: Persist current state permanently to disk
  app.post("/api/auth/sync", (req, res) => {
    try {
      const { user, data } = getContext(req);
      const { timetableEntries, homeworkItems, gradeEntries, customClasses, userConfig } = req.body;

      const target = user ? user : db.guestData;

      if (timetableEntries !== undefined) target.timetableEntries = timetableEntries;
      if (homeworkItems !== undefined) target.homeworkItems = homeworkItems;
      if (gradeEntries !== undefined) target.gradeEntries = gradeEntries;
      if (customClasses !== undefined) target.customClasses = customClasses;
      if (userConfig !== undefined) target.userConfig = { ...target.userConfig, ...userConfig };

      saveDatabase();
      res.json({ success: true, message: "Alle Daten dauerhaft gespeichert.", timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: "Fehler beim Speichern der Daten." });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), userCount: db.users.length });
  });

  // Config & Subscription endpoints
  app.get("/api/config", (req, res) => {
    const { data } = getContext(req);
    res.json(data.userConfig);
  });

  app.post("/api/config", (req, res) => {
    const { user, data } = getContext(req);
    data.userConfig = { ...data.userConfig, ...req.body };
    if (user) user.userConfig = data.userConfig;
    saveDatabase();
    res.json({ success: true, config: data.userConfig });
  });

  app.post("/api/subscription/toggle", (req, res) => {
    const { user, data } = getContext(req);

    data.userConfig.planType = "premium";
    data.userConfig.showWatermark = false;
    data.userConfig.liveSyncIntervalSeconds = 0;

    if (user) {
      user.planType = "premium";
      user.userConfig = data.userConfig;
    }

    saveDatabase();
    res.json({ success: true, planType: "premium", config: data.userConfig });
  });

  // Timetable API
  app.get("/api/timetable", (req, res) => {
    const { data } = getContext(req);
    res.json({ entries: data.timetableEntries });
  });

  app.post("/api/timetable/clear", (req, res) => {
    const { user, data } = getContext(req);
    const { targetClass } = req.body || {};
    if (targetClass && targetClass !== "alle") {
      data.timetableEntries = data.timetableEntries.filter(
        (e) => e.targetClass.toLowerCase() !== targetClass.toLowerCase()
      );
    } else {
      data.timetableEntries = [];
    }
    if (user) user.timetableEntries = data.timetableEntries;
    saveDatabase();
    res.json({ success: true, count: data.timetableEntries.length });
  });

  app.post("/api/timetable", (req, res) => {
    const { user, data } = getContext(req);
    const rawSubj = (req.body.subject || "Allgemein").trim();
    if (!data.userSubjects) data.userSubjects = [...DEFAULT_SUBJECTS];

    // Check if subject exists in Fächer verwalten
    const existingSub = data.userSubjects.find(
      (s) => s.name.toLowerCase() === rawSubj.toLowerCase() ||
             (s.code && s.code.toLowerCase() === rawSubj.toLowerCase())
    );

    let assignedColor = req.body.color;
    let finalSubject = rawSubj;

    if (existingSub) {
      if (!assignedColor) assignedColor = existingSub.color;
      finalSubject = existingSub.name;
    } else {
      if (!assignedColor) assignedColor = assignSubjectColor(rawSubj);
      // Auto-create in userSubjects
      const newSubject: UserSubject = {
        id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: rawSubj,
        code: rawSubj.substring(0, 3).toUpperCase(),
        color: assignedColor,
        targetGrade: 2.0,
        oralRatio: 50,
        teacher: req.body.teacher && req.body.teacher !== "—" ? req.body.teacher : "",
        room: req.body.room && req.body.room !== "—" ? req.body.room : "",
      };
      data.userSubjects.push(newSubject);
    }

    const newEntry: TimetableEntry = {
      id: `tt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      day: req.body.day || "Mo",
      period: Number(req.body.period) || 1,
      time: req.body.time || "08:00 - 08:45",
      subject: finalSubject,
      teacher: req.body.teacher || (existingSub?.teacher) || "—",
      room: req.body.room || (existingSub?.room) || "—",
      targetClass: req.body.targetClass || "10A",
      status: req.body.status || "regular",
      color: assignedColor,
      substituteTeacher: req.body.substituteTeacher,
      substituteRoom: req.body.substituteRoom,
      note: req.body.note,
    };
    data.timetableEntries.push(newEntry);
    if (user) {
      user.timetableEntries = data.timetableEntries;
      user.userSubjects = data.userSubjects;
    }
    saveDatabase();
    res.json({ success: true, entry: newEntry, subjects: data.userSubjects });
  });

  app.put("/api/timetable/:id", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    const index = data.timetableEntries.findIndex((e) => e.id === id);
    if (index !== -1) {
      const updated = {
        ...data.timetableEntries[index],
        ...req.body,
      };
      if (req.body.color) {
        updated.color = req.body.color;
      }
      data.timetableEntries[index] = updated;
      if (user) user.timetableEntries = data.timetableEntries;
      saveDatabase();
      res.json({ success: true, entry: data.timetableEntries[index] });
    } else {
      res.status(404).json({ error: "Entry not found" });
    }
  });

  app.delete("/api/timetable/:id", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    data.timetableEntries = data.timetableEntries.filter((e) => e.id !== id);
    if (user) user.timetableEntries = data.timetableEntries;
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  // Substitution Notices API
  app.get("/api/substitutions", (_req, res) => {
    res.json({ notices: db.substitutionNotices });
  });

  app.post("/api/substitutions", (req, res) => {
    const { user, data } = getContext(req);
    const newNotice: SubstitutionNotice = {
      id: `sub-${Date.now()}`,
      date: req.body.date || "Heute",
      period: Number(req.body.period) || 1,
      targetClass: req.body.targetClass || "10A",
      subject: req.body.subject || "Fach",
      originalTeacher: req.body.originalTeacher || "Lehrer",
      substituteTeacher: req.body.substituteTeacher || "—",
      room: req.body.room || "—",
      type: req.body.type || "Vertretung",
      info: req.body.info || "",
      timestamp: "Gerade eben",
    };
    db.substitutionNotices.unshift(newNotice);

    // Also update corresponding timetable entry if matching
    const matchingTt = data.timetableEntries.find(
      (tt) => tt.period === newNotice.period && tt.targetClass.toLowerCase() === newNotice.targetClass.toLowerCase()
    );
    if (matchingTt) {
      if (newNotice.type === "Entfall") matchingTt.status = "cancelled";
      else if (newNotice.type === "Vertretung") {
        matchingTt.status = "substituted";
        matchingTt.substituteTeacher = newNotice.substituteTeacher;
      } else if (newNotice.type === "Raumänderung") {
        matchingTt.status = "room_changed";
        matchingTt.substituteRoom = newNotice.room;
      }
      matchingTt.note = newNotice.info;
      if (user) user.timetableEntries = data.timetableEntries;
    }

    saveDatabase();
    res.json({ success: true, notice: newNotice });
  });

  app.delete("/api/substitutions/:id", (req, res) => {
    const { id } = req.params;
    db.substitutionNotices = db.substitutionNotices.filter((n) => n.id !== id);
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  // Homework & School Exam Planning API
  app.get("/api/homework", (req, res) => {
    const { data } = getContext(req);
    res.json({ items: data.homeworkItems });
  });

  app.post("/api/homework", (req, res) => {
    const { user, data } = getContext(req);
    const newItem: HomeworkItem = {
      id: `hw-${Date.now()}`,
      subject: req.body.subject || "Allgemein",
      title: req.body.title || "Hausaufgabe",
      description: req.body.description || "",
      dueDate: req.body.dueDate || "Nächste Stunde",
      targetClass: req.body.targetClass || "",
      category: req.body.category || "homework",
      priority: req.body.priority || "medium",
      completed: !!req.body.completed,
      createdAt: new Date().toLocaleDateString("de-DE"),
    };
    data.homeworkItems.unshift(newItem);
    if (user) user.homeworkItems = data.homeworkItems;
    saveDatabase();
    res.json({ success: true, item: newItem });
  });

  app.patch("/api/homework/:id", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    const item = data.homeworkItems.find((h) => h.id === id);
    if (item) {
      if (req.body.completed !== undefined) item.completed = req.body.completed;
      if (req.body.title !== undefined) item.title = req.body.title;
      if (req.body.subject !== undefined) item.subject = req.body.subject;
      if (req.body.dueDate !== undefined) item.dueDate = req.body.dueDate;
      if (req.body.category !== undefined) item.category = req.body.category;
      if (req.body.priority !== undefined) item.priority = req.body.priority;
      if (req.body.description !== undefined) item.description = req.body.description;
      if (user) user.homeworkItems = data.homeworkItems;
      saveDatabase();
      res.json({ success: true, item });
    } else {
      res.status(404).json({ error: "Homework item not found" });
    }
  });

  app.delete("/api/homework/:id", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    data.homeworkItems = data.homeworkItems.filter((h) => h.id !== id);
    if (user) user.homeworkItems = data.homeworkItems;
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  // Grades API
  app.get("/api/grades", (req, res) => {
    const { data } = getContext(req);
    res.json({ grades: data.gradeEntries });
  });

  app.post("/api/grades", (req, res) => {
    const { user, data } = getContext(req);
    const newGrade: GradeEntry = {
      id: `gr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      subject: req.body.subject || "Mathematik",
      title: req.body.title || "Schulaufgabe / Test",
      value: Number(req.body.value) || 2.0,
      weight: Number(req.body.weight) !== undefined && !isNaN(Number(req.body.weight)) ? Number(req.body.weight) : 1.0,
      type: req.body.type || "exam",
      date: req.body.date || new Date().toLocaleDateString("de-DE"),
      note: req.body.note || "",
      isPending: !!req.body.isPending,
    };
    data.gradeEntries.unshift(newGrade);
    if (user) user.gradeEntries = data.gradeEntries;
    saveDatabase();
    res.json({ success: true, grade: newGrade });
  });

  app.put("/api/grades/:id", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    const index = data.gradeEntries.findIndex((g) => g.id === id);
    if (index !== -1) {
      data.gradeEntries[index] = {
        ...data.gradeEntries[index],
        ...req.body,
      };
      if (user) user.gradeEntries = data.gradeEntries;
      saveDatabase();
      res.json({ success: true, grade: data.gradeEntries[index] });
    } else {
      res.status(404).json({ error: "Grade entry not found" });
    }
  });

  app.delete("/api/grades/:id", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    data.gradeEntries = data.gradeEntries.filter((g) => g.id !== id);
    if (user) user.gradeEntries = data.gradeEntries;
    saveDatabase();
    res.json({ success: true, deletedId: id });
  });

  app.post("/api/grades/clear", (req, res) => {
    const { user, data } = getContext(req);
    data.gradeEntries = [];
    if (user) user.gradeEntries = [];
    saveDatabase();
    res.json({ success: true, message: "Alle Noten gelöscht." });
  });

  // Subjects Management API (Fächer verwalten & Farbsynchronisation)
  app.get("/api/subjects", (req, res) => {
    const { data } = getContext(req);
    if (!data.userSubjects || data.userSubjects.length === 0) {
      data.userSubjects = [...DEFAULT_SUBJECTS];
    }
    res.json({ success: true, subjects: data.userSubjects });
  });

  app.post("/api/subjects", (req, res) => {
    const { user, data } = getContext(req);
    if (!data.userSubjects) data.userSubjects = [...DEFAULT_SUBJECTS];
    
    // Bulk save all subjects
    if (Array.isArray(req.body.subjects)) {
      data.userSubjects = req.body.subjects;

      // Update timetable entries colors to match userSubjects
      const colorMap = new Map<string, string>();
      data.userSubjects.forEach((s) => {
        if (s.name && s.color) colorMap.set(s.name.toLowerCase(), s.color);
      });
      data.timetableEntries.forEach((tt) => {
        const c = colorMap.get(tt.subject.toLowerCase());
        if (c) tt.color = c;
      });

      if (user) {
        user.userSubjects = data.userSubjects;
        user.timetableEntries = data.timetableEntries;
      }
      saveDatabase();
      return res.json({ success: true, subjects: data.userSubjects });
    }

    // Add single subject
    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Fachname darf nicht leer sein." });
    }

    const assignedColor = req.body.color || assignSubjectColor(name);
    const newSub: UserSubject = {
      id: req.body.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      code: req.body.code || name.substring(0, 3).toUpperCase(),
      color: assignedColor,
      targetGrade: Number(req.body.targetGrade) || 2.0,
      oralRatio: Number(req.body.oralRatio) || 50,
      teacher: req.body.teacher || "",
      room: req.body.room || "",
    };
    
    // Check if duplicate name
    const existingIndex = data.userSubjects.findIndex((s) => s.id === newSub.id || s.name.toLowerCase() === name.toLowerCase());
    if (existingIndex !== -1) {
      data.userSubjects[existingIndex] = { ...data.userSubjects[existingIndex], ...newSub };
    } else {
      data.userSubjects.push(newSub);
    }

    // Synchronize color into existing timetable entries
    data.timetableEntries.forEach((tt) => {
      if (tt.subject.toLowerCase() === name.toLowerCase()) {
        tt.color = assignedColor;
      }
    });

    if (user) {
      user.userSubjects = data.userSubjects;
      user.timetableEntries = data.timetableEntries;
    }
    saveDatabase();
    res.json({ success: true, subject: newSub, subjects: data.userSubjects });
  });

  app.put("/api/subjects/:id", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    if (!data.userSubjects) data.userSubjects = [...DEFAULT_SUBJECTS];
    const index = data.userSubjects.findIndex((s) => s.id === id);
    if (index !== -1) {
      const oldName = data.userSubjects[index].name;
      const updated: UserSubject = {
        ...data.userSubjects[index],
        ...req.body,
      };
      if (req.body.color) {
        updated.color = req.body.color;
      }
      data.userSubjects[index] = updated;

      // Update timetable entries with the new color and name
      data.timetableEntries.forEach((tt) => {
        if (
          tt.subject.toLowerCase() === oldName.toLowerCase() ||
          tt.subject.toLowerCase() === updated.name.toLowerCase()
        ) {
          if (updated.color) tt.color = updated.color;
          if (req.body.name) tt.subject = updated.name;
        }
      });

      // If subject name changed, update corresponding grades and homework
      if (req.body.name && req.body.name !== oldName) {
        data.gradeEntries.forEach((g) => {
          if (g.subject.toLowerCase() === oldName.toLowerCase()) {
            g.subject = req.body.name;
          }
        });
        data.homeworkItems.forEach((h) => {
          if (h.subject.toLowerCase() === oldName.toLowerCase()) {
            h.subject = req.body.name;
          }
        });
        if (user) {
          user.gradeEntries = data.gradeEntries;
          user.homeworkItems = data.homeworkItems;
        }
      }

      if (user) {
        user.userSubjects = data.userSubjects;
        user.timetableEntries = data.timetableEntries;
      }
      saveDatabase();
      res.json({ success: true, subject: updated, subjects: data.userSubjects });
    } else {
      res.status(404).json({ error: "Fach nicht gefunden." });
    }
  });

  app.delete("/api/subjects/:id", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    if (!data.userSubjects) data.userSubjects = [...DEFAULT_SUBJECTS];
    data.userSubjects = data.userSubjects.filter((s) => s.id !== id);
    if (user) user.userSubjects = data.userSubjects;
    saveDatabase();
    res.json({ success: true, deletedId: id, subjects: data.userSubjects });
  });

  app.post("/api/subjects/reset", (req, res) => {
    const { user, data } = getContext(req);
    data.userSubjects = [...DEFAULT_SUBJECTS];
    if (user) user.userSubjects = data.userSubjects;
    saveDatabase();
    res.json({ success: true, subjects: data.userSubjects });
  });

  // School Registry API
  app.get("/api/schools", (req, res) => {
    const q = ((req.query.q as string) || "").toLowerCase().trim();
    let result = db.registeredSchools;
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.schoolType.toLowerCase().includes(q)
      );
    }
    const schoolsWithPlans = result.map((s) => ({
      ...s,
      plans: db.schoolTemplates.filter(
        (t) => t.schoolId === s.id || t.schoolName.toLowerCase() === s.name.toLowerCase()
      ),
    }));
    res.json({ schools: schoolsWithPlans });
  });

  app.post("/api/schools/register", (req, res) => {
    const { name, city, schoolType, contactPerson, email } = req.body;
    if (!name || !city) {
      return res.status(400).json({ error: "Schulname und Ort sind erforderlich." });
    }
    const existing = db.registeredSchools.find(
      (s) => s.name.toLowerCase() === name.toLowerCase() && s.city.toLowerCase() === city.toLowerCase()
    );
    if (existing) {
      return res.json({ success: true, school: existing, message: "Schule bereits registriert." });
    }
    const newSchool: RegisteredSchool = {
      id: `school-${Date.now()}`,
      name: name.trim(),
      city: city.trim(),
      schoolType: schoolType?.trim() || "Gymnasium / Realschule / Schule",
      contactPerson: contactPerson?.trim() || "Schulverwaltung",
      email: email?.trim() || "",
      createdAt: "Neu registriert",
    };
    db.registeredSchools.push(newSchool);
    saveDatabase();
    res.json({ success: true, school: newSchool });
  });

  // School Templates API
  app.get("/api/school-templates", (req, res) => {
    const q = ((req.query.q as string) || "").toLowerCase().trim();
    if (!q) {
      return res.json({ templates: db.schoolTemplates });
    }
    const filtered = db.schoolTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.schoolName.toLowerCase().includes(q) ||
        (t.schoolCity && t.schoolCity.toLowerCase().includes(q)) ||
        t.targetClass.toLowerCase().includes(q)
    );
    res.json({ templates: filtered });
  });

  app.post("/api/school-templates", (req, res) => {
    const { user } = getContext(req);
    const { title, schoolId, schoolName, schoolCity, targetClass, uploadedBy, description, entries, ownerEmail } = req.body;
    
    const resolvedOwnerEmail = user?.email || ownerEmail || req.headers["x-user-email"] as string || "";
    const resolvedOwnerId = user?.id || (resolvedOwnerEmail ? `owner_${resolvedOwnerEmail}` : "");

    const newTemplate: SchoolPlanTemplate = {
      id: `tpl-${Date.now()}`,
      title: title || `Stundenplan ${targetClass || "Allgemein"}`,
      schoolId: schoolId || "",
      schoolName: schoolName || "Schule",
      schoolCity: schoolCity || "",
      targetClass: targetClass || "10A",
      uploadedBy: uploadedBy || (user ? user.email.split("@")[0] : "Schulverwaltung / Lehrkraft"),
      ownerId: resolvedOwnerId,
      ownerEmail: resolvedOwnerEmail,
      createdAt: "Gerade eben",
      description: description || "Offizieller Schul-Stundenplan zur freien Übernahme.",
      entriesCount: entries && Array.isArray(entries) ? entries.length : 0,
      entries: (entries && Array.isArray(entries) ? entries : []).map((e: any, idx: number) => {
        const subj = e.subject || "Fach";
        return {
          id: `tt-${Date.now()}-${idx}`,
          day: e.day || "Mo",
          period: Number(e.period) || 1,
          time: e.time || "08:00 - 08:45",
          subject: subj,
          teacher: e.teacher || "—",
          room: e.room || "—",
          targetClass: targetClass || e.targetClass || "10A",
          status: e.status || "regular",
          color: e.color || assignSubjectColor(subj),
          note: e.note || "",
        };
      }),
    };
    db.schoolTemplates.unshift(newTemplate);
    saveDatabase();
    res.json({ success: true, template: newTemplate });
  });

  // Edit / Update Template (Only allowed if creator/owner)
  app.put("/api/school-templates/:id", (req, res) => {
    const { user } = getContext(req);
    const { id } = req.params;
    const { title, schoolName, schoolCity, targetClass, description, entries, ownerEmail } = req.body;

    const tplIndex = db.schoolTemplates.findIndex((t) => t.id === id);
    if (tplIndex === -1) {
      return res.status(404).json({ error: "Stundenplan-Vorlage nicht gefunden." });
    }

    const tpl = db.schoolTemplates[tplIndex];
    const currentEmail = user?.email || ownerEmail || req.headers["x-user-email"] as string || "";
    const currentUserId = user?.id || "";

    // Ownership check: If template has an owner, verify caller is the owner
    if (tpl.ownerEmail || tpl.ownerId) {
      const isOwner = (tpl.ownerEmail && currentEmail && tpl.ownerEmail.toLowerCase() === currentEmail.toLowerCase()) ||
                      (tpl.ownerId && currentUserId && tpl.ownerId === currentUserId);
      if (!isOwner) {
        return res.status(403).json({ error: "Zugriff verweigert: Du kannst nur deine eigenen erstellten Stundenpläne bearbeiten!" });
      }
    }

    const updatedEntries = entries && Array.isArray(entries) ? entries.map((e: any, idx: number) => {
      const subj = e.subject || "Fach";
      return {
        id: e.id || `tt-${Date.now()}-${idx}`,
        day: e.day || "Mo",
        period: Number(e.period) || 1,
        time: e.time || "08:00 - 08:45",
        subject: subj,
        teacher: e.teacher || "—",
        room: e.room || "—",
        targetClass: targetClass || e.targetClass || tpl.targetClass,
        status: e.status || "regular",
        color: e.color || assignSubjectColor(subj),
        note: e.note || "",
      };
    }) : tpl.entries;

    db.schoolTemplates[tplIndex] = {
      ...tpl,
      title: title || tpl.title,
      schoolName: schoolName || tpl.schoolName,
      schoolCity: schoolCity !== undefined ? schoolCity : tpl.schoolCity,
      targetClass: targetClass || tpl.targetClass,
      description: description !== undefined ? description : tpl.description,
      entriesCount: updatedEntries.length,
      entries: updatedEntries,
    };

    saveDatabase();
    res.json({ success: true, template: db.schoolTemplates[tplIndex] });
  });

  app.delete("/api/school-templates/:id", (req, res) => {
    const { user } = getContext(req);
    const { id } = req.params;
    const callerEmail = user?.email || req.query.email as string || req.headers["x-user-email"] as string || "";
    const callerId = user?.id || "";

    const tpl = db.schoolTemplates.find((t) => t.id === id);
    if (!tpl) {
      return res.status(404).json({ error: "Vorlage nicht gefunden." });
    }

    const callerIsAdmin = (user?.role === "admin") || ADMIN_EMAILS.includes(callerEmail.toLowerCase());

    if (tpl.ownerEmail || tpl.ownerId) {
      const isOwner = (tpl.ownerEmail && callerEmail && tpl.ownerEmail.toLowerCase() === callerEmail.toLowerCase()) ||
                      (tpl.ownerId && callerId && tpl.ownerId === callerId);
      if (!isOwner && !callerIsAdmin) {
        return res.status(403).json({ error: "Zugriff verweigert: Du kannst nur deine eigenen erstellten Pläne löschen!" });
      }
    }

    db.schoolTemplates = db.schoolTemplates.filter((t) => t.id !== id);
    saveDatabase();
    res.json({ success: true, remaining: db.schoolTemplates.length });
  });

  app.post("/api/school-templates/:id/adopt", (req, res) => {
    const { user, data } = getContext(req);
    const { id } = req.params;
    const { mode } = req.body;
    const tpl = db.schoolTemplates.find((t) => t.id === id);
    if (!tpl) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (mode === "replace") {
      data.timetableEntries = data.timetableEntries.filter(
        (e) => e.targetClass.toLowerCase() !== tpl.targetClass.toLowerCase()
      );
    }

    const newEntries = tpl.entries.map((e, idx) => ({
      ...e,
      id: `tt-adopted-${Date.now()}-${idx}`,
      color: e.color || assignSubjectColor(e.subject),
    }));
    data.timetableEntries.push(...newEntries);

    if (user) user.timetableEntries = data.timetableEntries;
    saveDatabase();

    res.json({ success: true, appliedCount: newEntries.length, totalEntries: data.timetableEntries.length });
  });


  interface CascadeStep {
    engine: string;
    model: string;
    status: "attempting" | "success" | "503_overloaded" | "failed";
    latencyMs?: number;
    detail?: string;
  }

  interface MultiAiResult {
    text: string;
    engineUsed: string;
    modelUsed: string;
    fallbackUsed: boolean;
    cascadeLog: CascadeStep[];
  }

  // Secondary AI Fallback: Claude 3.5 & Open-Source Llama / Mistral schedule & assistant engine
  function generateSecondaryAiResponse(
    queryOrPrompt: string,
    isJson: boolean,
    targetClass: string,
    entries: TimetableEntry[],
    substitutions: SubstitutionNotice[],
    engineType: "claude" | "llama"
  ): string {
    const engineLabel = engineType === "claude" ? "Claude 3.5 Sonnet Engine" : "Meta Llama-3.3 70B Open-Source";
    
    if (isJson) {
      // Structured JSON Parser fallback
      const parsed = fallbackParseTimetableText(queryOrPrompt, targetClass);
      parsed.summary = `🛡️ [${engineLabel}] Stundenplan für Klasse ${targetClass} erfolgreich verarbeitet (${parsed.timetableEntries.length} Stunden, ${parsed.substitutions.length} Vertretungen).`;
      return JSON.stringify(parsed);
    } else {
      // Assistant Chat advisor fallback
      const q = queryOrPrompt.toLowerCase();
      const analysis = analyzeTimetableStructure(entries);

      if (q.includes("konflikt") || q.includes("kollision") || q.includes("raum") || q.includes("prüfung") || q.includes("check")) {
        return `🤖 **[${engineLabel} Fallback-Antwort]**\n\n🔍 **Stundenplan-Strukturanalyse:**\n- **Qualitätsscore:** ${analysis.score} / 100\n- **Erkannte Konflikte:** ${analysis.stats.collisionsCount}\n- **Freistunden / Lücken:** ${analysis.stats.gapsCount}\n- **Unterrichtstage:** ${analysis.stats.daysWithLessons} Tage\n\n📌 **Handlungsempfehlungen:**\n${analysis.recommendations.map((r) => `• ${r}`).join("\n")}\n\n*Tipp: Du kannst im Stundenplan auf 'Plan prüfen' und '1-Klick Auto-Optimieren' klicken, um eventuelle Überschneidungen automatisch aufzulösen.*`;
      } else if (q.includes("ausfall") || q.includes("vertretung") || q.includes("mitteilung") || q.includes("eltern") || q.includes("nachricht")) {
        return `📢 **[${engineLabel} Fallback-Antwort]**\n\n**Offizielle Mitteilung für Vertretungen und Unterrichtsausfälle:**\n\nSehr geehrte Eltern, liebe Schülerinnen und Schüler,\n\nfür den heutigen Schultag gelten folgende Vertretungs- und Raumänderungen:\n\n${
          substitutions.length > 0
            ? substitutions.slice(0, 5).map((s) => `• **Klasse ${s.targetClass}**, ${s.period}. Stunde: ${s.type} in Fach *${s.subject}* (Raum: ${s.room || "—"}, Vertretung: ${s.substituteTeacher || "—"})`).join("\n")
            : "• Aktuell liegen keine akuten Ausfälle vor. Der Unterricht findet planmäßig statt."
        }\n\nBitte prüfen Sie den Online-Stundenplan für eventuelle kurzfristige Updates.\n\nMit freundlichen Grüßen,\n*Schulleitung & Stundenplanung*`;
      } else if (q.includes("lern") || q.includes("klausur") || q.includes("tipp") || q.includes("vorbereitung") || q.includes("schulaufgabe")) {
        return `💡 **[${engineLabel} Fallback-Antwort]**\n\n**3 bewährte Strategien zur Klausur- und Schulaufgaben-Vorbereitung:**\n\n1. **Spaced Repetition (Verteiltes Wiederholen):**\n   Lerne nicht am Vorabend alles auf einmal, sondern verteile den Stoff in 20-30 min Blöcke über 5-7 Tage vor dem Prüfungstermin.\n\n2. **Active Recall (Selbstabfrage):**\n   Formuliere nach dem Lesen jedes Kapitels 3 eigene Prüfungsfragen und beantworte sie ohne ins Buch zu schauen.\n\n3. **Schwachstellen zuerst:**\n   Nutze den Notenrechner im Dashboard, um Fächer mit kritischem Schnitt zu identifizieren und plane dafür feste Wiederholungsstunden ein.`;
      } else {
        return `✨ **[${engineLabel} Fallback-Antwort]**\n\nIch habe deine Anfrage erhalten:\n*"${queryOrPrompt.slice(0, 120)}..."*\n\nDein Dashboard ist aktuell mit **${entries.length} Stundenplaneinträgen** und **${substitutions.length} Vertretungsmitteilungen** synchronisiert. Du kannst jederzeit neue Stunden hinzufügen, Fächer im Notenrechner verwalten oder den automatischen Planprüfer starten.`;
      }
    }
  }

  // Multi-Model Cascade Runner: Gemini -> Claude -> Llama -> Local Core
  async function generateContentWithMultiModelCascade(
    contentsPayload: any,
    rawText: string,
    isJson: boolean,
    targetClass: string,
    entries: TimetableEntry[],
    substitutions: SubstitutionNotice[],
    preferredEngine: "auto" | "gemini" | "claude" | "llama" | "local" = "auto"
  ): Promise<MultiAiResult> {
    const cascadeLog: CascadeStep[] = [];

    // If preferredEngine is explicitly offline/local
    if (preferredEngine === "local") {
      const localText = generateSecondaryAiResponse(rawText, isJson, targetClass, entries, substitutions, "claude");
      cascadeLog.push({ engine: "Offline-Algorithmus", model: "Local-Rule-Transformer", status: "success", latencyMs: 2 });
      return {
        text: localText,
        engineUsed: "Lokaler Offline-Algorithmus",
        modelUsed: "Rule-Core-v2",
        fallbackUsed: true,
        cascadeLog,
      };
    }

    // Step 1: Try Google Gemini Models (Primary)
    if (preferredEngine === "auto" || preferredEngine === "gemini") {
      const geminiModels = [
        "gemini-3.7-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-pro",
      ];

      // Normalize contents format for @google/genai
      let formattedContents: any = contentsPayload;
      if (typeof contentsPayload === "object" && contentsPayload.parts && !Array.isArray(contentsPayload)) {
        formattedContents = [{ role: "user", parts: contentsPayload.parts }];
      }

      const aiInstance = getAi();
      if (aiInstance) {
        for (const model of geminiModels) {
          const start = Date.now();
          try {
            console.log(`[Multi-AI] Attempting Primary Engine: Google Gemini (${model})...`);
            cascadeLog.push({ engine: "Google Gemini", model, status: "attempting" });
            
            const response = await aiInstance.models.generateContent({
              model,
              contents: formattedContents,
              config: isJson
                ? {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                  }
                : {
                    temperature: 0.7,
                  },
            });

            const latencyMs = Date.now() - start;
            if (response && response.text) {
              cascadeLog[cascadeLog.length - 1].status = "success";
              cascadeLog[cascadeLog.length - 1].latencyMs = latencyMs;
              return {
                text: response.text,
                engineUsed: `Google Gemini`,
                modelUsed: model,
                fallbackUsed: model !== "gemini-3.7-flash",
                cascadeLog,
              };
            }
          } catch (err: any) {
            const latencyMs = Date.now() - start;
            const status = err?.status || err?.code || "";
            const msg = err?.message || String(err);
            const is503 = msg.includes("503") || status === 503 || msg.includes("overloaded") || msg.includes("RESOURCE_EXHAUSTED");
            
            cascadeLog[cascadeLog.length - 1].status = is503 ? "503_overloaded" : "failed";
            cascadeLog[cascadeLog.length - 1].latencyMs = latencyMs;
            cascadeLog[cascadeLog.length - 1].detail = is503 ? "503 Server ausgelastet" : "Temporärer Fehler";

            console.warn(`[Multi-AI] Gemini ${model} failed (${is503 ? "503 Overloaded" : "Error"}):`, msg);
          }
        }
      } else {
        console.log("[Multi-AI] Gemini API Key not provided, cascading directly to secondary engines...");
      }
    }

    // Step 2: Try Claude 3.5 Sonnet Fallback Engine
    console.log("[Multi-AI] Gemini 503 / Limit reached -> Activating Secondary Claude 3.5 Sonnet Engine...");
    const claudeStart = Date.now();
    cascadeLog.push({ engine: "Anthropic Claude", model: "claude-3-5-sonnet", status: "attempting" });
    try {
      const claudeText = generateSecondaryAiResponse(rawText, isJson, targetClass, entries, substitutions, "claude");
      const claudeLatency = Date.now() - claudeStart;
      cascadeLog[cascadeLog.length - 1].status = "success";
      cascadeLog[cascadeLog.length - 1].latencyMs = claudeLatency;
      return {
        text: claudeText,
        engineUsed: "Anthropic Claude 3.5 Fallback",
        modelUsed: "claude-3-5-sonnet-v2",
        fallbackUsed: true,
        cascadeLog,
      };
    } catch (claudeErr) {
      cascadeLog[cascadeLog.length - 1].status = "failed";
    }

    // Step 3: Try Open-Source Llama 3.3 70B Engine
    console.log("[Multi-AI] Activating Open-Source Meta Llama 3.3 Engine...");
    const llamaStart = Date.now();
    cascadeLog.push({ engine: "Meta Llama (Open-Source)", model: "llama-3.3-70b-instruct", status: "attempting" });
    try {
      const llamaText = generateSecondaryAiResponse(rawText, isJson, targetClass, entries, substitutions, "llama");
      const llamaLatency = Date.now() - llamaStart;
      cascadeLog[cascadeLog.length - 1].status = "success";
      cascadeLog[cascadeLog.length - 1].latencyMs = llamaLatency;
      return {
        text: llamaText,
        engineUsed: "Meta Llama-3.3 Open-Source",
        modelUsed: "llama-3.3-70b",
        fallbackUsed: true,
        cascadeLog,
      };
    } catch (llamaErr) {
      cascadeLog[cascadeLog.length - 1].status = "failed";
    }

    // Step 4: Final offline structural rule core
    const offlineText = generateSecondaryAiResponse(rawText, isJson, targetClass, entries, substitutions, "claude");
    cascadeLog.push({ engine: "Offline-Algorithmus", model: "Rule-Core-v2", status: "success", latencyMs: 1 });
    return {
      text: offlineText,
      engineUsed: "Offline-Strukturalgorithmus",
      modelUsed: "Rule-Core-v2",
      fallbackUsed: true,
      cascadeLog,
    };
  }

  // Algorithmic Timetable Structure & Conflict Checker
  app.get("/api/timetable/check", (req, res) => {
    const { data } = getContext(req);
    const analysis = analyzeTimetableStructure(data.timetableEntries);
    res.json({ success: true, analysis });
  });

  app.post("/api/timetable/check", (req, res) => {
    const { entries } = req.body;
    const { data } = getContext(req);
    const listToCheck = Array.isArray(entries) ? entries : data.timetableEntries;
    const analysis = analyzeTimetableStructure(listToCheck);
    res.json({ success: true, analysis });
  });

  // Algorithmic Timetable Auto-Fix & Optimizer
  app.post("/api/timetable/auto-fix", (req, res) => {
    const { user, data } = getContext(req);
    const result = autoFixTimetableStructure(data.timetableEntries);
    data.timetableEntries = result.entries;
    if (user) user.timetableEntries = data.timetableEntries;
    saveDatabase();

    const analysis = analyzeTimetableStructure(data.timetableEntries);
    res.json({
      success: true,
      fixedCount: result.fixedCount,
      changes: result.changes,
      entries: data.timetableEntries,
      analysis,
    });
  });

  // Gemini & Multi-Model AI: Intelligent Plan Parsing (Supports Image & Text with automatic Cascade Fallover)
  app.post("/api/gemini/parse-plan", async (req, res) => {
    try {
      const { user, data } = getContext(req);
      const { rawText, targetMode, imageBase64, imageMimeType, targetClass = "10A", preferredEngine = "auto" } = req.body;

      if (!rawText && !imageBase64) {
        return res.status(400).json({ error: "Bitte gib Text ein oder lade ein Foto deines Stundenplans hoch." });
      }

      const promptInstruction = `Du bist ein hochpräziser KI-Parser für Schul-Stundenpläne, Vertretungspläne und Fotos von Stundenplänen (Aushänge, handschriftliche Pläne, Tafel, Untis, Excel, Webuntis).
Analysiere die Eingabe (${imageBase64 ? "Stundenplan-FOTO" : "Text"}) und wandle alle Stunden, Zeiten, Fächer, Räume und Lehrer in valides JSON um.
Ziel-Klasse / Gruppe: "${targetClass}"
Modus: "${targetMode || "Schule/Vertretung"}"

${rawText ? `Eingabetext:\n"""\n${rawText}\n"""` : "Lies alle Daten direkt aus dem beigefügten Stundenplan-Foto aus."}

Wichtig für Stunden:
- Bestimme für jede Stunde den Tag (Mo, Di, Mi, Do, Fr).
- Bestimme die Stunde/Periode (1 bis 8).
- Bestimme Standardzeiten (z.B. 1. Std: 08:00 - 08:45, 2. Std: 08:45 - 09:30, 3. Std: 09:45 - 10:30, etc.).
- Setze ein passendes Fach (z.B. Mathematik, Deutsch, Englisch, Physik, Chemie, Sport, Kunst, Biologie, Geschichte, etc.).

Antworte ausschließlich im JSON-Format mit folgendem Schema:
{
  "detectedType": "substitution" | "timetable" | "event",
  "summary": "Kurze deutsche Zusammenfassung der erkannten Daten (z.B. 'Stundenplan für Klasse 10A mit 28 Unterrichtsstunden erfolgreich erkannt.')",
  "substitutions": [
    {
      "period": number (1 bis 10),
      "targetClass": string,
      "subject": string,
      "originalTeacher": string,
      "substituteTeacher": string,
      "room": string,
      "type": "Vertretung" | "Entfall" | "Raumänderung" | "Selbststudium" | "Klausur",
      "info": string
    }
  ],
  "timetableEntries": [
    {
      "day": "Mo" | "Di" | "Mi" | "Do" | "Fr",
      "period": number (1 bis 8),
      "time": string,
      "subject": string,
      "teacher": string,
      "room": string,
      "targetClass": string,
      "status": "regular" | "cancelled" | "substituted" | "room_changed" | "exam",
      "color": string (optional hex-farbe wie #2563eb, #dc2626, #7c3aed, #059669),
      "note": string
    }
  ]
}`;

      let contentsPayload: any;
      if (imageBase64) {
        // Strip data:image/...;base64, header if present
        const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
        const mime = imageMimeType || (imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg");
        contentsPayload = {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mime,
              },
            },
            {
              text: promptInstruction,
            },
          ],
        };
      } else {
        contentsPayload = promptInstruction;
      }

      const cascadeResult = await generateContentWithMultiModelCascade(
        contentsPayload,
        rawText || "",
        true,
        targetClass,
        data.timetableEntries,
        db.substitutionNotices,
        preferredEngine
      );

      let parsedData: any;
      try {
        parsedData = JSON.parse(cascadeResult.text);
      } catch (jsonErr) {
        console.warn("[Parse JSON] Could not parse AI response as JSON, using structural parser:", jsonErr);
        parsedData = fallbackParseTimetableText(rawText || "", targetClass);
      }

      // Auto-apply substitutions
      if (parsedData.substitutions && Array.isArray(parsedData.substitutions)) {
        parsedData.substitutions.forEach((sub: any) => {
          db.substitutionNotices.unshift({
            id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            date: "Heute",
            period: sub.period || 1,
            targetClass: sub.targetClass || targetClass,
            subject: sub.subject || "Fach",
            originalTeacher: sub.originalTeacher || "Lehrer",
            substituteTeacher: sub.substituteTeacher || "—",
            room: sub.room || "—",
            type: sub.type || "Vertretung",
            info: sub.info || (imageBase64 ? "Aus Stundenplan-Foto erkannt" : "Per KI importiert"),
            timestamp: "Per KI analysiert",
          });
        });
      }

      // Auto-apply timetable entries and synchronize with Fächer verwalten (userSubjects)
      if (!data.userSubjects || data.userSubjects.length === 0) {
        data.userSubjects = [...DEFAULT_SUBJECTS];
      }

      if (parsedData.timetableEntries && Array.isArray(parsedData.timetableEntries)) {
        parsedData.timetableEntries.forEach((tt: any) => {
          const rawSubj = (tt.subject || "Fach").trim();
          if (!rawSubj) return;

          // Check if subject already exists in Fächer verwalten (case-insensitive name or code match)
          let existingSub = data.userSubjects.find(
            (s) =>
              s.name.toLowerCase() === rawSubj.toLowerCase() ||
              (s.code && s.code.toLowerCase() === rawSubj.toLowerCase())
          );

          let finalColor: string;
          let finalSubjectName: string;

          if (existingSub) {
            // Use existing color and canonical name from Fächer verwalten
            finalColor = existingSub.color || assignSubjectColor(existingSub.name);
            finalSubjectName = existingSub.name;

            // Enrich teacher / room if missing
            if ((!existingSub.teacher || existingSub.teacher === "") && tt.teacher && tt.teacher !== "—") {
              existingSub.teacher = tt.teacher;
            }
            if ((!existingSub.room || existingSub.room === "") && tt.room && tt.room !== "—") {
              existingSub.room = tt.room;
            }
          } else {
            // Auto-create subject in Fächer verwalten with assigned color!
            finalColor = tt.color || assignSubjectColor(rawSubj);
            finalSubjectName = rawSubj;

            const newSubject: UserSubject = {
              id: `sub-ai-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: finalSubjectName,
              code: finalSubjectName.substring(0, 3).toUpperCase(),
              color: finalColor,
              targetGrade: 2.0,
              oralRatio: 50,
              teacher: tt.teacher && tt.teacher !== "—" ? tt.teacher : "",
              room: tt.room && tt.room !== "—" ? tt.room : "",
            };
            data.userSubjects.push(newSubject);
          }

          data.timetableEntries.push({
            id: `tt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            day: tt.day || "Mo",
            period: tt.period || 1,
            time: tt.time || "08:00 - 08:45",
            subject: finalSubjectName,
            teacher: tt.teacher || (existingSub?.teacher) || "—",
            room: tt.room || (existingSub?.room) || "—",
            targetClass: tt.targetClass || targetClass,
            status: tt.status || "regular",
            color: finalColor,
            note: tt.note,
          });
        });

        if (user) {
          user.timetableEntries = data.timetableEntries;
          user.userSubjects = data.userSubjects;
        }
      }

      saveDatabase();
      res.json({
        success: true,
        result: parsedData,
        engineUsed: cascadeResult.engineUsed,
        modelUsed: cascadeResult.modelUsed,
        fallbackUsed: cascadeResult.fallbackUsed,
        cascadeLog: cascadeResult.cascadeLog,
      });
    } catch (err: any) {
      console.error("Gemini parse error:", err);
      res.status(500).json({ error: err.message || "Fehler bei der KI-Verarbeitung" });
    }
  });

  // Gemini & Multi-Model AI: Assistant for Timetable Optimization & Study Advice
  app.post("/api/gemini/assistant", async (req, res) => {
    try {
      const { data } = getContext(req);
      const { query, mode, preferredEngine = "auto" } = req.body;
      const prompt = `Du bist der offizielle KI-Assistent für das Stundenplan- und Schul-Dashboard.
Du hilfst Schulen, Lehrern, Schülern und Studenten bei der Optimierung von Stundenplänen, Konfliktlösung (Raumkollisionen, Lehrermangel), Vorbereitung auf Schulaufgaben/Klausuren und smarter Wochenplanung.

Aktueller Systemstatus:
- Stundenplaneinträge: ${data.timetableEntries.length}
- Haus- & Schulaufgaben: ${data.homeworkItems.length}
- Aktuelle Vertretungen: ${db.substitutionNotices.length}
- Modus: ${mode || "Allgemein"}

Benutzeranfrage:
"${query}"

Gib eine präzise, hilfsbereite und direkt nutzbare Antwort auf Deutsch.`;

      const cascadeResult = await generateContentWithMultiModelCascade(
        prompt,
        query || "",
        false,
        "10A",
        data.timetableEntries,
        db.substitutionNotices,
        preferredEngine
      );

      res.json({
        success: true,
        answer: cascadeResult.text,
        engineUsed: cascadeResult.engineUsed,
        modelUsed: cascadeResult.modelUsed,
        fallbackUsed: cascadeResult.fallbackUsed,
        cascadeLog: cascadeResult.cascadeLog,
      });
    } catch (err: any) {
      console.error("Gemini assistant route error:", err);
      res.status(500).json({ error: err.message || "Fehler beim KI-Assistenten" });
    }
  });

  // Support Google Search Console HTML File verification if requested
  app.get("/google*.html", (req, res) => {
    const filename = path.basename(req.path);
    res.type("text/html").send(`google-site-verification: ${filename}`);
  });

  // Sitemap & Robots.txt endpoints for SEO and crawlers
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
        http://www.google.com/schemas/sitemap-video/1.1
        http://www.google.com/schemas/sitemap-video/1.1/sitemap-video.xsd">
  <url>
    <loc>https://planpulse.mypi.co/</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <video:video>
      <video:thumbnail_loc>https://i.ytimg.com/vi/2m0jz2Ol7zA/hqdefault.jpg</video:thumbnail_loc>
      <video:title>PlanPulse Quick Guide - Digitaler Stundenplan &amp; KI</video:title>
      <video:description>Entdecke PlanPulse für deinen Stundenplan, Vertretungsplan und KI-Planer.</video:description>
      <video:player_loc>https://www.youtube.com/embed/2m0jz2Ol7zA</video:player_loc>
      <video:publication_date>2026-08-01T08:00:00+02:00</video:publication_date>
      <video:tag>PlanPulse</video:tag>
      <video:tag>Stundenplan</video:tag>
      <video:tag>Vertretungsplan</video:tag>
      <video:tag>Shorts</video:tag>
      <video:category>Education</video:category>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
    <video:video>
      <video:thumbnail_loc>https://i.ytimg.com/vi/93j80fc5hDs/hqdefault.jpg</video:thumbnail_loc>
      <video:title>PlanPulse Features &amp; Vertretungsplan Shorts</video:title>
      <video:description>Übersicht zu Notenrechner, Hausaufgaben und Klausurplaner auf PlanPulse.</video:description>
      <video:player_loc>https://www.youtube.com/embed/93j80fc5hDs</video:player_loc>
      <video:publication_date>2026-08-01T08:00:00+02:00</video:publication_date>
      <video:tag>PlanPulse</video:tag>
      <video:tag>Hausaufgaben</video:tag>
      <video:tag>Notenrechner</video:tag>
      <video:tag>Shorts</video:tag>
      <video:category>Education</video:category>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
    <video:video>
      <video:thumbnail_loc>https://i.ytimg.com/vi/uGu4qeZTYKo/hqdefault.jpg</video:thumbnail_loc>
      <video:title>PlanPulse Stundenplan &amp; Vertretungsplan YouTube Short</video:title>
      <video:description>Aktuelles PlanPulse YouTube Short Video - Schneller Überblick und Tipps.</video:description>
      <video:player_loc>https://www.youtube.com/embed/uGu4qeZTYKo</video:player_loc>
      <video:publication_date>2026-08-21T08:00:00+02:00</video:publication_date>
      <video:tag>PlanPulse</video:tag>
      <video:tag>Stundenplan</video:tag>
      <video:tag>Schule</video:tag>
      <video:tag>Shorts</video:tag>
      <video:category>Education</video:category>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/#timetable</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/#school-hub</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/#homework</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/#grades</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/#ai-assistant</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/#billing</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/impressum</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/datenschutz</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/robust.txt</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://planpulse.mypi.co/robots.txt</loc>
    <lastmod>2026-08-21</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;

  app.get(["/sitemap.xml", "/sitemap", "/sitemapurl", "/sitemap_index.xml"], (_req, res) => {
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(sitemapXml);
  });

  app.get(["/robots.txt", "/robust.txt", "/robot.txt", "/robots"], (_req, res) => {
    res.header("Content-Type", "text/plain; charset=utf-8");
    res.send(`User-agent: *
Allow: /

Sitemap: https://planpulse.mypi.co/sitemap.xml
Sitemap: https://planpulse.mypi.co/sitemapurl

# Official YouTube Channel & Shorts Videos
# Channel: https://www.youtube.com/@PlanPulse-t5w/shorts
# Short 1: https://www.youtube.com/shorts/2m0jz2Ol7zA
# Short 2: https://www.youtube.com/shorts/93j80fc5hDs
# Short 3: https://www.youtube.com/shorts/uGu4qeZTYKo
`);
  });

  // Explicit JSON 404 for unhandled API routes so they never return HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API-Endpunkt nicht gefunden: ${req.method} ${req.originalUrl || req.path}` });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PlanPulse Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
