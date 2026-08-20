import { safeFetchJson } from "../lib/api";
import React, { useState, useEffect } from "react";
import {
  Upload,
  Download,
  CheckCircle,
  Plus,
  Building,
  Search,
  School,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Calendar,
  Trash2,
  Edit2,
  Lock,
  Camera,
  Palette,
  Check,
  User,
  MapPin,
  Clock,
  HelpCircle
} from "lucide-react";
import { SchoolPlanTemplate, TimetableEntry, RegisteredSchool, AuthUser, DayOfWeek } from "../types";
import { DAYS, PERIOD_TIMES } from "../utils";

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
  { name: "Lila (z.B. Englisch)", color: "#7c3aed" },
  { name: "Indigo (z.B. Religion)", color: "#4f46e5" },
  { name: "Schiefer (z.B. Informatik)", color: "#475569" },
];

interface SchoolPlanHubProps {
  currentEntries: TimetableEntry[];
  activeClass: string;
  currentUser?: AuthUser | null;
  onAdoptTemplate: (templateId: string, mode: "replace" | "merge") => Promise<void>;
  onRefreshData: () => void;
  onNavigateToTimetable: () => void;
}

export const SchoolPlanHub: React.FC<SchoolPlanHubProps> = ({
  currentEntries,
  activeClass,
  currentUser,
  onAdoptTemplate,
  onRefreshData,
  onNavigateToTimetable,
}) => {
  const [templates, setTemplates] = useState<SchoolPlanTemplate[]>([]);
  const [schools, setSchools] = useState<(RegisteredSchool & { plans: SchoolPlanTemplate[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter view: "all" vs "mine"
  const [filterView, setFilterView] = useState<"all" | "mine">("all");

  // Track locally created template IDs for guest/logged-in users
  const [myCreatedTemplateIds, setMyCreatedTemplateIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("planpulse_my_template_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveMyTemplateId = (id: string) => {
    const updated = Array.from(new Set([...myCreatedTemplateIds, id]));
    setMyCreatedTemplateIds(updated);
    try {
      localStorage.setItem("planpulse_my_template_ids", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Registered School session
  const [registeredSchool, setRegisteredSchool] = useState<RegisteredSchool | null>(() => {
    try {
      const saved = localStorage.getItem("planpulse_registered_school");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Modal State for Create / Edit Template
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SchoolPlanTemplate | null>(null);

  // Mode inside modal: "photo" | "manual" | "current"
  const [editorSourceMode, setEditorSourceMode] = useState<"photo" | "manual" | "current">("photo");

  // Plan Form State
  const [planForm, setPlanForm] = useState({
    title: "",
    schoolName: "",
    schoolCity: "",
    targetClass: activeClass === "alle" ? "10A" : activeClass,
    description: "",
    entries: [] as Partial<TimetableEntry>[],
  });

  // Image Upload state inside builder
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanningImage, setIsScanningImage] = useState(false);

  // New Lesson form state within the manual editor
  const [newLesson, setNewLesson] = useState<Partial<TimetableEntry>>({
    day: "Mo",
    period: 1,
    subject: "Mathematik",
    teacher: "",
    room: "",
    color: "#2563eb",
  });

  // Helper to check if a template belongs to the current user
  const isMyTemplate = (tpl: SchoolPlanTemplate): boolean => {
    if (myCreatedTemplateIds.includes(tpl.id)) return true;
    if (currentUser?.email && tpl.ownerEmail && tpl.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (currentUser?.id && tpl.ownerId && tpl.ownerId === currentUser.id) return true;
    if (registeredSchool && (tpl.schoolId === registeredSchool.id || tpl.schoolName === registeredSchool.name)) return true;
    return false;
  };

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTemplates, resSchools] = await Promise.all([
        safeFetchJson(`/api/school-templates?q=${encodeURIComponent(searchQuery)}`),
        safeFetchJson(`/api/schools?q=${encodeURIComponent(searchQuery)}`),
      ]);
      const dataTpl = await resTemplates.data;
      const dataSch = await resSchools.data;

      if (dataTpl.templates) setTemplates(dataTpl.templates);
      if (dataSch.schools) setSchools(dataSch.schools);
    } catch (err) {
      console.error("Failed to load school hub data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery]);

  // Open Create Modal
  const handleOpenCreateModal = (mode: "photo" | "manual" | "current" = "photo") => {
    setEditingTemplate(null);
    setEditorSourceMode(mode);
    setImageFile(null);
    setImagePreview(null);

    let initialEntries: Partial<TimetableEntry>[] = [];
    if (mode === "current") {
      initialEntries = currentEntries.map((e) => ({ ...e }));
    }

    setPlanForm({
      title: mode === "current" ? `Mein Stundenplan (${activeClass === "alle" ? "Allgemein" : activeClass})` : "",
      schoolName: registeredSchool ? registeredSchool.name : (currentUser?.email ? `Stundenplan von ${currentUser.email.split("@")[0]}` : "Meine Schule"),
      schoolCity: registeredSchool ? registeredSchool.city : "",
      targetClass: activeClass === "alle" ? "10A" : activeClass,
      description: "Erstellt mit PlanPulse",
      entries: initialEntries,
    });
    setPlanEditorOpen(true);
  };

  // Open Edit Modal for OWN template
  const handleOpenEditModal = (tpl: SchoolPlanTemplate) => {
    if (!isMyTemplate(tpl)) {
      setErrorMessage("Du kannst nur deine eigenen erstellten Stundenpläne bearbeiten!");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setEditingTemplate(tpl);
    setEditorSourceMode("manual");
    setImageFile(null);
    setImagePreview(null);
    setPlanForm({
      title: tpl.title,
      schoolName: tpl.schoolName,
      schoolCity: tpl.schoolCity || "",
      targetClass: tpl.targetClass,
      description: tpl.description || "",
      entries: tpl.entries.map((e) => ({ ...e })),
    });
    setPlanEditorOpen(true);
  };

  // Handle Image Selection and AI Scan
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScanImage = async () => {
    if (!imagePreview) return;
    try {
      setIsScanningImage(true);
      setErrorMessage(null);

      const base64Data = imagePreview.split(",")[1];
      const mimeType = imageFile?.type || "image/jpeg";

      const token = localStorage.getItem("planpulse_auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await safeFetchJson("/api/gemini/parse-plan", {
        method: "POST",
        headers,
        body: JSON.stringify({
          imageBase64: base64Data,
          imageMimeType: mimeType,
          mode: "preview",
        }),
      });

      const data = await res.data;
      if (data.entries && data.entries.length > 0) {
        setPlanForm((prev) => ({
          ...prev,
          targetClass: data.entries[0]?.targetClass || prev.targetClass,
          title: prev.title || `Stundenplan Klasse ${data.entries[0]?.targetClass || prev.targetClass}`,
          entries: data.entries,
        }));
        setSuccessMessage(`✨ ${data.entries.length} Stunden erfolgreich aus dem Foto erkannt! Du kannst die Fächer und Farben unten direkt anpassen.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage("Keine eindeutigen Unterrichtsstunden auf dem Foto erkannt. Bitte trage sie manuell ein oder wähle ein deutlicheres Foto.");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      setErrorMessage("Fehler beim Verarbeiten des Fotos: " + (err.message || "Bitte erneut versuchen."));
    } finally {
      setIsScanningImage(false);
    }
  };

  // Add Lesson to Editor
  const handleAddLessonToPlan = () => {
    if (!newLesson.subject) return;
    const periodObj = PERIOD_TIMES.find((p) => p.period === newLesson.period);
    const entry: Partial<TimetableEntry> = {
      id: `temp-${Date.now()}`,
      day: newLesson.day || "Mo",
      period: newLesson.period || 1,
      time: periodObj ? periodObj.time : "08:00 - 08:45",
      subject: newLesson.subject,
      teacher: newLesson.teacher || "—",
      room: newLesson.room || "—",
      targetClass: planForm.targetClass,
      status: "regular",
      color: newLesson.color || "#2563eb",
      note: "",
    };

    setPlanForm((prev) => ({
      ...prev,
      entries: [...prev.entries, entry],
    }));
  };

  const handleRemoveLessonFromPlan = (idx: number) => {
    setPlanForm((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateLessonColor = (idx: number, color: string) => {
    setPlanForm((prev) => ({
      ...prev,
      entries: prev.entries.map((item, i) => (i === idx ? { ...item, color } : item)),
    }));
  };

  // Save or Update Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.title || !planForm.targetClass) {
      setErrorMessage("Bitte gib mindestens einen Titel und eine Zielklasse an.");
      return;
    }

    try {
      const token = localStorage.getItem("planpulse_auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (currentUser?.email) headers["x-user-email"] = currentUser.email;

      const payload = {
        title: planForm.title,
        schoolName: planForm.schoolName || "Schule",
        schoolCity: planForm.schoolCity || "",
        targetClass: planForm.targetClass,
        description: planForm.description,
        entries: planForm.entries,
        ownerEmail: currentUser?.email || "",
      };

      let res;
      if (editingTemplate) {
        // PUT update
        res = await safeFetchJson(`/api/school-templates/${editingTemplate.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        // POST create
        res = await safeFetchJson("/api/school-templates", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }

      const data = await res.data;
      if (res.ok && data.template) {
        saveMyTemplateId(data.template.id);
        setPlanEditorOpen(false);
        await fetchData();
        setSuccessMessage(
          editingTemplate
            ? `Stundenplan „${data.template.title}“ erfolgreich aktualisiert!`
            : `Stundenplan „${data.template.title}“ erfolgreich erstellt und gespeichert!`
        );
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(data.error || "Fehler beim Speichern des Stundenplans.");
      }
    } catch (err: any) {
      console.error("Save template error:", err);
      setErrorMessage("Fehler beim Speichern.");
    }
  };

  // Delete own template
  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Diesen von dir erstellten Stundenplan wirklich löschen?")) return;

    try {
      const token = localStorage.getItem("planpulse_auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (currentUser?.email) headers["x-user-email"] = currentUser.email;

      const res = await safeFetchJson(`/api/school-templates/${templateId}?email=${encodeURIComponent(currentUser?.email || "")}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        await fetchData();
        setSuccessMessage("Stundenplan erfolgreich gelöscht.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        const d = await res.data;
        setErrorMessage(d.error || "Löschen nicht möglich.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Adopt template into personal schedule
  const handleApply = async (templateId: string, mode: "replace" | "merge") => {
    setApplyingId(templateId);
    try {
      await onAdoptTemplate(templateId, mode);
      setSuccessMessage("Stundenplan erfolgreich in deinen persönlichen Wochenplan übernommen!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setApplyingId(null);
    }
  };

  const myTemplates = templates.filter(isMyTemplate);
  const displayedTemplates = filterView === "mine" ? myTemplates : templates;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Stundenplan-Portal & Schul-Vorlagen
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Erstelle eigene Stundenpläne per Foto-Scan oder manueller Eingabe und verwalte sie. 
              Du kannst jederzeit <strong>ausschließlich deine eigenen Pläne</strong> bearbeiten und anpassen.
            </p>
          </div>

          {/* Create Button Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => handleOpenCreateModal("photo")}
              className="flex-1 lg:flex-none flex items-center justify-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-amber-500/20 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Foto hochladen & erstellen</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal("manual")}
              className="flex-1 lg:flex-none flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Manuell erstellen</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={onNavigateToTimetable}
              className="font-semibold underline hover:text-white flex items-center space-x-1"
            >
              <span>Zum Stundenplan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-xs underline hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Strip */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setFilterView("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterView === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Alle Pläne ({templates.length})
          </button>
          <button
            onClick={() => setFilterView("mine")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
              filterView === "mine" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Nur meine Pläne ({myTemplates.length})</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Schule, Ort, Klasse oder Titel durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={fetchData}
          className="flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          <span>Aktualisieren</span>
        </button>
      </div>

      {/* Grid of Templates */}
      {displayedTemplates.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-700">
            <School className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white">
              {filterView === "mine"
                ? "Du hast noch keine eigenen Stundenpläne erstellt"
                : searchQuery
                ? `Keine Pläne für „${searchQuery}“ gefunden`
                : "Noch keine Stundenpläne vorhanden"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Erstelle jetzt deinen ersten eigenen Stundenplan per Foto-Upload oder manuell, um ihn jederzeit bearbeiten und nutzen zu können.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleOpenCreateModal("photo")}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
            >
              <Camera className="w-4 h-4" />
              <span>Foto scannen & erstellen</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal("manual")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Manuell anlegen</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedTemplates.map((template) => {
            const isApplying = applyingId === template.id;
            const isMine = isMyTemplate(template);

            return (
              <div
                key={template.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all group ${
                  isMine
                    ? "border-blue-500/40 bg-gradient-to-b from-blue-950/20 via-slate-900 to-slate-900 hover:border-blue-400"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300">
                      Klasse {template.targetClass}
                    </span>

                    {isMine ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/40 flex items-center space-x-1">
                        <span>✨ Dein Plan (Eigentümer)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center space-x-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Vorlage (Schreibgeschützt)</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-sm mb-1 leading-snug group-hover:text-blue-400 transition-colors">
                    {template.title}
                  </h3>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-300 mb-2.5">
                    <Building className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="font-semibold">{template.schoolName}</span>
                    {template.schoolCity && (
                      <span className="text-slate-500">({template.schoolCity})</span>
                    )}
                  </div>

                  {template.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      {template.description}
                    </p>
                  )}

                  {/* Colored Subject Preview Chips */}
                  <div className="space-y-1 mb-4">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Umfang: {template.entriesCount || template.entries.length} Stunden</span>
                      <span className="text-slate-500">Vollfarb-Stundenplan</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {template.entries.slice(0, 6).map((entry, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-bold text-white px-2 py-0.5 rounded-md shadow-sm border border-white/20"
                          style={{ backgroundColor: entry.color || "#2563eb" }}
                        >
                          {entry.subject}
                        </span>
                      ))}
                      {template.entries.length > 6 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{template.entries.length - 6} weitere
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions bottom strip */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApply(template.id, "replace")}
                      disabled={isApplying}
                      className="flex-1 flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-sm transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isApplying ? "Wird geladen..." : "In meinen Plan laden"}</span>
                    </button>

                    <button
                      onClick={() => handleApply(template.id, "merge")}
                      disabled={isApplying}
                      title="Zu bestehendem Plan hinzufügen"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 px-2.5 rounded-xl border border-slate-700 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Show Edit & Delete if it is the user's OWN template OR if Admin */}
                  {(isMine || currentUser?.role === "admin") && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                      <span className={`text-[10px] font-semibold ${isMine ? "text-blue-400" : "text-rose-400"}`}>
                        {isMine ? "Dein eigener Plan" : "Admin-Moderation"}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {isMine && (
                          <button
                            onClick={() => handleOpenEditModal(template)}
                            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Bearbeiten</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteTemplate(template.id, e)}
                          title={isMine ? "Diesen Plan löschen" : "Admin: Diesen Plan moderieren/löschen"}
                          className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-700 hover:border-rose-800 transition-colors text-[11px]"
                        >
                          <Trash2 className="w-3 h-3" />
                          {!isMine && <span>Admin Löschen</span>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Builder / Editor Modal */}
      {planEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  {editingTemplate ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingTemplate ? "Eigenen Stundenplan bearbeiten" : "Neuen Stundenplan erstellen"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingTemplate
                      ? "Änderungen an Fächern, Zeiten, Farben und Lehrkräften vornehmen"
                      : "Wähle Foto-Scan oder erstelle die Fächer und Farben manuell"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPlanEditorOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 py-4 space-y-4 text-xs pr-1">
              
              {/* Method Selector when creating fresh */}
              {!editingTemplate && (
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditorSourceMode("photo")}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                      editorSourceMode === "photo" ? "bg-amber-500 text-slate-950 shadow-md font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>1. Foto-Scan (KI)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorSourceMode("manual")}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                      editorSourceMode === "manual" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>2. Manuell eintragen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditorSourceMode("current");
                      setPlanForm((prev) => ({
                        ...prev,
                        entries: currentEntries.map((e) => ({ ...e })),
                      }));
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                      editorSourceMode === "current" ? "bg-purple-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>3. Aus Editor kopieren</span>
                  </button>
                </div>
              )}

              {/* Photo Upload Zone if in photo mode */}
              {editorSourceMode === "photo" && !editingTemplate && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <Camera className="w-4 h-4 text-amber-400" />
                      <span>Stundenplan-Foto hochladen & scannen</span>
                    </span>
                    <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                      Gemini Vision KI
                    </span>
                  </div>

                  <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-900/40">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="plan-hub-image-upload"
                    />
                    <label htmlFor="plan-hub-image-upload" className="cursor-pointer block space-y-1">
                      {imagePreview ? (
                        <div className="space-y-2">
                          <img
                            src={imagePreview}
                            alt="Stundenplan Vorschau"
                            className="max-h-36 mx-auto rounded-lg border border-slate-700 object-contain shadow-md"
                          />
                          <span className="text-xs text-amber-300 font-semibold block">
                            Foto ausgewählt (Klicken zum Ändern)
                          </span>
                        </div>
                      ) : (
                        <div>
                          <Camera className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
                          <span className="text-xs text-slate-200 font-semibold block">
                            Foto des Stundenplans auswählen oder hier hineinziehen
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            JPG, PNG, WebP von Aushang, Notiz oder Ausdruck
                          </span>
                        </div>
                      )}
                    </label>
                  </div>

                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleScanImage}
                      disabled={isScanningImage}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                    >
                      <Sparkles className={`w-4 h-4 ${isScanningImage ? "animate-spin" : ""}`} />
                      <span>{isScanningImage ? "Analysiere Stundenplan mit KI..." : "Stundenplan jetzt automatisch einlesen"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* General Plan Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Titel des Stundenplans *</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Stundenplan 10B (Halbjahr 2)"
                    value={planForm.title}
                    onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Zielklasse / Gruppe *</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. 10B, 8C, Oberstufe"
                    value={planForm.targetClass}
                    onChange={(e) => setPlanForm({ ...planForm, targetClass: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Schulname (optional)</label>
                  <input
                    type="text"
                    placeholder="z.B. Goethe-Gymnasium"
                    value={planForm.schoolName}
                    onChange={(e) => setPlanForm({ ...planForm, schoolName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Stadt / Ort (optional)</label>
                  <input
                    type="text"
                    placeholder="z.B. München"
                    value={planForm.schoolCity}
                    onChange={(e) => setPlanForm({ ...planForm, schoolCity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Lesson Items Editor Strip */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>Unterrichtsstunden & Vollfarben ({planForm.entries.length} Stunden)</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Jede Stunde vollflächig farbig</span>
                </div>

                {/* Quick Add Form for a Lesson */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-300">+ Stunde manuell hinzufügen</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Tag</label>
                      <select
                        value={newLesson.day}
                        onChange={(e) => setNewLesson({ ...newLesson, day: e.target.value as DayOfWeek })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                      >
                        {DAYS.map((d) => (
                          <option key={d.key} value={d.key}>{d.full}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Stunde</label>
                      <select
                        value={newLesson.period}
                        onChange={(e) => setNewLesson({ ...newLesson, period: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                      >
                        {PERIOD_TIMES.map((pt) => (
                          <option key={pt.period} value={pt.period}>{pt.period}. Std ({pt.time})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Fach *</label>
                      <input
                        type="text"
                        placeholder="z.B. Mathe"
                        value={newLesson.subject || ""}
                        onChange={(e) => setNewLesson({ ...newLesson, subject: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Raum</label>
                      <input
                        type="text"
                        placeholder="z.B. R102"
                        value={newLesson.room || ""}
                        onChange={(e) => setNewLesson({ ...newLesson, room: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  {/* Color Preset bar for new lesson */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <Palette className="w-3 h-3 text-blue-400" />
                        <span>Farbe:</span>
                      </span>
                      {COLOR_PRESETS.slice(0, 8).map((p) => (
                        <button
                          key={p.color}
                          type="button"
                          onClick={() => setNewLesson({ ...newLesson, color: p.color })}
                          className={`w-5 h-5 rounded-full transition-transform ${
                            newLesson.color === p.color ? "scale-125 ring-2 ring-white" : "opacity-80 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: p.color }}
                          title={p.name}
                        />
                      ))}
                      <input
                        type="color"
                        value={newLesson.color || "#2563eb"}
                        onChange={(e) => setNewLesson({ ...newLesson, color: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddLessonToPlan}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Hinzufügen</span>
                    </button>
                  </div>
                </div>

                {/* Table of configured lessons */}
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 bg-slate-950">
                  {planForm.entries.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      Noch keine Stunden in diesem Plan. Trage oben Fächer ein oder nutze den Foto-Scan.
                    </div>
                  ) : (
                    planForm.entries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-900 transition-colors"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {/* Color indicator pill */}
                          <span
                            className="w-3.5 h-3.5 rounded-md flex-shrink-0 shadow-sm border border-white/20"
                            style={{ backgroundColor: entry.color || "#2563eb" }}
                          />
                          <span className="font-bold text-white text-xs">{entry.day} {entry.period}. Std:</span>
                          <span className="text-blue-300 font-semibold truncate">{entry.subject}</span>
                          {entry.room && <span className="text-slate-400 text-[11px]">({entry.room})</span>}
                          {entry.teacher && <span className="text-slate-500 text-[11px]">{entry.teacher}</span>}
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {/* Quick color change */}
                          <input
                            type="color"
                            value={entry.color || "#2563eb"}
                            onChange={(e) => handleUpdateLessonColor(idx, e.target.value)}
                            title="Farbe für diese Stunde ändern"
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLessonFromPlan(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Entfernen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setPlanEditorOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingTemplate ? "Änderungen speichern" : "Stundenplan speichern"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
