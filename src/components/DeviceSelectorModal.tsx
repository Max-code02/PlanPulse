import React, { useState } from "react";
import { Monitor, Smartphone, Apple, Check, X, ArrowRight, Sparkles } from "lucide-react";

interface DeviceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChoice?: "pc" | "apple" | "android" | null;
  onSelectDevice: (device: "pc" | "apple" | "android", remember: boolean) => void;
}

export const DeviceSelectorModal: React.FC<DeviceSelectorModalProps> = ({
  isOpen,
  onClose,
  currentChoice = "pc",
  onSelectDevice,
}) => {
  const [rememberChoice, setRememberChoice] = useState(true);

  if (!isOpen) return null;

  const handleChoose = (device: "pc" | "apple" | "android") => {
    onSelectDevice(device, rememberChoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-750 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-modal-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-850 to-slate-900 border-b border-slate-800 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Schließen"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Geräte-Optimierung</span>
          </div>
          <h2 id="device-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Wähle dein Gerät aus
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Optimiere dein PlanPulse-Erlebnis für deinen Computer oder dein Smartphone:
          </p>
        </div>

        {/* Device Selection Cards */}
        <div className="p-5 sm:p-6 space-y-3">

          {/* Option 1: PC / Desktop */}
          <button
            onClick={() => handleChoose("pc")}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
              currentChoice === "pc"
                ? "bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/30"
                : "bg-slate-850/60 hover:bg-slate-800 border-slate-750 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="font-bold text-white text-base sm:text-lg">PC</span>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>

          {/* Option 2: Apple iPhone / iPad */}
          <button
            onClick={() => handleChoose("apple")}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
              currentChoice === "apple"
                ? "bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/30"
                : "bg-slate-850/60 hover:bg-slate-800 border-slate-750 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black"></span>
              </div>
              <span className="font-bold text-white text-base sm:text-lg">Apple</span>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>

          {/* Option 3: Android Handy */}
          <button
            onClick={() => handleChoose("android")}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
              currentChoice === "android"
                ? "bg-emerald-950/30 border-emerald-500/60 ring-1 ring-emerald-500/30"
                : "bg-slate-850/60 hover:bg-slate-800 border-slate-750 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="font-bold text-white text-base sm:text-lg">Android</span>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>

        </div>

        {/* Footer with Remember Checkbox & Close */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <label className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <span>Auswahl für diesen Browser merken</span>
          </label>

          <button
            onClick={() => handleChoose("pc")}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg font-medium border border-slate-700 transition-colors"
          >
            Auf PC fortfahren
          </button>
        </div>
      </div>
    </div>
  );
};
