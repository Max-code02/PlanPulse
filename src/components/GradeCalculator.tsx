import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  Calculator,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle,
  HelpCircle,
  PieChart,
  LineChart as LineChartIcon,
  Settings,
  Save,
  RotateCcw,
  Check,
  X,
  Calendar,
  Target,
  Palette,
  Search,
  CheckCircle2,
  Clock,
  FileText
} from "lucide-react";
import { GradeEntry, GradeType, TimetableEntry, UserSubject, SubjectGradeSummary } from "../types";
import { safeFetchJson } from "../lib/api";

interface GradeCalculatorProps {
  entries: TimetableEntry[];
  onDataChange?: () => void;
}

const GRADE_PRESETS: { type: GradeType; label: string; defaultWeight: number }[] = [
  { type: "exam", label: "Schulaufgabe / Klausur", defaultWeight: 2 },
  { type: "short_test", label: "Stegreifaufgabe / Ex", defaultWeight: 1 },
  { type: "oral", label: "Mündlich / Mitarbeit / Abfrage", defaultWeight: 1 },
  { type: "presentation", label: "Referat / Präsentation", defaultWeight: 1 },
  { type: "homework", label: "Hausaufgaben-Note", defaultWeight: 0.5 },
  { type: "custom", label: "Benutzerdefiniert", defaultWeight: 1 },
];

const PRESET_SUBJECTS: { name: string; code: string; color: string; targetGrade: number }[] = [
  { name: "Mathematik", code: "M", color: "#2563eb", targetGrade: 2.0 },
  { name: "Deutsch", code: "D", color: "#dc2626", targetGrade: 2.0 },
  { name: "Englisch", code: "E", color: "#7c3aed", targetGrade: 2.0 },
  { name: "Physik", code: "Ph", color: "#0891b2", targetGrade: 2.0 },
  { name: "Biologie", code: "Bio", color: "#16a34a", targetGrade: 2.0 },
  { name: "Chemie", code: "Ch", color: "#059669", targetGrade: 2.0 },
  { name: "Geschichte", code: "G", color: "#d97706", targetGrade: 2.0 },
  { name: "Informatik", code: "Inf", color: "#6366f1", targetGrade: 2.0 },
  { name: "Sport", code: "Sp", color: "#ea580c", targetGrade: 1.5 },
  { name: "Kunst", code: "Ku", color: "#ec4899", targetGrade: 2.0 },
  { name: "Musik", code: "Mu", color: "#8b5cf6", targetGrade: 2.0 },
  { name: "Religion / Ethik", code: "Rel", color: "#0284c7", targetGrade: 2.0 },
  { name: "Geographie / Erdkunde", code: "Geo", color: "#ca8a04", targetGrade: 2.0 },
  { name: "Wirtschaft & Recht", code: "WR", color: "#0d9488", targetGrade: 2.0 },
  { name: "Französisch", code: "F", color: "#3b82f6", targetGrade: 2.0 },
  { name: "Latein", code: "L", color: "#9333ea", targetGrade: 2.0 },
  { name: "Spanisch", code: "Spa", color: "#e11d48", targetGrade: 2.0 },
];

const COLOR_PALETTE = [
  "#2563eb", "#dc2626", "#7c3aed", "#0891b2", "#16a34a",
  "#059669", "#d97706", "#6366f1", "#ea580c", "#ec4899",
  "#8b5cf6", "#0284c7", "#0d9488", "#e11d48", "#ca8a04"
];

export const GradeCalculator: React.FC<GradeCalculatorProps> = ({ entries, onDataChange }) => {
  // Navigation for 4 Main Parts
  const [activePart, setActivePart] = useState<"cockpit" | "trend" | "subjects" | "manage">("cockpit");

  // Data States
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [homeworkStats, setHomeworkStats] = useState<{ total: number; completed: number }>({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [savingSubject, setSavingSubject] = useState(false);

  // Modals & UI States
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeEntry | null>(null);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<UserSubject | null>(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [searchSubject, setSearchSubject] = useState("");
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Grade Form State
  const [gradeForm, setGradeForm] = useState({
    subject: "",
    title: "",
    value: "2",
    type: "exam" as GradeType,
    weight: "2",
    date: new Date().toISOString().split("T")[0],
    note: "",
    isPending: false,
  });

  // Subject Form State
  const [subjectForm, setSubjectForm] = useState({
    id: "",
    name: "",
    code: "",
    color: "#2563eb",
    targetGrade: "2.0",
    oralRatio: "50",
    teacher: "",
    room: "",
  });

  // Auth Header Helper
  const getHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem("planpulse_auth_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const userStr = localStorage.getItem("planpulse_current_user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u?.email) headers["x-user-email"] = u.email;
      } catch (e) {
        // ignore
      }
    }
    return headers;
  }, []);

  // Fetch all grades, subjects & homework
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getHeaders();

      const [gradesRes, subjectsRes, hwRes] = await Promise.all([
        safeFetchJson<{ grades: GradeEntry[] }>("/api/grades", { headers }),
        safeFetchJson<{ subjects: UserSubject[] }>("/api/subjects", { headers }),
        safeFetchJson<{ items: any[] }>("/api/homework", { headers }),
      ]);

      if (gradesRes.ok && gradesRes.data?.grades) {
        setGrades(gradesRes.data.grades);
      }

      if (subjectsRes.ok && subjectsRes.data?.subjects && Array.isArray(subjectsRes.data.subjects)) {
        setSubjects(subjectsRes.data.subjects);
      } else {
        setSubjects([]);
      }

      if (hwRes.ok && hwRes.data?.items && Array.isArray(hwRes.data.items)) {
        const total = hwRes.data.items.length;
        const completed = hwRes.data.items.filter((h: any) => h.completed).length;
        setHomeworkStats({ total, completed });
      } else {
        setHomeworkStats({ total: 0, completed: 0 });
      }
    } catch (err) {
      console.error("Failed to load grades data:", err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchData();
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener("planpulse_data_updated", handleUpdate);
    return () => {
      window.removeEventListener("planpulse_data_updated", handleUpdate);
    };
  }, [fetchData]);

  // Merge timetable subject names into subject list if missing
  useEffect(() => {
    if (entries.length > 0) {
      const timetableSubjectNames = Array.from(
        new Set(entries.map((e) => e.subject).filter((s): s is string => typeof s === "string" && s.trim().length > 0))
      );
      const existingNames = new Set(subjects.map((s) => s.name.toLowerCase()));
      
      const newFromTimetable: UserSubject[] = [];
      timetableSubjectNames.forEach((tName: string) => {
        if (!existingNames.has(tName.toLowerCase())) {
          newFromTimetable.push({
            id: `sub-tt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: tName,
            code: tName.substring(0, 3).toUpperCase(),
            color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
            targetGrade: 2.0,
            oralRatio: 50,
          });
        }
      });

      if (newFromTimetable.length > 0) {
        const updated = [...subjects, ...newFromTimetable];
        setSubjects(updated);
        // Save to backend
        safeFetchJson("/api/subjects", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ subjects: updated }),
        }).catch((e) => console.error("Auto-sync timetable subjects error:", e));
      }
    }
  }, [entries, subjects, getHeaders]);

  // Subject Summaries computation
  const subjectSummaries: SubjectGradeSummary[] = useMemo(() => {
    const map: { [subjectName: string]: GradeEntry[] } = {};
    
    // Group grades
    grades.forEach((g) => {
      if (!map[g.subject]) map[g.subject] = [];
      map[g.subject].push(g);
    });

    // Also include subjects that have no grades yet
    subjects.forEach((s) => {
      if (!map[s.name]) map[s.name] = [];
    });

    return Object.keys(map).map((subjName) => {
      const list = map[subjName] || [];
      const subInfo = subjects.find((s) => s.name.toLowerCase() === subjName.toLowerCase());
      
      const validGrades = list.filter((g) => !g.isPending && !isNaN(g.value) && g.value > 0);
      
      let totalWeightedScore = 0;
      let totalWeight = 0;

      validGrades.forEach((item) => {
        const w = item.weight > 0 ? item.weight : 1;
        totalWeightedScore += item.value * w;
        totalWeight += w;
      });

      const average = totalWeight > 0 ? totalWeightedScore / totalWeight : null;

      return {
        subject: subjName,
        subjectInfo: subInfo,
        grades: list,
        average,
        totalWeight,
      };
    }).sort((a, b) => {
      // Sort subjects with grades first, then alphabetically
      if (a.grades.length > 0 && b.grades.length === 0) return -1;
      if (a.grades.length === 0 && b.grades.length > 0) return 1;
      return a.subject.localeCompare(b.subject);
    });
  }, [grades, subjects]);

  // Overall GPA Calculation (Gesamt-Notendurchschnitt)
  const validSubjectAverages = useMemo(() => {
    return subjectSummaries
      .map((s) => s.average)
      .filter((avg): avg is number => avg !== null);
  }, [subjectSummaries]);

  const overallGpa = useMemo(() => {
    if (validSubjectAverages.length === 0) return null;
    const sum = validSubjectAverages.reduce((a, b) => a + b, 0);
    return sum / validSubjectAverages.length;
  }, [validSubjectAverages]);

  // Grade Count Distribution (for Donut Cockpit)
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "?": 0,
    };

    grades.forEach((g) => {
      if (g.isPending) {
        counts["?"] += 1;
      } else {
        const rounded = Math.round(g.value);
        if (rounded >= 1 && rounded <= 6) {
          counts[String(rounded)] += 1;
        } else {
          counts["?"] += 1;
        }
      }
    });

    const totalCount = grades.length;
    const gradedCount = totalCount - counts["?"];

    return {
      counts,
      totalCount,
      gradedCount,
      pendingCount: counts["?"],
    };
  }, [grades]);

  // Chronological Grades for Trend Line (Teil 2)
  const chronologicalGrades = useMemo(() => {
    const filtered = grades
      .filter((g) => !g.isPending && (selectedSubjectFilter === "ALL" || g.subject === selectedSubjectFilter))
      .slice()
      .sort((a, b) => {
        const dateA = new Date(a.date || "").getTime() || 0;
        const dateB = new Date(b.date || "").getTime() || 0;
        return dateA - dateB;
      });

    // Compute running GPA at each step
    let cumulativeSum = 0;
    let cumulativeWeight = 0;

    return filtered.map((g, idx) => {
      const w = g.weight || 1;
      cumulativeSum += g.value * w;
      cumulativeWeight += w;
      const runningAvg = cumulativeSum / cumulativeWeight;

      return {
        ...g,
        stepIndex: idx + 1,
        runningAvg,
      };
    });
  }, [grades, selectedSubjectFilter]);

  // Grade Modal Helpers
  const handleOpenAddGrade = (defaultSubject?: string) => {
    const firstSubject = defaultSubject || (subjects.length > 0 ? subjects[0].name : "Mathematik");
    setGradeForm({
      subject: firstSubject,
      title: "",
      value: "2",
      type: "exam",
      weight: "2",
      date: new Date().toISOString().split("T")[0],
      note: "",
      isPending: false,
    });
    setEditingGrade(null);
    setGradeModalOpen(true);
  };

  const handleOpenEditGrade = (grade: GradeEntry) => {
    setEditingGrade(grade);
    setGradeForm({
      subject: grade.subject,
      title: grade.title,
      value: String(grade.value),
      type: grade.type,
      weight: String(grade.weight),
      date: grade.date || new Date().toISOString().split("T")[0],
      note: grade.note || "",
      isPending: !!grade.isPending,
    });
    setGradeModalOpen(true);
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeForm.subject.trim()) return;

    const numVal = parseFloat(gradeForm.value.replace(",", "."));
    // Robust parsing allowing "2*", "2x", "2×", "2-fach", "1.5", etc.
    const cleanWeightStr = String(gradeForm.weight)
      .replace(/[*xX×]/g, "")
      .replace("fach", "")
      .replace(",", ".")
      .trim();
    const numWeight = parseFloat(cleanWeightStr) || 1;

    if (!gradeForm.isPending && (isNaN(numVal) || numVal < 0.5 || numVal > 6.0)) {
      alert("Bitte gib eine gültige Schulnote zwischen 1.0 und 6.0 ein.");
      return;
    }

    const payload = {
      subject: gradeForm.subject.trim(),
      title: gradeForm.title.trim() || GRADE_PRESETS.find((p) => p.type === gradeForm.type)?.label || "Note",
      value: gradeForm.isPending ? 0 : numVal,
      weight: numWeight,
      type: gradeForm.type,
      date: gradeForm.date || new Date().toLocaleDateString("de-DE"),
      note: gradeForm.note.trim(),
      isPending: gradeForm.isPending,
    };

    try {
      const headers = getHeaders();
      if (editingGrade) {
        const res = await safeFetchJson(`/api/grades/${editingGrade.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        }).then((r) => r.data);

        if (res.success && res.grade) {
          setGrades((prev) => prev.map((g) => (g.id === editingGrade.id ? res.grade : g)));
        }
      } else {
        const res = await safeFetchJson("/api/grades", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }).then((r) => r.data);

        if (res.success && res.grade) {
          setGrades([res.grade, ...grades]);
        }
      }
      setGradeModalOpen(false);
    } catch (err) {
      console.error("Save grade error:", err);
    }
  };

  const handleDeleteGrade = async (id: string) => {
    setGrades((prev) => prev.filter((g) => g.id !== id));
    try {
      await safeFetchJson(`/api/grades/${id}`, { method: "DELETE", headers: getHeaders() });
    } catch (err) {
      console.error("Delete grade error:", err);
    }
  };

  // Subject Modal Helpers
  const handleOpenAddSubject = () => {
    setSubjectForm({
      id: "",
      name: "",
      code: "",
      color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
      targetGrade: "2.0",
      oralRatio: "50",
      teacher: "",
      room: "",
    });
    setEditingSubject(null);
    setSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subj: UserSubject) => {
    setEditingSubject(subj);
    setSubjectForm({
      id: subj.id,
      name: subj.name,
      code: subj.code || "",
      color: subj.color || "#2563eb",
      targetGrade: String(subj.targetGrade || 2.0),
      oralRatio: String(subj.oralRatio || 50),
      teacher: subj.teacher || "",
      room: subj.room || "",
    });
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;

    setSavingSubject(true);
    const payload = {
      id: subjectForm.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: subjectForm.name.trim(),
      code: subjectForm.code.trim() || subjectForm.name.trim().substring(0, 3).toUpperCase(),
      color: subjectForm.color,
      targetGrade: parseFloat(subjectForm.targetGrade) || 2.0,
      oralRatio: parseInt(subjectForm.oralRatio) || 50,
      teacher: subjectForm.teacher.trim(),
      room: subjectForm.room.trim(),
    };

    try {
      const headers = getHeaders();
      if (editingSubject) {
        const res = await safeFetchJson(`/api/subjects/${editingSubject.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        }).then((r) => r.data);

        if (res.success && res.subjects) {
          setSubjects(res.subjects);
        }
      } else {
        const res = await safeFetchJson("/api/subjects", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }).then((r) => r.data);

        if (res.success && res.subjects) {
          setSubjects(res.subjects);
        }
      }
      setSubjectModalOpen(false);
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Save subject error:", err);
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!confirm(`Fach "${name}" wirklich löschen? Die zugehörigen Noten bleiben erhalten.`)) return;

    try {
      const headers = getHeaders();
      const res = await safeFetchJson(`/api/subjects/${id}`, {
        method: "DELETE",
        headers,
      }).then((r) => r.data);

      if (res.success && res.subjects) {
        setSubjects(res.subjects);
      } else {
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      }
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error("Delete subject error:", err);
    }
  };

  const handleResetDefaultSubjects = async () => {
    if (!confirm("Fächer auf die Standard-Fächerliste zurücksetzen?")) return;
    try {
      const res = await safeFetchJson("/api/subjects/reset", {
        method: "POST",
        headers: getHeaders(),
      }).then((r) => r.data);

      if (res.success && res.subjects) {
        setSubjects(res.subjects);
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Reset subjects error:", err);
    }
  };

  const handleDeleteAllSubjects = async () => {
    if (!confirm("Alle Fächer restlos löschen? (Kann nicht rückgängig gemacht werden)")) return;
    try {
      const res = await safeFetchJson("/api/subjects/clear", {
        method: "POST",
        headers: getHeaders(),
      }).then((r) => r.data);
      if (res.success && res.subjects !== undefined) {
        setSubjects(res.subjects);
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Clear subjects error:", err);
    }
  };

  // Grade color badges
  const getGradeColorBadge = (val: number) => {
    if (val <= 1.5) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    if (val <= 2.5) return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    if (val <= 3.5) return "bg-sky-500/20 text-sky-300 border-sky-500/40";
    if (val <= 4.0) return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    if (val <= 4.5) return "bg-orange-500/20 text-orange-300 border-orange-500/40";
    return "bg-rose-500/20 text-rose-300 border-rose-500/40";
  };

  // Filtered Subjects for Management
  const filteredSubjectsList = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchSubject.toLowerCase()) ||
    (s.code && s.code.toLowerCase().includes(searchSubject.toLowerCase())) ||
    (s.teacher && s.teacher.toLowerCase().includes(searchSubject.toLowerCase()))
  );

  // --- DONUT PIE CHART CALCULATIONS (Exact Cockpit Replica from screenshot) ---
  const donutSlices = useMemo(() => {
    // Slices config matching user screenshot:
    // Notes 1, 2, 3, 4, 5, 6, ?
    const sliceDefs = [
      { key: "1", label: "1", color: "#38bdf8", count: gradeDistribution.counts["1"] || 0 },
      { key: "2", label: "2", color: "#2563eb", count: gradeDistribution.counts["2"] || 0 },
      { key: "3", label: "3", color: "#3b82f6", count: gradeDistribution.counts["3"] || 0 },
      { key: "4", label: "4", color: "#f59e0b", count: gradeDistribution.counts["4"] || 0 },
      { key: "5", label: "5", color: "#f97316", count: gradeDistribution.counts["5"] || 0 },
      { key: "6", label: "6", color: "#ef4444", count: gradeDistribution.counts["6"] || 0 },
      { key: "?", label: "?", color: "#64748b", count: gradeDistribution.counts["?"] || 0 },
    ];

    // Filter to active slices with count > 0
    const active = sliceDefs.filter((s) => s.count > 0);
    const total = active.reduce((sum, s) => sum + s.count, 0);

    if (total === 0) {
      return [];
    }

    let currentAngle = 0;
    return active.map((slice) => {
      const fraction = slice.count / total;
      const angleSweep = fraction * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSweep;
      currentAngle += angleSweep;

      return {
        ...slice,
        percent: fraction,
        startAngle,
        endAngle,
      };
    });
  }, [gradeDistribution]);

  // SVG Arc generator
  const getSvgArc = (cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number) => {
    // Avoid exact 360 bug
    const sweep = endDeg - startDeg;
    const actualEnd = sweep >= 359.9 ? startDeg + 359.99 : endDeg;

    const rad = Math.PI / 180;
    const startRad = (startDeg - 90) * rad;
    const endRad = (actualEnd - 90) * rad;

    const x1 = cx + rOuter * Math.cos(startRad);
    const y1 = cy + rOuter * Math.sin(startRad);
    const x2 = cx + rOuter * Math.cos(endRad);
    const y2 = cy + rOuter * Math.sin(endRad);

    const x3 = cx + rInner * Math.cos(endRad);
    const y3 = cy + rInner * Math.sin(endRad);
    const x4 = cx + rInner * Math.cos(startRad);
    const y4 = cy + rInner * Math.sin(startRad);

    const largeArc = sweep > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  // Text center point on arc for label
  const getSliceTextPos = (cx: number, cy: number, rMid: number, startDeg: number, endDeg: number) => {
    const midDeg = (startDeg + endDeg) / 2;
    const rad = (midDeg - 90) * (Math.PI / 180);
    return {
      x: cx + rMid * Math.cos(rad),
      y: cy + rMid * Math.sin(rad),
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Top Cockpit Header & Navigation Tabs (4 Haupt-Bereiche) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Noten-Cockpit & Notenrechner
                </h2>
                {overallGpa !== null && (
                  <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                    Ø {overallGpa.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                4-Teile-Cockpit: Kreisdiagramm, Trendverlauf, Fächer-Notenspiegel & Fächerverwaltung.
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              onClick={() => handleOpenAddGrade()}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Note eintragen</span>
            </button>

            <button
              onClick={handleOpenAddSubject}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              <span>Fach anlegen</span>
            </button>
          </div>
        </div>

        {/* 4 Main Segments Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-800/80">
          
          <button
            onClick={() => setActivePart("cockpit")}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activePart === "cockpit"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800"
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>1. Noten-Cockpit</span>
          </button>

          <button
            onClick={() => setActivePart("trend")}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activePart === "trend"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>2. Notenverlauf</span>
          </button>

          <button
            onClick={() => setActivePart("subjects")}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activePart === "subjects"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>3. Fächer-Notenspiegel</span>
          </button>

          <button
            onClick={() => setActivePart("manage")}
            className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activePart === "manage"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>4. Fächer verwalten</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TEIL 1: NOTEN-COCKPIT & KREISDIAGRAMM (EXAKT WIE IM SCREENSHOT) */}
      {/* ========================================================================= */}
      {activePart === "cockpit" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Cockpit Visual Box (Circle + Stats) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-blue-400" />
                <span>Noten-Cockpit & Notenverteilung</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {grades.length} {grades.length === 1 ? "Prüfung" : "Prüfungen / Arbeiten"} gesamt
              </span>
            </div>

            {/* Circular Donut + Statistics Container (Directly modeled from the user image!) */}
            <div className="flex flex-col sm:flex-row items-center justify-around gap-8 py-2">
              
              {/* Donut Chart with Center (+) Button */}
              <div className="relative w-64 h-64 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-lg" viewBox="0 0 200 200">
                  {donutSlices.length === 0 ? (
                    <circle
                      cx="100"
                      cy="100"
                      r="70"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="36"
                      strokeDasharray="6 6"
                      className="opacity-60"
                    />
                  ) : (
                    donutSlices.map((slice) => {
                      const pathD = getSvgArc(100, 100, 92, 48, slice.startAngle, slice.endAngle);
                      const isHovered = hoveredSegment === slice.key;

                      return (
                        <path
                          key={slice.key}
                          d={pathD}
                          fill={slice.color}
                          stroke="#0f172a"
                          strokeWidth="3"
                          className="transition-all duration-200 cursor-pointer hover:opacity-90"
                          onMouseEnter={() => setHoveredSegment(slice.key)}
                          onMouseLeave={() => setHoveredSegment(null)}
                          style={{
                            transformOrigin: "100px 100px",
                            transform: isHovered ? "scale(1.03)" : "scale(1)",
                          }}
                        />
                      );
                    })
                  )}
                </svg>

                {/* SVG Text Overlay on Slices */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 200 200">
                  {donutSlices.length === 0 ? (
                    <text
                      x="100"
                      y="170"
                      textAnchor="middle"
                      className="fill-slate-500 font-bold text-[10px]"
                    >
                      Klicke + zum Eintragen
                    </text>
                  ) : (
                    donutSlices.map((slice) => {
                      // Only display text if slice is big enough (sweep >= 20 deg)
                      if (slice.endAngle - slice.startAngle < 20) return null;
                      const pos = getSliceTextPos(100, 100, 70, slice.startAngle, slice.endAngle);

                      return (
                        <g key={`text-${slice.key}`} transform={`translate(${pos.x}, ${pos.y})`}>
                          <text
                            textAnchor="middle"
                            y="-4"
                            className="fill-white/80 font-bold text-[10px]"
                          >
                            {slice.count}x
                          </text>
                          <text
                            textAnchor="middle"
                            y="10"
                            className="fill-white font-black text-sm"
                          >
                            {slice.label}
                          </text>
                        </g>
                      );
                    })
                  )}
                </svg>

                {/* Center "+" Circle Button (Like in the screenshot!) */}
                <button
                  onClick={() => handleOpenAddGrade()}
                  title="Note eintragen"
                  className="absolute w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex flex-col items-center justify-center shadow-xl shadow-blue-900/60 border-4 border-slate-900 transition-transform transform hover:scale-105 active:scale-95 z-10"
                >
                  <Plus className="w-8 h-8 text-white font-bold" />
                </button>
              </div>

              {/* Statistics Card (Right side like in screenshot!) */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 min-w-[220px] flex-1 space-y-4">
                
                <div className="flex items-center space-x-2 text-slate-300 font-bold text-sm border-b border-slate-800 pb-2.5">
                  <div className="p-1 rounded bg-blue-500/20 text-blue-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span>Statistik</span>
                </div>

                {/* Main GPA Figure */}
                <div>
                  <div className="text-xs text-slate-400 font-medium">Notendurchschnitt</div>
                  <div className="text-4xl font-black text-white tracking-tight flex items-baseline space-x-1 mt-0.5">
                    <span className="text-blue-400 text-2xl font-semibold">ø</span>
                    <span>{overallGpa !== null ? overallGpa.toFixed(2).replace(".", ",") : "—"}</span>
                  </div>
                </div>

                {/* Exams with Grade Fraction */}
                <div className="border-t border-slate-900 pt-2.5">
                  <div className="text-xs text-slate-400 font-medium">Prüfungen m. Note</div>
                  <div className="text-xl font-bold text-slate-200 mt-0.5">
                    {gradeDistribution.gradedCount} / {gradeDistribution.totalCount || 0}
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ 
                        width: gradeDistribution.totalCount > 0 
                          ? `${(gradeDistribution.gradedCount / gradeDistribution.totalCount) * 100}%` 
                          : "0%" 
                      }}
                    />
                  </div>
                </div>

                {/* Homework Completion Fraction */}
                <div className="border-t border-slate-900 pt-2.5">
                  <div className="text-xs text-slate-400 font-medium">Hausaufgaben</div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">
                    {homeworkStats.completed} / {homeworkStats.total}
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ 
                        width: homeworkStats.total > 0 
                          ? `${(homeworkStats.completed / homeworkStats.total) * 100}%` 
                          : "0%" 
                      }}
                    />
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Legend */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-6 pt-4 border-t border-slate-800 text-center">
              {[
                { label: "Note 1", val: "1", color: "bg-sky-400", count: gradeDistribution.counts["1"] || 0 },
                { label: "Note 2", val: "2", color: "bg-blue-600", count: gradeDistribution.counts["2"] || 0 },
                { label: "Note 3", val: "3", color: "bg-blue-400", count: gradeDistribution.counts["3"] || 0 },
                { label: "Note 4", val: "4", color: "bg-amber-500", count: gradeDistribution.counts["4"] || 0 },
                { label: "Note 5", val: "5", color: "bg-orange-500", count: gradeDistribution.counts["5"] || 0 },
                { label: "Note 6", val: "6", color: "bg-rose-500", count: gradeDistribution.counts["6"] || 0 },
                { label: "Offen ?", val: "?", color: "bg-slate-500", count: gradeDistribution.counts["?"] || 0 },
              ].map((item) => (
                <div key={item.val} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2">
                  <div className="flex items-center justify-center space-x-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-[11px] font-bold text-slate-300">{item.val}</span>
                  </div>
                  <span className="text-xs font-bold text-white block mt-0.5">{item.count}x</span>
                </div>
              ))}
            </div>

          </div>

          {/* Quick Snapshot / Recent Grades */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>Letzte Noten</span>
                </h4>
                <button
                  onClick={() => setActivePart("subjects")}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Alle anzeigen →
                </button>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {grades.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Noch keine Noten eingetragen. Klicke auf das <b>+</b> im Kreisdiagramm!
                  </div>
                ) : (
                  grades.slice(0, 5).map((grade) => (
                    <div
                      key={grade.id}
                      className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span
                          className={`font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                            grade.isPending 
                              ? "bg-slate-800 text-slate-400 border-slate-700 font-bold" 
                              : getGradeColorBadge(grade.value)
                          }`}
                        >
                          {grade.isPending ? "?" : grade.value.toFixed(1).replace(".", ",")}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate">{grade.subject}</div>
                          <div className="text-[10px] text-slate-400 truncate">{grade.title}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          {grade.weight}×
                        </span>
                        <button
                          onClick={() => handleOpenEditGrade(grade)}
                          className="p-1 text-slate-500 hover:text-blue-300 rounded hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => handleOpenAddGrade()}
                className="w-full py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Neue Note eintragen</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TEIL 2: NOTENVERLAUF & TREND (INTERAKTIVES LINIENDIAGRAMM) */}
      {/* ========================================================================= */}
      {activePart === "trend" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span>Notenverlauf & Noten-Entwicklung</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Chronologische Entwicklung deiner Prüfungsergebnisse und des Gesamtschnitts über die Zeit.
              </p>
            </div>

            {/* Subject Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Alle Fächer (Gesamtverlauf)</option>
                {subjects.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chronologicalGrades.length < 2 ? (
            <div className="text-center py-16 text-slate-500 text-xs space-y-3">
              <LineChartIcon className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
              <p className="font-semibold text-slate-400">Mindestens 2 eingetragene Noten erforderlich</p>
              <p className="text-slate-500 max-w-sm mx-auto">
                Trage weitere Schulaufgaben, Stegreifaufgaben oder mündliche Noten ein, um den Verlaufsgraphen zu sehen.
              </p>
              <button
                onClick={() => handleOpenAddGrade()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-colors inline-flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Note eintragen</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* SVG Trend Line Chart */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                
                {/* Y-Axis Grade Grid Lines (1.0 to 6.0) */}
                <div className="relative h-64 w-full">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-600">
                    <div className="border-b border-slate-800/80 pb-0.5 flex justify-between">
                      <span className="text-emerald-400 font-bold">1.0 (Sehr gut)</span>
                      <span className="text-slate-600">Top</span>
                    </div>
                    <div className="border-b border-slate-800/40 pb-0.5">2.0 (Gut)</div>
                    <div className="border-b border-slate-800/40 pb-0.5">3.0 (Befriedigend)</div>
                    <div className="border-b border-slate-800/40 pb-0.5">4.0 (Ausreichend)</div>
                    <div className="border-b border-slate-800/40 pb-0.5">5.0 (Mangelhaft)</div>
                    <div className="pt-0.5 text-rose-400">6.0 (Ungenügend)</div>
                  </div>

                  {/* SVG Curves */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    {/* Running Average Line */}
                    <path
                      d={chronologicalGrades.reduce((acc, pt, idx) => {
                        const x = (idx / (chronologicalGrades.length - 1)) * 100;
                        // Map grade 1.0 -> 0%, 6.0 -> 100%
                        const y = ((pt.runningAvg - 1.0) / 5.0) * 100;
                        return idx === 0 ? `M ${x}% ${y}%` : `${acc} L ${x}% ${y}%`;
                      }, "")}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      className="opacity-80"
                    />

                    {/* Single Grade Points */}
                    {chronologicalGrades.map((pt, idx) => {
                      const x = (idx / (chronologicalGrades.length - 1)) * 100;
                      const y = ((pt.value - 1.0) / 5.0) * 100;

                      return (
                        <g key={pt.id}>
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="5"
                            className="fill-blue-500 stroke-slate-900 stroke-2 hover:r-7 transition-all cursor-pointer"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend for Chart */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-4 mt-2 border-t border-slate-900">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>Einzelne Noten</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-3 h-0.5 bg-sky-400 border-b border-dashed border-sky-400" />
                      <span>Gleitender Schnitt</span>
                    </span>
                  </div>
                  <span>{chronologicalGrades.length} Noten im Verlauf</span>
                </div>
              </div>

              {/* Chronological List of Entries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {chronologicalGrades.map((pt) => (
                  <div
                    key={pt.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center border ${getGradeColorBadge(pt.value)}`}>
                        {pt.value.toFixed(1).replace(".", ",")}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white">{pt.subject}</div>
                        <div className="text-[10px] text-slate-400">{pt.title} • {pt.date}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-sky-400 font-semibold block">
                        Ø {pt.runningAvg.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-[9px] text-slate-500">{pt.weight}× Gew.</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TEIL 3: NOTENDURCHSCHNITTE DER EINZELNEN FÄCHER (NOTENSPIEGEL) */}
      {/* ========================================================================= */}
      {activePart === "subjects" && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span>Notendurchschnitte der einzelnen Fächer</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Übersicht aller Fächer mit aktuellem Schnitt, Zielnote und allen Einzelnoten.
              </p>
            </div>

            <button
              onClick={() => handleOpenAddGrade()}
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Note eintragen</span>
            </button>
          </div>

          {/* Subjects Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectSummaries.map((summary) => {
              const avg = summary.average;
              const subColor = summary.subjectInfo?.color || "#2563eb";
              const targetG = summary.subjectInfo?.targetGrade || 2.0;

              return (
                <div
                  key={summary.subject}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all"
                >
                  <div className="space-y-3">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: subColor }}
                        />
                        <div>
                          <h4 className="font-bold text-white text-base tracking-tight">{summary.subject}</h4>
                          <span className="text-[11px] text-slate-400">
                            {summary.grades.length} {summary.grades.length === 1 ? "Note" : "Noten"} eingetragen
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-lg font-black px-2.5 py-0.5 rounded-lg border inline-block ${
                            avg !== null ? getGradeColorBadge(avg) : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {avg !== null ? `Ø ${avg.toFixed(2).replace(".", ",")}` : "Keine Note"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Ziel: {targetG.toFixed(1).replace(".", ",")}
                        </div>
                      </div>
                    </div>

                    {/* Grades List for this Subject */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {summary.grades.length === 0 ? (
                        <div className="text-center py-6 text-slate-500 text-xs">
                          Noch keine Noten für {summary.subject}.
                        </div>
                      ) : (
                        summary.grades.map((grade) => (
                          <div
                            key={grade.id}
                            className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs group"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span
                                className={`font-black text-sm w-7 h-7 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                                  grade.isPending
                                    ? "bg-slate-800 text-slate-400 border-slate-700 font-bold"
                                    : getGradeColorBadge(grade.value)
                                }`}
                              >
                                {grade.isPending ? "?" : grade.value.toFixed(1).replace(".", ",")}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-white truncate text-xs">{grade.title}</div>
                                <div className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                                  <span className="bg-slate-800 px-1 py-0.2 rounded text-blue-300 font-mono font-bold">
                                    {grade.weight}×
                                  </span>
                                  <span>{grade.date}</span>
                                  {grade.note && <span className="text-slate-500 truncate">({grade.note})</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleOpenEditGrade(grade)}
                                className="p-1 text-slate-500 hover:text-blue-300 rounded hover:bg-slate-800 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteGrade(grade.id)}
                                title="Note löschen"
                                className="p-1 text-slate-600 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                  </div>

                  {/* Add Grade for this specific subject */}
                  <div className="pt-3 mt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenAddGrade(summary.subject)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      <span>Note für {summary.subject} eintragen</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TEIL 4: FÄCHER VERWALTEN & SPEICHERN */}
      {/* ========================================================================= */}
      {activePart === "manage" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <span>Schulfächer verwalten & dauerhaft speichern</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Erstelle eigene Schulfächer mit Wunschfarben, Zielnoten und Gewichtung. Alle Fächer werden dauerhaft gespeichert!
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDeleteAllSubjects}
                className="flex items-center space-x-1 px-3 py-2 bg-red-950/40 hover:bg-red-900/50 text-red-400 rounded-xl text-xs font-semibold border border-red-900/50 transition-colors"
                title="Alle Fächer löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Alle löschen</span>
              </button>
              <button
                onClick={handleResetDefaultSubjects}
                className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                title="Standard-Schulfächer wiederherstellen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Standard-Fächer</span>
              </button>

              <button
                onClick={handleOpenAddSubject}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Neues Fach erstellen</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Fach suchen..."
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Subjects Table / List */}
          {filteredSubjectsList.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                {searchSubject ? "Kein Fach gefunden" : "Noch keine Fächer angelegt"}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {searchSubject
                  ? `Kein Fach passt zu "${searchSubject}".`
                  : "Lege deine Fächer an, um Noten gezielt zuzuordnen und im Stundenplan sofort auszuwählen."}
              </p>
              <button
                onClick={handleOpenAddSubject}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Erstes Fach anlegen</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSubjectsList.map((subj) => {
                const countGrades = grades.filter((g) => g.subject.toLowerCase() === subj.name.toLowerCase()).length;

                return (
                  <div
                    key={subj.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: subj.color || "#2563eb" }}
                          />
                          <div>
                            <h4 className="font-bold text-white text-sm tracking-tight">{subj.name}</h4>
                            <span className="text-[10px] text-slate-500 font-mono">Kürzel: {subj.code || "—"}</span>
                          </div>
                        </div>

                        <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700">
                          {countGrades} Noten
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Wunsch-Zielnote</span>
                          <span className="font-bold text-slate-200">{subj.targetGrade ? `${subj.targetGrade.toFixed(1).replace(".", ",")}` : "2,0"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Mündl. Anteil</span>
                          <span className="font-bold text-slate-200">{subj.oralRatio || 50}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-900">
                      <button
                        onClick={() => handleOpenEditSubject(subj)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Bearbeiten</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subj.id, subj.name)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Fach löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOTE EINTRAGEN / BEARBEITEN */}
      {/* ========================================================================= */}
      {gradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <span>{editingGrade ? "Note bearbeiten" : "Neue Note eintragen"}</span>
              </h3>
              <button
                onClick={() => setGradeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-3.5 text-xs">
              
              {/* Subject Selection */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Schulfach *</label>
                <select
                  value={gradeForm.subject}
                  onChange={(e) => setGradeForm({ ...gradeForm, subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Bezeichnung / Thema</label>
                <input
                  type="text"
                  placeholder="z.B. 1. Schulaufgabe (Kurvendiskussion)"
                  value={gradeForm.title}
                  onChange={(e) => setGradeForm({ ...gradeForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Value & Pending Option */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Schulnote (1 - 6) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="6"
                    disabled={gradeForm.isPending}
                    value={gradeForm.value}
                    onChange={(e) => setGradeForm({ ...gradeForm, value: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500 disabled:opacity-40"
                    required={!gradeForm.isPending}
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Gewichtung (z.B. 2*, 2× oder Zahl)
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. 2* oder 2"
                    value={gradeForm.weight}
                    onChange={(e) => setGradeForm({ ...gradeForm, weight: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                  {/* Quick-Pick Weight Chips */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[
                      { label: "1×", val: "1" },
                      { label: "2×", val: "2" },
                      { label: "3×", val: "3" },
                      { label: "0.5×", val: "0.5" },
                    ].map((chip) => {
                      const isSelected = String(gradeForm.weight).replace(/[*xX×]/g, "").trim() === chip.val;
                      return (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => setGradeForm({ ...gradeForm, weight: `${chip.val}×` })}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                            isSelected
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Checkbox for Pending "?" (Geschrieben, aber Note noch nicht bekannt) */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chkPending"
                  checked={gradeForm.isPending}
                  onChange={(e) => setGradeForm({ ...gradeForm, isPending: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                />
                <label htmlFor="chkPending" className="text-slate-300 font-medium cursor-pointer">
                  Arbeit geschrieben / anstehend (Note noch offen <b>?</b>)
                </label>
              </div>

              {/* Type Preset Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Art der Leistung</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {GRADE_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.type}
                      onClick={() => setGradeForm({ ...gradeForm, type: p.type, weight: String(p.defaultWeight) })}
                      className={`p-2 rounded-xl text-left border text-[11px] font-semibold transition-colors ${
                        gradeForm.type === p.type
                          ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Datum</label>
                <input
                  type="date"
                  value={gradeForm.date}
                  onChange={(e) => setGradeForm({ ...gradeForm, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Optionale Notiz</label>
                <input
                  type="text"
                  placeholder="z.B. Guter Schnitt, bei Aufgabe 3 noch üben"
                  value={gradeForm.note}
                  onChange={(e) => setGradeForm({ ...gradeForm, note: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setGradeModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  {editingGrade ? "Änderungen speichern" : "Note eintragen"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: FACH ERSTELLEN / BEARBEITEN */}
      {/* ========================================================================= */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <span>{editingSubject ? "Fach bearbeiten" : "Neues Schulfach anlegen"}</span>
              </h3>
              <button
                onClick={() => setSubjectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5 text-xs">
              
              {/* Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Fachname *</label>
                <input
                  type="text"
                  placeholder="z.B. Mathematik, Französisch, Spanisch"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Code */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Kürzel (z.B. M, D, Spa)</label>
                <input
                  type="text"
                  placeholder="z.B. M, D, E, Ph"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Color Selection Palette & Custom Color Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">Fachfarbe & Stundenplan-Design</label>
                  <span className="text-[11px] font-mono text-slate-400">{subjectForm.color}</span>
                </div>

                {/* Preset Palette Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setSubjectForm({ ...subjectForm, color: c })}
                      className={`w-6 h-6 rounded-full transition-transform shadow ${
                        subjectForm.color.toLowerCase() === c.toLowerCase()
                          ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900"
                          : "hover:scale-110 opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                      title={`Farbe ${c} wählen`}
                    />
                  ))}

                  {/* Custom HTML Color Picker */}
                  <div className="relative flex items-center">
                    <input
                      type="color"
                      id="customSubjectColor"
                      value={subjectForm.color.startsWith("#") && subjectForm.color.length === 7 ? subjectForm.color : "#2563eb"}
                      onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-slate-700 bg-transparent p-0 overflow-hidden"
                      title="Eigene Wunschfarbe wählen"
                    />
                  </div>
                </div>

                {/* Live Preview of Timetable Chip */}
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Live-Vorschau Stundenplan:</span>
                  <div
                    className="px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 transition-colors"
                    style={{ backgroundColor: subjectForm.color }}
                  >
                    <span>{subjectForm.code || (subjectForm.name ? subjectForm.name.substring(0, 3).toUpperCase() : "FACH")}</span>
                    <span>•</span>
                    <span>{subjectForm.name || "Fachname"}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  💡 Alle Stunden dieses Fachs im Stundenplan nehmen automatisch und sofort diese Farbe an.
                </p>
              </div>

              {/* Target Grade & Weighting Ratio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Wunsch-Zielnote</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="6"
                    value={subjectForm.targetGrade}
                    onChange={(e) => setSubjectForm({ ...subjectForm, targetGrade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mündlicher Anteil (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={subjectForm.oralRatio}
                    onChange={(e) => setSubjectForm({ ...subjectForm, oralRatio: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Teacher & Room */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lehrkraft (optional)</label>
                  <input
                    type="text"
                    placeholder="z.B. Fr. Müller"
                    value={subjectForm.teacher}
                    onChange={(e) => setSubjectForm({ ...subjectForm, teacher: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Raum (optional)</label>
                  <input
                    type="text"
                    placeholder="z.B. R204"
                    value={subjectForm.room}
                    onChange={(e) => setSubjectForm({ ...subjectForm, room: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingSubject ? "Fach aktualisieren" : "Fach dauerhaft speichern"}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
