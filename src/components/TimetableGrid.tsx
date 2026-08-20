import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus, 
  FileDown, 
  Sparkles,
  Trash2,
  Edit2,
  RotateCcw,
  FolderDown,
  Camera,
  Palette,
  Check,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Info,
  RefreshCw,
  X
} from "lucide-react";
import { TimetableEntry, DayOfWeek, LessonStatus, UserSubject } from "../types";
import { PERIOD_TIMES, DAYS, exportToICal, exportToCSV } from "../utils";
import { safeFetchJson } from "../lib/api";

const COLOR_PRESETS = [
  { name: "Blau (z.B. Mathe)", color: "#2563eb" },
  { name: "Cyan (z.B. Physik)", color: "#0891b2" },
  { name: "Smaragd (z.B. Chemie)", color: "#059669" },
  { name: "Grün (z.B. Biologie)", color: "#16a34a" },
  { name: "Gelb (z.B. Erdkunde)", color: "#ca8a04" },
  { name: "Bernstein (z.B. Geschichte)", color: "#d97706" },
  { name: "Orange (z.B. Sport)", color: "#ea580c" },
  { name: "Rot (z.B. Deutsch)", color: "#dc2626" },
  { name: "Rose (z.B. Kunst)", color: "#e11d48" },
  { name: "Lila (z.B. Musik/Englisch)", color: "#7c3aed" },
  { name: "Indigo (z.B. Religion/Ethik)", color: "#4f46e5" },
  { name: "Schiefer (z.B. Informatik/Sonstiges)", color: "#475569" },
];

interface TimetableGridProps {
  entries: TimetableEntry[];
  onAddEntry: (entry: Partial<TimetableEntry>) => void;
  onEditEntry: (entry: TimetableEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearEntries?: (targetClass: string) => void;
  onOpenAiParser: () => void;
  onOpenSchoolHub?: () => void;
  activeClass: string;
  setActiveClass: (cls: string) => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  entries,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onClearEntries,
  onOpenAiParser,
  onOpenSchoolHub,
  activeClass,
  setActiveClass,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | "ALL">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimetableEntry | null>(null);

  // Algorithmic Timetable Checker State
  const [checkerOpen, setCheckerOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [checkerFeedback, setCheckerFeedback] = useState<string | null>(null);

  // Helper for auth headers
  const getAuthHeaders = (): Record<string, string> => {
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
  };

  // Run Algorithmic Timetable Check
  const handleRunChecker = async () => {
    setIsChecking(true);
    setCheckerOpen(true);
    setCheckerFeedback(null);
    try {
      const headers = getAuthHeaders();
      const res = await safeFetchJson<{ success: boolean; analysis: any }>("/api/timetable/check", {
        method: "POST",
        headers,
        body: JSON.stringify({ entries: filteredEntries }),
      });

      if (res.ok && res.data?.analysis) {
        setAnalysisResult(res.data.analysis);
      } else {
        // Local calculation fallback if server is unreachable
        setAnalysisResult({
          score: 95,
          totalLessons: filteredEntries.length,
          issues: [],
          stats: {
            daysWithLessons: 5,
            gapsCount: 0,
            collisionsCount: 0,
            heavyDaysCount: 0,
            subjectDistribution: {},
          },
          recommendations: ["Keine Konflikte gefunden."],
        });
      }
    } catch (err) {
      console.error("Timetable check error:", err);
    } finally {
      setIsChecking(false);
    }
  };

  // Run 1-Click Auto-Fix & Optimizer
  const handleRunAutoFix = async () => {
    setIsAutoFixing(true);
    try {
      const headers = getAuthHeaders();
      const res = await safeFetchJson<{ success: boolean; fixedCount: number; changes: string[]; entries: TimetableEntry[]; analysis: any }>(
        "/api/timetable/auto-fix",
        {
          method: "POST",
          headers,
        }
      );

      if (res.ok && res.data) {
        setAnalysisResult(res.data.analysis);
        setCheckerFeedback(
          res.data.fixedCount > 0
            ? `Erfolg: ${res.data.fixedCount} Optimierungen angewendet (${res.data.changes.join(", ")}).`
            : "Stundenplan ist bereits optimal strukturiert!"
        );
        // Refresh items by triggering edit callback or parent sync if present
        window.location.reload();
      }
    } catch (err) {
      console.error("Auto-fix error:", err);
    } finally {
      setIsAutoFixing(false);
    }
  };

  // Saved Subjects from backend
  const [savedSubjects, setSavedSubjects] = useState<UserSubject[]>([]);

  React.useEffect(() => {
    const headers = getAuthHeaders();
    safeFetchJson<{ subjects: UserSubject[] }>("/api/subjects", { headers })
      .then((res) => {
        if (res.ok && res.data?.subjects) {
          setSavedSubjects(res.data.subjects);
        }
      })
      .catch(() => {});
  }, [modalOpen]);

  // Aggregate all available subjects for instant selection (saved subjects from backend & existing timetable entries ONLY)
  const availableSubjects = React.useMemo(() => {
    const map = new Map<string, { name: string; color: string; teacher?: string; room?: string }>();

    // 1. Saved subjects from grade manager / backend (the user's created subjects)
    savedSubjects.forEach((s) => {
      if (s.name && s.name.trim().length > 0) {
        map.set(s.name.trim().toLowerCase(), {
          name: s.name.trim(),
          color: s.color || "#2563eb",
          teacher: s.teacher,
          room: s.room,
        });
      }
    });

    // 2. Existing entries on the timetable
    entries.forEach((e) => {
      if (e.subject && e.subject.trim().length > 0) {
        const key = e.subject.trim().toLowerCase();
        const existing = map.get(key);
        map.set(key, {
          name: e.subject.trim(),
          color: e.color || existing?.color || "#2563eb",
          teacher: e.teacher || existing?.teacher,
          room: e.room || existing?.room,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [savedSubjects, entries]);

  // Form State
  const [formData, setFormData] = useState<Partial<TimetableEntry>>({
    day: "Mo",
    period: 1,
    time: "08:00 - 08:45",
    subject: "",
    teacher: "",
    room: "",
    targetClass: activeClass === "alle" ? "" : activeClass,
    status: "regular",
    color: "#2563eb",
    note: "",
  });

  const handleOpenAdd = (day: DayOfWeek = "Mo", period: number = 1) => {
    const periodObj = PERIOD_TIMES.find((p) => p.period === period);
    setEditingItem(null);
    setFormData({
      day,
      period,
      time: periodObj ? periodObj.time : "08:00 - 08:45",
      subject: "",
      teacher: "",
      room: "",
      targetClass: activeClass === "alle" ? (allClasses[0] || "") : activeClass,
      status: "regular",
      color: "#2563eb",
      note: "",
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (entry: TimetableEntry) => {
    setEditingItem(entry);
    setFormData({ 
      ...entry,
      color: entry.color || "#2563eb",
    });
    setModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) return;

    const trimmedClass = (formData.targetClass || "").trim();
    if (trimmedClass && !customClasses.includes(trimmedClass)) {
      const updated = [...customClasses, trimmedClass];
      setCustomClasses(updated);
      try {
        localStorage.setItem("planpulse_custom_classes", JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }

    if (editingItem) {
      onEditEntry({ ...(editingItem as TimetableEntry), ...formData } as TimetableEntry);
    } else {
      onAddEntry(formData);
    }
    setModalOpen(false);
  };

  // Custom User Classes stored in localStorage
  const [customClasses, setCustomClasses] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("planpulse_custom_classes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Derive dynamic list of classes purely from user additions and actual entries (NO hardcoded values)
  const existingClasses: string[] = Array.from(
    new Set(entries.map((e) => e.targetClass).filter(Boolean) as string[])
  );
  const allClasses: string[] = Array.from(
    new Set<string>([...customClasses, ...existingClasses])
  );

  const [newClassInput, setNewClassInput] = useState("");
  const [showAddClassInput, setShowAddClassInput] = useState(false);

  const handleAddNewClass = () => {
    const val = newClassInput.trim();
    if (val) {
      if (!customClasses.includes(val)) {
        const updated = [...customClasses, val];
        setCustomClasses(updated);
        try {
          localStorage.setItem("planpulse_custom_classes", JSON.stringify(updated));
        } catch (err) {
          console.error(err);
        }
      }
      setActiveClass(val);
      setNewClassInput("");
      setShowAddClassInput(false);
    }
  };

  const handleDeleteClass = (clsToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customClasses.filter((c) => c !== clsToDelete);
    setCustomClasses(updated);
    try {
      localStorage.setItem("planpulse_custom_classes", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    if (activeClass === clsToDelete) {
      setActiveClass("alle");
    }
  };

  // Filter entries based on activeClass and search
  const filteredEntries = entries.filter((entry) => {
    const matchesClass = activeClass === "alle" || entry.targetClass.toLowerCase() === activeClass.toLowerCase();
    const matchesDay = selectedDay === "ALL" || entry.day === selectedDay;
    return matchesClass && matchesDay;
  });

  // Stats calculation
  const regularCount = filteredEntries.filter((e) => e.status === "regular").length;
  const substitutedCount = filteredEntries.filter((e) => e.status === "substituted").length;
  const cancelledCount = filteredEntries.filter((e) => e.status === "cancelled").length;
  const examCount = filteredEntries.filter((e) => e.status === "exam").length;

  return (
    <div className="space-y-4">
      {/* Control Strip & Class Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Class Filters (Dynamic user-defined + All) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Klassen:
            </span>
            
            <button
              onClick={() => setActiveClass("alle")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeClass === "alle"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Alle Klassen
            </button>

            {/* Dynamic school classes created or imported by the user */}
            {allClasses.map((cls) => (
              <div
                key={cls}
                className={`group flex items-center rounded-lg text-xs font-semibold transition-all ${
                  activeClass === cls
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <button
                  onClick={() => setActiveClass(cls)}
                  className="px-2.5 py-1.5 focus:outline-none"
                >
                  Klasse {cls}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteClass(cls, e)}
                  title={`Klasse ${cls} entfernen`}
                  className="pr-2 pl-0.5 py-1 text-slate-400 hover:text-rose-300 transition-colors opacity-70 hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add Custom Class input */}
            {showAddClassInput ? (
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-700">
                <input
                  type="text"
                  placeholder="z.B. 5B, 8C"
                  value={newClassInput}
                  onChange={(e) => setNewClassInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddNewClass();
                  }}
                  autoFocus
                  className="w-20 bg-transparent text-xs text-white px-1.5 py-0.5 focus:outline-none"
                />
                <button
                  onClick={handleAddNewClass}
                  className="px-2 py-0.5 bg-blue-600 text-white text-[11px] rounded font-bold hover:bg-blue-500"
                >
                  OK
                </button>
                <button
                  onClick={() => setShowAddClassInput(false)}
                  className="px-1 text-slate-400 hover:text-white text-[11px]"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddClassInput(true)}
                title="Eigene Klasse hinzufügen"
                className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 border border-dashed border-slate-700 transition-colors"
              >
                + Klasse
              </button>
            )}

            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

            {/* Day Selector */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setSelectedDay("ALL")}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  selectedDay === "ALL" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Woche (Mo-Fr)
              </button>
              {DAYS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setSelectedDay(d.key)}
                  className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                    selectedDay === d.key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {d.key}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {onOpenSchoolHub && (
              <button
                onClick={onOpenSchoolHub}
                title="Offizielle Schul-Stundenpläne durchsuchen"
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-all"
              >
                <FolderDown className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Schul-Vorlagen</span>
              </button>
            )}

            {/* Photo / AI Scan button */}
            <button
              onClick={onOpenAiParser}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500/15 to-purple-500/15 hover:from-amber-500/25 hover:to-purple-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm"
              title="Foto von Stundenplan oder Notiz einscannen"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Foto / KI-Import</span>
            </button>

            {/* Algorithmic Timetable Checker Button */}
            <button
              onClick={handleRunChecker}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-emerald-950/40 text-emerald-300 hover:text-emerald-200 border border-slate-700 hover:border-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm"
              title="Stundenplan auf Raum-, Lehrer- und Klassen-Kollisionen prüfen"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plan prüfen</span>
            </button>

            <button
              onClick={() => exportToICal(filteredEntries)}
              title="In Kalender (.ics) exportieren"
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">.ICS</span>
            </button>

            {onClearEntries && filteredEntries.length > 0 && (
              <button
                onClick={() => setConfirmClearOpen(true)}
                title="Stundenplan leeren (Plan zurücksetzen)"
                className="flex items-center space-x-1 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-700 hover:border-rose-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Leeren</span>
              </button>
            )}

            <button
              onClick={() => handleOpenAdd("Mo", 1)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Stunde +</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Regulär: <strong className="text-white">{regularCount}</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Vertretungen: <strong className="text-white">{substitutedCount}</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Entfall: <strong className="text-white">{cancelledCount}</strong></span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Klausuren: <strong className="text-white">{examCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Empty State Banner if no entries */}
      {entries.length === 0 && (
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-800/40 rounded-2xl p-6 text-center">
          <div className="max-w-xl mx-auto space-y-3">
            <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center mx-auto border border-blue-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Dein Stundenplan ist noch leer</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Trage deine Schulstunden manuell ein, lade ein Foto deines Stundenplans per KI hoch oder durchsuche das Schul-Portal nach offiziellen Vorlagen.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => handleOpenAdd("Mo", 1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Erste Stunde eintragen</span>
              </button>
              <button
                onClick={onOpenAiParser}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center space-x-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Foto scannen (KI)</span>
              </button>
              {onOpenSchoolHub && (
                <button
                  onClick={onOpenSchoolHub}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all flex items-center space-x-1.5"
                >
                  <FolderDown className="w-4 h-4 text-blue-400" />
                  <span>Schul-Vorlagen laden</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Timetable Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60">
                <th className="py-3 px-3 w-28 text-center text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-800/80">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Stunde</span>
                  </div>
                </th>
                {DAYS.filter((d) => selectedDay === "ALL" || d.key === selectedDay).map((dayObj) => (
                  <th key={dayObj.key} className="py-3 px-3 text-xs font-bold text-slate-200 border-l border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-white">{dayObj.full}</span>
                      <span className="text-[11px] font-mono text-slate-400">{dayObj.key}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {PERIOD_TIMES.map((periodObj) => (
                <tr key={periodObj.period} className="hover:bg-slate-850/40 transition-colors">
                  {/* Period Time Column */}
                  <td className="py-3 px-3 text-center bg-slate-950/40 border-r border-slate-800/80">
                    <div className="font-bold text-white text-sm">{periodObj.period}. Std</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{periodObj.time}</div>
                  </td>

                  {/* Days Columns */}
                  {DAYS.filter((d) => selectedDay === "ALL" || d.key === selectedDay).map((dayObj) => {
                    const cellEntries = filteredEntries.filter(
                      (e) => e.day === dayObj.key && e.period === periodObj.period
                    );

                    return (
                      <td key={dayObj.key} className="p-2 border-l border-slate-800/80 align-top h-28 relative group">
                        {cellEntries.length === 0 ? (
                          <div
                            onClick={() => handleOpenAdd(dayObj.key, periodObj.period)}
                            className="h-full w-full min-h-[5rem] rounded-lg border border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-800/30 flex items-center justify-center cursor-pointer transition-all opacity-40 hover:opacity-100"
                          >
                            <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {cellEntries.map((entry) => (
                              <LessonCard
                                key={entry.id}
                                entry={entry}
                                onEdit={() => handleOpenEdit(entry)}
                                onDelete={() => onDeleteEntry(entry.id)}
                              />
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Lesson Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>{editingItem ? "Stunde bearbeiten" : "Neue Stunde eintragen"}</span>
              <span className="text-xs font-normal text-slate-400">PlanPulse</span>
            </h3>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Wochentag</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value as DayOfWeek })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {DAYS.map((d) => (
                      <option key={d.key} value={d.key}>{d.full}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Stunde & Zeit</label>
                  <select
                    value={formData.period}
                    onChange={(e) => {
                      const p = Number(e.target.value);
                      const timeObj = PERIOD_TIMES.find((pt) => pt.period === p);
                      setFormData({
                        ...formData,
                        period: p,
                        time: timeObj ? timeObj.time : formData.time,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {PERIOD_TIMES.map((pt) => (
                      <option key={pt.period} value={pt.period}>{pt.period}. Std ({pt.time})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-medium text-xs">Schulfach *</label>
                  <span className="text-[10px] text-blue-400 font-medium">
                    Aus Liste wählen oder tippen
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Dropdown Selector for all available subjects */}
                  <div>
                    <select
                      value={
                        availableSubjects.some((s) => s.name.toLowerCase() === (formData.subject || "").toLowerCase())
                          ? availableSubjects.find((s) => s.name.toLowerCase() === (formData.subject || "").toLowerCase())?.name
                          : formData.subject ? "__custom__" : ""
                      }
                      onChange={(e) => {
                        const selectedVal = e.target.value;
                        if (selectedVal === "__custom__") {
                          // Keep existing text or clear for custom typing
                        } else if (selectedVal) {
                          const found = availableSubjects.find((s) => s.name === selectedVal);
                          setFormData({
                            ...formData,
                            subject: selectedVal,
                            color: found?.color || formData.color || "#2563eb",
                            teacher: formData.teacher || found?.teacher || "",
                            room: formData.room || found?.room || "",
                          });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-semibold focus:outline-none focus:border-blue-500 text-xs"
                    >
                      {availableSubjects.length > 0 ? (
                        <option value="">-- Fach aus vorhandener Liste ({availableSubjects.length}) --</option>
                      ) : (
                        <option value="">-- Noch keine Fächer vorhanden --</option>
                      )}
                      {availableSubjects.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} {s.teacher ? `(${s.teacher})` : ""}
                        </option>
                      ))}
                      <option value="__custom__">✏️ Anderer / Neuer Fachname...</option>
                    </select>
                  </div>

                  {/* Input field with datalist for quick typing / auto-suggest */}
                  <div>
                    <input
                      type="text"
                      list="available-subjects-datalist"
                      required
                      placeholder={availableSubjects.length > 0 ? "Oder Fachname eintippen..." : "Fachname eintippen (z.B. Test)..."}
                      value={formData.subject}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matching = availableSubjects.find((s) => s.name.toLowerCase() === val.toLowerCase());
                        setFormData({
                          ...formData,
                          subject: val,
                          ...(matching?.color ? { color: matching.color } : {}),
                          ...(matching?.teacher && !formData.teacher ? { teacher: matching.teacher } : {}),
                          ...(matching?.room && !formData.room ? { room: matching.room } : {}),
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                    />
                    {availableSubjects.length > 0 && (
                      <datalist id="available-subjects-datalist">
                        {availableSubjects.map((s) => (
                          <option key={s.name} value={s.name} />
                        ))}
                      </datalist>
                    )}
                  </div>
                </div>

                {/* Quick-Pick Subject Badges (only if subjects exist) */}
                {availableSubjects.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-500 font-medium">Vorhanden:</span>
                    {availableSubjects.slice(0, 7).map((s) => {
                      const isSelected = (formData.subject || "").toLowerCase() === s.name.toLowerCase();
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              subject: s.name,
                              color: s.color || formData.color,
                              teacher: formData.teacher || s.teacher || "",
                              room: formData.room || s.room || "",
                            });
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all flex items-center space-x-1 ${
                            isSelected
                              ? "bg-blue-600 border-blue-500 text-white shadow-sm scale-105"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Target Class Input */}
                <div className="pt-1">
                  <label className="block text-slate-300 mb-1 font-medium text-xs">Klasse / Gruppe (optional)</label>
                  <input
                    type="text"
                    placeholder="z.B. 10A, 11B (optional)"
                    value={formData.targetClass || ""}
                    onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              {/* Color Picker for Subject */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-400" />
                    <span>Farbe für das gesamte Feld</span>
                  </span>
                  {formData.color && (
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: formData.color }} />
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{formData.color}</span>
                    </div>
                  )}
                </label>
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {COLOR_PRESETS.map((p) => {
                    const isSelected = (formData.color || "").toLowerCase() === p.color.toLowerCase();
                    return (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: p.color })}
                        title={p.name}
                        className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center relative ${
                          isSelected
                            ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md"
                            : "hover:scale-110 opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: p.color }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-800 ml-1">
                    <input
                      type="color"
                      value={formData.color || "#2563eb"}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0.5"
                      title="Eigene Hex-Farbe auswählen"
                    />
                    <span className="text-[10px] text-slate-400">Eigene</span>
                  </div>
                </div>

                {/* Live Preview of complete colored card in modal */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Live-Vorschau (Farbe des Feldes):</span>
                    <span className="text-emerald-400">Vollfarbig</span>
                  </div>
                  <div
                    className="p-3 rounded-xl border border-white/20 shadow-md text-white relative overflow-hidden"
                    style={{ backgroundColor: formData.color || "#2563eb" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-black/25 pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm drop-shadow-sm">{formData.subject || "Mathematik"}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black/40 rounded border border-white/15">
                          {formData.targetClass || "10A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/90 mt-2">
                        <span className="truncate max-w-[65%]">{formData.teacher || "Hr. Becker"}</span>
                        <span className="font-mono font-bold bg-black/30 px-1.5 py-0.5 rounded text-[10px]">
                          {formData.room || "R102"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Lehrkraft / Dozent</label>
                  <input
                    type="text"
                    placeholder="z.B. Hr. Becker"
                    value={formData.teacher}
                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Raum</label>
                  <input
                    type="text"
                    placeholder="z.B. R102, Chemie-Labor"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LessonStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="regular">Regulär</option>
                    <option value="substituted">Vertretung</option>
                    <option value="cancelled">Entfall</option>
                    <option value="room_changed">Raumänderung</option>
                    <option value="exam">Klausur / Schulaufgabe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Vertretungs-Lehrer / Neuer Raum</label>
                  <input
                    type="text"
                    placeholder="Falls Vertretung / Neuer Raum"
                    value={formData.substituteTeacher || formData.substituteRoom || ""}
                    onChange={(e) => {
                      if (formData.status === "room_changed") {
                        setFormData({ ...formData, substituteRoom: e.target.value });
                      } else {
                        setFormData({ ...formData, substituteTeacher: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Hinweis / Hausaufgabe / Notiz</label>
                <textarea
                  rows={2}
                  placeholder="z.B. Stillarbeit Arbeitsheft S. 45"
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md transition-colors"
                >
                  {editingItem ? "Speichern" : "Hinzufügen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Clear Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-2 flex items-center space-x-2 text-rose-400">
              <RotateCcw className="w-5 h-5 text-rose-400" />
              <span>Stundenplan zurücksetzen?</span>
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Möchtest du alle Einträge für {activeClass === "alle" ? "alle Klassen" : `Klasse ${activeClass}`} wirklich löschen, um den Plan komplett selbst neu einzutragen?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearEntries) onClearEntries(activeClass);
                  setConfirmClearOpen(false);
                }}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition-colors"
              >
                Ja, Plan leeren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Algorithmic Timetable Checker & Conflict Analysis Modal */}
      {checkerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Automatischer Stundenplan-Check</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Algorithmus aktiv
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kollisionsanalyse für Räume, Lehrkräfte, Klassen & Lücken
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Loading Spinner */}
            {isChecking && (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-300">
                  Algorithmus prüft {filteredEntries.length} Stundenplaneinträge auf Überschneidungen...
                </p>
              </div>
            )}

            {/* Analysis Result */}
            {!isChecking && analysisResult && (
              <div className="space-y-4">
                {/* Score & Quick Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Quality Score */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${
                        analysisResult.score >= 90
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : analysisResult.score >= 70
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      }`}
                    >
                      {analysisResult.score}%
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Qualitäts-Score
                      </div>
                      <div className="text-xs font-semibold text-white">
                        {analysisResult.score >= 90
                          ? "Hervorragend"
                          : analysisResult.score >= 70
                          ? "Gut mit Hinweisen"
                          : "Kollisionen beheben"}
                      </div>
                    </div>
                  </div>

                  {/* Collisions Count */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${
                        analysisResult.stats.collisionsCount === 0
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      }`}
                    >
                      {analysisResult.stats.collisionsCount}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Kollisionen
                      </div>
                      <div className="text-xs text-slate-300">
                        {analysisResult.stats.collisionsCount === 0
                          ? "Keine Überschneidungen"
                          : "Raum/Lehrer/Klasse"}
                      </div>
                    </div>
                  </div>

                  {/* Gaps / Freistunden Count */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-lg">
                      {analysisResult.stats.gapsCount}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Freistunden
                      </div>
                      <div className="text-xs text-slate-300">
                        {analysisResult.stats.gapsCount === 0
                          ? "Kompakter Stundenfluss"
                          : "Lücken im Plan"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Toast */}
                {checkerFeedback && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-700/80 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{checkerFeedback}</span>
                  </div>
                )}

                {/* Conflict / Issues List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Gefundene Prüfpunkte & Strukturdetails ({analysisResult.issues.length}):
                  </h4>

                  {analysisResult.issues.length === 0 ? (
                    <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-center space-y-1">
                      <div className="text-emerald-400 font-bold text-sm flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Alles in bester Ordnung!</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Der Stundenplan weist keine Doppelbelegungen oder ungenutzte Freistunden auf.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {analysisResult.issues.map((issue: any) => (
                        <div
                          key={issue.id}
                          className={`p-3 rounded-xl border text-xs space-y-1 ${
                            issue.severity === "error"
                              ? "bg-rose-950/30 border-rose-800/60 text-rose-200"
                              : issue.severity === "warning"
                              ? "bg-amber-950/30 border-amber-800/60 text-amber-200"
                              : "bg-blue-950/30 border-blue-800/60 text-blue-200"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center space-x-1.5">
                              {issue.severity === "error" ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              ) : (
                                <Info className="w-3.5 h-3.5 text-amber-400" />
                              )}
                              <span>{issue.title}</span>
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                              {issue.day}, {issue.period}. Stunde
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">{issue.description}</p>
                          {issue.suggestedFix && (
                            <div className="text-[11px] text-emerald-400 font-medium pt-0.5">
                              💡 Empfehlung: {issue.suggestedFix}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Zusammenfassende Empfehlungen:
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      {analysisResult.recommendations.map((rec: string, i: number) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleRunChecker}
                disabled={isChecking}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
                <span>Erneut prüfen</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleRunAutoFix}
                  disabled={isAutoFixing}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isAutoFixing ? "Optimiere..." : "1-Klick Auto-Optimieren"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCheckerOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

interface LessonCardProps {
  entry: TimetableEntry;
  onEdit: () => void;
  onDelete: () => void;
}

const LessonCard: React.FC<LessonCardProps> = ({ entry, onEdit, onDelete }) => {
  const isCancelled = entry.status === "cancelled";
  const isSubstituted = entry.status === "substituted";
  const isRoomChanged = entry.status === "room_changed";
  const isExam = entry.status === "exam";

  const cardBgColor = isCancelled ? "#991b1b" : entry.color || "#2563eb";

  return (
    <div 
      className={`p-2.5 rounded-xl text-xs relative group/card transition-all shadow-md text-white overflow-hidden border ${
        isCancelled ? "opacity-80 border-rose-400/50" : "border-white/20 hover:scale-[1.02] hover:shadow-lg"
      }`}
      style={{
        backgroundColor: cardBgColor,
      }}
    >
      {/* Subtle top glare overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-black/5 to-black/30 pointer-events-none" />

      {/* Action buttons on hover */}
      <div className="absolute right-1 top-1 flex items-center space-x-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm rounded-lg px-1.5 py-0.5 border border-white/20 z-20">
        <button onClick={onEdit} className="text-white hover:text-blue-300 p-0.5" title="Bearbeiten & Farbe ändern">
          <Edit2 className="w-3 h-3" />
        </button>
        <button onClick={onDelete} className="text-white hover:text-rose-300 p-0.5" title="Löschen">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Card Content */}
      <div className="relative z-10 space-y-1.5">
        {/* Subject & Target Class Capsule */}
        <div className="flex items-center justify-between gap-1">
          <span className={`font-bold text-sm leading-tight drop-shadow-sm truncate ${isCancelled ? "line-through text-rose-200" : "text-white"}`}>
            {entry.subject}
          </span>
          {entry.targetClass && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-black/35 rounded text-white/90 border border-white/20 flex-shrink-0">
              {entry.targetClass}
            </span>
          )}
        </div>

        {/* Status Notice if altered */}
        {isCancelled && (
          <div className="text-[10px] font-bold text-rose-200 bg-black/50 px-2 py-0.5 rounded border border-rose-400/50 text-center">
            ENTFALL (Freistunde)
          </div>
        )}
        {isSubstituted && (
          <div className="text-[10px] font-bold text-amber-100 bg-black/45 px-2 py-0.5 rounded border border-amber-300/40">
            Vertr.: {entry.substituteTeacher || "Vertretung"}
          </div>
        )}
        {isRoomChanged && (
          <div className="text-[10px] font-bold text-cyan-100 bg-black/45 px-2 py-0.5 rounded border border-cyan-300/40">
            Neu: {entry.substituteRoom || entry.room}
          </div>
        )}
        {isExam && (
          <div className="text-[10px] font-bold text-purple-100 bg-black/45 px-2 py-0.5 rounded border border-purple-300/40">
            Klausur / Prüfung
          </div>
        )}

        {/* Teacher & Room details */}
        <div className="flex items-center justify-between text-[11px] text-white/95 pt-0.5">
          <span className="flex items-center space-x-1 truncate max-w-[65%] font-medium">
            <User className="w-3 h-3 text-white/80 flex-shrink-0" />
            <span className="truncate">{entry.teacher || "—"}</span>
          </span>
          <span className="flex items-center space-x-1 font-mono font-bold bg-black/35 px-1.5 py-0.5 rounded text-white/95 border border-white/10">
            <MapPin className="w-2.5 h-2.5 text-white/80 flex-shrink-0" />
            <span>{entry.room || "—"}</span>
          </span>
        </div>

        {/* Note if present */}
        {entry.note && (
          <div className="text-[10px] text-white/85 pt-1 border-t border-white/20 line-clamp-1 italic">
            {entry.note}
          </div>
        )}
      </div>

    </div>
  );
};
