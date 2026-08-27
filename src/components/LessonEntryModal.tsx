import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Check, 
  MapPin, 
  User, 
  Palette, 
  Clock, 
  Calendar, 
  Sparkles, 
  AlertCircle,
  BookOpen,
  Layers,
  FileText,
  CheckCheck
} from "lucide-react";
import { TimetableEntry, DayOfWeek, LessonStatus, DevicePlatform } from "../types";
import { PERIOD_TIMES, DAYS } from "../utils";

export const DEFAULT_SUBJECT_PRESETS = [
  { name: "Mathematik", short: "Mathe", color: "#2563eb", icon: "📐" },
  { name: "Deutsch", short: "Deutsch", color: "#dc2626", icon: "📖" },
  { name: "Englisch", short: "Englisch", color: "#7c3aed", icon: "🇬🇧" },
  { name: "Biologie", short: "Bio", color: "#16a34a", icon: "🧬" },
  { name: "Chemie", short: "Chemie", color: "#059669", icon: "🧪" },
  { name: "Physik", short: "Physik", color: "#0891b2", icon: "⚡" },
  { name: "Geschichte", short: "Geschichte", color: "#d97706", icon: "📜" },
  { name: "Erdkunde / Geographie", short: "Erdkunde", color: "#ca8a04", icon: "🌍" },
  { name: "Sport", short: "Sport", color: "#ea580c", icon: "⚽" },
  { name: "Kunst", short: "Kunst", color: "#e11d48", icon: "🎨" },
  { name: "Musik", short: "Musik", color: "#9333ea", icon: "🎵" },
  { name: "Informatik", short: "Informatik", color: "#475569", icon: "💻" },
  { name: "Religion / Ethik", short: "Ethik/Rel", color: "#4f46e5", icon: "🕊️" },
  { name: "Wirtschaft / PoWi", short: "WiPo", color: "#0d9488", icon: "💼" },
  { name: "Französisch", short: "Französisch", color: "#3b82f6", icon: "🇫🇷" },
  { name: "Spanisch", short: "Spanisch", color: "#f59e0b", icon: "🇪🇸" },
  { name: "Latein", short: "Latein", color: "#854d0e", icon: "🏛️" },
];

export const COLOR_PALETTE = [
  { name: "Blau", color: "#2563eb" },
  { name: "Cyan", color: "#0891b2" },
  { name: "Smaragd", color: "#059669" },
  { name: "Grün", color: "#16a34a" },
  { name: "Gelb", color: "#ca8a04" },
  { name: "Bernstein", color: "#d97706" },
  { name: "Orange", color: "#ea580c" },
  { name: "Rot", color: "#dc2626" },
  { name: "Pink", color: "#e11d48" },
  { name: "Lila", color: "#7c3aed" },
  { name: "Indigo", color: "#4f46e5" },
  { name: "Dunkelgrau", color: "#475569" },
];

interface LessonEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: TimetableEntry | null;
  initialDay?: DayOfWeek;
  initialPeriod?: number;
  activeClass: string;
  allClasses: string[];
  availableSubjects: Array<{ name: string; color: string; teacher?: string; room?: string }>;
  existingEntries: TimetableEntry[];
  onSave: (entriesData: Partial<TimetableEntry>[], isDoubleLesson?: boolean) => void;
  devicePlatform?: DevicePlatform;
}

export const LessonEntryModal: React.FC<LessonEntryModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  initialDay = "Mo",
  initialPeriod = 1,
  activeClass,
  allClasses,
  availableSubjects,
  existingEntries,
  onSave,
  devicePlatform = "pc",
}) => {
  const isMobile = devicePlatform === "apple" || devicePlatform === "android";

  // Active form view tab: "quick" (einfach) vs "advanced" (erweitert)
  const [activeTab, setActiveTab] = useState<"quick" | "advanced">("quick");
  
  // Double lesson toggle
  const [isDoubleLesson, setIsDoubleLesson] = useState(false);

  // Multi-day selection (for new entries, users can select multiple days or whole week)
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([initialDay]);

  // Form State
  const [formData, setFormData] = useState<Partial<TimetableEntry>>({
    day: initialDay,
    period: initialPeriod,
    time: PERIOD_TIMES.find((p) => p.period === initialPeriod)?.time || "08:00 - 08:45",
    subject: "",
    teacher: "",
    room: "",
    targetClass: activeClass === "alle" ? (allClasses[0] || "") : activeClass,
    status: "regular",
    color: "#2563eb",
    note: "",
    substituteTeacher: "",
    substituteRoom: "",
  });

  // Keep state in sync with editingItem or initial params when modal opens
  useEffect(() => {
    if (editingItem) {
      setFormData({
        ...editingItem,
        color: editingItem.color || "#2563eb",
      });
      setSelectedDays([editingItem.day]);
      setIsDoubleLesson(false);
    } else {
      const periodObj = PERIOD_TIMES.find((p) => p.period === initialPeriod);
      setFormData({
        day: initialDay,
        period: initialPeriod,
        time: periodObj ? periodObj.time : "08:00 - 08:45",
        subject: "",
        teacher: "",
        room: "",
        targetClass: activeClass === "alle" ? (allClasses[0] || "") : activeClass,
        status: "regular",
        color: "#2563eb",
        note: "",
        substituteTeacher: "",
        substituteRoom: "",
      });
      setSelectedDays([initialDay]);
      setIsDoubleLesson(false);
    }
    setActiveTab("quick");
  }, [isOpen, editingItem, initialDay, initialPeriod, activeClass, allClasses]);

  // Collect previous teachers and rooms for 1-tap chip autofill
  const knownTeachers = useMemo(() => {
    const set = new Set<string>();
    existingEntries.forEach((e) => { if (e.teacher?.trim()) set.add(e.teacher.trim()); });
    availableSubjects.forEach((s) => { if (s.teacher?.trim()) set.add(s.teacher.trim()); });
    return Array.from(set).slice(0, 6);
  }, [existingEntries, availableSubjects]);

  const knownRooms = useMemo(() => {
    const set = new Set<string>();
    existingEntries.forEach((e) => { if (e.room?.trim()) set.add(e.room.trim()); });
    availableSubjects.forEach((s) => { if (s.room?.trim()) set.add(s.room.trim()); });
    return Array.from(set).slice(0, 6);
  }, [existingEntries, availableSubjects]);

  if (!isOpen) return null;

  const handleSelectSubjectPreset = (presetName: string, presetColor: string) => {
    const existing = availableSubjects.find((s) => s.name.toLowerCase() === presetName.toLowerCase()) ||
      existingEntries.find((e) => e.subject.toLowerCase() === presetName.toLowerCase());

    setFormData((prev) => ({
      ...prev,
      subject: presetName,
      color: presetColor,
      teacher: prev.teacher || existing?.teacher || "",
      room: prev.room || existing?.room || "",
    }));
  };

  const handlePeriodChange = (periodNum: number) => {
    const periodObj = PERIOD_TIMES.find((p) => p.period === periodNum);
    setFormData((prev) => ({
      ...prev,
      period: periodNum,
      time: periodObj ? periodObj.time : prev.time,
    }));
  };

  const toggleDaySelection = (dayKey: DayOfWeek) => {
    if (editingItem) {
      setSelectedDays([dayKey]);
      setFormData((prev) => ({ ...prev, day: dayKey }));
      return;
    }

    if (selectedDays.includes(dayKey)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayKey));
      }
    } else {
      setSelectedDays([...selectedDays, dayKey]);
    }
  };

  const selectAllWeekDays = () => {
    setSelectedDays(["Mo", "Di", "Mi", "Do", "Fr"]);
  };

  const selectOnlyCurrentDay = (dayKey: DayOfWeek) => {
    setSelectedDays([dayKey]);
    setFormData((prev) => ({ ...prev, day: dayKey }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject?.trim()) {
      alert("Bitte gib ein Schulfach an oder wähle eines aus.");
      return;
    }

    if (editingItem) {
      onSave([{ ...formData, day: selectedDays[0] || formData.day || "Mo" }], isDoubleLesson);
    } else {
      // Build an entry payload for each selected day
      const entriesToCreate: Partial<TimetableEntry>[] = selectedDays.map((d) => ({
        ...formData,
        day: d,
      }));
      onSave(entriesToCreate, isDoubleLesson);
    }
    onClose();
  };

  const isAllWeekSelected = selectedDays.length === 5;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      
      {/* Modal / Bottom Sheet Box */}
      <div 
        className={`w-full max-w-lg bg-slate-900 border border-slate-750 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] transition-all ${
          isMobile ? "rounded-t-3xl border-b-0" : "rounded-3xl"
        }`}
      >
        {/* Mobile Pull-Down Bar Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center bg-slate-900">
          <div className="w-12 h-1.5 rounded-full bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm text-white font-bold text-xs"
              style={{ backgroundColor: formData.color || "#2563eb" }}
            >
              {formData.period || 1}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {editingItem ? "Stunde bearbeiten" : "Neue Stunde(n) eintragen"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {selectedDays.length === 1 ? (
                  <>
                    {DAYS.find((d) => d.key === selectedDays[0])?.full || "Montag"} • {formData.period}. Stunde ({formData.time})
                  </>
                ) : selectedDays.length === 5 ? (
                  <>
                    <strong className="text-blue-400">Ganze Woche (Mo-Fr)</strong> • {formData.period}. Stunde ({formData.time})
                  </>
                ) : (
                  <>
                    {selectedDays.join(", ")} ({selectedDays.length} Tage) • {formData.period}. Stunde
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: Schnelleintrag vs Erweitert */}
        <div className="px-5 pt-3 pb-1 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <div className="grid grid-cols-2 gap-1.5 w-full bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("quick")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === "quick"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Schnelleintrag</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("advanced")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === "advanced"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>⚙️ Erweitert / Status</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form id="lesson-form" onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
          
          {/* TAB 1: Schnelleintrag / Basis-Angaben */}
          {activeTab === "quick" && (
            <div className="space-y-4">
              
              {/* 1. FACH AUSWAHL (1-Tap Quick-Chips & Textfeld) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Schulfach *</span>
                  </label>
                  <span className="text-[10px] text-blue-400 font-medium">1-Klick Auswahl</span>
                </div>

                {/* Direct Text Input for Custom Subject */}
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Fachname eintippen (z.B. Physik, Informatik)..."
                    value={formData.subject || ""}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                  {formData.subject && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, subject: "" })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Beliebte Schulfächer Chips (Touch-optimiert) */}
                <div className="pt-1">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                    Häufige Fächer (antippen zum Auswählen):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {/* User's existing subjects first */}
                    {availableSubjects.map((s) => {
                      const isSelected = (formData.subject || "").toLowerCase() === s.name.toLowerCase();
                      return (
                        <button
                          key={`user-${s.name}`}
                          type="button"
                          onClick={() => handleSelectSubjectPreset(s.name, s.color)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-400 shadow-md scale-105"
                              : "bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                          {s.room && <span className="text-[10px] opacity-70 font-mono">({s.room})</span>}
                        </button>
                      );
                    })}

                    {/* Standard School Subject Presets */}
                    {DEFAULT_SUBJECT_PRESETS.filter(
                      (p) => !availableSubjects.some((as) => as.name.toLowerCase() === p.name.toLowerCase())
                    ).map((preset) => {
                      const isSelected = (formData.subject || "").toLowerCase() === preset.name.toLowerCase();
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleSelectSubjectPreset(preset.name, preset.color)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-400 shadow-md font-bold scale-105"
                              : "bg-slate-950/80 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. WOCHENTAG & MEHRERE TAGE (GANZE WOCHE / EINZELNE TAGE) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>{editingItem ? "Wochentag" : "Wochentag(e) auswählen"}</span>
                    </label>
                    
                    {!editingItem && (
                      <span className="text-[11px] font-bold text-blue-400">
                        {isAllWeekSelected ? "✓ Ganze Woche" : `${selectedDays.length} Tag(e)`}
                      </span>
                    )}
                  </div>

                  {/* Day Buttons with Multi-Select capability */}
                  <div className="grid grid-cols-5 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    {DAYS.map((d) => {
                      const isSelected = selectedDays.includes(d.key);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleDaySelection(d.key)}
                          className={`py-2 text-xs rounded-xl font-bold transition-all relative ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-md scale-[1.02]"
                              : "text-slate-400 hover:text-slate-200 bg-slate-900/50"
                          }`}
                        >
                          {isSelected && !editingItem && selectedDays.length > 1 && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                          )}
                          <div>{d.key}</div>
                          <div className="text-[9px] opacity-75 font-normal">{d.full.slice(0, 2)}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Preset Buttons for Multi-Day Scheduling */}
                  {!editingItem && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      <button
                        type="button"
                        onClick={selectAllWeekDays}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1 ${
                          isAllWeekSelected
                            ? "bg-blue-600/30 text-blue-300 border-blue-500"
                            : "bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800"
                        }`}
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>⚡ Ganze Woche (Mo-Fr)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDays(["Mo", "Mi", "Fr"])}
                        className="text-[11px] px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                      >
                        Mo / Mi / Fr
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDays(["Di", "Do"])}
                        className="text-[11px] px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                      >
                        Di / Do
                      </button>

                      <button
                        type="button"
                        onClick={() => selectOnlyCurrentDay((initialDay as DayOfWeek) || "Mo")}
                        className="text-[11px] px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 ml-auto"
                      >
                        Nur {initialDay}
                      </button>
                    </div>
                  )}

                  {/* Multi-day summary notice */}
                  {!editingItem && selectedDays.length > 1 && (
                    <div className="mt-2 p-2 rounded-xl bg-blue-950/40 border border-blue-800/50 flex items-center justify-between text-xs text-blue-300">
                      <span>Wird für <strong>{selectedDays.length} Tage</strong> eingetragen: {selectedDays.join(", ")}</span>
                    </div>
                  )}
                </div>

                {/* Stunde Segmented Grid */}
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Stunde & Uhrzeit</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PERIOD_TIMES.map((pt) => {
                      const isSelected = formData.period === pt.period;
                      return (
                        <button
                          key={pt.period}
                          type="button"
                          onClick={() => handlePeriodChange(pt.period)}
                          className={`p-2 rounded-xl text-center border transition-all ${
                            isSelected
                              ? "bg-blue-600 border-blue-400 text-white shadow-md font-bold scale-[1.02]"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="text-xs font-black">{pt.period}. Std</div>
                          <div className="text-[9px] font-mono opacity-75 truncate">{pt.time.split(" - ")[0]}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Doppelstunde Option */}
                  {!editingItem && (
                    <label className="flex items-center space-x-2.5 mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={isDoubleLesson}
                        onChange={(e) => setIsDoubleLesson(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-white">Doppelstunde anlegen</span>
                        <span className="text-slate-400 text-[11px] block">
                          Trägt automatisch auch die {(formData.period || 1) + 1}. Stunde ein
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* 3. RAUM & LEHRKRAFT (Touch-Eingabe mit 1-Klick Vorschlägen) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Raum */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      <span>Raum</span>
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. R102, Turnhalle, Bio"
                      value={formData.room || ""}
                      onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:border-blue-500 focus:outline-none"
                    />
                    {knownRooms.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-1.5">
                        <span className="text-[9px] text-slate-500 font-medium">Oft:</span>
                        {knownRooms.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setFormData({ ...formData, room: r })}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-blue-500"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lehrkraft */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Lehrkraft</span>
                    </label>
                    <input
                      type="text"
                      placeholder="z.B. Hr. Becker, Schmidt"
                      value={formData.teacher || ""}
                      onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:border-blue-500 focus:outline-none"
                    />
                    {knownTeachers.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-1.5">
                        <span className="text-[9px] text-slate-500 font-medium">Oft:</span>
                        {knownTeachers.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setFormData({ ...formData, teacher: t })}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-blue-500"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* 4. FARBWAHL (Grosse Farbtupfer) */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-400" />
                  <span>Farbe für das Fach</span>
                </label>
                <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {COLOR_PALETTE.map((p) => {
                    const isSelected = (formData.color || "").toLowerCase() === p.color.toLowerCase();
                    return (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: p.color })}
                        title={p.name}
                        className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                          isSelected
                            ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md"
                            : "hover:scale-110 opacity-85 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: p.color }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                  <div className="flex items-center space-x-1 pl-2 border-l border-slate-800 ml-1">
                    <input
                      type="color"
                      value={formData.color || "#2563eb"}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border border-slate-700 p-0.5"
                      title="Eigene Farbe wählen"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: Erweitert / Vertretung / Notiz / Klasse */}
          {activeTab === "advanced" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Status */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Unterrichts-Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "regular", label: "Regulär", desc: "Normaler Unterricht" },
                    { id: "substituted", label: "Vertretung", desc: "Andere Lehrkraft" },
                    { id: "cancelled", label: "Entfall", desc: "Stunde fällt aus" },
                    { id: "room_changed", label: "Raumtausch", desc: "Neuer Raum" },
                    { id: "exam", label: "Klausur", desc: "Prüfung / Test" },
                  ].map((st) => {
                    const isSelected = formData.status === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: st.id as LessonStatus })}
                        className={`p-2.5 rounded-xl text-left border transition-all ${
                          isSelected
                            ? "bg-blue-600/20 border-blue-500 text-white font-bold"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="text-xs">{st.label}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{st.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Klasse / Kurs */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Klasse / Kurs (optional)
                </label>
                <input
                  type="text"
                  placeholder="z.B. 10A, 11B, LK Mathe (optional)"
                  value={formData.targetClass || ""}
                  onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Vertretungsdetails falls nicht regulär */}
              {formData.status !== "regular" && (
                <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 space-y-2">
                  <div className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Vertretungs- / Abweichungsdetails</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-0.5">Vertretungslehrer</label>
                      <input
                        type="text"
                        placeholder="z.B. Fr. Sommer"
                        value={formData.substituteTeacher || ""}
                        onChange={(e) => setFormData({ ...formData, substituteTeacher: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-0.5">Neuer Raum</label>
                      <input
                        type="text"
                        placeholder="z.B. Aula"
                        value={formData.substituteRoom || ""}
                        onChange={(e) => setFormData({ ...formData, substituteRoom: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notiz / Hausaufgabe */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Notiz / Hausaufgaben-Hinweis</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="z.B. Buch S. 45 Nr. 2 mitbringen, Taschenrechner nicht vergessen..."
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

            </div>
          )}

        </form>

        {/* Sticky Mobile-Friendly Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition-colors text-center"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            form="lesson-form"
            className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-transform active:scale-98"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {editingItem 
                ? "Änderungen speichern" 
                : selectedDays.length > 1
                ? `${selectedDays.length} Tage eintragen`
                : isDoubleLesson 
                ? "Doppelstunde speichern" 
                : "Stunde eintragen"}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
