import React from "react";
import { 
  CalendarDays, 
  BookOpen,
  GraduationCap,
  Sparkles, 
  Crown, 
  Zap, 
  RefreshCw,
  Sliders,
  User,
  Lock,
  CheckCircle2,
  ShieldAlert,
  FileDown,
  Palmtree,
  Smartphone,
  Laptop
} from "lucide-react";
import { ActiveTab, UserConfig, AuthUser } from "../types";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: UserConfig;
  currentUser: AuthUser | null;
  onOpenAuthModal: () => void;
  onOpenDeviceModal?: () => void;
  onUpgradeClick: () => void;
  isSyncing: boolean;
  onManualSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  currentUser,
  onOpenAuthModal,
  onOpenDeviceModal,
  onUpgradeClick,
  isSyncing,
  onManualSync,
}) => {
  const isPremium = config.planType === "premium";

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      {/* Top Banner / Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            {config.customLogoUrl ? (
              <img
                src={config.customLogoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-lg object-cover border border-slate-700 shadow-sm"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md font-black text-white"
                style={{ backgroundColor: config.primaryColor || "#2563eb" }}
              >
                <Zap className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-white tracking-tight">
                  {config.organizationName || "PlanPulse"}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Vollversion
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stundenplan, Vertretungsplan, Haus- & Schulaufgaben
              </p>
            </div>
          </div>

          {/* Right Actions: Auth Login / Profile, Sync Status & Export Action */}
          <div className="flex items-center space-x-2.5">
            {/* Auth Button */}
            <button
              onClick={onOpenAuthModal}
              className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                currentUser
                  ? "bg-blue-950/40 text-blue-300 border-blue-800/60 hover:bg-blue-900/50"
                  : "bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700"
              }`}
            >
              {currentUser ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[130px] sm:max-w-[180px] truncate font-medium">
                    {currentUser.email}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">Einloggen</span>
                </>
              )}
            </button>

            {/* Live Sync Indicator */}
            <button
              onClick={onManualSync}
              title="Echtzeit-Synchronisation aktiv (Klick für manuellen Sync)"
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-400" : "text-emerald-400"}`} />
              <span className="hidden sm:inline">Live-Sync</span>
            </button>

            {/* Device Switcher Button */}
            {onOpenDeviceModal && (
              <button
                onClick={onOpenDeviceModal}
                title="Gerät / Plattform wählen (PC, Apple iPhone, Handy Android)"
                className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all bg-slate-800 hover:bg-slate-750 text-purple-300 hover:text-purple-200 border border-slate-700 hover:border-purple-500/50"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gerät wählen</span>
              </button>
            )}

            {/* Android App Link */}
            <a
              href="/handyadriod.html"
              title="PlanPulse Handy Android (APK & Download)"
              className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 hover:border-emerald-500/50"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Handy</span>
            </a>

            {/* Quick Export Button */}
            <button
              onClick={() => setActiveTab("freemium")}
              className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
            >
              <FileDown className="w-4 h-4" />
              <span>Export & Backup</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-800/60">
          <TabButton
            active={activeTab === "timetable"}
            onClick={() => setActiveTab("timetable")}
            icon={<CalendarDays className="w-4 h-4" />}
            label="Mein Stundenplan"
          />
          <TabButton
            active={activeTab === "school_hub"}
            onClick={() => setActiveTab("school_hub")}
            icon={<Zap className="w-4 h-4 text-blue-400" />}
            label="Schul-Portal & Pläne"
            badge="Portal"
          />
          <TabButton
            active={activeTab === "homework"}
            onClick={() => setActiveTab("homework")}
            icon={<BookOpen className="w-4 h-4 text-emerald-400" />}
            label="Haus- & Schulaufgaben"
          />
          <TabButton
            active={activeTab === "grades"}
            onClick={() => setActiveTab("grades")}
            icon={<GraduationCap className="w-4 h-4 text-amber-400" />}
            label="Noten & Schnitt"
          />
          <TabButton
            active={activeTab === "ai"}
            onClick={() => setActiveTab("ai")}
            icon={<Sparkles className="w-4 h-4 text-purple-400" />}
            label="KI-Assistent"
            badge="Multi-KI"
            badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold"
          />
          <TabButton
            active={activeTab === "freemium"}
            onClick={() => setActiveTab("freemium")}
            icon={<FileDown className="w-4 h-4 text-cyan-400" />}
            label="Export & Werkzeuge"
          />
          {(currentUser?.role === "admin" || currentUser?.email?.toLowerCase().trim() === "max.kistner12@gmail.com") && (
            <TabButton
              active={activeTab === "admin"}
              onClick={() => setActiveTab("admin")}
              icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
              label="Admin-Bereich"
              badge="Admin"
              badgeColor="bg-rose-500/30 text-rose-200 border-rose-500/50 font-bold"
            />
          )}
        </div>
      </div>
    </header>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, badge, badgeColor }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? "bg-slate-800 text-white shadow-sm border border-slate-700"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
            badgeColor || "bg-rose-500/20 text-rose-300 border-rose-500/40"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
};
