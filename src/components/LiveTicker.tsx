import React, { useState } from "react";
import { AlertCircle, ArrowRight, Bell, Plus, Filter, RefreshCw } from "lucide-react";
import { SubstitutionNotice } from "../types";

interface LiveTickerProps {
  notices: SubstitutionNotice[];
  onOpenAddModal: () => void;
  onSelectNotice?: (notice: SubstitutionNotice) => void;
  filterClass: string;
  setFilterClass: (cls: string) => void;
}

export const LiveTicker: React.FC<LiveTickerProps> = ({
  notices,
  onOpenAddModal,
  filterClass,
  setFilterClass,
}) => {
  const [isPaused, setIsPaused] = useState(false);

  const filteredNotices = filterClass === "alle" 
    ? notices 
    : notices.filter((n) => n.targetClass.toLowerCase() === filterClass.toLowerCase());

  return (
    <div className="bg-slate-900/90 border-y border-slate-800 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        
        {/* Left: Ticker Label & Filter */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold px-2.5 py-1 rounded-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
            <span>LIVE-VERTRETUNG</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="alle">Alle Klassen</option>
              <option value="10A">Klasse 10A</option>
              <option value="11B">Klasse 11B</option>
              <option value="Q12">Stufe Q12</option>
              <option value="Privat">Privat / Uni</option>
            </select>
          </div>
        </div>

        {/* Center: Scrolling / Animated Notice Ticker */}
        <div 
          className="overflow-hidden relative flex-1 w-full max-w-2xl h-7 flex items-center bg-slate-950/60 rounded-lg px-3 border border-slate-800"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {filteredNotices.length === 0 ? (
            <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
              <span>Keine aktuellen Vertretungen für diese Auswahl — Alles regulär nach Plan! 🎉</span>
            </span>
          ) : (
            <div className={`flex items-center space-x-6 whitespace-nowrap text-xs ${!isPaused ? "animate-marquee" : ""}`}>
              {filteredNotices.map((n) => (
                <div key={n.id} className="flex items-center space-x-2 text-slate-300">
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                    n.type === "Entfall"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : n.type === "Raumänderung"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}>
                    {n.type}
                  </span>
                  <span className="font-semibold text-white">[{n.targetClass}] {n.period}. Std {n.subject}:</span>
                  <span className="text-slate-300">
                    {n.originalTeacher} ➔ <span className="text-amber-200">{n.substituteTeacher}</span> ({n.room})
                  </span>
                  <span className="text-slate-400 italic font-mono text-[11px]">"{n.info}"</span>
                  <span className="text-slate-500 text-[10px]">•</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Action Button */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-1 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-2.5 py-1.5 rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Planänderung eintragen</span>
          </button>
        </div>

      </div>
    </div>
  );
};
