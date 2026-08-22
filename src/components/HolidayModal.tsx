import React, { useState, useMemo } from "react";
import { 
  Palmtree, 
  X, 
  Download, 
  MapPin, 
  CalendarDays, 
  Clock, 
  Sparkles,
  CalendarCheck,
  ChevronRight
} from "lucide-react";
import { 
  GermanState, 
  GERMAN_STATES, 
  getAllHolidaysForState, 
  getNextHolidayStatus, 
  calculateDaysDuration, 
  exportHolidaysToICal,
  StateInfo
} from "../data/holidaysData";

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialState?: GermanState;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  initialState = "BY"
}) => {
  const [selectedState, setSelectedState] = useState<GermanState>(() => {
    try {
      const saved = localStorage.getItem("planpulse_selected_state");
      if (saved && GERMAN_STATES.some(s => s.code === saved)) {
        return saved as GermanState;
      }
    } catch {}
    return initialState;
  });

  const [activeCategory, setActiveCategory] = useState<"ALL" | "school_vacation" | "public_holiday">("ALL");

  if (!isOpen) return null;

  const handleSelectState = (st: GermanState) => {
    setSelectedState(st);
    try {
      localStorage.setItem("planpulse_selected_state", st);
    } catch {}
  };

  const currentStateObj: StateInfo = GERMAN_STATES.find(s => s.code === selectedState) || GERMAN_STATES[1];
  const nextHolidayStatus = getNextHolidayStatus(selectedState);
  const currentYear = new Date().getFullYear();
  const allHolidays = getAllHolidaysForState(selectedState, currentYear, currentYear + 1);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredHolidays = allHolidays.filter(h => {
    if (activeCategory !== "ALL" && h.category !== activeCategory) return false;
    return true;
  });

  const formatDateGerman = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    const dayName = date.toLocaleDateString("de-DE", { weekday: "short" });
    return `${dayName}., ${d}.${m}.${y}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Ferien & Feiertage</span>
                <span className="text-sm">{currentStateObj.flagEmoji}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Offizielle Ferientermine & gesetzliche Feiertage
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportHolidaysToICal(selectedState, currentStateObj.name)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-semibold transition-colors"
              title="In Kalender (.ics) exportieren"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iCal Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bundesland Dropdown & Compact Selection Bar */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-xs text-slate-300 font-medium">Bundesland:</span>
            <select
              value={selectedState}
              onChange={(e) => handleSelectState(e.target.value as GermanState)}
              className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
            >
              {GERMAN_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.flagEmoji} {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                activeCategory === "ALL" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setActiveCategory("school_vacation")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                activeCategory === "school_vacation" ? "bg-teal-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Ferien
            </button>
            <button
              onClick={() => setActiveCategory("public_holiday")}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                activeCategory === "public_holiday" ? "bg-amber-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Feiertage
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          
          {/* Next Vacation Mini-Highlight */}
          {nextHolidayStatus && (
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
              nextHolidayStatus.isCurrentlyActive
                ? "bg-teal-950/40 border-teal-500/40 text-teal-100"
                : "bg-slate-950/70 border-slate-800"
            }`}>
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <span className="text-xl shrink-0">
                  {nextHolidayStatus.holiday.icon || (nextHolidayStatus.isCurrentlyActive ? "🏖️" : "🌴")}
                </span>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">
                    {nextHolidayStatus.isCurrentlyActive ? "🎉 Aktuell frei: " : "🌴 Nächste: "}
                    {nextHolidayStatus.holiday.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {formatDateGerman(nextHolidayStatus.holiday.startDate)}
                    {nextHolidayStatus.holiday.startDate !== nextHolidayStatus.holiday.endDate && (
                      <> bis {formatDateGerman(nextHolidayStatus.holiday.endDate)}</>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  nextHolidayStatus.isCurrentlyActive
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                    : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                }`}>
                  {nextHolidayStatus.isCurrentlyActive
                    ? `Noch ${nextHolidayStatus.daysRemaining} Tage`
                    : `In ${nextHolidayStatus.daysRemaining} Tagen`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Compact Holiday List */}
          <div className="space-y-1.5">
            {filteredHolidays.map((holiday) => {
              const isPast = todayStr > holiday.endDate;
              const isActive = todayStr >= holiday.startDate && todayStr <= holiday.endDate;
              const isVacation = holiday.category === "school_vacation";
              const duration = calculateDaysDuration(holiday.startDate, holiday.endDate);

              return (
                <div
                  key={holiday.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                    isActive
                      ? "bg-teal-950/30 border-teal-500/50 text-white font-medium"
                      : isPast
                      ? "bg-slate-950/30 border-slate-800/40 text-slate-500"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="text-base shrink-0">{holiday.icon || (isVacation ? "🌴" : "🎉")}</span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold truncate ${isActive ? "text-teal-300" : isPast ? "text-slate-500" : "text-white"}`}>
                          {holiday.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded uppercase font-bold tracking-wider ${
                          isVacation ? "bg-teal-950 text-teal-400 border border-teal-800/50" : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {isVacation ? "Ferien" : "Feiertag"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateGerman(holiday.startDate)}
                        {holiday.startDate !== holiday.endDate && ` – ${formatDateGerman(holiday.endDate)}`}
                        {holiday.notes && <span className="text-slate-500"> ({holiday.notes})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {duration} {duration === 1 ? "Tag frei" : "Tage frei"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Automatisch nach KMK-Terminen berechnet.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
