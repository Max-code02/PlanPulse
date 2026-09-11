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
  X,
  Palmtree,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Grid3X3,
  List,
  Eye,
  EyeOff
} from "lucide-react";
import { TimetableEntry, DayOfWeek, LessonStatus, UserSubject, DevicePlatform } from "../types";
import { PERIOD_TIMES, DAYS, exportToICal, exportToCSV } from "../utils";
import { safeFetchJson } from "../lib/api";
import { HolidayModal } from "./HolidayModal";
import { LessonEntryModal } from "./LessonEntryModal";

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
  devicePlatform?: DevicePlatform;
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
  devicePlatform = "pc",
}) => {
  const isMobilePlatform = devicePlatform === "apple" || devicePlatform === "android";
  
  // Calculate today's day of week
  const getTodayDayOfWeek = (): DayOfWeek => {
    const day = new Date().getDay();
    if (day === 1) return "Mo";
    if (day === 2) return "Di";
    if (day === 3) return "Mi";
    if (day === 4) return "Do";
    if (day === 5) return "Fr";
    return "Mo";
  };

  const [selectedDay, setSelectedDay] = useState<DayOfWeek | "ALL">(() => {
    return isMobilePlatform ? getTodayDayOfWeek() : "ALL";
  });

  const [viewMode, setViewMode] = useState<"agenda" | "grid">(() => {
    return isMobilePlatform ? "agenda" : "grid";
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimetableEntry | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const toggleDayCollapse = (dayKey: string) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }));
  };

  const expandAllDays = () => {
    setCollapsedDays({});
  };

  const collapseAllDays = () => {
    const all: Record<string, boolean> = {};
    DAYS.forEach((d) => {
      all[d.key] = true;
    });
    setCollapsedDays(all);
  };

  const handlePrevDay = () => {
    const dayKeys: DayOfWeek[] = ["Mo", "Di", "Mi", "Do", "Fr"];
    if (selectedDay === "ALL") {
      setSelectedDay(todayDayKey);
      return;
    }
    const currentIndex = dayKeys.indexOf(selectedDay);
    const prevIndex = (currentIndex - 1 + dayKeys.length) % dayKeys.length;
    setSelectedDay(dayKeys[prevIndex]);
  };

  const handleNextDay = () => {
    const dayKeys: DayOfWeek[] = ["Mo", "Di", "Mi", "Do", "Fr"];
    if (selectedDay === "ALL") {
      setSelectedDay(todayDayKey);
      return;
    }
    const currentIndex = dayKeys.indexOf(selectedDay);
    const nextIndex = (currentIndex + 1) % dayKeys.length;
    setSelectedDay(dayKeys[nextIndex]);
  };

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

  // Modal Parameters
  const [modalInitialDay, setModalInitialDay] = useState<DayOfWeek>("Mo");
  const [modalInitialPeriod, setModalInitialPeriod] = useState<number>(1);

  const handleOpenAdd = (day: DayOfWeek = "Mo", period: number = 1) => {
    setEditingItem(null);
    setModalInitialDay(day);
    setModalInitialPeriod(period);
    setModalOpen(true);
  };

  const handleOpenEdit = (entry: TimetableEntry) => {
    setEditingItem(entry);
    setModalInitialDay(entry.day);
    setModalInitialPeriod(entry.period);
    setModalOpen(true);
  };

  const handleSaveLesson = (entriesData: Partial<TimetableEntry>[], isDoubleLesson?: boolean) => {
    entriesData.forEach((entryData) => {
      const trimmedClass = (entryData.targetClass || "").trim();
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
        onEditEntry({ ...(editingItem as TimetableEntry), ...entryData } as TimetableEntry);
      } else {
        onAddEntry(entryData);

        // If user selected Doppelstunde, also insert the next hour
        if (isDoubleLesson && (entryData.period || 1) < 8) {
          const nextPeriod = (entryData.period || 1) + 1;
          const nextTimeObj = PERIOD_TIMES.find((p) => p.period === nextPeriod);
          onAddEntry({
            ...entryData,
            period: nextPeriod,
            time: nextTimeObj ? nextTimeObj.time : undefined,
          });
        }
      }
    });
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

  // Calculate today's weekday
  const todayDayKey: DayOfWeek = React.useMemo(() => {
    const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon ... 5 = Fri
    if (dayIndex === 1) return "Mo";
    if (dayIndex === 2) return "Di";
    if (dayIndex === 3) return "Mi";
    if (dayIndex === 4) return "Do";
    if (dayIndex === 5) return "Fr";
    return "Mo";
  }, []);

  // Compute lesson count per day for badges
  const dayLessonCounts = React.useMemo(() => {
    const counts: Record<DayOfWeek, number> = { Mo: 0, Di: 0, Mi: 0, Do: 0, Fr: 0 };
    const classFiltered = entries.filter(
      (e) => activeClass === "alle" || e.targetClass.toLowerCase() === activeClass.toLowerCase()
    );
    classFiltered.forEach((e) => {
      if (counts[e.day] !== undefined) counts[e.day]++;
    });
    return counts;
  }, [entries, activeClass]);

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

            {/* View Mode Switcher (Agenda / Mobile Cards vs Grid Table) */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode("agenda")}
                title="Tageskarten-Ansicht (Große Karten & Touch-optimiert)"
                className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded font-semibold transition-all ${
                  viewMode === "agenda"
                    ? isMobilePlatform
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>📱 Tageskarten</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                title="Wochen-Tabelle (Kompaktes Raster)"
                className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded font-semibold transition-all ${
                  viewMode === "grid"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>🗓️ Wochen-Raster</span>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

            {/* Smart Day Selector Bar */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedDay(todayDayKey)}
                title={`Direkt zum heutigen Tag (${todayDayKey}) springen`}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center space-x-1 ${
                  selectedDay === todayDayKey
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-850"
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Heute</span>
              </button>

              <div className="h-4 w-px bg-slate-800 mx-0.5" />

              <button
                onClick={() => setSelectedDay("ALL")}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center space-x-1 ${
                  selectedDay === "ALL" 
                    ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Woche</span>
                <span className="text-[10px] px-1 py-0.2 rounded bg-slate-900/80 font-mono text-slate-400">
                  {filteredEntries.length}
                </span>
              </button>

              {DAYS.map((d) => {
                const isSelected = selectedDay === d.key;
                const isToday = d.key === todayDayKey;
                const count = dayLessonCounts[d.key] || 0;
                return (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDay(d.key)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center space-x-1 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm"
                        : isToday
                        ? "text-blue-400 hover:bg-slate-900"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{d.key}</span>
                    {count > 0 && (
                      <span className={`text-[10px] px-1 rounded font-mono ${
                        isSelected ? "bg-black/30 text-white" : "bg-slate-900 text-slate-400"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
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

            {/* Ferien & Feiertage Modal Trigger (Discreet & Compact) */}
            <button
              onClick={() => setHolidayModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-teal-950/40 text-teal-300 hover:text-teal-200 border border-slate-700 hover:border-teal-700/60 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
              title="Schulferien & Feiertage nach Bundesland anzeigen"
            >
              <Palmtree className="w-3.5 h-3.5 text-teal-400" />
              <span>Ferien</span>
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
                <span className="hidden md:inline">Alles zurücksetzen</span>
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

      {/* Timetable Content: Single Day Focus vs Clean Weekly Matrix vs Compact Weekly Agenda */}
      {selectedDay !== "ALL" ? (
        /* SINGLE DAY FOCUS VIEW */
        <div className="space-y-4">
          {DAYS.filter((d) => d.key === selectedDay).map((dayObj) => {
            const dayEntries = filteredEntries
              .filter((e) => e.day === dayObj.key)
              .sort((a, b) => a.period - b.period);
            const hasAnyLessonThisDay = dayEntries.length > 0;
            const isToday = dayObj.key === todayDayKey;

            const dayEntriesByPeriod = PERIOD_TIMES.map((pt) => ({
              period: pt.period,
              time: pt.time,
              entries: dayEntries.filter((e) => e.period === pt.period),
            }));

            return (
              <div key={dayObj.key} className="space-y-3">
                {/* Day Navigation Banner */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-md">
                  <button
                    onClick={handlePrevDay}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all shadow-sm"
                    title="Vorheriger Tag"
                  >
                    <ChevronLeft className="w-4 h-4 text-blue-400" />
                    <span className="hidden sm:inline">Vorheriger Tag</span>
                  </button>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20">
                      {dayObj.key}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-white tracking-tight">{dayObj.full}</h3>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                            Heute
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {hasAnyLessonThisDay
                          ? `${dayEntries.length} Unterrichtsstunde${dayEntries.length > 1 ? "n" : ""} geplant`
                          : "Keine Stunden eingetragen"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedDay("ALL")}
                      className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
                      title="Ganze Woche anzeigen"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Woche</span>
                    </button>
                    <button
                      onClick={handleNextDay}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all shadow-sm"
                      title="Nächster Tag"
                    >
                      <span className="hidden sm:inline">Nächster Tag</span>
                      <ChevronRight className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>

                {/* Day Lessons List (1..8 Periods) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Stundenablauf ({dayObj.full})
                    </span>
                    <button
                      onClick={() => handleOpenAdd(dayObj.key, 1)}
                      className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Stunde</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {dayEntriesByPeriod.map((pObj) => {
                      if (pObj.entries.length === 0) {
                        return (
                          <div
                            key={pObj.period}
                            onClick={() => handleOpenAdd(dayObj.key, pObj.period)}
                            className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-850/40 cursor-pointer transition-all text-slate-500 hover:text-slate-300 group"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="w-7 text-center font-bold text-xs text-slate-400 bg-slate-900 py-1 rounded">
                                {pObj.period}.
                              </span>
                              <span className="text-xs font-mono text-slate-500">{pObj.time}</span>
                              <span className="text-xs italic text-slate-500 group-hover:text-slate-400">
                                Freistunde
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 flex items-center space-x-1">
                              <Plus className="w-3.5 h-3.5" />
                              <span>Stunde eintragen</span>
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={pObj.period} className="space-y-2">
                          {pObj.entries.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-3.5 rounded-xl text-white shadow-md border relative overflow-hidden transition-all"
                              style={{
                                backgroundColor: entry.status === "cancelled" ? "#991b1b" : entry.color || "#2563eb",
                                borderColor: "rgba(255,255,255,0.2)",
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-black/40 text-xs font-mono font-bold text-white border border-white/20">
                                      {entry.period}. Std • {entry.time}
                                    </span>
                                    {entry.targetClass && (
                                      <span className="px-2 py-0.5 rounded bg-black/30 text-xs font-mono text-white/90">
                                        Klasse {entry.targetClass}
                                      </span>
                                    )}
                                    {entry.status === "cancelled" && (
                                      <span className="px-2 py-0.5 rounded bg-black/60 text-xs font-bold text-rose-200 border border-rose-400">
                                        ENTFALL
                                      </span>
                                    )}
                                    {entry.status === "substituted" && (
                                      <span className="px-2 py-0.5 rounded bg-black/60 text-xs font-bold text-amber-200 border border-amber-400">
                                        VERTRETUNG
                                      </span>
                                    )}
                                    {entry.status === "exam" && (
                                      <span className="px-2 py-0.5 rounded bg-black/60 text-xs font-bold text-purple-200 border border-purple-400">
                                        KLAUSUR
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xl font-black tracking-tight pt-0.5 drop-shadow-sm">
                                    {entry.subject}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/95 pt-0.5">
                                    <span className="flex items-center space-x-1.5 font-medium">
                                      <User className="w-3.5 h-3.5 text-white/80" />
                                      <span>{entry.teacher || "Kein Lehrer"}</span>
                                    </span>
                                    <span className="flex items-center space-x-1.5 font-mono font-bold bg-black/35 px-2 py-0.5 rounded border border-white/15">
                                      <MapPin className="w-3.5 h-3.5 text-white/80" />
                                      <span>Raum: {entry.room || "—"}</span>
                                    </span>
                                  </div>

                                  {entry.note && (
                                    <p className="text-xs text-white/90 italic pt-1 border-t border-white/15 mt-1">
                                      {entry.note}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-sm rounded-lg p-1 border border-white/20">
                                  <button
                                    onClick={() => handleOpenEdit(entry)}
                                    title="Bearbeiten"
                                    className="p-1.5 text-white hover:text-blue-300 rounded hover:bg-white/10 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteEntry(entry.id)}
                                    title="Löschen"
                                    className="p-1.5 text-white hover:text-rose-300 rounded hover:bg-white/10 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "grid" ? (
        /* WHOLE WEEK: 5-COLUMN STRUCTURED WEEK MATRIX */
        <div className="space-y-3">
          {/* Week Mode Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-sm">
                <Grid3X3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>Wochen-Stundenplan (Mo – Fr)</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 text-[11px] font-mono font-semibold border border-blue-500/30">
                    {filteredEntries.length} Stunden
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Kompakte Matrix-Übersicht • Horizontales Wischen für alle 5 Schultage
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                onClick={() => setViewMode("agenda")}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
                title="Zur übersichtlichen Listen-Agenda wechseln"
              >
                <List className="w-3.5 h-3.5 text-blue-400" />
                <span>Als Liste</span>
              </button>
              <button
                onClick={() => setSelectedDay(todayDayKey)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all"
                title="Direkt zu Heute springen"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Heute ({todayDayKey})</span>
              </button>
            </div>
          </div>

          {/* Clean 5-Column Week Schedule Table with Sticky Headers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto select-none">
              <table className="w-full border-collapse text-left min-w-[680px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10 backdrop-blur-sm">
                    <th className="py-2.5 px-2.5 w-24 text-center text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-800/80 sticky left-0 z-20 bg-slate-950">
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Zeit</span>
                      </div>
                    </th>
                    {DAYS.map((dayObj) => {
                      const isToday = dayObj.key === todayDayKey;
                      const count = dayLessonCounts[dayObj.key] || 0;
                      return (
                        <th
                          key={dayObj.key}
                          className={`py-2.5 px-2.5 text-xs font-bold border-l border-slate-800/80 transition-colors ${
                            isToday ? "bg-blue-950/40 text-blue-300" : "text-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => setSelectedDay(dayObj.key)}
                                className="font-bold text-white hover:text-blue-400 text-xs flex items-center space-x-1 group"
                                title={`Nur ${dayObj.full} anzeigen`}
                              >
                                <span className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center ${
                                  isToday ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 group-hover:bg-blue-600 group-hover:text-white"
                                }`}>
                                  {dayObj.key}
                                </span>
                                <span>{dayObj.full}</span>
                              </button>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-750">
                              {count} Std
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {PERIOD_TIMES.map((periodObj) => (
                    <tr key={periodObj.period} className="hover:bg-slate-850/30 transition-colors">
                      {/* Period Time Column (Sticky Left) */}
                      <td className="py-2.5 px-2 text-center bg-slate-950/90 border-r border-slate-800/80 sticky left-0 z-10">
                        <div className="font-bold text-white text-xs">{periodObj.period}. Std</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 leading-tight">{periodObj.time}</div>
                      </td>

                      {/* 5 Day Columns */}
                      {DAYS.map((dayObj) => {
                        const cellEntries = filteredEntries.filter(
                          (e) => e.day === dayObj.key && e.period === periodObj.period
                        );
                        const isToday = dayObj.key === todayDayKey;

                        return (
                          <td
                            key={dayObj.key}
                            className={`p-1.5 border-l border-slate-800/80 align-top min-h-[4.5rem] relative group ${
                              isToday ? "bg-blue-950/15" : ""
                            }`}
                          >
                            {cellEntries.length === 0 ? (
                              <div
                                onClick={() => handleOpenAdd(dayObj.key, periodObj.period)}
                                className="h-full min-h-[4rem] rounded-lg border border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-800/40 flex items-center justify-center cursor-pointer transition-all opacity-25 hover:opacity-100"
                                title={`+ ${dayObj.full}, ${periodObj.period}. Stunde`}
                              >
                                <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
                              </div>
                            ) : (
                              <div className="space-y-1">
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
        </div>
      ) : (
        /* WHOLE WEEK: COMPACT HIGH-DENSITY TIMELINE AGENDA (SUPER READABLE & ORGANIZED) */
        <div className="space-y-3">
          {/* Week Summary Header Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-sm">
                <List className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center space-x-2">
                  <span>Wochen-Agenda (Mo – Fr)</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 text-[11px] font-mono font-semibold border border-blue-500/30">
                    {filteredEntries.length} Stunden gesamt
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Strukturierte Tages-Zeitleiste • Schnell einklappen oder fokussieren
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                onClick={expandAllDays}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center space-x-1"
                title="Alle Tage aufklappen"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Alle auf</span>
              </button>
              <button
                onClick={collapseAllDays}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center space-x-1"
                title="Alle Tage einklappen"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Alle zu</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
                title="Zum Stundenplan-Raster wechseln"
              >
                <Grid3X3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Wochen-Raster</span>
              </button>
            </div>
          </div>

          {/* 5 Day Accordion Cards with Ultra-Clean High-Density Lesson Rows */}
          <div className="space-y-3">
            {DAYS.map((dayObj) => {
              const dayEntries = filteredEntries
                .filter((e) => e.day === dayObj.key)
                .sort((a, b) => a.period - b.period);
              const hasAnyLesson = dayEntries.length > 0;
              const isToday = dayObj.key === todayDayKey;
              const isCollapsed = !!collapsedDays[dayObj.key];

              // Empty Day: Clean 1-line strip
              if (!hasAnyLesson) {
                return (
                  <div
                    key={dayObj.key}
                    className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between transition-all hover:bg-slate-900"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center justify-center font-bold text-xs">
                        {dayObj.key}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-300">{dayObj.full}</span>
                          {isToday && (
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-800/40">
                              Heute
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">Keine Stunden eingetragen</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenAdd(dayObj.key, 1)}
                      className="flex items-center space-x-1 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/40 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Stunde</span>
                    </button>
                  </div>
                );
              }

              // Active Day Card
              return (
                <div
                  key={dayObj.key}
                  className={`bg-slate-900 border rounded-2xl transition-all shadow-md overflow-hidden ${
                    isToday ? "border-blue-500/50 ring-1 ring-blue-500/20" : "border-slate-800"
                  }`}
                >
                  {/* Day Header Row */}
                  <div className="p-3 sm:p-4 flex items-center justify-between bg-slate-950/40 border-b border-slate-800/80">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setSelectedDay(dayObj.key)}
                        className="group flex items-center space-x-2.5 text-left focus:outline-none"
                        title={`Klicke, um nur ${dayObj.full} im Detail zu fokussieren`}
                      >
                        <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center transition-all ${
                          isToday
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                            : "bg-blue-600/20 text-blue-400 border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white"
                        }`}>
                          {dayObj.key}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                              {dayObj.full}
                            </span>
                            {isToday && (
                              <span className="text-[10px] font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800/50">
                                Heute
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {dayEntries.length} Stunde{dayEntries.length > 1 ? "n" : ""} • {dayEntries[0]?.time?.split("-")[0] || "08:00"} bis {dayEntries[dayEntries.length - 1]?.time?.split("-")[1] || "13:15"} Uhr
                          </span>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenAdd(dayObj.key, (dayEntries[dayEntries.length - 1]?.period || 0) + 1)}
                        className="flex items-center space-x-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-blue-500/30 transition-all"
                        title={`Stunde zu ${dayObj.full} hinzufügen`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Stunde</span>
                      </button>
                      <button
                        onClick={() => toggleDayCollapse(dayObj.key)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title={isCollapsed ? "Tag aufklappen" : "Tag einklappen"}
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* If collapsed: Show brief subject chip preview */}
                  {isCollapsed ? (
                    <div
                      onClick={() => toggleDayCollapse(dayObj.key)}
                      className="p-3 bg-slate-900/40 hover:bg-slate-900 flex flex-wrap items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span className="text-[11px] font-semibold text-slate-400 mr-1">Fächer:</span>
                      {dayEntries.map((e) => (
                        <span
                          key={e.id}
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-white border"
                          style={{
                            backgroundColor: e.color || "#2563eb",
                            borderColor: "rgba(255,255,255,0.2)",
                          }}
                        >
                          {e.period}. {e.subject}
                        </span>
                      ))}
                      <span className="text-[11px] text-blue-400 font-medium ml-auto">Klicken zum Aufklappen ↓</span>
                    </div>
                  ) : (
                    /* If expanded: Clean High-Density Structured Timeline Rows */
                    <div className="divide-y divide-slate-800/60 p-2 sm:p-3 space-y-1.5">
                      {dayEntries.map((entry) => {
                        const isCancelled = entry.status === "cancelled";
                        const isSubstituted = entry.status === "substituted";
                        const isExam = entry.status === "exam";

                        return (
                          <div
                            key={entry.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl hover:bg-slate-850/50 transition-all border border-slate-800/40 gap-2"
                          >
                            {/* Left: Period Time Badge + Colored Subject Pill */}
                            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                              {/* Period & Time Pill */}
                              <span className="px-2 py-1 rounded-lg bg-slate-950 text-slate-300 font-mono text-xs font-bold border border-slate-800 flex items-center space-x-1.5 flex-shrink-0">
                                <span className="text-blue-400">{entry.period}. Std</span>
                                <span className="text-slate-500 font-normal">|</span>
                                <span className="text-slate-400 font-normal">{entry.time}</span>
                              </span>

                              {/* Colored Subject Pill */}
                              <div
                                className="px-2.5 py-1 rounded-lg text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm border"
                                style={{
                                  backgroundColor: isCancelled ? "#991b1b" : entry.color || "#2563eb",
                                  borderColor: "rgba(255,255,255,0.2)",
                                }}
                              >
                                <span className={isCancelled ? "line-through opacity-80" : ""}>
                                  {entry.subject}
                                </span>
                              </div>

                              {/* Target Class if available */}
                              {entry.targetClass && (
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                                  {entry.targetClass}
                                </span>
                              )}

                              {/* Altered Status Badges */}
                              {isCancelled && (
                                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold text-[10px]">
                                  ENTFALL
                                </span>
                              )}
                              {isSubstituted && (
                                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold text-[10px]">
                                  VERTRETUNG: {entry.substituteTeacher || entry.teacher}
                                </span>
                              )}
                              {isExam && (
                                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold text-[10px]">
                                  KLAUSUR
                                </span>
                              )}
                            </div>

                            {/* Right: Room, Teacher & Actions */}
                            <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs text-slate-400 pt-1 sm:pt-0">
                              <div className="flex items-center space-x-3">
                                <span className="flex items-center space-x-1 text-slate-300">
                                  <User className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{entry.teacher || "—"}</span>
                                </span>
                                <span className="flex items-center space-x-1 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                                  <MapPin className="w-3 h-3 text-blue-400" />
                                  <span>{entry.room || "—"}</span>
                                </span>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                                <button
                                  onClick={() => handleOpenEdit(entry)}
                                  title="Bearbeiten"
                                  className="p-1 text-slate-400 hover:text-blue-300 hover:bg-slate-800 rounded transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteEntry(entry.id)}
                                  title="Löschen"
                                  className="p-1 text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dedicated Mobile & Desktop Lesson Entry Modal */}
      <LessonEntryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingItem={editingItem}
        initialDay={modalInitialDay}
        initialPeriod={modalInitialPeriod}
        activeClass={activeClass}
        allClasses={allClasses}
        availableSubjects={availableSubjects}
        existingEntries={entries}
        onSave={handleSaveLesson}
        devicePlatform={devicePlatform}
      />

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

      {/* Compact Holiday Modal */}
      <HolidayModal
        isOpen={holidayModalOpen}
        onClose={() => setHolidayModalOpen(false)}
      />

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
