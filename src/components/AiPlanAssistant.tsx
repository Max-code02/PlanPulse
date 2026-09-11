import React, { useState, useRef } from "react";
import { 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Bot, 
  Send, 
  Copy, 
  Camera,
  Image as ImageIcon,
  UploadCloud,
  X,
  RefreshCw,
  Crown,
  Lock,
  Check,
  Palette,
  ShieldCheck,
  Zap,
  Cpu,
  Layers,
  CheckCircle,
  AlertTriangle,
  Flame,
  ArrowRight
} from "lucide-react";
import confetti from "canvas-confetti";
import { safeFetchJson } from "../lib/api";

interface AiPlanAssistantProps {
  isPremium?: boolean;
  onPlanParsed: (parsedData?: any) => void;
  onUpgradeClick?: () => void;
  targetClassDefault?: string;
}

type AiEngineChoice = "auto" | "gemini" | "claude" | "llama" | "local";

interface CascadeStepLog {
  engine: string;
  model: string;
  status: "attempting" | "success" | "503_overloaded" | "failed";
  latencyMs?: number;
  detail?: string;
}

export const AiPlanAssistant: React.FC<AiPlanAssistantProps> = ({
  onPlanParsed,
  targetClassDefault = "10A",
}) => {
  const [activeInputTab, setActiveInputTab] = useState<"image" | "text">("image");
  const [selectedEngine, setSelectedEngine] = useState<AiEngineChoice>("auto");

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [imageFileName, setImageFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Text Parser State
  const [rawText, setRawText] = useState(
    `Vertretungsplan Gymnasium Heute (Dienstag):
- 10A: 3. Stunde Deutsch bei Fr. Sommer entfällt wegen Fortbildung.
- 10A: 4. Stunde Englisch Hr. Miller findet in Raum R204 statt (Raumwechsel).
- 11B: 2. Stunde Chemie Dr. Walter wird vertreten durch Fr. Lindner in Bio-1.
- Q12: 5. und 6. Stunde Mathe Klausur bei Hr. Becker in der Aula.`
  );
  const [targetClass, setTargetClass] = useState(targetClassDefault || "10A");
  const [targetMode, setTargetMode] = useState("Schul-Vertretungsplan");
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [parseEngineInfo, setParseEngineInfo] = useState<{ engine: string; model: string; fallback: boolean; cascadeLog?: CascadeStepLog[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Assistant Chat State
  const [chatQuery, setChatQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatEngineInfo, setChatEngineInfo] = useState<{ engine: string; model: string; fallback: boolean; cascadeLog?: CascadeStepLog[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("planpulse_auth_token");
    const userStr = localStorage.getItem("planpulse_current_user");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u?.email) headers["x-user-email"] = u.email;
      } catch {}
    }
    return headers;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setImageMimeType(file.type || "image/jpeg");

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setParseError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setImageFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleParse = async () => {
    if (activeInputTab === "image" && !selectedImage) {
      setParseError("Bitte wähle zuerst ein Foto oder einen Screenshot deines Stundenplans aus.");
      return;
    }
    if (activeInputTab === "text" && !rawText.trim()) {
      setParseError("Bitte trage Text aus deinem Stunden- oder Vertretungsplan ein.");
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setParseResult(null);
    setParseEngineInfo(null);

    try {
      const payload: any = {
        targetMode,
        targetClass: targetClass.trim() || "10A",
        preferredEngine: selectedEngine,
      };

      if (activeInputTab === "image" && selectedImage) {
        payload.imageBase64 = selectedImage;
        payload.imageMimeType = imageMimeType;
      } else {
        payload.rawText = rawText;
      }

      const res = await safeFetchJson<{
        success: boolean;
        result: any;
        engineUsed?: string;
        modelUsed?: string;
        fallbackUsed?: boolean;
        cascadeLog?: CascadeStepLog[];
        error?: string;
      }>("/api/gemini/parse-plan", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok && res.data?.success) {
        setParseResult(res.data.result);
        setParseEngineInfo({
          engine: res.data.engineUsed || "Google Gemini",
          model: res.data.modelUsed || "gemini-3.7-flash",
          fallback: !!res.data.fallbackUsed,
          cascadeLog: res.data.cascadeLog,
        });
        onPlanParsed(res.data.result);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } else {
        setParseError(res.error || res.data?.error || "Fehler beim KI-Import. Bitte erneut versuchen.");
      }
    } catch (err: any) {
      setParseError(err.message || "Netzwerkfehler beim Ansprechen der KI.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleAskAssistant = async (promptText?: string) => {
    const q = promptText || chatQuery;
    if (!q.trim()) return;
    setIsAsking(true);
    setChatAnswer(null);
    setChatEngineInfo(null);

    try {
      const res = await safeFetchJson<{
        success: boolean;
        answer?: string;
        engineUsed?: string;
        modelUsed?: string;
        fallbackUsed?: boolean;
        cascadeLog?: CascadeStepLog[];
        error?: string;
      }>("/api/gemini/assistant", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ query: q, mode: targetMode, preferredEngine: selectedEngine }),
      });

      if (res.ok && res.data?.success && res.data.answer) {
        setChatAnswer(res.data.answer);
        setChatEngineInfo({
          engine: res.data.engineUsed || "Google Gemini",
          model: res.data.modelUsed || "gemini-3.7-flash",
          fallback: !!res.data.fallbackUsed,
          cascadeLog: res.data.cascadeLog,
        });
      } else {
        setChatAnswer(res.error || res.data?.error || "Entschuldigung, der KI-Dienst ist gerade überlastet. Bitte versuche es gleich erneut.");
      }
    } catch (err) {
      setChatAnswer("Verbindungsfehler zur KI-Engine.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleCopy = () => {
    if (!chatAnswer) return;
    navigator.clipboard.writeText(chatAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Card with Pro Status & Multi-Model Engine Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center shadow-lg text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Multi-KI Smart-Parser & Ausfallsicherer Assistent
                </h2>
                <span className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>VOLLVERSION FREIGESCHALTET</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ausgestattet mit automatischer Fallback-Kaskade: Wenn Gemini (503) überlastet ist, übernehmen sofort Anthropic Claude 3.5, Meta Llama 3.3 oder der lokale Algorithmus.
              </p>
            </div>
          </div>
        </div>

        {/* AI Engine & Fallback Selector */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">Aktive KI-Engine:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedEngine("auto")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                selectedEngine === "auto"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>⚡ Auto-Kaskade (Gemini ➔ Claude ➔ Llama ➔ Offline)</span>
            </button>

            <button
              onClick={() => setSelectedEngine("gemini")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                selectedEngine === "gemini"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>Google Gemini 3.7</span>
            </button>

            <button
              onClick={() => setSelectedEngine("claude")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                selectedEngine === "claude"
                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              <span>Claude 3.5 Fallback</span>
            </button>

            <button
              onClick={() => setSelectedEngine("llama")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                selectedEngine === "llama"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Meta Llama 3.3 (Open-Source)</span>
            </button>

            <button
              onClick={() => setSelectedEngine("local")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                selectedEngine === "local"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>Lokaler Offline-Core</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Smart Notice & Photo Parser */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Stundenplan automatisch importieren</h3>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-[11px] text-slate-400 font-medium">Zielklasse:</label>
              <input
                type="text"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                placeholder="10A"
                className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Tab Selector: Photo vs. Text */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveInputTab("image")}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all ${
                activeInputTab === "image"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Foto / Bild hochladen</span>
            </button>
            <button
              onClick={() => setActiveInputTab("text")}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all ${
                activeInputTab === "text"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Text / Untis einfügen</span>
            </button>
          </div>

          {/* Image Input Tab */}
          {activeInputTab === "image" ? (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedImage ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 transition-colors">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    Foto oder Screenshot des Stundenplans auswählen
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Klicke hier oder ziehe eine Bilddatei (JPG, PNG, WebP) hinein. Handschrift, Aushang oder Ausdruck wird per Bild-KI erkannt.
                  </p>
                </div>
              ) : (
                <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                    <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="truncate max-w-[200px]">{imageFileName || "Stundenplan-Foto"}</span>
                    </span>
                    <button
                      onClick={handleClearImage}
                      className="text-slate-400 hover:text-rose-400 p-1 hover:bg-slate-800 rounded transition-colors"
                      title="Foto entfernen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-hidden rounded-lg flex items-center justify-center bg-black/40">
                    <img
                      src={selectedImage}
                      alt="Stundenplan Vorschau"
                      referrerPolicy="no-referrer"
                      className="max-h-48 object-contain w-full rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Foto bereit zur KI-Erkennung</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-amber-400 hover:underline"
                    >
                      Anderes Bild wählen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Modus:</span>
                <select
                  value={targetMode}
                  onChange={(e) => setTargetMode(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="Schul-Vertretungsplan">Schul-Vertretungsplan</option>
                  <option value="Wochenstundenplan">Wochenstundenplan (Klassen)</option>
                  <option value="Privater Wochenplan">Privater Wochenplan / Uni</option>
                </select>
              </div>

              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Kopiere hier Vertretungs-Notizen oder Stundenplanzeilen ein..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {parseError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-start space-x-2">
              <span className="font-bold flex-shrink-0">Hinweis:</span>
              <span>{parseError}</span>
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={isParsing}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>KI scannt mit Multi-Model Kaskade...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {activeInputTab === "image" ? "Stundenplan-Foto per KI einlesen & eintragen" : "Plan-Text importieren & live synchronisieren"}
                </span>
              </>
            )}
          </button>

          {/* Parse Result Summary & Engine Badge */}
          {parseResult && (
            <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-800/60 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Erfolgreich ins System übertragen!</span>
                </div>
                {parseEngineInfo && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1 ${
                    parseEngineInfo.fallback 
                      ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                      : "bg-blue-950/80 text-blue-300 border border-blue-700/60"
                  }`}>
                    {parseEngineInfo.fallback ? <Flame className="w-3 h-3 text-amber-400" /> : <Zap className="w-3 h-3 text-blue-400" />}
                    <span>{parseEngineInfo.engine}</span>
                  </span>
                )}
              </div>

              {parseEngineInfo?.fallback && (
                <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-lg text-[11px] text-amber-200 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Ausfallsicherheit aktiv:</strong> Google KI war kurzzeitig 503 ausgelastet — die Kaskade hat nahtlos mit <strong>{parseEngineInfo.engine}</strong> ohne Datenverlust weitergearbeitet.
                  </span>
                </div>
              )}

              <p className="text-slate-300">{parseResult.summary}</p>
              {parseResult.substitutions?.length > 0 && (
                <div className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-800/40">
                  ⚡ {parseResult.substitutions.length} Vertretungsmeldungen wurden synchronisiert.
                </div>
              )}
              {parseResult.timetableEntries?.length > 0 && (
                <div className="text-[11px] text-blue-300 bg-blue-950/30 p-2 rounded border border-blue-800/40 flex items-center justify-between">
                  <span>🗓️ {parseResult.timetableEntries.length} Unterrichtsstunden eingetragen.</span>
                  <span className="flex items-center space-x-1 text-emerald-400">
                    <Palette className="w-3 h-3" />
                    <span>Farben zugewiesen</span>
                  </span>
                </div>
              )}
              {parseResult.extractedSubjects?.length > 0 && (
                <div className="text-[11px] text-purple-300 bg-purple-950/30 p-2 rounded border border-purple-800/40">
                  📚 {parseResult.extractedSubjects.length} Fächer/Lehrkräfte wurden erstellt.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: AI Schedule Advisor & School Notification Generator */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">KI-Assistent & Schulplan-Berater</h3>
            </div>
            {chatEngineInfo && (
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1 ${
                chatEngineInfo.fallback 
                  ? "bg-amber-950/80 text-amber-300 border border-amber-700/60"
                  : "bg-purple-950/80 text-purple-300 border border-purple-700/60"
              }`}>
                {chatEngineInfo.fallback ? <Flame className="w-3 h-3 text-amber-400" /> : <Bot className="w-3 h-3 text-purple-400" />}
                <span>{chatEngineInfo.engine}</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Nutze die Multi-Model KI für Raumkollisionsprüfungen, automatische Eltern-/Schüler-Mitteilungen für Schulausfälle oder smarte Klausurvorbereitung mit 100% Verfügbarkeit.
          </p>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              onClick={() => handleAskAssistant("Erstelle eine offizielle Mitteilung für die heutigen Unterrichtsausfälle und Vertretungen.")}
              className="bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition-colors"
            >
              📢 Mitteilung für Ausfälle
            </button>
            <button
              onClick={() => handleAskAssistant("Gibt es heute Raum- oder Lehrerkonflikte in unserem Stundenplan?")}
              className="bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition-colors"
            >
              🔍 Konfliktprüfung
            </button>
            <button
              onClick={() => handleAskAssistant("Gib mir 3 effektive Lern- und Vorbereitungstipps für anstehende Schulaufgaben und Klausuren.")}
              className="bg-slate-950 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-800 transition-colors"
            >
              💡 Klausur-Lernstrategien
            </button>
          </div>

          {/* Input field */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="z.B. Formuliere eine Eltern-Nachricht für die Hitzefrei-Regelung..."
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAssistant()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={() => handleAskAssistant()}
              disabled={isAsking}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-lg font-semibold text-xs transition-colors shadow flex items-center justify-center disabled:opacity-50"
            >
              {isAsking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Chat Answer Box */}
          {chatAnswer && (
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2 text-xs relative animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[11px] font-bold text-purple-400 flex items-center space-x-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Antwort ({chatEngineInfo?.engine || "PlanPulse KI"})</span>
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-slate-400 hover:text-white text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Kopiert!" : "Kopieren"}</span>
                </button>
              </div>
              <div className="text-slate-300 whitespace-pre-wrap leading-relaxed font-sans text-xs">
                {chatAnswer}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
