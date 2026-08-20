import React from "react";
import { 
  FileDown, 
  Sparkles, 
  Calendar,
  FileText,
  Database,
  CheckCircle2,
  Zap,
  Layers,
  Cpu
} from "lucide-react";
import { UserConfig, TimetableEntry, SubstitutionNotice } from "../types";
import { exportToCSV, exportToJSON, exportToICal } from "../utils";

interface FreemiumBillingProps {
  config: UserConfig;
  onUpdateConfig: (newConfig: Partial<UserConfig>) => void;
  onTogglePlan: (targetPlan?: "free" | "premium") => void;
  timetableEntries: TimetableEntry[];
  substitutions: SubstitutionNotice[];
}

export const FreemiumBilling: React.FC<FreemiumBillingProps> = ({
  timetableEntries,
  substitutions,
}) => {
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg text-white font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  PlanPulse Export Center & Werkzeuge
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  100% Kostenlos & Unbegrenzt
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Alle Funktionen wie KI-Stundenplan-Scan, Multi-Model Assistent, PDF-Druck und Kalender-Sync sind dauerhaft für alle Nutzer freigeschaltet.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-emerald-950/40 text-emerald-300 border-emerald-800/50 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Alle Funktionen Aktiv</span>
            </span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4.5 space-y-2">
          <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
            <Cpu className="w-4 h-4" />
            <span>Multi-Model KI-Assistent</span>
          </div>
          <p className="text-xs text-slate-300">
            Intelligenter Foto-Scanner & ausfallsichere Kaskade (Gemini 3.7, Claude 3.5, Llama 3.3).
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4.5 space-y-2">
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
            <Zap className="w-4 h-4" />
            <span>Echtzeit-Synchronisation</span>
          </div>
          <p className="text-xs text-slate-300">
            Dauerhafte Server-Speicherung ohne Verzögerung, sofort auf allen Geräten verfügbar.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4.5 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
            <Layers className="w-4 h-4" />
            <span>Schul-Portal & Community</span>
          </div>
          <p className="text-xs text-slate-300">
            Unbegrenzte Stundenplan-Vorlagen erstellen, austauschen und direkt in deinen Kalender übernehmen.
          </p>
        </div>
      </div>

      {/* Export & Backup Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <FileDown className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-white">Export & Datensicherung</h3>
            <p className="text-xs text-slate-400">
              Exportiere deinen vollständigen Stunden- und Vertretungsplan in universelle Standardformate.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          
          {/* PDF Export */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-white font-bold text-xs">
                <FileText className="w-4 h-4 text-rose-400" />
                <span>Druck & PDF</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Druckoptimiertes Dokument zum Ausdrucken oder als PDF.
              </p>
            </div>
            <button
              onClick={handlePrintPDF}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              PDF drucken
            </button>
          </div>

          {/* iCal .ICS Export */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-white font-bold text-xs">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Kalender (.ICS)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Für Apple Kalender, Google Kalender & Outlook.
              </p>
            </div>
            <button
              onClick={() => exportToICal(timetableEntries)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              .ICS herunterladen
            </button>
          </div>

          {/* CSV Export */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-white font-bold text-xs">
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span>Excel (CSV)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tabellenformat für Excel & Tabellenkalkulationen.
              </p>
            </div>
            <button
              onClick={() => exportToCSV(timetableEntries, substitutions)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              CSV Exportieren
            </button>
          </div>

          {/* JSON Backup */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-white font-bold text-xs">
                <Database className="w-4 h-4 text-purple-400" />
                <span>JSON Backup</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Vollständige Sicherungskopie aller Einträge & Fächer.
              </p>
            </div>
            <button
              onClick={() => exportToJSON(timetableEntries, substitutions)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              JSON Sichern
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
