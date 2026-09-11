import React, { useState, useRef } from "react";
import {
  Camera,
  UploadCloud,
  X,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  User,
  Trash2,
  RefreshCw,
  Layers,
  Save,
  Palette,
  Image as ImageIcon,
  Zap,
  Info
} from "lucide-react";
import confetti from "canvas-confetti";
import { safeFetchJson } from "../lib/api";
import { UserSubject } from "../types";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface SubjectAiCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectsImported: (newSubjects: UserSubject[]) => void;
  existingSubjects?: UserSubject[];
  targetClassDefault?: string;
}

const COLOR_PALETTE = [
  "#2563eb", "#dc2626", "#7c3aed", "#0891b2", "#16a34a",
  "#059669", "#d97706", "#6366f1", "#ea580c", "#ec4899",
  "#8b5cf6", "#0284c7", "#0d9488", "#e11d48", "#ca8a04"
];

interface ExtractedSubjectItem {
  id: string;
  name: string;
  code: string;
  teacher: string;
  room: string;
  color: string;
  targetGrade: number;
  oralRatio: number;
  selected: boolean;
}

export const SubjectAiCameraModal: React.FC<SubjectAiCameraModalProps> = ({
  isOpen,
  onClose,
  onSubjectsImported,
  existingSubjects = [],
  targetClassDefault = "",
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedList, setExtractedList] = useState<ExtractedSubjectItem[]>([]);
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [aiEngineUsed, setAiEngineUsed] = useState<string | null>(null);
  const [targetClass, setTargetClass] = useState<string>(targetClassDefault || "");
  const [activeTab, setActiveTab] = useState<"camera" | "text">("camera");
  const [manualText, setManualText] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const compressImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.88);
            resolve({ base64: compressed, mimeType: "image/jpeg" });
          } else {
            resolve({ base64: e.target?.result as string, mimeType: file.type || "image/jpeg" });
          }
        };
        img.onerror = () => {
          resolve({ base64: e.target?.result as string, mimeType: file.type || "image/jpeg" });
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setScanError(null);
    setExtractedList([]);
    setScanSummary(null);

    const { base64, mimeType } = await compressImage(file);
    setSelectedImage(base64);
    setImageMimeType(mimeType);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImageFileName("");
    setExtractedList([]);
    setScanSummary(null);
    setScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const assignColor = (name: string, index: number): string => {
    const lower = name.toLowerCase();
    if (lower.includes("mathe")) return "#2563eb";
    if (lower.includes("deutsch")) return "#dc2626";
    if (lower.includes("englisch")) return "#7c3aed";
    if (lower.includes("physik")) return "#0891b2";
    if (lower.includes("chemie")) return "#059669";
    if (lower.includes("bio")) return "#16a34a";
    if (lower.includes("geschichte")) return "#d97706";
    if (lower.includes("informatik")) return "#6366f1";
    if (lower.includes("sport")) return "#ea580c";
    if (lower.includes("kunst")) return "#ec4899";
    if (lower.includes("musik")) return "#8b5cf6";
    if (lower.includes("relig") || lower.includes("ethik")) return "#0284c7";
    if (lower.includes("wirtschaft") || lower.includes("recht")) return "#0d9488";
    if (lower.includes("latein")) return "#9333ea";
    if (lower.includes("französ")) return "#3b82f6";
    if (lower.includes("span")) return "#e11d48";
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  };

  const generateCode = (name: string): string => {
    const clean = name.trim();
    if (clean.toLowerCase().includes("mathe")) return "M";
    if (clean.toLowerCase().includes("deutsch")) return "D";
    if (clean.toLowerCase().includes("englisch")) return "E";
    if (clean.toLowerCase().includes("physik")) return "Ph";
    if (clean.toLowerCase().includes("chemie")) return "Ch";
    if (clean.toLowerCase().includes("bio")) return "Bio";
    if (clean.toLowerCase().includes("geschichte")) return "G";
    if (clean.toLowerCase().includes("informatik")) return "Inf";
    if (clean.toLowerCase().includes("sport")) return "Sp";
    if (clean.toLowerCase().includes("kunst")) return "Ku";
    if (clean.toLowerCase().includes("musik")) return "Mu";
    if (clean.toLowerCase().includes("ethik")) return "Eth";
    if (clean.toLowerCase().includes("relig")) return "Rel";
    if (clean.toLowerCase().includes("wirtschaft")) return "WR";
    if (clean.toLowerCase().includes("latein")) return "L";
    if (clean.toLowerCase().includes("französ")) return "F";
    if (clean.toLowerCase().includes("span")) return "Spa";
    return clean.substring(0, 3).toUpperCase();
  };

  const handleStartScan = async () => {
    if (!selectedImage && !manualText.trim()) {
      setScanError("Bitte wähle zuerst ein Foto aus oder gib Text/Fächerliste ein.");
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setExtractedList([]);
    setScanSummary(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("planpulse_auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const userStr = localStorage.getItem("planpulse_current_user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u?.email) headers["x-user-email"] = u.email;
        } catch {}
      }

      const res = await safeFetchJson<{
        success: boolean;
        result: {
          detectedType?: string;
          summary?: string;
          extractedSubjects?: Array<{ name: string; teacher?: string; room?: string }>;
          timetableEntries?: Array<{ subject: string; teacher?: string; room?: string; color?: string }>;
          allSubjects?: UserSubject[];
        };
        engineUsed?: string;
        modelUsed?: string;
      }>("/api/gemini/parse-plan", {
        method: "POST",
        headers,
        body: JSON.stringify({
          imageBase64: selectedImage || undefined,
          imageMimeType: selectedImage ? imageMimeType : undefined,
          rawText: manualText.trim() || undefined,
          targetMode: "Schul-Fächer & Lehrkräfte Liste",
          targetClass: targetClass || "9b",
          preferredEngine: "auto",
        }),
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || "Die KI konnte das Bild nicht verarbeiten.");
      }

      const data = res.data;
      setAiEngineUsed(`${data.engineUsed || "Google Gemini"} (${data.modelUsed || "gemini-3.8-flash"})`);

      const rawExtracted = data.result?.extractedSubjects || [];
      const rawTimetable = data.result?.timetableEntries || [];

      // Combine and deduplicate extracted subjects by name
      const subjectMap = new Map<string, { name: string; teacher: string; room: string }>();

      rawExtracted.forEach((s) => {
        if (!s.name) return;
        const key = s.name.trim().toLowerCase();
        const existing = subjectMap.get(key);
        if (!existing) {
          subjectMap.set(key, {
            name: s.name.trim(),
            teacher: (s.teacher || "").replace(/^—$/, "").trim(),
            room: (s.room || "").replace(/^—$/, "").trim(),
          });
        } else {
          if (s.teacher && s.teacher !== "—" && !existing.teacher.toLowerCase().includes(s.teacher.toLowerCase())) {
            existing.teacher = existing.teacher ? `${existing.teacher}, ${s.teacher}` : s.teacher;
          }
          if (s.room && s.room !== "—" && !existing.room) {
            existing.room = s.room;
          }
        }
      });

      // If no rawExtracted was present but timetable entries were parsed
      if (subjectMap.size === 0 && rawTimetable.length > 0) {
        rawTimetable.forEach((t) => {
          if (!t.subject) return;
          const key = t.subject.trim().toLowerCase();
          const existing = subjectMap.get(key);
          if (!existing) {
            subjectMap.set(key, {
              name: t.subject.trim(),
              teacher: (t.teacher || "").replace(/^—$/, "").trim(),
              room: (t.room || "").replace(/^—$/, "").trim(),
            });
          }
        });
      }

      const items: ExtractedSubjectItem[] = Array.from(subjectMap.values()).map((s, idx) => {
        const matchingExisting = existingSubjects.find(
          (ex) => ex.name.toLowerCase() === s.name.toLowerCase() || (ex.code && ex.code.toLowerCase() === s.name.toLowerCase())
        );

        return {
          id: `ext-${Date.now()}-${idx}`,
          name: s.name,
          code: matchingExisting?.code || generateCode(s.name),
          teacher: s.teacher || matchingExisting?.teacher || "",
          room: s.room || matchingExisting?.room || "",
          color: matchingExisting?.color || assignColor(s.name, idx),
          targetGrade: matchingExisting?.targetGrade || 2.0,
          oralRatio: matchingExisting?.oralRatio || 50,
          selected: true,
        };
      });

      if (items.length === 0) {
        setScanError("Es konnten keine Schulfächer oder Lehrkräfte auf dem Bild erkannt werden. Bitte stelle sicher, dass die Schrift gut lesbar und scharf fokussiert ist.");
      } else {
        setExtractedList(items);
        setScanSummary(data.result?.summary || `🎉 ${items.length} Schulfächer und Lehrkräfte erfolgreich erkannt!`);
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (err: any) {
      console.error("Camera scan error:", err);
      setScanError(err.message || "Fehler bei der KI-Fotoanalyse.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSelectAll = () => {
    const allSelected = extractedList.every((i) => i.selected);
    setExtractedList((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleToggleItem = (id: string) => {
    setExtractedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleUpdateItem = (id: string, updates: Partial<ExtractedSubjectItem>) => {
    setExtractedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setExtractedList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleApplySubjects = async () => {
    const selectedItems = extractedList.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      setScanError("Bitte wähle mindestens ein Fach aus der Liste aus.");
      return;
    }

    const mergedSubjects: UserSubject[] = [...existingSubjects];

    selectedItems.forEach((item) => {
      const existingIdx = mergedSubjects.findIndex(
        (s) => s.name.toLowerCase() === item.name.toLowerCase()
      );

      const newSubj: UserSubject = {
        id: existingIdx !== -1 ? mergedSubjects[existingIdx].id : `sub-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: item.name.trim(),
        code: item.code.trim() || generateCode(item.name),
        color: item.color,
        targetGrade: item.targetGrade,
        oralRatio: item.oralRatio,
        teacher: item.teacher.trim(),
        room: item.room.trim(),
      };

      if (existingIdx !== -1) {
        mergedSubjects[existingIdx] = {
          ...mergedSubjects[existingIdx],
          ...newSubj,
        };
      } else {
        mergedSubjects.push(newSubj);
      }
    });

    // Save to Server & Cloud Firestore
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = localStorage.getItem("planpulse_auth_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const userStr = localStorage.getItem("planpulse_current_user");
      let currentUser: any = null;
      if (userStr) {
        try {
          currentUser = JSON.parse(userStr);
          if (currentUser?.email) headers["x-user-email"] = currentUser.email;
        } catch {}
      }

      await safeFetchJson("/api/subjects", {
        method: "POST",
        headers,
        body: JSON.stringify({ subjects: mergedSubjects }),
      });

      // Also persist to Firestore if user is authenticated
      if (currentUser?.id || currentUser?.uid) {
        const uid = currentUser.id || currentUser.uid;
        try {
          const userDocRef = doc(db, "users", uid);
          await setDoc(userDocRef, { userSubjects: mergedSubjects }, { merge: true });
        } catch (e) {
          console.warn("Firestore sync optional warning:", e);
        }
      }

      // Persist to all localStorage caches used across the app
      localStorage.setItem("planpulse_saved_subjects", JSON.stringify(mergedSubjects));
      localStorage.setItem("planpulse_user_subjects", JSON.stringify(mergedSubjects));
      localStorage.setItem("planpulse_subjects_timestamp", Date.now().toString());
      localStorage.removeItem("planpulse_subjects_explicitly_cleared");

      // Notify caller & broadcast event to app
      onSubjectsImported(mergedSubjects);
      window.dispatchEvent(new CustomEvent("planpulse_subjects_updated", { detail: { subjects: mergedSubjects } }));

      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
      } catch {}

      onClose();
    } catch (saveErr) {
      console.error("Error saving imported subjects:", saveErr);
      // Still apply locally even if network fails
      localStorage.setItem("planpulse_saved_subjects", JSON.stringify(mergedSubjects));
      localStorage.setItem("planpulse_user_subjects", JSON.stringify(mergedSubjects));
      onSubjectsImported(mergedSubjects);
      window.dispatchEvent(new CustomEvent("planpulse_subjects_updated", { detail: { subjects: mergedSubjects } }));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-1.5">
                <span>KI-Kamera & Foto-Upload</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-extrabold px-2 py-0.5 rounded-full border border-blue-500/30">
                  Multimodal KI
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Fotografiere deine Lehrkräfte- & Fächerliste oder Stundenplanausdrucke
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Target Class info banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-200">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                Erkennt automatisch <strong>Fächer, Lehrer, Kürzel und Farben</strong> aus Screenshots, Aushängen & Fotos.
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px]">
              <span className="text-blue-300/80">Klasse/Stufe:</span>
              <input
                type="text"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                placeholder="z.B. 9b"
                className="w-16 px-2 py-0.5 bg-slate-900 border border-blue-700/60 rounded text-center text-white font-bold focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex items-center space-x-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("camera");
                setScanError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === "camera"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Foto-Scan (Kamera / Galerie)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("text");
                setScanError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === "text"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Text / Liste einfügen</span>
            </button>
          </div>

          {/* TAB 1: Camera / Photo Mode */}
          {activeTab === "camera" && (
            <>
              {!selectedImage ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Direct Camera Button */}
                  <label className="flex flex-col items-center justify-center p-6 bg-slate-950 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-2xl cursor-pointer group transition-all text-center">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={cameraInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 group-hover:bg-blue-600 text-blue-400 group-hover:text-white flex items-center justify-center mb-3 transition-all">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-200 text-sm group-hover:text-blue-400 transition-colors">
                      Kamera öffnen & Foto machen
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Direkt mit Smartphone- oder Webcam-Kamera fotografieren
                    </span>
                  </label>

                  {/* Gallery / File Upload Button */}
                  <label className="flex flex-col items-center justify-center p-6 bg-slate-950 border-2 border-dashed border-slate-800 hover:border-indigo-500 rounded-2xl cursor-pointer group transition-all text-center">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 group-hover:bg-indigo-600 text-indigo-400 group-hover:text-white flex items-center justify-center mb-3 transition-all">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-200 text-sm group-hover:text-indigo-400 transition-colors">
                      Foto aus Galerie / Datei hochladen
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      JPG, PNG, WebP, Screenshot oder Stundenplan-Scan
                    </span>
                  </label>

                </div>
              ) : (
                <div className="space-y-3">
                  {/* Image Preview Card */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 max-h-60 flex items-center justify-center group">
                    <img
                      src={selectedImage}
                      alt="Hochgeladener Stundenplan"
                      className="w-full h-full object-contain max-h-56 p-2"
                    />
                    
                    {/* Floating Clear Button */}
                    <button
                      onClick={handleClearImage}
                      className="absolute top-3 right-3 bg-slate-900/90 hover:bg-rose-600 text-slate-300 hover:text-white p-1.5 rounded-xl border border-slate-700 shadow-lg transition-all flex items-center space-x-1 text-xs"
                    >
                      <X className="w-4 h-4" />
                      <span className="pr-1">Anderes Foto</span>
                    </button>

                    {/* Scan Overlay while scanning */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                          <Sparkles className="w-5 h-5 text-blue-400 absolute" />
                        </div>
                        <div className="text-center">
                          <span className="font-bold text-white text-sm block">KI scannt Fächer & Lehrkräfte...</span>
                          <span className="text-[11px] text-blue-300/80">Google Gemini & OCR analysieren Schriftzeichen & Tabellen</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button: Start Scan */}
                  {extractedList.length === 0 && !isScanning && (
                    <button
                      onClick={handleStartScan}
                      disabled={isScanning}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center space-x-2 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Jetzt mit KI analysieren & Fächer extrahieren</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* TAB 2: Text / Copy-Paste Mode */}
          {activeTab === "text" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">
                  Fächer- oder Lehrerliste hier einfügen:
                </label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={`Z.B. aus Schulportal / WebUntis / Eltern-Portal kopiert:\n\nMathematik Bernadette Sicheneder\nDeutsch Jutta Fischer\nEnglisch Diana Geck\nLatein Katharina Weikert\nPhysik Kelly Reble\nChemie Dr. Kai Konrad\nBiologie Dr. Kai Konrad\nGeschichte Dr. Rainer Bach\nInformatik Dr. Iljana Zähle\nWirtschaft und Recht Bernhard Ruhl\nKunst Dorette Jansen\nMusik Christine Gaillard\nSport Jana Stark, Jochen Hassel`}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {extractedList.length === 0 && (
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={isScanning || !manualText.trim()}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold shadow-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Text mit KI strukturieren & Fächer anlegen</span>
                </button>
              )}
            </div>
          )}

          {/* Scan Error */}
          {scanError && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-start space-x-2.5 text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{scanError}</span>
                <span className="text-[10px] text-rose-300/70">
                  Tipp: Achte auf gute Beleuchtung und dass die Fächer- und Lehrernamen gut erkennbar sind.
                </span>
              </div>
            </div>
          )}

          {/* Scan Results & Extracted Subject Review */}
          {extractedList.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Results Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs">
                      {extractedList.filter((i) => i.selected).length} von {extractedList.length} Fächern ausgewählt
                    </span>
                  </div>
                  {scanSummary && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">{scanSummary}</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-700 transition-colors"
                  >
                    {extractedList.every((i) => i.selected) ? "Alle abwählen" : "Alle auswählen"}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartScan}
                    disabled={isScanning}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-[11px] font-semibold border border-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} />
                    <span>Neu scannen</span>
                  </button>
                </div>
              </div>

              {/* Extracted Subjects List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {extractedList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.selected
                        ? "bg-slate-950 border-slate-700 shadow-sm"
                        : "bg-slate-950/40 border-slate-800/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(item.id)}
                        className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 cursor-pointer mt-0.5 sm:mt-0"
                      />

                      {/* Color Preview with Color Palette Selector */}
                      <div className="relative group/color flex-shrink-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow cursor-pointer"
                          style={{ backgroundColor: item.color }}
                          title="Klicke, um Farbe zu ändern"
                        >
                          {item.code || item.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Inputs: Name, Teacher, Room, Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 min-w-0">
                        {/* Subject Name */}
                        <div>
                          <label className="text-[9px] text-slate-500 block uppercase font-mono">Fachname</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 font-bold text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Teacher */}
                        <div>
                          <label className="text-[9px] text-slate-500 block uppercase font-mono">Lehrkraft</label>
                          <input
                            type="text"
                            value={item.teacher}
                            placeholder="z.B. Hr. Meier"
                            onChange={(e) => handleUpdateItem(item.id, { teacher: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Code & Target Grade */}
                        <div className="flex items-center space-x-2">
                          <div className="w-16">
                            <label className="text-[9px] text-slate-500 block uppercase font-mono">Kürzel</label>
                            <input
                              type="text"
                              value={item.code}
                              maxLength={5}
                              onChange={(e) => handleUpdateItem(item.id, { code: e.target.value.toUpperCase() })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 font-mono text-xs focus:outline-none focus:border-blue-500 uppercase"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[9px] text-slate-500 block uppercase font-mono">Zielnote</label>
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              max="6"
                              value={item.targetGrade}
                              onChange={(e) => handleUpdateItem(item.id, { targetGrade: parseFloat(e.target.value) || 2.0 })}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 font-bold text-xs focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delete item button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors self-end sm:self-center"
                      title="Aus Liste entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="text-[11px] text-slate-400">
            {aiEngineUsed && (
              <span className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Analysiert mit {aiEngineUsed}</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Schließen
            </button>

            {extractedList.length > 0 && (
              <button
                type="button"
                onClick={handleApplySubjects}
                disabled={extractedList.filter((i) => i.selected).length === 0}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center space-x-1.5 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {extractedList.filter((i) => i.selected).length} Fächer dauerhaft übernehmen
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
