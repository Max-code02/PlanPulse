import React from "react";
import { 
  CalendarDays, 
  BookOpen, 
  GraduationCap, 
  Sparkles, 
  Zap, 
  Camera, 
  Laptop, 
  FileDown 
} from "lucide-react";
import { ActiveTab, DevicePlatform } from "../types";

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  devicePlatform: DevicePlatform;
  onOpenAiParser: () => void;
  onOpenDeviceModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  devicePlatform,
  onOpenAiParser,
  onOpenDeviceModal,
}) => {
  const isApple = devicePlatform === "apple";
  const isAndroid = devicePlatform === "android";

  return (
    <nav 
      aria-label="Mobile Schnellnavigation"
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t ${
        isApple
          ? "bg-slate-900/90 backdrop-blur-xl border-slate-800/80 pb-safe shadow-2xl"
          : "bg-slate-950/95 backdrop-blur-md border-slate-800 shadow-xl"
      }`}
    >
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        
        {/* 1. Stundenplan (Main) */}
        <button
          onClick={() => setActiveTab("timetable")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === "timetable"
              ? isApple 
                ? "text-blue-400 font-bold scale-105" 
                : "text-emerald-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === "timetable" ? (isApple ? "bg-blue-500/20" : "bg-emerald-500/20") : ""}`}>
            <CalendarDays className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Plan</span>
        </button>

        {/* 2. Hausaufgaben */}
        <button
          onClick={() => setActiveTab("homework")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === "homework"
              ? isApple 
                ? "text-purple-400 font-bold scale-105" 
                : "text-emerald-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === "homework" ? (isApple ? "bg-purple-500/20" : "bg-emerald-500/20") : ""}`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Aufgaben</span>
        </button>

        {/* 3. Center Highlight: KI-Foto-Scan (Großer Daumen-Baustein) */}
        <button
          onClick={onOpenAiParser}
          className={`flex flex-col items-center justify-center -mt-4 py-1.5 px-3 rounded-2xl shadow-lg transition-transform active:scale-95 ${
            isApple
              ? "bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-blue-500/30 ring-4 ring-slate-900"
              : "bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 ring-4 ring-slate-950"
          }`}
          title="Stundenplan per Foto scannen"
        >
          <Camera className="w-5 h-5" />
          <span className="text-[9px] font-extrabold mt-0.5 uppercase tracking-wider">Scan</span>
        </button>

        {/* 4. Notenrechner */}
        <button
          onClick={() => setActiveTab("grades")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === "grades"
              ? isApple 
                ? "text-amber-400 font-bold scale-105" 
                : "text-amber-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === "grades" ? "bg-amber-500/20" : ""}`}>
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Noten</span>
        </button>

        {/* 5. KI & Mehr */}
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
            activeTab === "ai"
              ? isApple 
                ? "text-purple-400 font-bold scale-105" 
                : "text-purple-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === "ai" ? "bg-purple-500/20" : ""}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">KI-Chat</span>
        </button>

      </div>
    </nav>
  );
};
