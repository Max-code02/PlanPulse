import React from "react";
import { Scale, ShieldCheck, Smartphone, Laptop, Link as LinkIcon } from "lucide-react";

interface BottomLegalBarProps {
  onNavigate: (tab: "impressum" | "datenschutz") => void;
  onOpenDeviceModal?: () => void;
}

export const BottomLegalBar: React.FC<BottomLegalBarProps> = ({ onNavigate, onOpenDeviceModal }) => {
  return (
    <div 
      id="bottom-left-legal-bar"
      className="fixed bottom-4 left-4 z-30 flex items-center bg-slate-900/95 hover:bg-slate-900 text-slate-300 border border-slate-750/90 rounded-full shadow-lg shadow-black/50 backdrop-blur-md px-3 py-1.5 transition-all text-xs"
      role="region"
      aria-label="Rechtliche Hinweise und Geräteauswahl"
    >
      <div className="flex items-center space-x-2">
        {onOpenDeviceModal ? (
          <button
            id="btn-bottom-left-device"
            onClick={onOpenDeviceModal}
            className="flex items-center space-x-1.5 text-purple-300 hover:text-purple-200 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
            title="Gerät auswählen (PC, Apple, Android)"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="font-medium text-[11px] sm:text-xs">Gerät</span>
          </button>
        ) : (
          <a
            id="btn-bottom-left-app"
            href="/handyadriod.html"
            className="flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
            title="PlanPulse Handy Android Edition"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="font-medium text-[11px] sm:text-xs">Android</span>
          </a>
        )}

        <span className="text-slate-600 font-bold">•</span>

        <a
          id="btn-bottom-left-apple"
          href="/handyappel.html"
          className="flex items-center space-x-1.5 text-purple-300 hover:text-purple-200 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
          title="PlanPulse für Apple iPhone & iPad"
        >
          <span className="text-xs font-bold"></span>
          <span className="font-medium text-[11px] sm:text-xs">Apple</span>
        </a>

        <span className="text-slate-600 font-bold">•</span>

        <a
          id="btn-bottom-left-linktree"
          href="https://linktr.ee/Planpulse"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-slate-500 hover:text-slate-400 transition-colors py-0.5 px-1 rounded hover:bg-slate-800 opacity-60 hover:opacity-100"
          title="PlanPulse Links"
        >
          <span className="font-medium text-[9px]">Links</span>
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

