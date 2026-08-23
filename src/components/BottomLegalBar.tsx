import React from "react";
import { Scale, ShieldCheck, Smartphone } from "lucide-react";

interface BottomLegalBarProps {
  onNavigate: (tab: "impressum" | "datenschutz") => void;
}

export const BottomLegalBar: React.FC<BottomLegalBarProps> = ({ onNavigate }) => {
  return (
    <div 
      id="bottom-left-legal-bar"
      className="fixed bottom-4 left-4 z-30 flex items-center bg-slate-900/95 hover:bg-slate-900 text-slate-300 border border-slate-750/90 rounded-full shadow-lg shadow-black/50 backdrop-blur-md px-3 py-1.5 transition-all text-xs"
      role="region"
      aria-label="Rechtliche Hinweise und App-Download"
    >
      <div className="flex items-center space-x-2">
        <a
          id="btn-bottom-left-app"
          href="https://betadrop.app/app/gMbqiQ"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
          title="PlanPulse Android App herunterladen (BetaDrop)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="font-medium text-[11px] sm:text-xs">Android App</span>
        </a>

        <span className="text-slate-600 font-bold">•</span>

        <button
          id="btn-bottom-left-impressum"
          onClick={() => onNavigate("impressum")}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
          title="Impressum Seite öffnen"
        >
          <Scale className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium text-[11px] sm:text-xs">Impressum</span>
        </button>

        <span className="text-slate-600 font-bold">•</span>

        <button
          id="btn-bottom-left-datenschutz"
          onClick={() => onNavigate("datenschutz")}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
          title="Datenschutzerklärung Seite öffnen"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-[11px] sm:text-xs">Datenschutz</span>
        </button>
      </div>
    </div>
  );
};
