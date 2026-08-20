import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Trash2,
  CheckSquare,
  AlertCircle,
  Tag,
  Filter,
  ListTodo,
  Layers,
  GraduationCap,
  FileSpreadsheet,
  Presentation,
  Flame,
  Check
} from "lucide-react";
import { HomeworkItem, TimetableEntry, TaskCategory } from "../types";
import { safeFetchJson } from "../lib/api";

interface HomeworkPlannerProps {
  entries: TimetableEntry[];
  activeClass: string;
}

const CATEGORY_CONFIG: Record<
  TaskCategory,
  { label: string; icon: any; colorBadge: string; defaultPriority: "low" | "medium" | "high" }
> = {
  homework: {
    label: "Hausaufgabe",
    icon: BookOpen,
    colorBadge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    defaultPriority: "medium",
  },
  exam: {
    label: "Schulaufgabe / Klausur",
    icon: GraduationCap,
    colorBadge: "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold",
    defaultPriority: "high",
  },
  short_test: {
    label: "Stegreifaufgabe / Ex / Test",
    icon: AlertCircle,
    colorBadge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    defaultPriority: "high",
  },
  presentation: {
    label: "Referat / GFS / Präsentation",
    icon: Presentation,
    colorBadge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    defaultPriority: "medium",
  },
  project: {
    label: "Projekt / Ausarbeitung",
    icon: FileSpreadsheet,
    colorBadge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    defaultPriority: "medium",
  },
  other: {
    label: "Sonstige Aufgabe",
    icon: Tag,
    colorBadge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    defaultPriority: "low",
  },
};

export const HomeworkPlanner: React.FC<HomeworkPlannerProps> = ({
  entries,
  activeClass,
}) => {
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [savedSubjects, setSavedSubjects] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "DONE">("ALL");

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    title: "",
    description: "",
    dueDate: "Morgen",
    category: "homework" as TaskCategory,
    targetClass: activeClass === "alle" ? "" : activeClass,
    priority: "medium" as "low" | "medium" | "high",
  });

  // Extract unique subjects from actual user-defined subjects, timetable, and homework items ONLY
  const allKnownSubjects = React.useMemo(() => {
    const list = new Set<string>();
    savedSubjects.forEach((s) => {
      if (s.name && s.name.trim()) list.add(s.name.trim());
    });
    entries.forEach((e) => {
      if (e.subject && e.subject.trim()) list.add(e.subject.trim());
    });
    items.forEach((i) => {
      if (i.subject && i.subject.trim()) list.add(i.subject.trim());
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b, "de"));
  }, [savedSubjects, entries, items]);

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("planpulse_auth_token") || localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const userStr = localStorage.getItem("planpulse_current_user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u?.email) headers["x-user-email"] = u.email;
        } catch {}
      }

      const [hwRes, subRes] = await Promise.all([
        safeFetchJson<{ items: HomeworkItem[] }>("/api/homework", { headers }),
        safeFetchJson<{ subjects: { name: string }[] }>("/api/subjects", { headers }),
      ]);

      if (hwRes.ok && hwRes.data?.items) {
        setItems(hwRes.data.items);
      }
      if (subRes.ok && subRes.data?.subjects && Array.isArray(subRes.data.subjects)) {
        setSavedSubjects(subRes.data.subjects);
      }
    } catch (err) {
      console.error("Failed to load homework:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, []);

  const handleCategorySelect = (cat: TaskCategory) => {
    setFormData((prev) => ({
      ...prev,
      category: cat,
      priority: CATEGORY_CONFIG[cat].defaultPriority,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const token = localStorage.getItem("planpulse_auth_token") || localStorage.getItem("auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await safeFetchJson<{ success: boolean; item: HomeworkItem }>("/api/homework", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...formData,
          subject: formData.subject.trim() || "Allgemein",
        }),
      });
      if (res.ok && res.data?.success && res.data.item) {
        setItems([res.data.item, ...items]);
        setModalOpen(false);
        setFormData({
          subject: "",
          title: "",
          description: "",
          dueDate: "Morgen",
          category: "homework",
          targetClass: activeClass === "alle" ? "" : activeClass,
          priority: "medium",
        });
      }
    } catch (err) {
      console.error("Failed to create homework item:", err);
    }
  };

  const handleToggleCompleted = async (id: string, currentCompleted: boolean) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !currentCompleted } : it))
    );

    try {
      const token = localStorage.getItem("planpulse_auth_token") || localStorage.getItem("auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await safeFetchJson(`/api/homework/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ completed: !currentCompleted }),
      });
    } catch (err) {
      console.error("Failed to update homework status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      const token = localStorage.getItem("planpulse_auth_token") || localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await safeFetchJson(`/api/homework/${id}`, { method: "DELETE", headers });
    } catch (err) {
      console.error("Failed to delete homework item:", err);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchSubject = filterSubject === "ALL" || item.subject.toLowerCase() === filterSubject.toLowerCase();
    const itemCat = item.category || "homework";
    const matchCategory = filterCategory === "ALL" || itemCat === filterCategory;
    const matchStatus =
      filterStatus === "ALL" ||
      (filterStatus === "OPEN" && !item.completed) ||
      (filterStatus === "DONE" && item.completed);
    return matchSubject && matchCategory && matchStatus;
  });

  const openCount = items.filter((it) => !it.completed).length;
  const completedCount = items.filter((it) => it.completed).length;
  const examCount = items.filter((it) => !it.completed && (it.category === "exam" || it.category === "short_test")).length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>Hausaufgaben & Schulaufgaben-Planer</span>
                {openCount > 0 && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                    {openCount} offen
                  </span>
                )}
                {examCount > 0 && (
                  <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center space-x-1">
                    <Flame className="w-3 h-3 text-rose-400" />
                    <span>{examCount} Klausuren/Exen</span>
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Plane Hausaufgaben, Schulaufgaben, Klausuren, Referate und Projekte mit Fristen und Fächern an einem Ort.
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md shadow-blue-500/20 transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Aufgabe / Schulaufgabe planen</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilterCategory("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterCategory === "ALL"
              ? "bg-slate-700 text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Alle Typen ({items.length})
        </button>
        <button
          onClick={() => setFilterCategory("exam")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
            filterCategory === "exam"
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
              : "bg-slate-900 border border-slate-800 text-rose-300/80 hover:text-rose-200"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Schulaufgaben & Klausuren ({items.filter((i) => i.category === "exam").length})</span>
        </button>
        <button
          onClick={() => setFilterCategory("short_test")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
            filterCategory === "short_test"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
              : "bg-slate-900 border border-slate-800 text-amber-300/80 hover:text-amber-200"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Exen & Tests ({items.filter((i) => i.category === "short_test").length})</span>
        </button>
        <button
          onClick={() => setFilterCategory("homework")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
            filterCategory === "homework"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-slate-900 border border-slate-800 text-blue-300/80 hover:text-blue-200"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Hausaufgaben ({items.filter((i) => !i.category || i.category === "homework").length})</span>
        </button>
        <button
          onClick={() => setFilterCategory("presentation")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
            filterCategory === "presentation"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-slate-900 border border-slate-800 text-purple-300/80 hover:text-purple-200"
          }`}
        >
          <Presentation className="w-3.5 h-3.5" />
          <span>Referate ({items.filter((i) => i.category === "presentation").length})</span>
        </button>
      </div>

      {/* Filter & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </span>
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Alle ({items.length})
          </button>
          <button
            onClick={() => setFilterStatus("OPEN")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === "OPEN"
                ? "bg-amber-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Offen ({openCount})
          </button>
          <button
            onClick={() => setFilterStatus("DONE")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === "DONE"
                ? "bg-emerald-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Erledigt ({completedCount})
          </button>
        </div>

        {allKnownSubjects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Fach:</span>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Alle Fächer</option>
              {allKnownSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center mx-auto border border-slate-700">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Keine Einträge vorhanden</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {items.length === 0
              ? "Trage deine erste Hausaufgabe, Schulaufgabe oder Klausur ein, um deine Vorbereitung optimal im Blick zu behalten."
              : "Keine Aufgaben entsprechen den aktuellen Filtern."}
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Neuen Eintrag anlegen</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const isDone = item.completed;
            const cat = item.category || "homework";
            const catConf = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.homework;
            const CategoryIcon = catConf.icon;

            const priorityColor =
              item.priority === "high"
                ? "bg-rose-950/60 text-rose-300 border-rose-800"
                : item.priority === "medium"
                ? "bg-amber-950/60 text-amber-300 border-amber-800"
                : "bg-slate-800 text-slate-400 border-slate-700";

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-xl p-4 transition-all flex items-start justify-between gap-3 ${
                  isDone
                    ? "border-slate-800/60 opacity-60 bg-slate-900/40"
                    : cat === "exam"
                    ? "border-rose-800/50 bg-gradient-to-br from-slate-900 to-rose-950/20 shadow-md shadow-rose-950/20"
                    : "border-slate-800 hover:border-slate-700 shadow-sm"
                }`}
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleCompleted(item.id, item.completed)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                    title={isDone ? "Als unerledigt markieren" : "Als erledigt markieren"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800/80">
                        {item.subject}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center space-x-1 ${catConf.colorBadge}`}>
                        <CategoryIcon className="w-3 h-3 mr-0.5" />
                        <span>{catConf.label}</span>
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${priorityColor}`}>
                        {item.priority === "high" ? "Dringend" : item.priority === "medium" ? "Mittel" : "Normal"}
                      </span>
                      {item.targetClass && (
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                          {item.targetClass}
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-sm font-semibold text-white break-words ${
                        isDone ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-xs text-slate-400 break-words leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                      <span className={`flex items-center space-x-1 font-medium ${cat === "exam" ? "text-rose-300 font-bold" : "text-amber-300/90"}`}>
                        <Clock className="w-3 h-3" />
                        <span>Termin / Fällig: {item.dueDate}</span>
                      </span>
                      <span className="text-slate-500">• Erstellt: {item.createdAt}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  title="Eintrag löschen"
                  className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <span>Aufgabe oder Schulaufgabe planen</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Wähle den Typ (Schulaufgabe, Klausur, Ex, Hausaufgabe, Referat), das Fach und den Fälligkeitstermin.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              
              {/* Type Selection */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium">Art der Aufgabe / Leistung *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map((catKey) => {
                    const conf = CATEGORY_CONFIG[catKey];
                    const Icon = conf.icon;
                    const isSelected = formData.category === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => handleCategorySelect(catKey)}
                        className={`p-2.5 rounded-lg border text-left flex items-center space-x-2 transition-all ${
                          isSelected
                            ? "bg-blue-600/20 border-blue-500 text-white font-semibold"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? "text-blue-400" : "text-slate-500"}`} />
                        <span className="truncate text-xs">{conf.label.split(" / ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-medium text-xs">Fach *</label>
                  <span className="text-[10px] text-blue-400">Aus Liste wählen oder tippen</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={
                      allKnownSubjects.includes(formData.subject)
                        ? formData.subject
                        : formData.subject ? "__custom__" : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val !== "__custom__") {
                        setFormData({ ...formData, subject: val });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-semibold focus:outline-none focus:border-blue-500 text-xs"
                  >
                    {allKnownSubjects.length > 0 ? (
                      <option value="">-- Fach auswählen ({allKnownSubjects.length} Fächer) --</option>
                    ) : (
                      <option value="">-- Noch keine Fächer vorhanden --</option>
                    )}
                    {allKnownSubjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                    <option value="__custom__">✏️ Anderer / Eigener Name...</option>
                  </select>

                  <input
                    type="text"
                    list="hw-known-subjects-list"
                    required
                    placeholder={allKnownSubjects.length > 0 ? "Oder Fachname eintippen..." : "Fachname eintippen (z.B. Test)..."}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 font-semibold text-xs"
                  />
                  {allKnownSubjects.length > 0 && (
                    <datalist id="hw-known-subjects-list">
                      {allKnownSubjects.map((sub) => (
                        <option key={sub} value={sub} />
                      ))}
                    </datalist>
                  )}
                </div>

                {/* Quick Chips */}
                {allKnownSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className="text-[10px] text-slate-500 mr-0.5">Vorhanden:</span>
                    {allKnownSubjects.slice(0, 6).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setFormData({ ...formData, subject: sub })}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          formData.subject.toLowerCase() === sub.toLowerCase()
                            ? "bg-blue-600 border-blue-500 text-white font-bold"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  {formData.category === "exam"
                    ? "Titel / Schulaufgabenthema *"
                    : formData.category === "short_test"
                    ? "Ex / Test Thema *"
                    : formData.category === "presentation"
                    ? "Referatsthema *"
                    : "Aufgabe / Beschreibung *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.category === "exam"
                      ? "z.B. 1. Schulaufgabe: Quadratische Funktionen & Vektoren"
                      : formData.category === "short_test"
                      ? "z.B. Stegreifaufgabe: Grammatik Unit 3"
                      : formData.category === "presentation"
                      ? "z.B. Referat über den Klimawandel (15 Min)"
                      : "z.B. Buch S. 84 Nr. 3a-c lösen"
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    {formData.category === "exam" || formData.category === "short_test"
                      ? "Termin / Datum *"
                      : "Fälligkeit / Abgabetermin"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Donnerstag, 25.10. / 3. Stunde"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Priorität</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Normal</option>
                    <option value="medium">Mittel</option>
                    <option value="high">Dringend / Sehr wichtig</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Zusatzinfos / Lernstoff / Hilfsmittel</label>
                <textarea
                  rows={2}
                  placeholder="z.B. Taschenrechner und Formelsammlung erlaubt, S. 40-65 im Buch lernen"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  Eintrag speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
