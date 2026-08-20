import React, { useState } from "react";
import { 
  AlertTriangle, 
  Send, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Bot
} from "lucide-react";
import { SubstitutionNotice, SubstitutionType } from "../types";

interface SubstitutionManagerProps {
  notices: SubstitutionNotice[];
  onAddNotice: (notice: Partial<SubstitutionNotice>) => void;
  onDeleteNotice: (id: string) => void;
  onDispatchWebhook: (notice: SubstitutionNotice) => void;
  onOpenAiParser: () => void;
}

export const SubstitutionManager: React.FC<SubstitutionManagerProps> = ({
  notices,
  onAddNotice,
  onDeleteNotice,
  onDispatchWebhook,
  onOpenAiParser,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<SubstitutionNotice>>({
    date: "Heute",
    period: 1,
    targetClass: "10A",
    subject: "",
    originalTeacher: "",
    substituteTeacher: "",
    room: "",
    type: "Vertretung",
    info: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) return;
    onAddNotice(formData);
    setModalOpen(false);
    setFormData({
      date: "Heute",
      period: 1,
      targetClass: "10A",
      subject: "",
      originalTeacher: "",
      substituteTeacher: "",
      room: "",
      type: "Vertretung",
      info: "",
    });
  };

  const filteredNotices = notices.filter((n) => {
    const matchType = filterType === "ALL" || n.type === filterType;
    const matchClass = filterClass === "ALL" || n.targetClass.toLowerCase() === filterClass.toLowerCase();
    const matchSearch =
      !searchQuery ||
      n.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.originalTeacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.substituteTeacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.targetClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.room.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchClass && matchSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Live-Vertretungsplan & Ausfall-Zentrale
              </h2>
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {notices.length} Aktive Meldungen
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verwalte sofortige Änderungen, Vertretungskräfte, Raumwechsel und sende Push-Alerts an den Discord-Bot.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenAiParser}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/40 text-purple-200 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>KI Text-Parser</span>
            </button>

            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Vertretung melden</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Suche nach Fach, Lehrer, Klasse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Alle Änderungsarten</option>
              <option value="Vertretung">Nur Vertretungen</option>
              <option value="Entfall">Nur Entfälle</option>
              <option value="Raumänderung">Nur Raumänderungen</option>
              <option value="Selbststudium">Nur Selbststudium</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Alle Zielgruppen / Klassen</option>
              <option value="10A">Klasse 10A</option>
              <option value="11B">Klasse 11B</option>
              <option value="Q12">Stufe Q12</option>
              <option value="Privat">Privat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notices Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredNotices.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-semibold text-white">Keine passenden Vertretungen gefunden</h4>
            <p className="text-xs text-slate-400 mt-1">
              Aktuell liegt kein Unterrichtsausfall für diese Kriterien vor.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredNotices.map((notice) => {
              const isEntfall = notice.type === "Entfall";
              const isRaum = notice.type === "Raumänderung";

              return (
                <div
                  key={notice.id}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-850/50 transition-colors"
                >
                  {/* Left Column: Timing & Class badge */}
                  <div className="flex items-center space-x-3 min-w-[200px]">
                    <div className="text-center bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 font-mono">
                      <span className="text-xs font-bold text-blue-400 block">{notice.date}</span>
                      <span className="text-[11px] text-slate-400">{notice.period}. Stunde</span>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{notice.subject}</span>
                        <span className="text-[11px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded border border-slate-700">
                          {notice.targetClass}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {notice.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Center Column: Replacement details & Reason */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isEntfall
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : isRaum
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}>
                        {notice.type}
                      </span>
                      
                      <span className="text-slate-400">
                        {notice.originalTeacher}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="font-semibold text-white">
                        {isEntfall ? "Entfällt ersatzlos" : notice.substituteTeacher}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        (Raum: {notice.room})
                      </span>
                    </div>

                    {notice.info && (
                      <p className="text-xs text-slate-300 bg-slate-950/60 rounded px-2.5 py-1 border border-slate-800/80 font-mono">
                        💬 {notice.info}
                      </p>
                    )}
                  </div>

                  {/* Right Actions: Discord Webhook Dispatch & Delete */}
                  <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() => onDispatchWebhook(notice)}
                      title="Als Discord Webhook Push-Meldung senden"
                      className="flex items-center space-x-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Discord Alert</span>
                    </button>

                    <button
                      onClick={() => onDeleteNotice(notice.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Manual Add Substitution Notice */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Vertretungsmeldung eintragen</span>
              <span className="text-xs font-semibold text-rose-400">Live Sync</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Datum</label>
                  <select
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Heute">Heute</option>
                    <option value="Morgen">Morgen</option>
                    <option value="Übermorgen">Übermorgen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Stunde</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                      <option key={p} value={p}>{p}. Std</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Klasse</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. 10A"
                    value={formData.targetClass}
                    onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Fach *</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Deutsch"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Art der Änderung</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as SubstitutionType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Vertretung">Vertretung</option>
                    <option value="Entfall">Entfall (Freistunde)</option>
                    <option value="Raumänderung">Raumänderung</option>
                    <option value="Selbststudium">Selbststudium</option>
                    <option value="Klausur">Klausur</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Ursprüngl. Lehrer</label>
                  <input
                    type="text"
                    placeholder="z.B. Fr. Sommer"
                    value={formData.originalTeacher}
                    onChange={(e) => setFormData({ ...formData, originalTeacher: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Vertretungs-Lehrer</label>
                  <input
                    type="text"
                    placeholder="z.B. Fr. Krause"
                    value={formData.substituteTeacher}
                    onChange={(e) => setFormData({ ...formData, substituteTeacher: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Raum</label>
                  <input
                    type="text"
                    placeholder="z.B. R102"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Aufgaben / Anmerkungen</label>
                <textarea
                  rows={2}
                  placeholder="z.B. Aufgabenblatt Seite 45-48 bearbeiten"
                  value={formData.info}
                  onChange={(e) => setFormData({ ...formData, info: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md transition-colors"
                >
                  Veröffentlichen & Syncen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
