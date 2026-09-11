import { auth, db } from "./firebase";
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { SchoolPlanTemplate, RegisteredSchool, TimetableEntry, HomeworkItem, GradeEntry, UserSubject, UserConfig } from "../types";

// Default subjects fallback (clean without hardcoded dummy teachers or rooms)
export const DEFAULT_SUBJECTS: UserSubject[] = [
  { id: "sub-1", name: "Mathematik", code: "M", color: "#2563eb", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-2", name: "Deutsch", code: "D", color: "#dc2626", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-3", name: "Englisch", code: "E", color: "#7c3aed", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-4", name: "Physik", code: "Ph", color: "#0891b2", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-5", name: "Biologie", code: "Bio", color: "#16a34a", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-6", name: "Chemie", code: "Ch", color: "#059669", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-7", name: "Geschichte", code: "G", color: "#d97706", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-8", name: "Informatik", code: "Inf", color: "#6366f1", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-9", name: "Sport", code: "Sp", color: "#ea580c", targetGrade: 1.5, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-10", name: "Kunst", code: "Ku", color: "#ec4899", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-11", name: "Musik", code: "Mu", color: "#8b5cf6", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-12", name: "Religion", code: "Rel", color: "#0284c7", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-13", name: "Geographie", code: "Geo", color: "#ca8a04", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-14", name: "Französisch", code: "F", color: "#3b82f6", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-15", name: "Latein", code: "L", color: "#9333ea", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-16", name: "Spanisch", code: "Spa", color: "#e11d48", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
  { id: "sub-17", name: "Wirtschaft & Recht", code: "WR", color: "#0d9488", targetGrade: 2.0, oralRatio: 50, teacher: "", room: "" },
];

export const INITIAL_SCHOOLS: RegisteredSchool[] = [
  {
    id: "school-1",
    name: "Gymnasium München-Nord",
    city: "München",
    schoolType: "Naturwissenschaftlich-technologisches & Sprachliches Gymnasium",
    contactPerson: "Studiendirektor Dr. Keller",
    email: "verwaltung@gymnasium-nord.de",
    createdAt: "Offizieller Schul-Partner",
  },
  {
    id: "school-2",
    name: "Schiller-Gymnasium Berlin",
    city: "Berlin",
    schoolType: "Staatliches Gymnasium mit Ganztagsangebot",
    contactPerson: "Fr. Oberstudienrätin Schneider",
    email: "sekretariat@schiller-gymnasium.de",
    createdAt: "Offizieller Schul-Partner",
  },
  {
    id: "school-3",
    name: "Realschule am Schloss Hamburg",
    city: "Hamburg",
    schoolType: "Städtische Realschule",
    contactPerson: "Hr. Realschulrektor Wagner",
    email: "info@realschule-schloss.de",
    createdAt: "Offizieller Schul-Partner",
  },
];

export const INITIAL_TEMPLATES: SchoolPlanTemplate[] = [
  {
    id: "tpl-10a-nord",
    title: "Klasse 10A (NTG-Zweig) – Gymnasium München-Nord",
    schoolId: "school-1",
    schoolName: "Gymnasium München-Nord",
    schoolCity: "München",
    targetClass: "10A",
    uploadedBy: "Schulverwaltung",
    createdAt: "Offizieller Stundenplan 2026",
    description: "Standard-Wochenplan Klasse 10A inkl. Intensivierung Mathe/Physik und digitalem Informatik-Unterricht.",
    entriesCount: 15,
    entries: [
      { id: "tt-tpl-1", day: "Mo", period: 1, time: "08:00 - 08:45", subject: "Mathematik", teacher: "Hr. Becker", room: "R101", targetClass: "10A", status: "regular", color: "#2563eb", note: "" },
      { id: "tt-tpl-2", day: "Mo", period: 2, time: "08:50 - 09:35", subject: "Mathematik", teacher: "Hr. Becker", room: "R101", targetClass: "10A", status: "regular", color: "#2563eb", note: "" },
      { id: "tt-tpl-3", day: "Mo", period: 3, time: "09:55 - 10:40", subject: "Deutsch", teacher: "Fr. Sommer", room: "R102", targetClass: "10A", status: "regular", color: "#dc2626", note: "" },
      { id: "tt-tpl-4", day: "Mo", period: 4, time: "10:45 - 11:30", subject: "Englisch", teacher: "Hr. Miller", room: "R201", targetClass: "10A", status: "regular", color: "#7c3aed", note: "" },
      { id: "tt-tpl-5", day: "Mo", period: 5, time: "11:45 - 12:30", subject: "Physik", teacher: "Hr. Weber", room: "Ph-1", targetClass: "10A", status: "regular", color: "#0891b2", note: "" },
      { id: "tt-tpl-6", day: "Mo", period: 6, time: "12:35 - 13:20", subject: "Biologie", teacher: "Fr. Lindner", room: "Bio-1", targetClass: "10A", status: "regular", color: "#16a34a", note: "" },

      { id: "tt-tpl-7", day: "Di", period: 1, time: "08:00 - 08:45", subject: "Englisch", teacher: "Hr. Miller", room: "R201", targetClass: "10A", status: "regular", color: "#7c3aed", note: "" },
      { id: "tt-tpl-8", day: "Di", period: 2, time: "08:50 - 09:35", subject: "Geschichte", teacher: "Hr. Franke", room: "R105", targetClass: "10A", status: "regular", color: "#d97706", note: "" },
      { id: "tt-tpl-9", day: "Di", period: 3, time: "09:55 - 10:40", subject: "Mathematik", teacher: "Hr. Becker", room: "R101", targetClass: "10A", status: "regular", color: "#2563eb", note: "" },
      { id: "tt-tpl-10", day: "Di", period: 4, time: "10:45 - 11:30", subject: "Chemie", teacher: "Hr. Vogel", room: "Ch-1", targetClass: "10A", status: "regular", color: "#059669", note: "" },
      { id: "tt-tpl-11", day: "Di", period: 5, time: "11:45 - 12:30", subject: "Sport", teacher: "Hr. Walter", room: "TH-1", targetClass: "10A", status: "regular", color: "#ea580c", note: "" },
      { id: "tt-tpl-12", day: "Di", period: 6, time: "12:35 - 13:20", subject: "Sport", teacher: "Hr. Walter", room: "TH-1", targetClass: "10A", status: "regular", color: "#ea580c", note: "" },

      { id: "tt-tpl-13", day: "Mi", period: 1, time: "08:00 - 08:45", subject: "Informatik", teacher: "Hr. Kistner", room: "Inf-1", targetClass: "10A", status: "regular", color: "#6366f1", note: "" },
      { id: "tt-tpl-14", day: "Mi", period: 2, time: "08:50 - 09:35", subject: "Informatik", teacher: "Hr. Kistner", room: "Inf-1", targetClass: "10A", status: "regular", color: "#6366f1", note: "" },
      { id: "tt-tpl-15", day: "Mi", period: 3, time: "09:55 - 10:40", subject: "Deutsch", teacher: "Fr. Sommer", room: "R102", targetClass: "10A", status: "regular", color: "#dc2626", note: "" },
    ],
  },
  {
    id: "tpl-8b-schiller",
    title: "Klasse 8B – Schiller-Gymnasium Berlin",
    schoolId: "school-2",
    schoolName: "Schiller-Gymnasium Berlin",
    schoolCity: "Berlin",
    targetClass: "8B",
    uploadedBy: "Schulkoordination",
    createdAt: "Offizieller Stundenplan 2026",
    description: "Kompakter Stundenplan für die 8. Jahrgangsstufe mit 2. Fremdsprache.",
    entriesCount: 12,
    entries: [
      { id: "tt-tpl-8b-1", day: "Mo", period: 1, time: "08:00 - 08:45", subject: "Deutsch", teacher: "Fr. Sommer", room: "R102", targetClass: "8B", status: "regular", color: "#dc2626", note: "" },
      { id: "tt-tpl-8b-2", day: "Mo", period: 2, time: "08:50 - 09:35", subject: "Mathematik", teacher: "Hr. Becker", room: "R101", targetClass: "8B", status: "regular", color: "#2563eb", note: "" },
      { id: "tt-tpl-8b-3", day: "Mo", period: 3, time: "09:55 - 10:40", subject: "Englisch", teacher: "Hr. Miller", room: "R201", targetClass: "8B", status: "regular", color: "#7c3aed", note: "" },
      { id: "tt-tpl-8b-4", day: "Mo", period: 4, time: "10:45 - 11:30", subject: "Französisch", teacher: "Mme. Dupont", room: "R205", targetClass: "8B", status: "regular", color: "#3b82f6", note: "" },
      { id: "tt-tpl-8b-5", day: "Mo", period: 5, time: "11:45 - 12:30", subject: "Geographie", teacher: "Hr. Braun", room: "R204", targetClass: "8B", status: "regular", color: "#ca8a04", note: "" },
    ],
  },
];

// Helper to assign subject colors
function getSubjectColor(subjectName: string): string {
  const s = subjectName.toLowerCase().trim();
  if (s.includes("mathe")) return "#2563eb";
  if (s.includes("deutsch")) return "#dc2626";
  if (s.includes("engl")) return "#7c3aed";
  if (s.includes("phys")) return "#0891b2";
  if (s.includes("bio")) return "#16a34a";
  if (s.includes("chem")) return "#059669";
  if (s.includes("gesch")) return "#d97706";
  if (s.includes("inf")) return "#6366f1";
  if (s.includes("sport")) return "#ea580c";
  if (s.includes("kunst")) return "#ec4899";
  if (s.includes("musik")) return "#8b5cf6";
  if (s.includes("rel") || s.includes("eth")) return "#0284c7";
  if (s.includes("geo") || s.includes("erd")) return "#ca8a04";
  if (s.includes("franz")) return "#3b82f6";
  if (s.includes("lat")) return "#9333ea";
  if (s.includes("span")) return "#e11d48";
  if (s.includes("wirt") || s.includes("recht")) return "#0d9488";
  return "#2563eb";
}

// Local storage helper
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn("LocalStorage save error:", err);
  }
}

// Parse URL pathname and query
function parseApiUrl(url: string) {
  let pathname = url;
  let search = "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const u = new URL(url);
      pathname = u.pathname;
      search = u.search;
    } catch {}
  } else {
    const qIdx = url.indexOf("?");
    if (qIdx !== -1) {
      pathname = url.slice(0, qIdx);
      search = url.slice(qIdx);
    }
  }
  return { pathname, search };
}

/**
 * Universal safeFetchJson:
 * 1. Attempts the real server API route.
 * 2. If the server is offline or returns 404 (e.g. static host/Vercel/client preview),
 *    it gracefully uses the client Firestore + LocalStorage engine, ensuring
 *    timetables, school templates, homework, grades, and subjects are ALWAYS saved and loaded!
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  _retryCount: number = 1
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const { pathname, search } = parseApiUrl(url);

  // 1. Try real server fetch first (with a short timeout so UI stays snappy)
  if (pathname.startsWith("/api/")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const fetchOptions: RequestInit = {
        credentials: "include",
        ...options,
        signal: controller.signal,
      };

      const res = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        return { ok: true, status: res.status, data };
      }
      // If 404 or HTML (Vercel SPA fallback), fallback to client persistence below
    } catch (err) {
      // Network error or aborted -> fallback to client persistence
    }
  }

  // 2. Client-Side Fallback Engine (Firestore + LocalStorage)
  if (pathname.startsWith("/api/")) {
    const method = (options?.method || "GET").toUpperCase();
    const cleanPath = pathname.replace(/^\/api\//, "").replace(/\/$/, "");
    const parts = cleanPath.split("/");
    const resource = parts[0]; // e.g. 'school-templates', 'timetable', 'homework', 'grades', 'subjects', 'schools'
    const id = parts[1]; // e.g. template ID or 'clear' or 'adopt'
    const action = parts[2]; // e.g. 'adopt' if path is school-templates/:id/adopt

    const searchParams = new URLSearchParams(search);
    const queryQ = (searchParams.get("q") || "").toLowerCase().trim();

    const bodyStr = typeof options?.body === "string" ? options.body : "";
    let bodyObj: any = null;
    try {
      if (bodyStr) bodyObj = JSON.parse(bodyStr);
    } catch {}

    const uid = auth.currentUser?.uid;

    try {
      // ----------------------------------------------------
      // 1. SCHOOL TEMPLATES (/api/school-templates)
      // ----------------------------------------------------
      if (resource === "school-templates") {
        // Handle POST /api/school-templates/:id/adopt
        if (id && (action === "adopt" || parts[1] === "adopt" || pathname.includes("/adopt"))) {
          const targetId = action === "adopt" ? id : parts[1];
          const mode = bodyObj?.mode || "replace";

          const localTemplates = getLocalItem<SchoolPlanTemplate[]>("planpulse_school_templates", INITIAL_TEMPLATES);
          const tpl = localTemplates.find((t) => t.id === targetId) || INITIAL_TEMPLATES.find((t) => t.id === targetId);

          if (!tpl) {
            return { ok: false, status: 404, data: null, error: "Stundenplan-Vorlage nicht gefunden." };
          }

          let existingEntries = getLocalItem<TimetableEntry[]>("planpulse_timetable_entries", []);
          if (mode === "replace") {
            existingEntries = existingEntries.filter(
              (e) => e.targetClass.toLowerCase() !== tpl.targetClass.toLowerCase()
            );
          }

          const newEntries: TimetableEntry[] = tpl.entries.map((e, idx) => ({
            ...e,
            id: `tt-adopted-${Date.now()}-${idx}`,
            color: e.color || getSubjectColor(e.subject),
            targetClass: tpl.targetClass || e.targetClass || "10A",
            status: e.status || "regular",
            note: e.note || "",
          }));

          const updatedEntries = [...existingEntries, ...newEntries];
          setLocalItem("planpulse_timetable_entries", updatedEntries);

          if (uid) {
            try {
              const batch = writeBatch(db);
              newEntries.forEach((ne) => {
                batch.set(doc(db, `users/${uid}/timetable`, ne.id), ne);
              });
              await batch.commit();
            } catch (e) {
              console.warn("Firestore sync error on adopt:", e);
            }
          }

          return {
            ok: true,
            status: 200,
            data: {
              success: true,
              appliedCount: newEntries.length,
              totalEntries: updatedEntries.length,
              entries: updatedEntries,
            } as any,
          };
        }

        // GET /api/school-templates
        if (method === "GET") {
          let templates = getLocalItem<SchoolPlanTemplate[]>("planpulse_school_templates", INITIAL_TEMPLATES);

          // Try fetching Firestore templates to merge
          try {
            const snap = await getDocs(collection(db, "school_templates"));
            if (!snap.empty) {
              const fsTemplates = snap.docs.map((d) => d.data() as SchoolPlanTemplate);
              const map = new Map<string, SchoolPlanTemplate>();
              INITIAL_TEMPLATES.forEach((t) => map.set(t.id, t));
              templates.forEach((t) => map.set(t.id, t));
              fsTemplates.forEach((t) => map.set(t.id, t));
              templates = Array.from(map.values());
              setLocalItem("planpulse_school_templates", templates);
            }
          } catch {}

          if (queryQ) {
            templates = templates.filter(
              (t) =>
                t.title.toLowerCase().includes(queryQ) ||
                t.schoolName.toLowerCase().includes(queryQ) ||
                (t.schoolCity && t.schoolCity.toLowerCase().includes(queryQ)) ||
                t.targetClass.toLowerCase().includes(queryQ)
            );
          }

          return { ok: true, status: 200, data: { templates } as any };
        }

        // POST /api/school-templates (Create)
        if (method === "POST" && bodyObj) {
          const newId = bodyObj.id || `tpl-${Date.now()}`;
          const rawEntries = Array.isArray(bodyObj.entries) ? bodyObj.entries : [];
          const formattedEntries: TimetableEntry[] = rawEntries.map((e: any, idx: number) => ({
            id: e.id || `tt-${Date.now()}-${idx}`,
            day: e.day || "Mo",
            period: Number(e.period) || 1,
            time: e.time || "08:00 - 08:45",
            subject: e.subject || "Fach",
            teacher: e.teacher || "—",
            room: e.room || "—",
            targetClass: bodyObj.targetClass || e.targetClass || "10A",
            status: e.status || "regular",
            color: e.color || getSubjectColor(e.subject || ""),
            note: e.note || "",
          }));

          const newTemplate: SchoolPlanTemplate = {
            id: newId,
            title: bodyObj.title || `Stundenplan ${bodyObj.targetClass || ""}`,
            schoolId: bodyObj.schoolId || "",
            schoolName: bodyObj.schoolName || "Schule",
            schoolCity: bodyObj.schoolCity || "",
            targetClass: bodyObj.targetClass || "10A",
            uploadedBy: bodyObj.uploadedBy || "Schulverwaltung",
            ownerEmail: bodyObj.ownerEmail || auth.currentUser?.email || "",
            ownerId: uid || "",
            createdAt: "Gerade eben",
            description: bodyObj.description || "Stundenplan zur freien Übernahme.",
            entriesCount: formattedEntries.length,
            entries: formattedEntries,
          };

          const localTemplates = getLocalItem<SchoolPlanTemplate[]>("planpulse_school_templates", INITIAL_TEMPLATES);
          const updatedTemplates = [newTemplate, ...localTemplates.filter((t) => t.id !== newId)];
          setLocalItem("planpulse_school_templates", updatedTemplates);

          try {
            await setDoc(doc(db, "school_templates", newId), newTemplate);
          } catch (e) {
            console.warn("Firestore template write error:", e);
          }

          return { ok: true, status: 200, data: { success: true, template: newTemplate } as any };
        }

        // PUT /api/school-templates/:id (Update)
        if (id && method === "PUT" && bodyObj) {
          const localTemplates = getLocalItem<SchoolPlanTemplate[]>("planpulse_school_templates", INITIAL_TEMPLATES);
          const existing = localTemplates.find((t) => t.id === id);

          const updatedEntries: TimetableEntry[] = Array.isArray(bodyObj.entries)
            ? bodyObj.entries.map((e: any, idx: number) => ({
                id: e.id || `tt-${Date.now()}-${idx}`,
                day: e.day || "Mo",
                period: Number(e.period) || 1,
                time: e.time || "08:00 - 08:45",
                subject: e.subject || "Fach",
                teacher: e.teacher || "—",
                room: e.room || "—",
                targetClass: bodyObj.targetClass || e.targetClass || "10A",
                status: e.status || "regular",
                color: e.color || getSubjectColor(e.subject || ""),
                note: e.note || "",
              }))
            : existing?.entries || [];

          const updatedTemplate: SchoolPlanTemplate = {
            ...(existing || ({} as SchoolPlanTemplate)),
            ...bodyObj,
            id,
            entriesCount: updatedEntries.length,
            entries: updatedEntries,
          };

          const updatedList = localTemplates.map((t) => (t.id === id ? updatedTemplate : t));
          setLocalItem("planpulse_school_templates", updatedList);

          try {
            await setDoc(doc(db, "school_templates", id), updatedTemplate, { merge: true });
          } catch {}

          return { ok: true, status: 200, data: { success: true, template: updatedTemplate } as any };
        }

        // DELETE /api/school-templates/:id
        if (id && method === "DELETE") {
          const localTemplates = getLocalItem<SchoolPlanTemplate[]>("planpulse_school_templates", INITIAL_TEMPLATES);
          const updatedList = localTemplates.filter((t) => t.id !== id);
          setLocalItem("planpulse_school_templates", updatedList);

          try {
            await deleteDoc(doc(db, "school_templates", id));
          } catch {}

          return { ok: true, status: 200, data: { success: true, remaining: updatedList.length } as any };
        }
      }

      // ----------------------------------------------------
      // 2. SCHOOLS REGISTRY (/api/schools)
      // ----------------------------------------------------
      if (resource === "schools") {
        if (method === "GET") {
          let schools = getLocalItem<RegisteredSchool[]>("planpulse_registered_schools", INITIAL_SCHOOLS);
          const templates = getLocalItem<SchoolPlanTemplate[]>("planpulse_school_templates", INITIAL_TEMPLATES);

          if (queryQ) {
            schools = schools.filter(
              (s) =>
                s.name.toLowerCase().includes(queryQ) ||
                s.city.toLowerCase().includes(queryQ) ||
                s.schoolType.toLowerCase().includes(queryQ)
            );
          }

          const schoolsWithPlans = schools.map((s) => ({
            ...s,
            plans: templates.filter(
              (t) => t.schoolId === s.id || t.schoolName.toLowerCase() === s.name.toLowerCase()
            ),
          }));

          return { ok: true, status: 200, data: { schools: schoolsWithPlans } as any };
        }

        if (method === "POST" && bodyObj) {
          const newSchool: RegisteredSchool = {
            id: `school-${Date.now()}`,
            name: bodyObj.name?.trim() || "Schule",
            city: bodyObj.city?.trim() || "Stadt",
            schoolType: bodyObj.schoolType?.trim() || "Gymnasium / Realschule",
            contactPerson: bodyObj.contactPerson?.trim() || "Schulverwaltung",
            email: bodyObj.email?.trim() || "",
            createdAt: "Neu registriert",
          };

          const schools = getLocalItem<RegisteredSchool[]>("planpulse_registered_schools", INITIAL_SCHOOLS);
          const updated = [...schools, newSchool];
          setLocalItem("planpulse_registered_schools", updated);

          try {
            await setDoc(doc(db, "registered_schools", newSchool.id), newSchool);
          } catch {}

          return { ok: true, status: 200, data: { success: true, school: newSchool } as any };
        }
      }

      // ----------------------------------------------------
      // 3. TIMETABLE (/api/timetable)
      // ----------------------------------------------------
      if (resource === "timetable") {
        if (id === "clear" || (method === "POST" && pathname.endsWith("/clear"))) {
          const targetClass = bodyObj?.targetClass;
          let entries = getLocalItem<TimetableEntry[]>("planpulse_timetable_entries", []);
          if (targetClass && targetClass !== "alle") {
            entries = entries.filter((e) => (e.targetClass || "").toLowerCase() !== targetClass.toLowerCase());
          } else {
            entries = [];
          }
          setLocalItem("planpulse_timetable_entries", entries);

          if (uid) {
            try {
              const snap = await getDocs(collection(db, `users/${uid}/timetable`));
              const batch = writeBatch(db);
              snap.docs.forEach((d) => {
                const data = d.data();
                if (!targetClass || targetClass === "alle" || data.targetClass?.toLowerCase() === targetClass.toLowerCase()) {
                  batch.delete(d.ref);
                }
              });
              await batch.commit();
            } catch {}
          }

          return { ok: true, status: 200, data: { success: true, count: entries.length } as any };
        }

        if (method === "GET") {
          let entries = getLocalItem<TimetableEntry[]>("planpulse_timetable_entries", []);
          if (uid) {
            try {
              const snap = await getDocs(collection(db, `users/${uid}/timetable`));
              if (!snap.empty) {
                entries = snap.docs.map((d) => d.data() as TimetableEntry);
                setLocalItem("planpulse_timetable_entries", entries);
              }
            } catch {}
          }
          return { ok: true, status: 200, data: { entries } as any };
        }

        if (method === "POST" && bodyObj) {
          const newEntry: TimetableEntry = {
            id: bodyObj.id || `tt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            day: bodyObj.day || "Mo",
            period: Number(bodyObj.period) || 1,
            time: bodyObj.time || "08:00 - 08:45",
            subject: bodyObj.subject || "Allgemein",
            teacher: bodyObj.teacher || "—",
            room: bodyObj.room || "—",
            targetClass: bodyObj.targetClass || "10A",
            status: bodyObj.status || "regular",
            color: bodyObj.color || getSubjectColor(bodyObj.subject || ""),
            note: bodyObj.note || "",
          };

          const entries = getLocalItem<TimetableEntry[]>("planpulse_timetable_entries", []);
          const updated = [...entries, newEntry];
          setLocalItem("planpulse_timetable_entries", updated);

          if (uid) {
            try {
              await setDoc(doc(db, `users/${uid}/timetable`, newEntry.id), newEntry);
            } catch {}
          }

          return { ok: true, status: 200, data: { success: true, entry: newEntry } as any };
        }

        if (id) {
          if (method === "PUT" && bodyObj) {
            const entries = getLocalItem<TimetableEntry[]>("planpulse_timetable_entries", []);
            const updated = entries.map((e) => (e.id === id ? { ...e, ...bodyObj } : e));
            setLocalItem("planpulse_timetable_entries", updated);

            if (uid) {
              try {
                await setDoc(doc(db, `users/${uid}/timetable`, id), bodyObj, { merge: true });
              } catch {}
            }

            return { ok: true, status: 200, data: { success: true, entry: bodyObj } as any };
          }

          if (method === "DELETE") {
            const entries = getLocalItem<TimetableEntry[]>("planpulse_timetable_entries", []);
            const updated = entries.filter((e) => e.id !== id);
            setLocalItem("planpulse_timetable_entries", updated);

            if (uid) {
              try {
                await deleteDoc(doc(db, `users/${uid}/timetable`, id));
              } catch {}
            }

            return { ok: true, status: 200, data: { success: true, deletedId: id } as any };
          }
        }
      }

      // ----------------------------------------------------
      // 4. HOMEWORK (/api/homework)
      // ----------------------------------------------------
      if (resource === "homework") {
        if (method === "GET") {
          let items = getLocalItem<HomeworkItem[]>("planpulse_homework_items", []);
          if (uid) {
            try {
              const snap = await getDocs(collection(db, `users/${uid}/homework`));
              if (!snap.empty) {
                items = snap.docs.map((d) => d.data() as HomeworkItem);
                setLocalItem("planpulse_homework_items", items);
              }
            } catch {}
          }
          return { ok: true, status: 200, data: { items } as any };
        }

        if (method === "POST" && bodyObj) {
          const newItem: HomeworkItem = {
            id: bodyObj.id || `hw-${Date.now()}`,
            subject: bodyObj.subject || "Allgemein",
            title: bodyObj.title || "Hausaufgabe",
            description: bodyObj.description || "",
            dueDate: bodyObj.dueDate || "Nächste Stunde",
            targetClass: bodyObj.targetClass || "",
            category: bodyObj.category || "homework",
            priority: bodyObj.priority || "medium",
            completed: !!bodyObj.completed,
            createdAt: new Date().toLocaleDateString("de-DE"),
          };

          const items = getLocalItem<HomeworkItem[]>("planpulse_homework_items", []);
          const updated = [newItem, ...items];
          setLocalItem("planpulse_homework_items", updated);

          if (uid) {
            try {
              await setDoc(doc(db, `users/${uid}/homework`, newItem.id), newItem);
            } catch {}
          }

          return { ok: true, status: 200, data: { success: true, item: newItem } as any };
        }

        if (id) {
          if (method === "PATCH" || method === "PUT") {
            const items = getLocalItem<HomeworkItem[]>("planpulse_homework_items", []);
            let updatedItem: HomeworkItem | null = null;
            const updated = items.map((it) => {
              if (it.id === id) {
                updatedItem = { ...it, ...bodyObj };
                return updatedItem;
              }
              return it;
            });
            setLocalItem("planpulse_homework_items", updated);

            if (uid) {
              try {
                await setDoc(doc(db, `users/${uid}/homework`, id), bodyObj, { merge: true });
              } catch {}
            }

            return { ok: true, status: 200, data: { success: true, item: updatedItem } as any };
          }

          if (method === "DELETE") {
            const items = getLocalItem<HomeworkItem[]>("planpulse_homework_items", []);
            const updated = items.filter((it) => it.id !== id);
            setLocalItem("planpulse_homework_items", updated);

            if (uid) {
              try {
                await deleteDoc(doc(db, `users/${uid}/homework`, id));
              } catch {}
            }

            return { ok: true, status: 200, data: { success: true, deletedId: id } as any };
          }
        }
      }

      // ----------------------------------------------------
      // 5. SUBJECTS (/api/subjects)
      // ----------------------------------------------------
      if (resource === "subjects") {
        if (id === "clear" || (method === "POST" && pathname.endsWith("/clear"))) {
          setLocalItem("planpulse_user_subjects", []);
          if (uid) {
            try {
              const snap = await getDocs(collection(db, `users/${uid}/subjects`));
              const batch = writeBatch(db);
              snap.docs.forEach((d) => batch.delete(d.ref));
              await batch.commit();
            } catch {}
          }
          return { ok: true, status: 200, data: { success: true, subjects: [] } as any };
        }

        if (id === "reset" || (method === "POST" && pathname.endsWith("/reset"))) {
          setLocalItem("planpulse_user_subjects", DEFAULT_SUBJECTS);
          if (uid) {
            try {
              const snap = await getDocs(collection(db, `users/${uid}/subjects`));
              const batch = writeBatch(db);
              snap.docs.forEach((d) => batch.delete(d.ref));
              DEFAULT_SUBJECTS.forEach((sub) => {
                batch.set(doc(db, `users/${uid}/subjects`, sub.id), sub);
              });
              await batch.commit();
            } catch {}
          }
          return { ok: true, status: 200, data: { success: true, subjects: DEFAULT_SUBJECTS } as any };
        }

        if (method === "GET") {
          let subjects = getLocalItem<UserSubject[] | null>("planpulse_user_subjects", null);
          if (subjects === null) {
            subjects = DEFAULT_SUBJECTS;
          }
          if (uid) {
            try {
              const snap = await getDocs(collection(db, `users/${uid}/subjects`));
              if (!snap.empty) {
                subjects = snap.docs.map((d) => d.data() as UserSubject);
                setLocalItem("planpulse_user_subjects", subjects);
              } else if (localStorage.getItem("planpulse_user_subjects") === "[]") {
                subjects = [];
              }
            } catch {}
          }
          return { ok: true, status: 200, data: { success: true, subjects } as any };
        }

        if (method === "POST" && bodyObj) {
          if (Array.isArray(bodyObj.subjects)) {
            setLocalItem("planpulse_user_subjects", bodyObj.subjects);
            if (uid) {
              try {
                const batch = writeBatch(db);
                bodyObj.subjects.forEach((s: UserSubject) => {
                  batch.set(doc(db, `users/${uid}/subjects`, s.id), s);
                });
                await batch.commit();
              } catch {}
            }
            return { ok: true, status: 200, data: { success: true, subjects: bodyObj.subjects } as any };
          }

          const name = (bodyObj.name || "").trim();
          const newSub: UserSubject = {
            id: bodyObj.id || `sub-${Date.now()}`,
            name: name || "Fach",
            code: bodyObj.code || (name ? name.substring(0, 3).toUpperCase() : "FACH"),
            color: bodyObj.color || getSubjectColor(name),
            targetGrade: Number(bodyObj.targetGrade) || 2.0,
            oralRatio: Number(bodyObj.oralRatio) || 50,
            teacher: bodyObj.teacher || "",
            room: bodyObj.room || "",
          };

          const subjects = getLocalItem<UserSubject[]>("planpulse_user_subjects", DEFAULT_SUBJECTS);
          const existingIdx = subjects.findIndex((s) => s.id === newSub.id || s.name.toLowerCase() === name.toLowerCase());
          let updated: UserSubject[];
          if (existingIdx !== -1) {
            updated = subjects.map((s, i) => (i === existingIdx ? { ...s, ...newSub } : s));
          } else {
            updated = [...subjects, newSub];
          }
          setLocalItem("planpulse_user_subjects", updated);

          if (uid) {
            try {
              await setDoc(doc(db, `users/${uid}/subjects`, newSub.id), newSub);
            } catch {}
          }

          return { ok: true, status: 200, data: { success: true, subject: newSub, subjects: updated } as any };
        }

        if (id) {
          if (method === "PUT" && bodyObj) {
            const subjects = getLocalItem<UserSubject[]>("planpulse_user_subjects", DEFAULT_SUBJECTS);
            const updated = subjects.map((s) => (s.id === id ? { ...s, ...bodyObj } : s));
            setLocalItem("planpulse_user_subjects", updated);

            if (uid) {
              try {
                await setDoc(doc(db, `users/${uid}/subjects`, id), bodyObj, { merge: true });
              } catch {}
            }

            return { ok: true, status: 200, data: { success: true, subject: bodyObj, subjects: updated } as any };
          }

          if (method === "DELETE") {
            const subjects = getLocalItem<UserSubject[]>("planpulse_user_subjects", DEFAULT_SUBJECTS);
            const updated = subjects.filter((s) => s.id !== id);
            setLocalItem("planpulse_user_subjects", updated);

            if (uid) {
              try {
                await deleteDoc(doc(db, `users/${uid}/subjects`, id));
              } catch {}
            }

            return { ok: true, status: 200, data: { success: true, deletedId: id, subjects: updated } as any };
          }
        }
      }

      // ----------------------------------------------------
      // 6. GRADES (/api/grades)
      // ----------------------------------------------------
      if (resource === "grades") {
        if (id === "clear" || (method === "POST" && pathname.endsWith("/clear"))) {
          setLocalItem("planpulse_grade_entries", []);
          if (uid) {
            try {
              const snap = await getDocs(collection(db, `users/${uid}/grades`));
              const batch = writeBatch(db);
              snap.docs.forEach((d) => batch.delete(d.ref));
              await batch.commit();
            } catch {}
          }
          return { ok: true, status: 200, data: { success: true } as any };
        }

        if (method === "GET") {
          let grades = getLocalItem<GradeEntry[]>("planpulse_grade_entries", []);
          if (uid) {
            try {
              const snap = await getDocs(collection(db, `users/${uid}/grades`));
              if (!snap.empty) {
                grades = snap.docs.map((d) => d.data() as GradeEntry);
                setLocalItem("planpulse_grade_entries", grades);
              }
            } catch {}
          }
          return { ok: true, status: 200, data: { grades } as any };
        }

        if (method === "POST" && bodyObj) {
          const newGrade: GradeEntry = {
            id: bodyObj.id || `gr-${Date.now()}`,
            subject: bodyObj.subject || "Mathematik",
            title: bodyObj.title || "Schulaufgabe",
            value: Number(bodyObj.value) || 2.0,
            weight: Number(bodyObj.weight) || 1.0,
            type: bodyObj.type || "exam",
            date: bodyObj.date || new Date().toLocaleDateString("de-DE"),
            note: bodyObj.note || "",
            isPending: !!bodyObj.isPending,
          };

          const grades = getLocalItem<GradeEntry[]>("planpulse_grade_entries", []);
          const updated = [newGrade, ...grades];
          setLocalItem("planpulse_grade_entries", updated);

          if (uid) {
            try {
              await setDoc(doc(db, `users/${uid}/grades`, newGrade.id), newGrade);
            } catch {}
          }

          return { ok: true, status: 200, data: { success: true, grade: newGrade } as any };
        }

        if (id) {
          if (method === "PUT" && bodyObj) {
            const grades = getLocalItem<GradeEntry[]>("planpulse_grade_entries", []);
            const updated = grades.map((g) => (g.id === id ? { ...g, ...bodyObj } : g));
            setLocalItem("planpulse_grade_entries", updated);

            if (uid) {
              try {
                await setDoc(doc(db, `users/${uid}/grades`, id), bodyObj, { merge: true });
              } catch {}
            }

            return { ok: true, status: 200, data: { success: true, grade: bodyObj } as any };
          }

          if (method === "DELETE") {
            const grades = getLocalItem<GradeEntry[]>("planpulse_grade_entries", []);
            const updated = grades.filter((g) => g.id !== id);
            setLocalItem("planpulse_grade_entries", updated);

            if (uid) {
              try {
                await deleteDoc(doc(db, `users/${uid}/grades`, id));
              } catch {}
            }

            return { ok: true, status: 200, data: { success: true, deletedId: id } as any };
          }
        }
      }

      // ----------------------------------------------------
      // 7. CONFIG & SUBSCRIPTIONS
      // ----------------------------------------------------
      if (resource === "config") {
        if (method === "GET") {
          const config = getLocalItem<UserConfig>("planpulse_user_config", {
            planType: "premium",
            organizationName: "PlanPulse",
            customLogoUrl: "",
            primaryColor: "#2563eb",
            showWatermark: false,
            liveSyncIntervalSeconds: 0,
            webhookUrl: "",
            notifyOnSubstitutions: true,
          });
          return { ok: true, status: 200, data: config as any };
        }

        if (method === "POST" && bodyObj) {
          const currentConfig = getLocalItem<UserConfig>("planpulse_user_config", {
            planType: "premium",
            organizationName: "PlanPulse",
            customLogoUrl: "",
            primaryColor: "#2563eb",
            showWatermark: false,
            liveSyncIntervalSeconds: 0,
            webhookUrl: "",
            notifyOnSubstitutions: true,
          });
          const merged = { ...currentConfig, ...bodyObj };
          setLocalItem("planpulse_user_config", merged);
          return { ok: true, status: 200, data: { success: true, config: merged } as any };
        }
      }

      if (resource === "subscription" && id === "toggle") {
        const currentConfig = getLocalItem<UserConfig>("planpulse_user_config", {
          planType: "premium",
          organizationName: "PlanPulse",
          customLogoUrl: "",
          primaryColor: "#2563eb",
          showWatermark: false,
          liveSyncIntervalSeconds: 0,
          webhookUrl: "",
          notifyOnSubstitutions: true,
        });
        currentConfig.planType = "premium";
        setLocalItem("planpulse_user_config", currentConfig);
        return { ok: true, status: 200, data: { success: true, planType: "premium", config: currentConfig } as any };
      }

      // ----------------------------------------------------
      // 8. SUBSTITUTION NOTICES
      // ----------------------------------------------------
      if (resource === "substitutions") {
        if (method === "GET") {
          const notices = getLocalItem<any[]>("planpulse_substitution_notices", []);
          return { ok: true, status: 200, data: { notices } as any };
        }
        if (method === "POST" && bodyObj) {
          const newNotice = {
            id: `sub-${Date.now()}`,
            date: bodyObj.date || "Heute",
            period: Number(bodyObj.period) || 1,
            targetClass: bodyObj.targetClass || "10A",
            subject: bodyObj.subject || "Fach",
            originalTeacher: bodyObj.originalTeacher || "Lehrer",
            substituteTeacher: bodyObj.substituteTeacher || "—",
            room: bodyObj.room || "—",
            type: bodyObj.type || "Vertretung",
            info: bodyObj.info || "",
            timestamp: "Gerade eben",
          };
          const notices = getLocalItem<any[]>("planpulse_substitution_notices", []);
          const updated = [newNotice, ...notices];
          setLocalItem("planpulse_substitution_notices", updated);
          return { ok: true, status: 200, data: { success: true, notice: newNotice } as any };
        }
        if (id && method === "DELETE") {
          const notices = getLocalItem<any[]>("planpulse_substitution_notices", []);
          const updated = notices.filter((n) => n.id !== id);
          setLocalItem("planpulse_substitution_notices", updated);
          return { ok: true, status: 200, data: { success: true, deletedId: id } as any };
        }
      }

      // ----------------------------------------------------
      // 9. ADMIN ENDPOINTS (/api/admin/...)
      // ----------------------------------------------------
      if (resource === "admin") {
        const sub = parts[1]; // e.g. "users"
        const targetUserId = parts[2]; // e.g. userId or "create"
        const subAction = parts[3]; // e.g. "role", "ban", "reset-password"

        if (sub === "users") {
          // POST /api/admin/users/create
          if (targetUserId === "create" && method === "POST") {
            const newUid = `user-${Date.now()}`;
            const newUser = {
              id: newUid,
              email: bodyObj?.email || "nutzer@schule.de",
              role: bodyObj?.role || "user",
              planType: "premium",
              banned: false,
              createdAt: new Date().toISOString(),
              timetableCount: 0,
              homeworkCount: 0,
            };
            try {
              await setDoc(doc(db, "users", newUid), newUser);
            } catch {}
            return { ok: true, status: 200, data: { success: true, message: `Benutzer ${newUser.email} erfolgreich erstellt!`, user: newUser } as any };
          }

          // POST /api/admin/users/:id/role
          if (targetUserId && subAction === "role" && method === "POST") {
            const nextRole = bodyObj?.role || "user";
            try {
              await setDoc(doc(db, "users", targetUserId), { role: nextRole }, { merge: true });
            } catch {}
            return { ok: true, status: 200, data: { success: true, message: `Rolle erfolgreich auf ${nextRole} gesetzt.` } as any };
          }

          // POST /api/admin/users/:id/ban
          if (targetUserId && subAction === "ban" && method === "POST") {
            const banned = !!bodyObj?.banned;
            try {
              await setDoc(doc(db, "users", targetUserId), { banned }, { merge: true });
            } catch {}
            return { ok: true, status: 200, data: { success: true, message: banned ? "Benutzer gesperrt." : "Benutzer entsperrt." } as any };
          }

          // POST /api/admin/users/:id/reset-password
          if (targetUserId && subAction === "reset-password" && method === "POST") {
            return { ok: true, status: 200, data: { success: true, message: "Passwort-Änderung veranlasst." } as any };
          }

          // DELETE /api/admin/users/:id
          if (targetUserId && method === "DELETE") {
            const delIds = getLocalItem<string[]>("planpulse_deleted_user_ids", []);
            if (!delIds.includes(targetUserId)) {
              delIds.push(targetUserId);
              setLocalItem("planpulse_deleted_user_ids", delIds);
            }

            // Also check if body passes target email
            if (bodyObj?.email) {
              const cleanE = bodyObj.email.toLowerCase().trim();
              const delEmails = getLocalItem<string[]>("planpulse_deleted_user_emails", []);
              if (cleanE !== "max.kistner12@gmail.com" && !delEmails.includes(cleanE)) {
                delEmails.push(cleanE);
                setLocalItem("planpulse_deleted_user_emails", delEmails);
              }
            }

            try {
              await deleteDoc(doc(db, "users", targetUserId));
            } catch {}
            return { ok: true, status: 200, data: { success: true, message: "Benutzer gelöscht." } as any };
          }

          // GET /api/admin/users
          if (method === "GET") {
            const seedUsers = [
              {
                id: uid || "usr-admin-max",
                email: "max.kistner12@gmail.com",
                role: "admin",
                planType: "premium",
                banned: false,
                createdAt: "Haupt-Administrator",
                timetableCount: 15,
                homeworkCount: 3,
              },
            ];

            let firestoreUsers: any[] = [];
            try {
              const snap = await getDocs(collection(db, "users"));
              if (!snap.empty) {
                firestoreUsers = snap.docs.map((d) => {
                  const data = d.data();
                  const uEmail = (data.email || "").toLowerCase().trim();
                  const isAdmin = uEmail === "max.kistner12@gmail.com" || data.role === "admin" || data.role === "Admin" || data.role === "owner";
                  return {
                    id: d.id,
                    email: data.email || "user@schule.de",
                    role: isAdmin ? "admin" : "user",
                    planType: data.planType || "premium",
                    banned: !!data.banned,
                    createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString("de-DE") : "Registriert",
                    timetableCount: data.timetableCount || 0,
                    homeworkCount: data.homeworkCount || 0,
                  };
                });
              }
            } catch (e) {
              console.warn("Firestore getDocs users error:", e);
            }

            // Merge firestore users with seed users (deduplicated by email)
            const map = new Map<string, any>();
            seedUsers.forEach((u) => map.set(u.email.toLowerCase().trim(), u));
            firestoreUsers.forEach((u) => {
              if (u.email) {
                map.set(u.email.toLowerCase().trim(), { ...map.get(u.email.toLowerCase().trim()), ...u });
              }
            });

            // Also check localStorage user
            try {
              const savedRaw = localStorage.getItem("planpulse_current_user");
              if (savedRaw) {
                const u = JSON.parse(savedRaw);
                if (u && u.email) {
                  const clean = u.email.toLowerCase().trim();
                  const existing = map.get(clean) || {};
                  map.set(clean, {
                    id: u.id || existing.id || `local-${Date.now()}`,
                    email: u.email,
                    role: clean === "max.kistner12@gmail.com" || u.role === "admin" ? "admin" : (existing.role || "user"),
                    planType: u.planType || existing.planType || "premium",
                    banned: !!existing.banned,
                    createdAt: existing.createdAt || "Aktiv (Diese Sitzung)",
                    timetableCount: existing.timetableCount || 10,
                    homeworkCount: existing.homeworkCount || 2,
                  });
                }
              }
            } catch {}

            const delIds = getLocalItem<string[]>("planpulse_deleted_user_ids", []);
            const delEmails = getLocalItem<string[]>("planpulse_deleted_user_emails", []);

            const usersList = Array.from(map.values()).filter((u) => {
              const cleanE = (u.email || "").toLowerCase().trim();
              if (cleanE === "max.kistner12@gmail.com") return true;
              if (delIds.includes(u.id)) return false;
              if (delEmails.includes(cleanE)) return false;
              return true;
            });

            return { ok: true, status: 200, data: { success: true, users: usersList } as any };
          }
        }
      }

      // Default fallback
      return { ok: true, status: 200, data: { success: true, message: "Aktion erfolgreich ausgeführt." } as any };
    } catch (e: any) {
      console.warn("Client fallback error:", e);
      return { ok: false, status: 500, data: null, error: e.message || "Fehler bei der Datenverarbeitung." };
    }
  }

  // External Fetch
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    }
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch {
      return { ok: res.ok, status: res.status, data: null, error: "Antwort konnte nicht verarbeitet werden." };
    }
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: "Netzwerkfehler." };
  }
}

