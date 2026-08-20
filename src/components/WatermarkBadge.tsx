import React from "react";
import { Zap, ShieldCheck } from "lucide-react";
import { UserConfig } from "../types";

interface WatermarkBadgeProps {
  config?: UserConfig;
  onUpgradeClick?: () => void;
}

export const WatermarkBadge: React.FC<WatermarkBadgeProps> = () => {
  return (
    <footer className="mt-12 py-6 border-t border-slate-800 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
            <Zap className="w-3 h-3" />
          </div>
          <span>
            <strong className="text-slate-400">PlanPulse</strong> — Dein smarter digitaler Schul- & Vertretungsplan
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Vollversion • Kostenlos & unbegrenzt nutzbar</span>
        </div>
      </div>
    </footer>
  );
};
