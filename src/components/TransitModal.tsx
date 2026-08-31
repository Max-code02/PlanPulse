import React, { useState, useEffect } from "react";
import { Bus, Train, ArrowRight, MapPin, Clock, Search, X, Loader2, AlertCircle } from "lucide-react";

interface TransitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Station {
  id: string;
  name: string;
}

interface Journey {
  legs: {
    origin: { name: string };
    destination: { name: string };
    departure: string;
    arrival: string;
    line?: { name: string };
    delay?: number;
  }[];
}

export const TransitModal: React.FC<TransitModalProps> = ({ isOpen, onClose }) => {
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  
  const [fromSuggestions, setFromSuggestions] = useState<Station[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Station[]>([]);
  
  const [isSearchingFrom, setIsSearchingFrom] = useState(false);
  const [isSearchingTo, setIsSearchingTo] = useState(false);
  
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [isLoadingJourneys, setIsLoadingJourneys] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search for From Station
  useEffect(() => {
    if (!fromQuery || fromStation?.name === fromQuery) {
      setFromSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingFrom(true);
      try {
        const res = await fetch(`/api/transit/locations?query=${encodeURIComponent(fromQuery)}&results=5`, { credentials: "include" });
        if (!res.ok) throw new Error("API-Verbindungsfehler");
        const data = await res.json();
        const results = data.filter((d: any) => d.id && d.name).slice(0, 5);
        setFromSuggestions(results);
      } catch (err) {
        setFromSuggestions([{ id: "error", name: "⚠️ API derzeit nicht erreichbar" }]);
      } finally {
        setIsSearchingFrom(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [fromQuery, fromStation]);

  // Debounced search for To Station
  useEffect(() => {
    if (!toQuery || toStation?.name === toQuery) {
      setToSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingTo(true);
      try {
        const res = await fetch(`/api/transit/locations?query=${encodeURIComponent(toQuery)}&results=5`, { credentials: "include" });
        if (!res.ok) throw new Error("API-Verbindungsfehler");
        const data = await res.json();
        const results = data.filter((d: any) => d.id && d.name).slice(0, 5);
        setToSuggestions(results);
      } catch (err) {
        setToSuggestions([{ id: "error", name: "⚠️ API derzeit nicht erreichbar" }]);
      } finally {
        setIsSearchingTo(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [toQuery, toStation]);

  const handleSearchJourneys = async () => {
    if ((!fromStation && !fromQuery) || (!toStation && !toQuery)) {
      setError("Bitte Start und Ziel eingeben.");
      return;
    }
    setIsLoadingJourneys(true);
    setError(null);
    setJourneys([]);
    
    let finalFromStation = fromStation;
    let finalToStation = toStation;
    
    try {
      if (!finalFromStation) {
        const res = await fetch(`/api/transit/locations?query=${encodeURIComponent(fromQuery)}&results=1`, { credentials: "include" });
        if (!res.ok) throw new Error("Fehler: Start-Haltestelle konnte über die DB API nicht aufgelöst werden (API überlastet).");
        const data = await res.json();
        const results = data.filter((d: any) => d.id && d.name);
        if (results.length > 0) {
           finalFromStation = results[0];
           setFromStation(finalFromStation);
        } else {
           throw new Error("Start-Haltestelle nicht gefunden.");
        }
      }
      
      if (!finalToStation) {
        const res = await fetch(`/api/transit/locations?query=${encodeURIComponent(toQuery)}&results=1`, { credentials: "include" });
        if (!res.ok) throw new Error("Fehler: Ziel-Haltestelle konnte über die DB API nicht aufgelöst werden (API überlastet).");
        const data = await res.json();
        const results = data.filter((d: any) => d.id && d.name);
        if (results.length > 0) {
           finalToStation = results[0];
           setToStation(finalToStation);
        } else {
           throw new Error("Ziel-Haltestelle nicht gefunden.");
        }
      }

      const res = await fetch(`/api/transit/journeys?from=${finalFromStation.id}&to=${finalToStation.id}&results=4`, { credentials: "include" });
      if (!res.ok) throw new Error("Fehler beim Abrufen der Fahrpläne. Die DB API (transport.rest) ist aktuell offline oder überlastet.");
      const data = await res.json();
      if (data.journeys && data.journeys.length > 0) {
        setJourneys(data.journeys);
      } else {
        throw new Error("Keine Verbindungen gefunden.");
      }
    } catch (err: any) {
      setError(err.message || "Fehler beim Laden der API.");
    } finally {
      setIsLoadingJourneys(false);
    }
  };

  const formatTime = (isoString: string, delayInSeconds?: number) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const timeStr = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (delayInSeconds && delayInSeconds > 0) {
      const delayMin = Math.round(delayInSeconds / 60);
      return (
        <span className="flex items-center space-x-1">
          <span className="line-through text-slate-500">{timeStr}</span>
          <span className="text-red-400 font-bold">
            {new Date(date.getTime() + delayInSeconds * 1000).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </span>
      );
    }
    return timeStr;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg text-white">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Bus & Bahn Live</h2>
              <p className="text-xs text-slate-400">Echtzeit-Abfahrten für den Heimweg</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-6">
          
          {/* Inputs */}
          <div className="space-y-4">
            {/* From */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Start / Schule</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Z.B. Würzburg Hbf"
                  value={fromQuery}
                  onChange={(e) => {
                    setFromQuery(e.target.value);
                    if (fromStation) setFromStation(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
                {isSearchingFrom && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />}
              </div>
              
              {fromSuggestions.length > 0 && !fromStation && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                  {fromSuggestions.map((s) => (
                    <button
                      key={s.id}
                      disabled={s.id === "error"}
                      onClick={() => {
                        if (s.id === "error") return;
                        setFromStation(s);
                        setFromQuery(s.name);
                        setFromSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 last:border-0 flex items-center justify-between disabled:opacity-75 disabled:hover:bg-slate-800"
                    >
                      <span className={s.id === "error" ? "text-amber-400" : ""}>{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* To */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Ziel / Zuhause</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Z.B. Sanderring"
                  value={toQuery}
                  onChange={(e) => {
                    setToQuery(e.target.value);
                    if (toStation) setToStation(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
                {isSearchingTo && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin" />}
              </div>
              
              {toSuggestions.length > 0 && !toStation && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                  {toSuggestions.map((s) => (
                    <button
                      key={s.id}
                      disabled={s.id === "error"}
                      onClick={() => {
                        if (s.id === "error") return;
                        setToStation(s);
                        setToQuery(s.name);
                        setToSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border-b border-slate-700/50 last:border-0 flex items-center justify-between disabled:opacity-75 disabled:hover:bg-slate-800"
                    >
                      <span className={s.id === "error" ? "text-amber-400" : ""}>{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSearchJourneys}
              disabled={(!fromStation && !fromQuery) || (!toStation && !toQuery) || isLoadingJourneys}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-600/20"
            >
              {isLoadingJourneys ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Verbindungen suchen</span>
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start space-x-3 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {journeys.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Nächste Abfahrten</span>
              </h3>
              
              <div className="space-y-3">
                {journeys.map((j, idx) => {
                  const firstLeg = j.legs[0];
                  const lastLeg = j.legs[j.legs.length - 1];
                  const transitLegs = j.legs.filter(l => l.line?.name);
                  
                  return (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-white">
                            {formatTime(firstLeg.departure, firstLeg.delay)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                          <span className="text-lg font-bold text-white">
                            {formatTime(lastLeg.arrival, lastLeg.delay)}
                          </span>
                        </div>
                        {transitLegs.length > 0 && (
                          <div className="flex items-center space-x-1.5 flex-wrap justify-end">
                            {transitLegs.map((l, i) => (
                              <span key={i} className="bg-slate-800 text-amber-400 font-bold px-2.5 py-1 rounded-lg text-xs border border-slate-700">
                                {l.line?.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-start space-x-3 text-sm">
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                          <div className="w-0.5 h-6 bg-slate-800"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-slate-300 font-medium truncate">{firstLeg.origin.name}</p>
                          <p className="text-slate-400 text-xs py-1">
                            {j.legs.length > 1 ? `${j.legs.length - 1}x Umsteigen` : "Direktfahrt"}
                          </p>
                          <p className="text-slate-300 font-medium truncate">{lastLeg.destination.name}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
