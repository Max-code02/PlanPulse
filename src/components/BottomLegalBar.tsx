import React from "react";
import { Scale, ShieldCheck, FileText } from "lucide-react";
import { LegalTab } from "./LegalModal";

interface BottomLegalBarProps {
  onOpenLegal: (tab: LegalTab) => void;
}

export const BottomLegalBar: React.FC<BottomLegalBarProps> = ({ onOpenLegal }) => {
  return (
    <div 
      id="bottom-left-legal-bar"
      className="fixed bottom-4 left-4 z-30 flex items-center bg-slate-900/90 hover:bg-slate-900 text-slate-300 border border-slate-750/90 rounded-full shadow-lg shadow-black/40 backdrop-blur-md px-3 py-1.5 transition-all hover:scale-[1.02] text-xs"
      role="region"
      aria-label="Rechtliche Hinweise"
    >
      <div className="flex items-center space-x-2">
        <button
          id="btn-bottom-left-impressum"
          onClick={() => onOpenLegal("impressum")}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
          title="Impressum nach § 5 DDG öffnen"
        >
          <Scale className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium text-[11px] sm:text-xs">Impressum</span>
        </button>

        <span className="text-slate-600 font-bold">•</span>

        <button
          id="btn-bottom-left-datenschutz"
          onClick={() => onOpenLegal("datenschutz")}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
          title="Datenschutzerklärung nach DSGVO öffnen"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-[11px] sm:text-xs">Datenschutz</span>
        </button>
      </div>
    </div>
  );
};
