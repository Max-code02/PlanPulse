import React, { useState } from "react";
import { Zap, ShieldCheck, Play, Video, ExternalLink, X, Scale, FileText, Smartphone } from "lucide-react";
import { UserConfig } from "../types";

interface WatermarkBadgeProps {
  config?: UserConfig;
  onUpgradeClick?: () => void;
  onOpenLegal?: (tab: "impressum" | "datenschutz") => void;
}

export const WatermarkBadge: React.FC<WatermarkBadgeProps> = ({ onOpenLegal }) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  return (
    <footer className="mt-12 pt-8 pb-12 border-t border-slate-800 bg-slate-950/60 text-center text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* YouTube Shorts & Video Hub Bar - Visually hidden for users, preserved for SEO/Bots */}
        <div className="absolute w-0 h-0 opacity-0 overflow-hidden pointer-events-none -z-50" aria-hidden="true" tabIndex={-1}>
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 font-bold shrink-0">
              <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm tracking-tight">
                  PlanPulse auf YouTube Shorts
                </span>
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Offiziell
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sieh dir Tutorials, Tipps zum Vertretungsplan und Shorts an.
              </p>
            </div>
          </div>

          {/* Quick Shorts Links & Channel Button */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            <a
              href="https://www.youtube.com/shorts/2m0jz2Ol7zA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm group"
            >
              <Video className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span>Short #1</span>
              <ExternalLink className="w-3 h-3 text-slate-400 opacity-60" />
            </a>

            <a
              href="https://www.youtube.com/shorts/93j80fc5hDs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm group"
            >
              <Video className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span>Short #2</span>
              <ExternalLink className="w-3 h-3 text-slate-400 opacity-60" />
            </a>

            <a
              href="https://www.youtube.com/shorts/uGu4qeZTYKo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm group"
            >
              <Video className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span>Short #3</span>
              <ExternalLink className="w-3 h-3 text-slate-400 opacity-60" />
            </a>

            <a
              href="https://www.youtube.com/@PlanPulse-t5w/shorts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-red-600/25 transition-all hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>@PlanPulse-t5w / Shorts</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>

        {/* Modal for In-App Video Playback if requested */}
        {selectedVideoId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
              <div className="flex items-center justify-between p-3 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">PlanPulse Short</span>
                <button
                  onClick={() => setSelectedVideoId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="aspect-[9/16] w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideoId}?autoplay=1`}
                  title="PlanPulse YouTube Short"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer Brand, Legal Links & Status */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 text-left">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                <Zap className="w-3 h-3" />
              </div>
              <span>
                <strong className="text-slate-300">PlanPulse</strong> — Smartes Schul-Dashboard
              </span>
            </div>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span className="text-slate-500 text-[11px]">
              © {new Date().getFullYear()} Alle Rechte vorbehalten
            </span>
          </div>

          {/* Explicit Legal Links & App Link */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            {/* Android App Link - Visually hidden for users, preserved for SEO/Bots */}
            <a
              id="footer-link-app"
              href="https://betadrop.app/app/gMbqiQ"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute w-0 h-0 opacity-0 overflow-hidden pointer-events-none -z-50"
              title="PlanPulse Android App herunterladen (BetaDrop)"
              aria-hidden="true"
              tabIndex={-1}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android App (BetaDrop)</span>
            </a>

            {/* <span className="text-slate-700">•</span> */}

            <button
              id="footer-link-impressum"
              onClick={() => onOpenLegal?.("impressum")}
              className="inline-flex items-center space-x-1 text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-slate-800/60"
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="font-medium">Impressum (§ 5 DDG)</span>
            </button>

            <span className="text-slate-700">•</span>

            <button
              id="footer-link-datenschutz"
              onClick={() => onOpenLegal?.("datenschutz")}
              className="inline-flex items-center space-x-1 text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded hover:bg-slate-800/60"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-medium">Datenschutzerklärung (DSGVO)</span>
            </button>

            <span className="text-slate-700">•</span>

            <div className="flex items-center space-x-1 text-slate-400 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kostenlose Vollversion</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

